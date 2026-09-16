from rest_framework import serializers
from .models import Incident, Report, IncidentTimeline


class IncidentTimelineSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = IncidentTimeline
        fields = ['id', 'event', 'actor_name', 'actor_label', 'timestamp']

    def get_actor_name(self, obj):
        if obj.actor:
            return obj.actor.get_full_name() or obj.actor.username
        return obj.actor_label or 'System'


class IncidentSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    incident_type_display = serializers.CharField(source='get_incident_type_display', read_only=True)
    location_display = serializers.CharField(source='get_location_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)

    class Meta:
        model = Incident
        fields = [
            'id', 'incident_id', 'incident_type', 'incident_type_display',
            'location', 'location_display', 'location_detail',
            'status', 'status_display', 'priority', 'priority_display',
            'risk_score', 'risk_breakdown', 'confidence',
            'people_exposed', 'spread_potential', 'severity_factors',
            'required_capabilities', 'ai_summary',
            'created_at', 'updated_at', 'resolved_at',
        ]
        read_only_fields = fields


class IncidentDetailSerializer(IncidentSerializer):
    timeline = IncidentTimelineSerializer(many=True, read_only=True)

    class Meta(IncidentSerializer.Meta):
        fields = IncidentSerializer.Meta.fields + ['timeline']


class ReportCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = [
            'description', 'location', 'location_detail',
            'source', 'evidence', 'additional_info',
        ]

    def create(self, validated_data):
        # Reporter is set from request.user in the view
        return super().create(validated_data)


class ReportSerializer(serializers.ModelSerializer):
    incident_id = serializers.CharField(source='incident.incident_id', read_only=True)
    reporter_name = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = [
            'id', 'incident_id', 'reporter_name', 'source',
            'description', 'location', 'location_detail',
            'evidence', 'additional_info', 'created_at',
        ]

    def get_reporter_name(self, obj):
        if obj.reporter:
            return obj.reporter.get_full_name() or obj.reporter.username
        return 'Anonymous'
