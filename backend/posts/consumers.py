import json
from channels.generic.websocket import AsyncWebsocketConsumer


class FeedConsumer(AsyncWebsocketConsumer):
    GROUP = 'feed'

    async def connect(self):
        await self.channel_layer.group_add(self.GROUP, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.GROUP, self.channel_name)

    async def receive(self, text_data):
        # Clients don't push events; ignore incoming messages
        pass

    async def new_post(self, event):
        await self.send(text_data=json.dumps({
            'type': 'new_post',
            'post': event['data'],
        }))

    async def new_comment(self, event):
        await self.send(text_data=json.dumps({
            'type': 'new_comment',
            'comment': event['data'],
        }))

    async def post_liked(self, event):
        await self.send(text_data=json.dumps({
            'type': 'post_liked',
            **event['data'],
        }))
