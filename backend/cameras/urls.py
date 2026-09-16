from django.urls import path
from .views import cameras_for_incident, CameraListView, ingest_cctv_event, camera_events

urlpatterns = [
    path('cameras/', CameraListView.as_view(), name='camera-list'),
    path('cameras/events/', camera_events, name='camera-events'),
    path('cameras/events/create/', ingest_cctv_event, name='cctv-event-create'),
    path('incidents/<int:pk>/cameras/', cameras_for_incident, name='incident-cameras'),
]
