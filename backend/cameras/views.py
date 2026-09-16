from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, generics
from django.shortcuts import get_object_or_404

from incidents.models import Incident
from .models import Camera, CCTVEvent
from .serializers import CameraSerializer, CCTVEventSerializer, CCTVEventCreateSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def cameras_for_incident(request, pk):
    """
    GET /api/incidents/{id}/cameras/
    Returns cameras covering the incident location.
    """
    incident = get_object_or_404(Incident, pk=pk)
    cameras = Camera.objects.filter(location_block=incident.location)
    serializer = CameraSerializer(cameras, many=True)
    return Response(serializer.data)


class CameraListView(generics.ListAPIView):
    """GET /api/cameras/ — list all cameras."""
    queryset = Camera.objects.all()
    serializer_class = CameraSerializer
    permission_classes = [IsAuthenticated]


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ingest_cctv_event(request):
    """
    POST /api/cameras/events/
    Ingest a simulated CCTV detection event.
    """
    serializer = CCTVEventCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    event = serializer.save()

    # If linked to an incident, add a timeline entry
    if event.linked_incident:
        from incidents.models import IncidentTimeline
        IncidentTimeline.objects.create(
            incident=event.linked_incident,
            event=f'CCTV Event: {event.camera.name} detected {event.get_event_type_display()} — {event.description[:100]}',
            actor_label=f'CCTV / {event.camera.name}',
        )

    return Response(CCTVEventSerializer(event).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def camera_events(request):
    """GET /api/cameras/events/ — list recent CCTV events."""
    events = CCTVEvent.objects.select_related('camera').order_by('-timestamp')[:50]
    serializer = CCTVEventSerializer(events, many=True)
    return Response(serializer.data)
