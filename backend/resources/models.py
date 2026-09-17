"""
Resources app — Response team models and assignments.
"""
from django.db import models
from django.conf import settings
from incidents.models import CampusLocation


class ResourceType(models.TextChoices):
    MEDICAL = 'MEDICAL', 'Medical Team'
    FIRE = 'FIRE', 'Fire Response Team'
    HAZMAT = 'HAZMAT', 'Hazmat / EHS Team'
    SECURITY = 'SECURITY', 'Security Response Team'
    FACILITIES = 'FACILITIES', 'Facilities / Maintenance Team'


class ResourceStatus(models.TextChoices):
    AVAILABLE = 'AVAILABLE', 'Available'
    BUSY = 'BUSY', 'On Assignment'
    OFFLINE = 'OFFLINE', 'Offline / Unavailable'


class Resource(models.Model):
    name = models.CharField(max_length=100)
    resource_type = models.CharField(max_length=20, choices=ResourceType.choices)
    capabilities = models.JSONField(default=list)
    location = models.CharField(
        max_length=50, choices=CampusLocation.choices, default=CampusLocation.SECURITY_ROOM
    )
    status = models.CharField(
        max_length=15, choices=ResourceStatus.choices, default=ResourceStatus.AVAILABLE
    )
    contact = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['resource_type', 'name']

    def __str__(self):
        return f'{self.name} ({self.get_resource_type_display()}) — {self.status}'


class ResourceAssignment(models.Model):
    incident = models.ForeignKey(
        'incidents.Incident',
        on_delete=models.CASCADE,
        related_name='assignments',
    )
    resource = models.ForeignKey(
        Resource,
        on_delete=models.CASCADE,
        related_name='assignments',
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    class AssignmentStatus(models.TextChoices):
        ASSIGNED = 'ASSIGNED', 'Assigned'
        DISPATCHED = 'DISPATCHED', 'Dispatched'
        RESPONDING = 'RESPONDING', 'Responding'
        ON_SCENE = 'ON_SCENE', 'On Scene'
        COMPLETED = 'COMPLETED', 'Completed'
        REVOKED = 'REVOKED', 'Revoked'

    status = models.CharField(
        max_length=15,
        choices=AssignmentStatus.choices,
        default=AssignmentStatus.ASSIGNED,
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revocation_reason = models.TextField(blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    completion_report = models.TextField(blank=True)
    casualties_treated = models.PositiveIntegerField(default=0)
    hazard_cleared = models.BooleanField(default=False)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-assigned_at']

    def __str__(self):
        return f'{self.resource.name} → {self.incident.incident_id} [{self.status}]'


