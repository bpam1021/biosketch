import requests
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser

@api_view(["POST"])
def magic_select(request):
    parser_classes = [MultiPartParser]

    image = request.FILES.get("image")
    if not image:
        return Response({"error": "No image uploaded"}, status=400)

    try:
        files = {"image": (image.name, image.read(), image.content_type)}
        r = requests.post("https://sam.biosketch.ai/magic-select/", files=files)
        r.raise_for_status()
        return Response(r.json())
    except requests.exceptions.RequestException as e:
        return Response({"error": str(e)}, status=500)
