from django.contrib import admin
from .models import Camera, CCTVEvent


@admin.register(Camera)
class CameraAdmin(admin.ModelAdmin):
    list_display = ['name', 'location_block', 'coverage_description', 'status']
    list_filter = ['location_block', 'status']


@admin.register(CCTVEvent)
class CCTVEventAdmin(admin.ModelAdmin):
    list_display = ['camera', 'event_type', 'confidence_score', 'linked_incident', 'reviewed', 'timestamp']
    list_filter = ['event_type', 'reviewed']
