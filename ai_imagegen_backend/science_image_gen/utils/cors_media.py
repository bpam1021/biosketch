from django.utils.deprecation import MiddlewareMixin
from django.conf import settings

class CORSMediaMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        # Only add CORS headers if django-cors-headers hasn't already handled it
        if request.path.startswith('/media/') and 'Access-Control-Allow-Origin' not in response:
            # Use the same origin policy as the main CORS configuration
            origin = request.META.get('HTTP_ORIGIN')
            if origin and self.is_origin_allowed(origin):
                response["Access-Control-Allow-Origin"] = origin
            elif getattr(settings, 'CORS_ALLOW_ALL_ORIGINS', False):
                response["Access-Control-Allow-Origin"] = "*"
        return response

    def is_origin_allowed(self, origin):
        """Check if origin is in allowed origins"""
        allowed_origins = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
        return origin in allowed_origins