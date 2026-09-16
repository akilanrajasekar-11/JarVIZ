from django.contrib import admin
from .models import Incident, Report, IncidentTimeline


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = ['incident_id', 'incident_type', 'location', 'status', 'priority', 'risk_score', 'created_at']
    list_filter = ['status', 'priority', 'incident_type']
    ordering = ['-risk_score', '-created_at']


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ['id', 'source', 'location', 'incident', 'created_at']
    list_filter = ['source', 'location']


@admin.register(IncidentTimeline)
class IncidentTimelineAdmin(admin.ModelAdmin):
    list_display = ['incident', 'event', 'actor', 'timestamp']
    list_filter = ['incident']
