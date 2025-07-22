import os, uuid, hashlib, re, unicodedata, base64
import pytesseract
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
from datetime import timedelta
from django.utils.timezone import now
from django.conf import settings
from django.http import JsonResponse, HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from openai import OpenAI
from rembg import remove
import cv2
import numpy as np
from lama_cleaner.model_manager import ModelManager
from lama_cleaner.schema import Config

from users.models import GeneratedImage
from users.views.credit_views import deduct_credit_for_image_generation

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    raise ValueError("Missing OpenAI API keys.")

# LaMa config (for text removal)
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
default_config = Config(ldm_steps=25, sd_steps=25, sd_strength=0.5, ldm_sampler="ddim",
                        hd_strategy="Original", hd_strategy_crop_margin=32,
                        hd_strategy_crop_trigger_size=512, hd_strategy_resize_limit=1024,
                        zits_wireframe=False, use_croper=False, croper_x=0, croper_y=0,
                        croper_width=512, croper_height=512, sd_mask_blur=5,
                        sd_guidance_scale=7.5, sd_sampler="ddim", sd_seed=-1,
                        prompt="", controlnet_conditioning_scale=1.0)
model = ModelManager(name="lama", device="cpu", config=default_config)


@api_view(['GET'])
def get_images(request):
    templates_folder = os.path.join(settings.MEDIA_ROOT, "templates")
    image_files = [f for f in os.listdir(templates_folder) if f.endswith('.png')]
    image_urls = [f"/media/templates/{image_file}" for image_file in image_files]
    return JsonResponse(image_urls, safe=False)

def normalize_text(text):
    text = unicodedata.normalize("NFKD", text)  # Normalize unicode
    text = text.lower().strip()
    text = re.sub(r"[^\w\s]", " ", text)  # Replace punctuation with space
    text = re.sub(r"\s+", " ", text)      # Normalize multiple spaces
    return text

def generate_prompt_key(prompt, style, field, aspect_ratio, models, quality, white_background=False):
    prompt_norm = normalize_text(prompt or "")
    style_norm = normalize_text(style or "")
    field_norm = normalize_text(field or "")
    aspect_ratio_str = str(aspect_ratio or "")
    model_norm = normalize_text(models or "")
    quality_norm = normalize_text(quality or "")
    background_flag = "whitebg" if white_background else "transbg"
    raw = f"{prompt_norm}|{style_norm}|{field_norm}|{aspect_ratio_str}|{model_norm}|{quality_norm}|{background_flag}"
    return hashlib.sha256(raw.encode()).hexdigest()

def get_watermark_font(size=200):
    try:
        return ImageFont.truetype("arial.ttf", size)  # Works on Windows if Arial is installed
    except IOError:
        try:
            return ImageFont.truetype("DejaVuSans.ttf", size)  # Linux fallback
        except IOError:
            return ImageFont.load_default()
        

