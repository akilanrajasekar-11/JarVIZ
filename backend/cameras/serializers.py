from rest_framework import serializers
from .models import Camera, CCTVEvent


class CameraSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Camera
        fields = ['id', 'name', 'location_block', 'coverage_description', 'status', 'status_display']


class CCTVEventSerializer(serializers.ModelSerializer):
    camera_name = serializers.CharField(source='camera.name', read_only=True)
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)

    class Meta:
        model = CCTVEvent
        fields = [
            'id', 'camera', 'camera_name', 'event_type', 'event_type_display',
            'description', 'confidence_score', 'linked_incident',
            'timestamp', 'reviewed',
        ]


class CCTVEventCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CCTVEvent
        fields = ['camera', 'event_type', 'description', 'confidence_score', 'linked_incident']
