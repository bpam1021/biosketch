import os
from dotenv import load_dotenv

# ✅ Load the .env file BEFORE Django loads anything else
load_dotenv()

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'science_image_gen.settings')

import django
django.setup()

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from community.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            websocket_urlpatterns
        )
    ),
})