@api_view(['POST'])
def generate_image(request):
    user = request.user
    user_id = user.id
    profile = user.profile

    # 🔹 Inputs
    prompt = request.data.get("prompt")
    style = request.data.get("style")
    quality = request.data.get("quality")
    aspectRatio = request.data.get("aspectRatio")
    field = request.data.get("field")
    num_images = int(request.data.get("numImages", 1))
    white_background = str(request.data.get("whiteBackground", "false")).lower() == "true"
    force_regenerate = str(request.data.get("forceRegenerate", "false")).lower() == "true"

    model = "gpt-image-1"

    if not prompt:
        return Response({"error": "Prompt is required."}, status=status.HTTP_400_BAD_REQUEST)

    if profile.credits < num_images:
        return Response({"error": "Not enough credits."}, status=status.HTTP_403_FORBIDDEN)

    try:
        deduct_credit_for_image_generation(user, num_images, quality)
    except ValueError as e:
        return Response({"error": str(e)}, status=403)

    # 🔹 Generate key
    prompt_key = generate_prompt_key(prompt, style, field, aspectRatio, model, quality, white_background)
    if not force_regenerate:
        cached_images = list(
            GeneratedImage.objects.filter(user_id=user_id, prompt_key=prompt_key).order_by("sequence_index")
        )

        if len(cached_images) >= num_images:
            image_urls = [img.image_url for img in cached_images[:num_images]]
            return Response({
                "image_urls": image_urls,
                "prompt_key": prompt_key,
            }, status=status.HTTP_200_OK)
    else:
        cached_images = []

    # 🔹 GPT Prompt
    gpt_prompt = f"{style} of {prompt} for {field}"
    if white_background:
        gpt_prompt += " with a white background."

    client = OpenAI(api_key=OPENAI_API_KEY)
    print("OpenAI key", OPENAI_API_KEY)
    unique_id = uuid.uuid4().hex[:8]
    image_urls = []

    try:
        response = client.images.generate(
            model=model,
            prompt=gpt_prompt,
            n=num_images,
            size=aspectRatio,
            quality=quality,
        )

        for idx, image_data in enumerate(response.data):
            b64_data = image_data.b64_json
            if not b64_data:
                continue

            image = Image.open(BytesIO(base64.b64decode(b64_data)))

            # 🔹 Convert transparency to white background if requested
            if white_background:
                if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
                    bg = Image.new("RGB", image.size, (255, 255, 255))
                    bg.paste(image, mask=image.split()[3] if image.mode == "RGBA" else None)
                    image = bg
                else:
                    image = image.convert("RGB")

            # 🔹 Watermark if low credits
            if profile.credits <= 5:
                draw = ImageDraw.Draw(image)
                watermark_text = "BIOSKETCH AI"
                font = get_watermark_font(200)
                bbox = draw.textbbox((0, 0), watermark_text, font=font)
                position = ((image.width - bbox[2]) // 2, (image.height - bbox[3]) // 2)
                draw.text(position, watermark_text, fill=(255, 255, 255, 128), font=font)

            # 🔹 Save image
            hashed_prompt = hashlib.md5(prompt_key.encode('utf-8')).hexdigest()[:10]
            filename = f"img_{hashed_prompt}_{len(cached_images) + idx + 1}_{unique_id}.png"
            image_path = os.path.join(settings.MEDIA_ROOT, 'generated_images', filename)
            image.save(image_path)

            full_url = f"{request.scheme}://{request.get_host()}{settings.MEDIA_URL}generated_images/{filename}"
            image_urls.append(full_url)

            GeneratedImage.objects.create(
                user_id=user_id,
                image_name=filename,
                image_url=full_url,
                token_count=len(gpt_prompt.split()),
                image_type=style,
                image_size=aspectRatio,
                image_model=model,
                image_quality=quality,
                prompt=prompt,
                prompt_key=prompt_key,
                sequence_index=len(cached_images) + idx,
                sci_description="No description available",
                created_at=now()
            )

        return Response({
            "image_urls": image_urls,
            "prompt_key": prompt_key,
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": f"An unexpected error occurred: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_description(request):
    prompt = request.data.get("prompt")
    prompt_key = request.data.get("prompt_key")
    print("Received prompt:", prompt, prompt_key)
    
    if not prompt or not prompt_key:
        return Response({"error": "Prompt and prompt_key are required."}, status=400)

    # Check if description already exists
    existing = GeneratedImage.objects.filter(prompt_key=prompt_key).first()
    if existing and existing.sci_description and existing.sci_description != "No description available":
        return Response({"explanation": existing.sci_description}, status=200)

    client = OpenAI(api_key=OPENAI_API_KEY)

    try:
        doc_prompt = (
            f"Write a well-structured, systematic and detailed documentation of {prompt} in **Markdown format**. "
            "Include bold titles, subtitles, abstract in italics, and use proper section headers."
        )
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": doc_prompt}]
        )
        explanation = response.choices[0].message.content

        # Update all images for that prompt_key with the new explanation
        GeneratedImage.objects.filter(prompt_key=prompt_key).update(sci_description=explanation)
        
        return Response({"explanation": explanation}, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_description(request):
    prompt_key = request.data.get("prompt_key")
    description = request.data.get("description")

    if not prompt_key or not description:
        return Response({"error": "Missing prompt_key or description."}, status=status.HTTP_400_BAD_REQUEST)

    images = GeneratedImage.objects.filter(user=request.user, prompt_key=prompt_key)
    if not images.exists():
        return Response({"error": "No images found for the given prompt key."}, status=status.HTTP_404_NOT_FOUND)

    images.update(sci_description=description)
    return Response({"message": "Description saved successfully."}, status=status.HTTP_200_OK)

@api_view(['POST'])
def remove_background(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST allowed'}, status=405)

    image_file = request.FILES.get('image')
    if not image_file:
        return JsonResponse({'error': 'No image uploaded'}, status=400)

    try:
        input_image = Image.open(image_file)
        output_image = remove(input_image)

        buffer = BytesIO()
        output_image.save(buffer, format='PNG')
        buffer.seek(0)

        return HttpResponse(buffer, content_type='image/png')
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['POST'])
def remove_text(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST allowed'}, status=405)

    image_file = request.FILES.get('image')
    if not image_file:
        return JsonResponse({'error': 'No image uploaded'}, status=400)

    try:
        input_image = Image.open(image_file).convert("RGB")
        image_np = np.array(input_image, dtype=np.uint8)  # Ensure uint8 format

        gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)

        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        custom_config = r'--oem 3 --psm 6'
        detected_text = pytesseract.image_to_data(thresh, config=custom_config, output_type=pytesseract.Output.DICT)

        mask = np.zeros(gray.shape, dtype=np.uint8)

        for i in range(len(detected_text["text"])):
            confidence = int(detected_text["conf"][i])  # OCR Confidence Score
            if detected_text["text"][i].strip() and confidence > 30:  # Slightly lower threshold
                x, y, w, h = (
                    detected_text["left"][i], 
                    detected_text["top"][i], 
                    detected_text["width"][i], 
                    detected_text["height"][i]
                )
                
                x = max(0, x - 10)  # Expand left
                y = max(0, y - 10)  # Expand top
                w += 20  # Expand width
                h += 20  # Expand height

                cv2.rectangle(mask, (x, y), (x + w, y + h), 255, -1)

        kernel = np.ones((5,5), np.uint8)
        mask = cv2.dilate(mask, kernel, iterations=2)

        mask = np.clip(mask, 0, 255).astype(np.uint8)

        try:
            inpainted_image = model(image_np, mask, default_config)
        except Exception as e:
            return JsonResponse({'error': 'LaMa Model Failed: ' + str(e)}, status=500)

        inpainted_image = np.clip(inpainted_image, 0, 255).astype(np.uint8)
        output_image = Image.fromarray(cv2.cvtColor(inpainted_image, cv2.COLOR_BGR2RGB))

        buffer = BytesIO()
        output_image.save(buffer, format="PNG")
        buffer.seek(0)
        return HttpResponse(buffer, content_type="image/png")

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
