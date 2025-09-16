from django.utils.deprecation import MiddlewareMixin
from django.conf import settings

class CORSMediaMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        # Only add CORS headers for media files if django-cors-headers hasn't already handled it
        if request.path.startswith('/media/'):
            # Check if CORS header already exists to avoid duplicates
            existing_header = response.get('Access-Control-Allow-Origin')
            if not existing_header:
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