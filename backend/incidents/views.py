"""
Incident views — Report intake, incident lifecycle, operator approval.
"""
import threading
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from django.utils import timezone
from .models import Incident, Report, IncidentTimeline, IncidentStatus, IncidentSeparationTask
from .serializers import (
    IncidentSerializer,
    IncidentDetailSerializer,
    ReportCreateSerializer,
    ReportSerializer,
    IncidentTimelineSerializer,
    IncidentSeparationTaskSerializer,
)
from .permissions import IsOperator, IsOperatorOrTeam, IsSecurityOrOperator



def _run_pipeline(report):
    """Run AI + risk pipeline in a background thread."""
    try:
        from ai_engine.pipeline import analyze_report
        analyze_report(report)
    except Exception as exc:
        print(f'[JarVIZ] AI pipeline error: {exc}')


class ReportCreateView(generics.CreateAPIView):
    """
    POST /api/reports/
    Any authenticated user can submit an emergency report.
    """
    serializer_class = ReportCreateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        report = serializer.save(reporter=self.request.user)
        # Add source from user role if not explicitly set
        if not report.source:
            report.source = self.request.user.role
            report.save(update_fields=['source'])

        # Record timeline event
        IncidentTimeline.objects.create(
            incident=report.incident,
            event=f'Report submitted by {self.request.user.get_full_name() or self.request.user.username}: "{report.description[:100]}"',
            actor=self.request.user,
        ) if report.incident else None

        # Trigger AI + risk pipeline asynchronously
        t = threading.Thread(target=_run_pipeline, args=(report,), daemon=True)
        t.start()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class IncidentListView(generics.ListAPIView):
    """
    GET /api/incidents/
    Returns all incidents ordered by risk_score descending (priority queue).
    """
    serializer_class = IncidentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Incident.objects.all()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class IncidentDetailView(generics.RetrieveAPIView):
    """
    GET /api/incidents/{id}/
    Full incident detail with AI analysis, risk breakdown, and timeline.
    """
    serializer_class = IncidentDetailSerializer
    permission_classes = [IsAuthenticated]
    queryset = Incident.objects.all()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def incident_timeline(request, pk):
    """GET /api/incidents/{id}/timeline/"""
    incident = get_object_or_404(Incident, pk=pk)
    events = incident.timeline.all()
    serializer = IncidentTimelineSerializer(events, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def incident_approve(request, pk):
    """
    POST /api/incidents/{id}/approve/
    Operator approves AI recommendation and assigns resources.
    """
    if not request.user.is_operator:
        return Response(
            {'detail': 'Only Emergency Operators can approve incidents.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    incident = get_object_or_404(Incident, pk=pk)

    if incident.status != IncidentStatus.AWAITING_APPROVAL:
        return Response(
            {'detail': f'Incident is {incident.status}, not AWAITING_APPROVAL.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    resource_ids = request.data.get('resource_ids', [])

    incident.status = IncidentStatus.ASSIGNED
    incident.save(update_fields=['status', 'updated_at'])

    IncidentTimeline.objects.create(
        incident=incident,
        event=f'Operator approved response. Resources assigned: {resource_ids}',
        actor=request.user,
    )

    # Assign resources
    if resource_ids:
        from resources.models import Resource, ResourceStatus, ResourceAssignment
        for rid in resource_ids:
            try:
                resource = Resource.objects.get(pk=rid)
                ResourceAssignment.objects.create(
                    incident=incident,
                    resource=resource,
                    assigned_by=request.user,
                )
                resource.status = ResourceStatus.BUSY
                resource.save(update_fields=['status'])
            except Resource.DoesNotExist:
                pass

    # Push WebSocket update
    _broadcast_incident_update(incident)

    serializer = IncidentDetailSerializer(incident)
    return Response(serializer.data)


def _broadcast_incident_update(incident):
    """Send updated incident to all WebSocket listeners."""
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        from incidents.serializers import IncidentSerializer as IS
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'incidents',
            {
                'type': 'incident_update',
                'incident': IS(incident).data,
            }
        )
    except Exception:
        pass  # Channel layer may not be available in dev


class MyReportsView(generics.ListAPIView):
    """GET /api/reports/mine/ — reporter sees their own reports."""
    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Report.objects.filter(reporter=self.request.user)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def incident_close(request, pk):
    """
    POST /api/incidents/{id}/close/
    Operator performs final administrative sign-off on a resolved incident.
    """
    incident = get_object_or_404(Incident, pk=pk)
    incident.status = IncidentStatus.CLOSED
    incident.save(update_fields=['status', 'updated_at'])

    note = request.data.get('notes', '').strip()
    timeline_text = f"Incident officially closed and archived by Operator {request.user.get_full_name() or request.user.username}."
    if note:
        timeline_text += f" Closure Note: {note}"

    IncidentTimeline.objects.create(
        incident=incident,
        event=timeline_text,
        actor=request.user,
    )

    _broadcast_incident_update(incident)

    return Response(IncidentDetailSerializer(incident).data)


class AllReportsView(generics.ListAPIView):
    """
    GET /api/reports/all/
    List all emergency reports with response status and AI incident links.
    Accessible to security staff and operators.
    """
    serializer_class = ReportSerializer
    permission_classes = [IsSecurityOrOperator]

    def get_queryset(self):
        qs = Report.objects.select_related('incident', 'reporter', 'security_approved_by').all()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        incident_filter = self.request.query_params.get('incident')
        if incident_filter:
            qs = qs.filter(incident_id=incident_filter)
        return qs


@api_view(['POST'])
@permission_classes([IsSecurityOrOperator])
def security_approve_report(request, pk):
    """
    POST /api/reports/<pk>/security-approve/
    Security Guard inspects report response on the ground and signs off,
    authorizing that the report response can resolve.
    """
    report = get_object_or_404(Report, pk=pk)
    notes = request.data.get('notes', '').strip()
    mark_resolved = request.data.get('mark_resolved', True)
    response_notes = request.data.get('response_notes', '').strip()

    report.security_approved_by = request.user
    report.security_approved_at = timezone.now()
    report.security_approval_notes = notes
    report.can_resolve = True
    if response_notes:
        report.response_notes = response_notes

    if mark_resolved:
        report.status = Report.ReportStatus.SECURITY_APPROVED
    else:
        report.status = Report.ReportStatus.INVESTIGATING
    report.save()

    guard_name = request.user.get_full_name() or request.user.username

    # Audit log to incident timeline if attached
    if report.incident:
        timeline_msg = f"Security Guard {guard_name} approved report #{report.id} response. On-scene check confirmed safe to resolve."
        if notes:
            timeline_msg += f" Verification notes: {notes}"
        IncidentTimeline.objects.create(
            incident=report.incident,
            event=timeline_msg,
            actor=request.user,
        )
        _broadcast_incident_update(report.incident)

    return Response(ReportSerializer(report).data)


@api_view(['PATCH', 'POST'])
@permission_classes([IsSecurityOrOperator])
def update_report_status(request, pk):
    """
    PATCH / POST /api/reports/<pk>/status/
    Operator or Security updates report status (e.g. RESOLVED, INVESTIGATING, DISMISSED)
    with optional notes and timeline audit logging.
    """
    report = get_object_or_404(Report, pk=pk)
    new_status = request.data.get('status')
    notes = request.data.get('notes', '').strip()

    if new_status and new_status in Report.ReportStatus.values:
        report.status = new_status
        if new_status == Report.ReportStatus.RESOLVED:
            report.can_resolve = True

    if notes:
        report.response_notes = notes

    report.save()

    if report.incident:
        user_name = request.user.get_full_name() or request.user.username
        role_label = str(getattr(request.user, 'role', 'Operator')).title()
        timeline_msg = f"{role_label} {user_name} updated report #{report.id} status to '{report.get_status_display()}'."
        if notes:
            timeline_msg += f" Note: {notes}"
        IncidentTimeline.objects.create(
            incident=report.incident,
            event=timeline_msg,
            actor=request.user,
        )
        _broadcast_incident_update(report.incident)

    return Response(ReportSerializer(report).data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def incident_separation_tasks(request, pk):
    """
    GET: list separation tasks for incident
    POST: operator adds separation/containment task to incident
    """
    incident = get_object_or_404(Incident, pk=pk)
    if request.method == 'GET':
        tasks = incident.separation_tasks.all()
        return Response(IncidentSeparationTaskSerializer(tasks, many=True).data)

    if not request.user.is_operator:
        return Response(
            {'detail': 'Only Emergency Operators can create separation tasks.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    data = request.data.copy()
    data['incident'] = incident.id
    serializer = IncidentSeparationTaskSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    task = serializer.save(created_by=request.user)

    # Log to incident timeline
    operator_name = request.user.get_full_name() or request.user.username
    IncidentTimeline.objects.create(
        incident=incident,
        event=f"Operator {operator_name} deployed separation task: '{task.title}' [{task.get_category_display()}] targeting {task.target_location or incident.get_location_display()}.",
        actor=request.user,
    )
    _broadcast_incident_update(incident)

    return Response(IncidentSeparationTaskSerializer(task).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def separation_tasks_list(request):
    """
    GET /api/separation-tasks/
    List separation tasks across active incidents with filters.
    """
    qs = IncidentSeparationTask.objects.select_related('incident', 'created_by', 'completed_by').all()
    incident_id = request.query_params.get('incident')
    if incident_id:
        qs = qs.filter(incident_id=incident_id)
    task_status = request.query_params.get('status')
    if task_status:
        qs = qs.filter(status=task_status)
    active_only = request.query_params.get('active_only')
    if active_only in ['true', '1', True]:
        qs = qs.exclude(incident__status__in=[IncidentStatus.RESOLVED, IncidentStatus.CLOSED])
    return Response(IncidentSeparationTaskSerializer(qs, many=True).data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def separation_task_update_status(request, pk):
    """
    PATCH /api/separation-tasks/<pk>/status/
    Update status (PENDING, IN_PROGRESS, COMPLETED) and completion notes.
    """
    task = get_object_or_404(IncidentSeparationTask, pk=pk)
    new_status = request.data.get('status')
    notes = request.data.get('completion_notes', '').strip()

    if new_status in IncidentSeparationTask.TaskStatus.values:
        task.status = new_status
        if new_status == IncidentSeparationTask.TaskStatus.COMPLETED:
            task.completed_by = request.user
            task.completed_at = timezone.now()
        if notes:
            task.completion_notes = notes
        task.save()

        actor_name = request.user.get_full_name() or request.user.username
        timeline_text = f"Separation task '{task.title}' updated to {task.get_status_display()} by {actor_name}."
        if notes:
            timeline_text += f" Notes: {notes}"
        IncidentTimeline.objects.create(
            incident=task.incident,
            event=timeline_text,
            actor=request.user,
        )
        _broadcast_incident_update(task.incident)

    return Response(IncidentSeparationTaskSerializer(task).data)


