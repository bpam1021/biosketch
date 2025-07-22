from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser
from django.http import JsonResponse
from community.models import ChatMessage

@api_view(['GET'])
def chat_history(request, room_name):
    messages = ChatMessage.objects.filter(room_name=room_name).order_by('-timestamp')[:50]
    return JsonResponse([
        {
            'user_id': msg.user.id,
            'username': msg.user.username,
            'message': msg.message,
            'media_url': msg.media.url if msg.media else None,
            'timestamp': msg.timestamp.isoformat()
        }
        for msg in reversed(messages)
    ], safe=False)


@api_view(['POST'])
@parser_classes([MultiPartParser])
@permission_classes([IsAuthenticated])
def upload_chat_media(request, room_name):
    file = request.FILES.get("file")
    if file and room_name:
        message = ChatMessage.objects.create(user=request.user, media=file, room_name=room_name)
        return Response({
            "media_url": message.media.url,
            "user_id": request.user.id,
            "username": request.user.username,
            "timestamp": message.timestamp.isoformat(),
        })
    return Response({"error": "Missing file or room_name"}, status=400)
