"""
Incidents app models — Report, Incident, IncidentTimeline
"""
from django.db import models
from django.conf import settings


class IncidentType(models.TextChoices):
    FIRE_SMOKE = 'FIRE_SMOKE', 'Fire / Smoke'
    MEDICAL = 'MEDICAL', 'Medical Emergency'
    CHEMICAL = 'CHEMICAL', 'Chemical / Laboratory Hazard'
    SECURITY_THREAT = 'SECURITY_THREAT', 'Security Threat / Intrusion'
    ELECTRICAL = 'ELECTRICAL', 'Electrical / Infrastructure'
    VIOLENCE_CROWD = 'VIOLENCE_CROWD', 'Violence / Crowd Disturbance'
    UNKNOWN = 'UNKNOWN', 'Unknown'


class IncidentStatus(models.TextChoices):
    REPORTED = 'REPORTED', 'Reported'
    CLASSIFIED = 'CLASSIFIED', 'Classified'
    PRIORITIZED = 'PRIORITIZED', 'Prioritized'
    AWAITING_APPROVAL = 'AWAITING_APPROVAL', 'Awaiting Operator Approval'
    ASSIGNED = 'ASSIGNED', 'Assigned'
    DISPATCHED = 'DISPATCHED', 'Dispatched'
    RESPONDING = 'RESPONDING', 'Responding'
    ON_SCENE = 'ON_SCENE', 'On Scene'
    RESOLVED = 'RESOLVED', 'Resolved'
    CLOSED = 'CLOSED', 'Closed'


class PriorityLevel(models.TextChoices):
    P0 = 'P0', 'P0 — Critical (90–100)'
    P1 = 'P1', 'P1 — Serious (75–89)'
    P2 = 'P2', 'P2 — Significant (50–74)'
    P3 = 'P3', 'P3 — Lower Urgency (0–49)'


class CampusLocation(models.TextChoices):
    BLOCK_1 = 'BLOCK_1', 'Block 1 — Library / Academic'
    BLOCK_2 = 'BLOCK_2', 'Block 2 — Chemistry Labs'
    BLOCK_3 = 'BLOCK_3', 'Block 3 — Mechanical Workshop'
    BLOCK_4 = 'BLOCK_4', 'Block 4 — Computer Science'
    BLOCK_5 = 'BLOCK_5', 'Block 5 — Administration'
    HOSTEL_A = 'HOSTEL_A', 'Hostel A — Residential'
    HOSTEL_B = 'HOSTEL_B', 'Hostel B — Residential'
    MAIN_GATE = 'MAIN_GATE', 'Main Gate — Campus Entrance'
    CAFETERIA = 'CAFETERIA', 'Cafeteria — High Occupancy'
    AUDITORIUM = 'AUDITORIUM', 'Auditorium — Large Gathering'
    SPORTS_GROUND = 'SPORTS_GROUND', 'Sports Ground — Open Area'
    HEALTH_CENTRE = 'HEALTH_CENTRE', 'Health Centre — Medical Response'
    SECURITY_ROOM = 'SECURITY_ROOM', 'Security Room — Command Centre'
    SUBSTATION = 'SUBSTATION', 'Electrical Substation — Infrastructure'
    OTHER = 'OTHER', 'Other'


class Incident(models.Model):
    """
    Core incident record. Created when a report is submitted and enriched
    by the AI engine and risk engine.
    """
    incident_id = models.CharField(max_length=20, unique=True, editable=False)
    incident_type = models.CharField(
        max_length=30, choices=IncidentType.choices, default=IncidentType.UNKNOWN
    )
    location = models.CharField(
        max_length=50, choices=CampusLocation.choices, default=CampusLocation.OTHER
    )
    location_detail = models.CharField(max_length=255, blank=True)
    status = models.CharField(
        max_length=20, choices=IncidentStatus.choices, default=IncidentStatus.REPORTED
    )

    # AI-extracted fields
    people_exposed = models.IntegerField(default=0)
    spread_potential = models.CharField(max_length=20, blank=True)
    severity_factors = models.JSONField(default=list)
    required_capabilities = models.JSONField(default=list)
    ai_summary = models.TextField(blank=True)
    confidence = models.FloatField(default=0.0)

    # Risk engine output
    risk_score = models.FloatField(default=0.0)
    priority = models.CharField(
        max_length=5, choices=PriorityLevel.choices, default=PriorityLevel.P3
    )
    risk_breakdown = models.JSONField(default=dict)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-risk_score', '-created_at']

    def save(self, *args, **kwargs):
        if not self.incident_id:
            last = Incident.objects.order_by('-id').first()
            next_num = (last.id + 1) if last else 1
            self.incident_id = f'INC-{next_num:03d}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.incident_id} — {self.get_incident_type_display()} [{self.status}]'


