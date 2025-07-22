from channels.generic.websocket import AsyncWebsocketConsumer
from .models import ChatMessage
from django.contrib.auth.models import AnonymousUser
from asgiref.sync import sync_to_async
from django.contrib.auth.models import User
import json

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f"chat_{self.room_name}"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        last_messages = await self.get_last_messages(self.room_name)
        for msg in last_messages:
            await self.send(text_data=json.dumps({
                'user_id': msg['user__id'],
                'username': msg['user__username'],
                'message': msg['message']
            }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        await self.close()

    async def receive(self, text_data):
        data = json.loads(text_data)
        user_id = data['user_id']
        user = await self.get_user(user_id)
        username = user.username
        message = data.get('message', '')
        media_url = data.get('media_url')

        # await self.save_message(self.room_name, user_id, message, media_url)

        if media_url:
            # Broadcast media message (don't save it here)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'user_id': user_id,
                    'username': user.username,
                    'media_url': media_url
                }
            )
        elif message:
            # Save text message
            await self.save_message(self.room_name, user_id, message)

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'user_id': user_id,
                    'username': user.username,
                    'message': message
                }
            )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'user_id': event['user_id'],
            'username': event['username'],
            'message': event.get('message'),
            'media_url': event.get('media_url'),
        }))

    @sync_to_async
    def save_message(self, room_name, user_id, message, media_url=None):
        user = User.objects.get(id=user_id)
        return ChatMessage.objects.create(
            room_name=room_name,
            user=user,
            message=message or '',
            media=media_url.replace('/media/', 'chat_media/') if media_url else None
        )

    @sync_to_async
    def get_last_messages(self, room_name, limit=50):
        return list(ChatMessage.objects
            .filter(room_name=room_name)
            .select_related('user')  # important to fetch user in the same query
            .order_by('-timestamp')[:limit]
            .values('user__id', 'user__username', 'message')  # return raw dicts
        )[::-1]

    
    @sync_to_async
    def get_user(self, user_id):
        return User.objects.get(id=user_id)
