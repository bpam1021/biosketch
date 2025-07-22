from openai import OpenAI
import os
import json
from PIL import Image
from io import BytesIO
import hashlib
import base64
import uuid
from django.conf import settings

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def decompose_prompt(prompt: str):
    """
    Breaks a topic into 4–6 slides using GPT-4.
    Each slide includes title, description, and image prompt.
    """
    system_message = (
        "You are an assistant that transforms topics into presentations.\n"
        "Given a topic, return 4–6 slides as JSON:\n"
        "[\n"
        "  {\"title\": ..., \"description\": ..., \"image_prompt\": ...},\n"
        "  ...\n"
        "]\n"
        "Each description should be 2–3 sentences.\n"
        "Make image_prompt clear enough for an AI image generator like DALL·E or GPT-4 image."
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4",
            temperature=0.7,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": f"Topic: {prompt}"},
            ]
        )

        content = response.choices[0].message.content
        return json.loads(content)

    except Exception as e:
        print("[GPT Error]", e)
        raise


def generate_image(prompt: str, request) -> str:
    """
    Generates an image using OpenAI's gpt-image-1 model and returns the saved file URL.
    """
    try:
        response = client.images.generate(
            model="gpt-image-1",
            prompt=prompt,
            n=1,
            size="1536x1024",
            quality="high",
        )
        b64_data = response.data[0].b64_json
        if not b64_data:
            raise ValueError("Empty image data from gpt-image-1")

        image = Image.open(BytesIO(base64.b64decode(b64_data)))
        hashed = hashlib.md5(prompt.encode()).hexdigest()[:10]
        filename = f"slide_{hashed}_{uuid.uuid4().hex[:6]}.png"
        path = os.path.join(settings.MEDIA_ROOT, "generated_slides", filename)
        image.save(path)

        return f"{request.scheme}://{request.get_host()}{settings.MEDIA_URL}generated_slides/{filename}"
    except Exception as e:
        print("[Image Generation Error]", e)
        return ""

def regenerate_slide_content(image_prompt: str):
    """
    Regenerates slide title and description from an image prompt using GPT-4.
    """
    system_message = (
        "Given an AI image prompt, generate a suitable slide title and a 2–3 sentence description.\n"
        "Respond as JSON: {\"title\": ..., \"description\": ...}"
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4",
            temperature=0.7,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": f"Prompt: {image_prompt}"},
            ]
        )

        content = response.choices[0].message.content
        return json.loads(content)

    except Exception as e:
        print("[GPT Regeneration Error]", e)
        raise