"""
WebSocket URL routing for JarVIZ
"""
from django.urls import re_path
from incidents import consumers

websocket_urlpatterns = [
    re_path(r'^ws/incidents/$', consumers.IncidentConsumer.as_asgi()),
]
