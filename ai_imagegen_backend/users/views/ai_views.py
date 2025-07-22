from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from openai import OpenAI
import base64

@api_view(["POST"])
@parser_classes([MultiPartParser])
def edit_image_openai(request):
    prompt = request.POST.get("prompt")
    image_file = request.FILES.get("image")

    if not prompt or not image_file:
        return Response({"error": "Missing prompt or image"}, status=400)

    from openai import OpenAI
    client = OpenAI()

    file_tuple = (
        image_file.name,
        image_file.read(),  # ✅ read raw bytes
        image_file.content_type or "image/png",  # fallback just in case
    )
    try:
        result = client.images.edit(
            model="gpt-image-1",
            image=file_tuple,
            prompt=f"Remove background, {prompt}",
        )
    except openai.OpenAIError as e:
        return Response({"error": str(e)}, status=400)

    image_base64 = result.data[0].b64_json
    return Response({"image_base64": image_base64})
