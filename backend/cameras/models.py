"""
Cameras app — Camera model and CCTV event ingestion.
"""
from django.db import models
from incidents.models import CampusLocation


class CameraStatus(models.TextChoices):
    ONLINE = 'ONLINE', 'Online'
    OFFLINE = 'OFFLINE', 'Offline'
    MAINTENANCE = 'MAINTENANCE', 'Under Maintenance'


class Camera(models.Model):
    name = models.CharField(max_length=50, unique=True)   # e.g. CAM-01
    location_block = models.CharField(
        max_length=50, choices=CampusLocation.choices
    )
    coverage_description = models.CharField(max_length=200)  # e.g. Library Entrance
    status = models.CharField(
        max_length=15, choices=CameraStatus.choices, default=CameraStatus.ONLINE
    )
    rtsp_url = models.URLField(blank=True)  # real RTSP stream (optional)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.name} → {self.coverage_description}'


class CCTVEventType(models.TextChoices):
    SMOKE_FIRE = 'SMOKE_FIRE', 'Possible Smoke / Fire'
    CROWD_FORMATION = 'CROWD_FORMATION', 'Crowd Formation'
    RESTRICTED_ENTRY = 'RESTRICTED_ENTRY', 'Restricted Area Entry'
    FALL_COLLAPSE = 'FALL_COLLAPSE', 'Fall / Collapse Detection'
    UNUSUAL_MOVEMENT = 'UNUSUAL_MOVEMENT', 'Unusual Crowd Movement'
    OTHER = 'OTHER', 'Other'


class CCTVEvent(models.Model):
    camera = models.ForeignKey(Camera, on_delete=models.CASCADE, related_name='events')
    event_type = models.CharField(max_length=25, choices=CCTVEventType.choices)
    description = models.TextField(blank=True)
    confidence_score = models.FloatField(default=0.5)
    linked_incident = models.ForeignKey(
        'incidents.Incident',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='cctv_events',
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    reviewed = models.BooleanField(default=False)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f'{self.camera.name} — {self.get_event_type_display()} @ {self.timestamp:%H:%M}'
