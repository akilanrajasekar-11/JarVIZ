from rest_framework import serializers
from .models import Resource, ResourceAssignment


class ResourceSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_resource_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Resource
        fields = [
            'id', 'name', 'resource_type', 'type_display',
            'capabilities', 'location', 'status', 'status_display',
            'contact', 'notes',
        ]


class AssignmentSerializer(serializers.ModelSerializer):
    resource = ResourceSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = ResourceAssignment
        fields = [
            'id', 'resource', 'status', 'status_display',
            'assigned_at', 'updated_at', 'notes',
        ]


class AssignmentStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResourceAssignment
        fields = ['status', 'notes']
