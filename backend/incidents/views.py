"""
Incident views — Report intake, incident lifecycle, operator approval.
"""
import threading
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import Incident, Report, IncidentTimeline, IncidentStatus
from .serializers import (
    IncidentSerializer,
    IncidentDetailSerializer,
    ReportCreateSerializer,
    ReportSerializer,
    IncidentTimelineSerializer,
)
from .permissions import IsOperator, IsOperatorOrTeam


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
