from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, generics
from django.shortcuts import get_object_or_404

from incidents.models import Incident
from .models import Resource, ResourceAssignment
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

    return Response(AssignmentSerializer(assignment).data)


def _sync_incident_status(assignment: ResourceAssignment):
    """Mirror assignment status progression to incident status."""
    from incidents.models import IncidentStatus, IncidentTimeline
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
