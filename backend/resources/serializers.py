from rest_framework import serializers
from .models import Resource, ResourceAssignment


class ResourceSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_resource_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    active_assignment = serializers.SerializerMethodField()

    class Meta:
        model = Resource
        fields = [
            'id', 'name', 'resource_type', 'type_display',
            'capabilities', 'location', 'status', 'status_display',
            'contact', 'notes', 'active_assignment',
        ]

    def get_active_assignment(self, obj):
        active_statuses = [
            ResourceAssignment.AssignmentStatus.ASSIGNED,
            ResourceAssignment.AssignmentStatus.DISPATCHED,
            ResourceAssignment.AssignmentStatus.RESPONDING,
            ResourceAssignment.AssignmentStatus.ON_SCENE,
        ]
        assignment = obj.assignments.filter(status__in=active_statuses).select_related('incident').first()
        if assignment and assignment.incident:
            return {
                'assignment_id': assignment.id,
                'incident_id': assignment.incident.incident_id,
                'incident_pk': assignment.incident.id,
                'status': assignment.status,
                'status_display': assignment.get_status_display(),
            }
        return None


class AssignmentSerializer(serializers.ModelSerializer):
    resource = ResourceSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    assigned_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ResourceAssignment
        fields = [
            'id', 'resource', 'status', 'status_display',
            'assigned_by_name', 'assigned_at', 'updated_at',
            'revoked_at', 'revocation_reason',
            'completed_at', 'completion_report', 'casualties_treated', 'hazard_cleared',
            'notes',
        ]


    def get_assigned_by_name(self, obj):
        if obj.assigned_by:
            return obj.assigned_by.get_full_name() or obj.assigned_by.username
        return 'System Operator'


class AssignmentStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResourceAssignment
        fields = ['status', 'notes']

