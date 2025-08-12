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
        "Each description should be 2–3 sentences and be informative and educational.\n"
        "Make image_prompt clear, detailed, and specific enough for an AI image generator like DALL·E or GPT-4 image.\n"
        "Focus on creating professional, scientific, and visually appealing content."
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4",
            temperature=0.8,
            max_tokens=2000,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": f"Topic: {prompt}"},
            ]
        )

        content = response.choices[0].message.content
        if not content:
            raise ValueError("Empty response from GPT-4")
            
        return json.loads(content)

    except Exception as e:
        print("[GPT Error]", e)
        # Return fallback slides if GPT fails
        return [
            {
                "title": "Introduction",
                "description": f"Overview of {prompt}",
                "image_prompt": f"Professional scientific illustration of {prompt}, clean background"
            },
            {
                "title": "Key Concepts",
                "description": f"Main concepts and principles related to {prompt}",
                "image_prompt": f"Educational diagram showing key concepts of {prompt}, scientific style"
            },
            {
                "title": "Analysis",
                "description": f"Detailed analysis and findings about {prompt}",
                "image_prompt": f"Data visualization and analysis charts for {prompt}, professional presentation style"
            },
            {
                "title": "Conclusion",
                "description": f"Summary and conclusions about {prompt}",
                "image_prompt": f"Summary infographic for {prompt}, clean scientific design"
            }
        ]


def generate_image(prompt: str, request) -> str:
    """
    Generates an image using OpenAI's gpt-image-1 model and returns the saved file URL.
    """
    try:
        # Enhanced prompt for better image generation
        enhanced_prompt = f"Professional scientific illustration: {prompt}. High quality, detailed, educational, clean background, suitable for academic presentation."
        
        response = client.images.generate(
            model="gpt-image-1",
            prompt=enhanced_prompt,
            n=1,
            size="1536x1024",
            quality="hd",
        )
        b64_data = response.data[0].b64_json
        if not b64_data:
            print("[Image Generation Warning] Empty image data, using fallback")
            return ""

        image = Image.open(BytesIO(base64.b64decode(b64_data)))
        hashed = hashlib.md5(prompt.encode()).hexdigest()[:10]
        filename = f"slide_{hashed}_{uuid.uuid4().hex[:6]}.png"
        
        # Ensure directory exists
        os.makedirs(os.path.join(settings.MEDIA_ROOT, "generated_slides"), exist_ok=True)
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
        "Make the content educational, informative, and professional.\n"
        "Respond as JSON: {\"title\": ..., \"description\": ...}\n"
        "Ensure the title is clear and the description provides valuable information."
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4",
            temperature=0.8,
            max_tokens=500,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": f"Prompt: {image_prompt}"},
            ]
        )

        content = response.choices[0].message.content
        if not content:
            raise ValueError("Empty response from GPT-4")
            
        return json.loads(content)

    except Exception as e:
        print("[GPT Regeneration Error]", e)
        # Return fallback content
        return {
            "title": "Generated Content",
            "description": "AI-generated content based on the provided prompt. This slide contains relevant information for your presentation."
        }