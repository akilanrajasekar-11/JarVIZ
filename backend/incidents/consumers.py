"""
WebSocket consumer — broadcasts real-time incident updates to all connected operators.
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer


class IncidentConsumer(AsyncWebsocketConsumer):
    GROUP_NAME = 'incidents'

    async def connect(self):
        await self.channel_layer.group_add(self.GROUP_NAME, self.channel_name)
        await self.accept()
        await self.send(text_data=json.dumps({'type': 'connected', 'message': 'JarVIZ live feed connected'}))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.GROUP_NAME, self.channel_name)

    async def receive(self, text_data):
        # Clients can send ping; echo back
        data = json.loads(text_data)
        if data.get('type') == 'ping':
            await self.send(text_data=json.dumps({'type': 'pong'}))

    async def incident_update(self, event):
        """Handler called by channel_layer.group_send with type='incident_update'."""
        await self.send(text_data=json.dumps({
            'type': 'incident_update',
            'incident': event['incident'],
        }))