class Report(models.Model):
    """
    Raw emergency report submitted by a user or security staff.
    One incident can have multiple reports (re-reports, updates).
    """
    class ReportSource(models.TextChoices):
        STUDENT = 'STUDENT', 'Student'
        FACULTY = 'FACULTY', 'Faculty'
        SECURITY = 'SECURITY', 'Security Staff'
        CCTV = 'CCTV', 'CCTV System'
        OPERATOR = 'OPERATOR', 'Operator'

    class ReportStatus(models.TextChoices):
        PENDING_REVIEW = 'PENDING_REVIEW', 'Pending Security Review'
        INVESTIGATING = 'INVESTIGATING', 'Under Security Check'
        SECURITY_APPROVED = 'SECURITY_APPROVED', 'Approved by Security'
        RESOLVED = 'RESOLVED', 'Resolved'
        DISMISSED = 'DISMISSED', 'Dismissed'

    incident = models.ForeignKey(
        Incident, on_delete=models.CASCADE, related_name='reports', null=True, blank=True
    )
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reports',
    )
    source = models.CharField(max_length=20, choices=ReportSource.choices)
    description = models.TextField()
    location = models.CharField(
        max_length=50, choices=CampusLocation.choices, default=CampusLocation.OTHER
    )
    location_detail = models.CharField(max_length=255, blank=True)
    evidence = models.ImageField(upload_to='evidence/', null=True, blank=True)
    additional_info = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Security Guard Review & Resolution Approval
    status = models.CharField(
        max_length=25, choices=ReportStatus.choices, default=ReportStatus.PENDING_REVIEW
    )
    response_notes = models.TextField(blank=True)
    security_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_reports',
    )
    security_approved_at = models.DateTimeField(null=True, blank=True)
    security_approval_notes = models.TextField(blank=True)
    can_resolve = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Report by {self.source} @ {self.created_at:%Y-%m-%d %H:%M} [{self.status}]'


class IncidentTimeline(models.Model):
    """
    Auditable event log — every status transition and significant action is recorded.
    """
    incident = models.ForeignKey(
        Incident, on_delete=models.CASCADE, related_name='timeline'
    )
    event = models.TextField()
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='timeline_events',
    )
    actor_label = models.CharField(max_length=100, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f'{self.incident.incident_id} — {self.event[:60]}'


class IncidentSeparationTask(models.Model):
    """
    Operational separation and perimeter containment task assigned during active incidents.
    Enables operators to isolate sectors, establish cordons, lock down access points,
    and separate non-affected campus zones.
    """
    class TaskPriority(models.TextChoices):
        URGENT = 'URGENT', 'Urgent / Immediate'
        HIGH = 'HIGH', 'High Priority'
        MEDIUM = 'MEDIUM', 'Medium Priority'
        LOW = 'LOW', 'Low Priority'

    class TaskStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending Execution'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        COMPLETED = 'COMPLETED', 'Completed'

    class SeparationCategory(models.TextChoices):
        PERIMETER_CORDON = 'PERIMETER_CORDON', 'Perimeter Cordon & Boundary Separation'
        SECTOR_ISOLATION = 'SECTOR_ISOLATION', 'Sector & Zone Isolation'
        ACCESS_LOCKDOWN = 'ACCESS_LOCKDOWN', 'Access Point Lockdown'
        CROWD_DIVERSION = 'CROWD_DIVERSION', 'Crowd & Traffic Diversion'
        HVAC_VENTILATION = 'HVAC_VENTILATION', 'HVAC & Ventilation Shutoff'
        UTILITY_ISOLATION = 'UTILITY_ISOLATION', 'Utility / Power / Gas Cutoff'
        EVACUATION_CLEARANCE = 'EVACUATION_CLEARANCE', 'Evacuation Clearance & Separation'

    incident = models.ForeignKey(
        Incident, on_delete=models.CASCADE, related_name='separation_tasks'
    )
    title = models.CharField(max_length=200)
    category = models.CharField(
        max_length=35,
        choices=SeparationCategory.choices,
        default=SeparationCategory.PERIMETER_CORDON,
    )
    description = models.TextField(blank=True)
    target_location = models.CharField(max_length=150, blank=True)
    assigned_role = models.CharField(max_length=50, blank=True)
    priority = models.CharField(
        max_length=15,
        choices=TaskPriority.choices,
        default=TaskPriority.HIGH,
    )
    status = models.CharField(
        max_length=20,
        choices=TaskStatus.choices,
        default=TaskStatus.PENDING,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_separation_tasks',
    )
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='completed_separation_tasks',
    )
    completion_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'[{self.incident.incident_id}] {self.title} ({self.status})'

