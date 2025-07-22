from django.utils.deprecation import MiddlewareMixin

class CORSMediaMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        if request.path.startswith('/media/'):
            response["Access-Control-Allow-Origin"] = "*"
        return response