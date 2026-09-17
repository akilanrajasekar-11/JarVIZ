from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, generics
from django.shortcuts import get_object_or_404
from django.utils import timezone

from incidents.models import Incident, IncidentStatus, IncidentTimeline
from .models import Resource, ResourceStatus, ResourceAssignment
from .serializers import ResourceSerializer, AssignmentSerializer, AssignmentStatusUpdateSerializer
from .matcher import match_resources


class ResourceListView(generics.ListAPIView):
    """GET /api/resources/ — all resources and their status."""
    queryset = Resource.objects.all()
    serializer_class = ResourceSerializer
    permission_classes = [IsAuthenticated]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def incident_recommendation(request, pk):
    """
    GET /api/incidents/{id}/recommendation/
    Returns capability-matched resource recommendation + alternatives.
    """
    incident = get_object_or_404(Incident, pk=pk)
    result = match_resources(incident)

    return Response({
        'required_capabilities': result['required_capabilities'],
        'recommendation': ResourceSerializer(result['recommendation']).data if result['recommendation'] else None,
        'alternatives': ResourceSerializer(result['alternatives'], many=True).data,
        'eligible_count': len(result['all_eligible']),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_resource_to_incident(request, pk):
    """
    POST /api/incidents/{id}/assign/
    Assign one or more resources to an incident dynamically.
    Body:
      { "resource_id": 1, "notes": "Optional dispatch notes" }
      or { "resource_ids": [1, 2], "notes": "Optional notes" }
    """
    incident = get_object_or_404(Incident, pk=pk)

    resource_ids = request.data.get('resource_ids')
    if not resource_ids:
        single_id = request.data.get('resource_id')
        resource_ids = [single_id] if single_id is not None else []

    if not resource_ids:
        return Response(
            {'detail': 'Please provide resource_id or resource_ids.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    notes = request.data.get('notes', '').strip()
    active_statuses = [
        ResourceAssignment.AssignmentStatus.ASSIGNED,
        ResourceAssignment.AssignmentStatus.DISPATCHED,
        ResourceAssignment.AssignmentStatus.RESPONDING,
        ResourceAssignment.AssignmentStatus.ON_SCENE,
    ]

    assigned_resources = []
    for rid in resource_ids:
        try:
            resource = Resource.objects.get(pk=rid)
        except Resource.DoesNotExist:
            continue

        # Check if already actively assigned to this incident
        already_active = ResourceAssignment.objects.filter(
            incident=incident,
            resource=resource,
            status__in=active_statuses,
        ).exists()

        if already_active:
            continue

        ResourceAssignment.objects.create(
            incident=incident,
            resource=resource,
            assigned_by=request.user,
            status=ResourceAssignment.AssignmentStatus.ASSIGNED,
            notes=notes,
        )
        resource.status = ResourceStatus.BUSY
        resource.save(update_fields=['status'])
        assigned_resources.append(resource)

    if not assigned_resources:
        return Response(
            {'detail': 'Selected unit(s) are already actively assigned to this incident or do not exist.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # If incident was awaiting approval, advance to assigned
    if incident.status == IncidentStatus.AWAITING_APPROVAL:
        incident.status = IncidentStatus.ASSIGNED
        incident.save(update_fields=['status', 'updated_at'])

    unit_names = ', '.join([r.name for r in assigned_resources])
    timeline_event = f'Operator dispatched {unit_names}.'
    if notes:
        timeline_event += f' Notes: {notes}'

    IncidentTimeline.objects.create(
        incident=incident,
        event=timeline_event,
        actor=request.user,
    )

    _broadcast_incident_update(incident)

    from incidents.serializers import IncidentDetailSerializer
    return Response(IncidentDetailSerializer(incident).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def revoke_assignment(request, pk):
    """
    POST /api/assignments/{id}/revoke/
    Revoke/recall an assigned response unit.
    Body:
      { "reason": "Optional or mandatory reason" }
    """
    assignment = get_object_or_404(ResourceAssignment, pk=pk)

    active_statuses = [
        ResourceAssignment.AssignmentStatus.ASSIGNED,
        ResourceAssignment.AssignmentStatus.DISPATCHED,
        ResourceAssignment.AssignmentStatus.RESPONDING,
        ResourceAssignment.AssignmentStatus.ON_SCENE,
    ]

    if assignment.status not in active_statuses:
        return Response(
            {'detail': f"Cannot revoke assignment with status '{assignment.get_status_display()}'."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    reason = request.data.get('reason', '').strip()

    assignment.status = ResourceAssignment.AssignmentStatus.REVOKED
    assignment.revoked_at = timezone.now()
    assignment.revocation_reason = reason
    assignment.save(update_fields=['status', 'revoked_at', 'revocation_reason', 'updated_at'])

    # Free the resource if it has no other active assignments
    resource = assignment.resource
    other_active = ResourceAssignment.objects.filter(
        resource=resource,
        status__in=active_statuses,
    ).exclude(pk=assignment.pk).exists()

    if not other_active:
        resource.status = ResourceStatus.AVAILABLE
        resource.save(update_fields=['status'])

    incident = assignment.incident
    event_msg = f'Assignment revoked for {resource.name}.'
    if reason:
        event_msg += f' Reason: {reason}'

    IncidentTimeline.objects.create(
        incident=incident,
        event=event_msg,
        actor=request.user,
    )

    # Check if incident still has any active units
    remaining_active = incident.assignments.filter(status__in=active_statuses).exists()
    if not remaining_active and incident.status in [IncidentStatus.ASSIGNED, IncidentStatus.DISPATCHED]:
        incident.status = IncidentStatus.AWAITING_APPROVAL
        incident.save(update_fields=['status', 'updated_at'])
        IncidentTimeline.objects.create(
            incident=incident,
            event='All active units were revoked. Incident reverted to Awaiting Approval.',
            actor=request.user,
        )

    _broadcast_incident_update(incident)

    from incidents.serializers import IncidentDetailSerializer
    return Response(IncidentDetailSerializer(incident).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_assignment(request, pk):
    """
    POST /api/assignments/{id}/complete/
    Response team finishes rescue mission and files completion acknowledgment report.
    Body:
      {
        "completion_report": "Actions taken, victim status, hazard neutralized...",
        "casualties_treated": 2,
        "hazard_cleared": true,
        "notes": "Optional notes"
      }
    """
    assignment = get_object_or_404(ResourceAssignment, pk=pk)

    active_statuses = [
        ResourceAssignment.AssignmentStatus.ASSIGNED,
        ResourceAssignment.AssignmentStatus.DISPATCHED,
        ResourceAssignment.AssignmentStatus.RESPONDING,
        ResourceAssignment.AssignmentStatus.ON_SCENE,
    ]

    if assignment.status not in active_statuses:
        return Response(
            {'detail': f"Assignment is already {assignment.get_status_display()}."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    completion_report = request.data.get('completion_report', '').strip()
    if not completion_report:
        return Response(
            {'detail': 'A debrief / completion report acknowledgment is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    assignment.status = ResourceAssignment.AssignmentStatus.COMPLETED
    assignment.completed_at = timezone.now()
    assignment.completion_report = completion_report
    assignment.casualties_treated = int(request.data.get('casualties_treated', 0) or 0)
    assignment.hazard_cleared = bool(request.data.get('hazard_cleared', False))
    if 'notes' in request.data:
        assignment.notes = request.data.get('notes', '').strip()

    assignment.save(update_fields=[
        'status', 'completed_at', 'completion_report',
        'casualties_treated', 'hazard_cleared', 'notes', 'updated_at',
    ])

    # Free the resource if it has no other active assignments
    resource = assignment.resource
    other_active = ResourceAssignment.objects.filter(
        resource=resource,
        status__in=active_statuses,
    ).exclude(pk=assignment.pk).exists()

    if not other_active:
        resource.status = ResourceStatus.AVAILABLE
        resource.save(update_fields=['status'])

    # Log timeline event
    incident = assignment.incident
    timeline_event = f"{resource.name} completed rescue operations & acknowledged mission report."
    if assignment.completion_report:
        timeline_event += f" Debrief: {assignment.completion_report}"
    if assignment.casualties_treated:
        timeline_event += f" (Assisted: {assignment.casualties_treated} persons)"
    if assignment.hazard_cleared:
        timeline_event += " [Hazard Cleared & Secured]"

    IncidentTimeline.objects.create(
        incident=incident,
        event=timeline_event,
        actor=request.user,
        actor_label=resource.name,
    )

    # Check if all appointed response teams have completed
    remaining_active = incident.assignments.filter(status__in=active_statuses).exists()
    if not remaining_active:
        incident.status = IncidentStatus.RESOLVED
        incident.resolved_at = timezone.now()
        incident.save(update_fields=['status', 'resolved_at', 'updated_at'])
        IncidentTimeline.objects.create(
            incident=incident,
            event="All appointed units have finished rescue operations and filed reports. Incident marked RESOLVED.",
            actor=request.user,
        )

    _broadcast_incident_update(incident)

    from incidents.serializers import IncidentDetailSerializer
    return Response({
        'assignment': AssignmentSerializer(assignment).data,
        'incident': IncidentDetailSerializer(incident).data,
    })


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_assignment_status(request, pk):

    """
    PATCH /api/assignments/{id}/status/
    Response team updates their assignment operational status.
    """
    assignment = get_object_or_404(ResourceAssignment, pk=pk)
    serializer = AssignmentStatusUpdateSerializer(assignment, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    assignment = serializer.save()

    # Sync incident status from assignment status
    _sync_incident_status(assignment)

    # If completed, free up the resource if no other active assignments
    if assignment.status == ResourceAssignment.AssignmentStatus.COMPLETED:
        active_statuses = [
            ResourceAssignment.AssignmentStatus.ASSIGNED,
            ResourceAssignment.AssignmentStatus.DISPATCHED,
            ResourceAssignment.AssignmentStatus.RESPONDING,
            ResourceAssignment.AssignmentStatus.ON_SCENE,
        ]
        other_active = ResourceAssignment.objects.filter(
            resource=assignment.resource,
            status__in=active_statuses,
        ).exclude(pk=assignment.pk).exists()
        if not other_active:
            assignment.resource.status = ResourceStatus.AVAILABLE
            assignment.resource.save(update_fields=['status'])

    return Response(AssignmentSerializer(assignment).data)


def _sync_incident_status(assignment: ResourceAssignment):
    """Mirror assignment status progression to incident status."""
    incident = assignment.incident
    mapping = {
        'DISPATCHED': IncidentStatus.DISPATCHED,
        'RESPONDING': IncidentStatus.RESPONDING,
        'ON_SCENE': IncidentStatus.ON_SCENE,
        'COMPLETED': IncidentStatus.RESOLVED,
    }
    new_status = mapping.get(assignment.status)
    if new_status and incident.status != new_status:
        incident.status = new_status
        incident.save(update_fields=['status', 'updated_at'])
        IncidentTimeline.objects.create(
            incident=incident,
            event=f'{assignment.resource.name} updated status to {assignment.get_status_display()}.',
            actor_label=assignment.resource.name,
        )


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

