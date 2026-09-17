from rest_framework import serializers
from .models import Incident, Report, IncidentTimeline, IncidentSeparationTask


class IncidentTimelineSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = IncidentTimeline
        fields = ['id', 'event', 'actor_name', 'actor_label', 'timestamp']

    def get_actor_name(self, obj):
        if obj.actor:
            return obj.actor.get_full_name() or obj.actor.username
        return obj.actor_label or 'System'


class IncidentSeparationTaskSerializer(serializers.ModelSerializer):
    incident_id_str = serializers.CharField(source='incident.incident_id', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    completed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = IncidentSeparationTask
        fields = [
            'id',
            'incident',
            'incident_id_str',
            'title',
            'category',
            'category_display',
            'description',
            'target_location',
            'assigned_role',
            'priority',
            'priority_display',
            'status',
            'status_display',
            'created_by',
            'created_by_name',
            'completed_by',
            'completed_by_name',
            'completion_notes',
            'created_at',
            'completed_at',
        ]
        read_only_fields = [
            'id', 'incident_id_str', 'category_display', 'priority_display',
            'status_display', 'created_by_name', 'completed_by_name', 'created_at', 'completed_at'
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return 'System / Operator'

    def get_completed_by_name(self, obj):
        if obj.completed_by:
            return obj.completed_by.get_full_name() or obj.completed_by.username
        return None


class IncidentSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    incident_type_display = serializers.CharField(source='get_incident_type_display', read_only=True)
    location_display = serializers.CharField(source='get_location_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    assignments = serializers.SerializerMethodField()
    separation_tasks = IncidentSeparationTaskSerializer(many=True, read_only=True)

    class Meta:
        model = Incident
        fields = [
            'id', 'incident_id', 'incident_type', 'incident_type_display',
            'location', 'location_display', 'location_detail',
            'status', 'status_display', 'priority', 'priority_display',
            'risk_score', 'risk_breakdown', 'confidence',
            'people_exposed', 'spread_potential', 'severity_factors',
            'required_capabilities', 'ai_summary',
            'assignments', 'separation_tasks',
            'created_at', 'updated_at', 'resolved_at',
        ]
        read_only_fields = fields

    def get_assignments(self, obj):
        from resources.serializers import AssignmentSerializer
        return AssignmentSerializer(obj.assignments.all().select_related('resource', 'assigned_by'), many=True).data


class ReportSerializer(serializers.ModelSerializer):
    incident_id = serializers.CharField(source='incident.incident_id', read_only=True)
    incident_pk = serializers.IntegerField(source='incident.id', read_only=True)
    reporter_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    location_display = serializers.CharField(source='get_location_display', read_only=True)
    security_approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = [
            'id', 'incident_id', 'incident_pk', 'reporter_name', 'source',
            'description', 'location', 'location_display', 'location_detail',
            'evidence', 'additional_info', 'created_at',
            'status', 'status_display', 'response_notes',
            'security_approved_by', 'security_approved_by_name',
            'security_approved_at', 'security_approval_notes',
            'can_resolve',
        ]
        read_only_fields = [
            'id', 'incident_id', 'incident_pk', 'reporter_name', 'status_display',
            'location_display', 'security_approved_by_name', 'created_at'
        ]

    def get_reporter_name(self, obj):
        if obj.reporter:
            return obj.reporter.get_full_name() or obj.reporter.username
        return 'Anonymous'

    def get_security_approved_by_name(self, obj):
        if obj.security_approved_by:
            return obj.security_approved_by.get_full_name() or obj.security_approved_by.username
        return None


class IncidentDetailSerializer(IncidentSerializer):
    timeline = IncidentTimelineSerializer(many=True, read_only=True)
    reports = ReportSerializer(many=True, read_only=True)

    class Meta(IncidentSerializer.Meta):
        fields = IncidentSerializer.Meta.fields + ['timeline', 'reports']


class ReportCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = [
            'description', 'location', 'location_detail',
            'source', 'evidence', 'additional_info',
        ]

    def create(self, validated_data):
        return super().create(validated_data)
