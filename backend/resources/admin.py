from django.contrib import admin
from .models import Resource, ResourceAssignment


@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ['name', 'resource_type', 'location', 'status']
    list_filter = ['resource_type', 'status', 'location']


@admin.register(ResourceAssignment)
class ResourceAssignmentAdmin(admin.ModelAdmin):
    list_display = ['resource', 'incident', 'status', 'assigned_at']
    list_filter = ['status']
