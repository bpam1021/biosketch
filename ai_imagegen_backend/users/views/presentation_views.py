from rest_framework.views import APIView
from rest_framework.generics import RetrieveAPIView, CreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework import mixins, generics
from django.core.files.base import ContentFile
import requests

from users.models import Presentation, Slide
from users.serializers import (
    PresentationSerializer,
    CreatePresentationSerializer,
    ReorderSlidesSerializer,
    SlideSerializer,
)
from users.utils.ai_generation import decompose_prompt, generate_image, regenerate_slide_content
from django.shortcuts import get_object_or_404
from django.db import transaction, models
from django.core.files.base import ContentFile
from users.views.credit_views import deduct_credit_for_presentation
import json
import base64
import uuid
from openai import OpenAI
import os

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def generate_default_canvas_json(image_url: str) -> str:
    return json.dumps({
        "version": "6.6.1",
        "objects": [
            {
                "type": "image",
                "version": "6.6.1",
                "originX": "left",
                "originY": "top",
                "left": 0,
                "top": 0,
                "width": 1536,
                "height": 1024,
                "scaleX": 768/1536,
                "scaleY": 512/1024,
                "angle": 0,
                "opacity": 1,
                "src": image_url,
                "crossOrigin": "anonymous",
                "selectable": False,    # (This will be locked in frontend anyway)
                "evented": False,
                "hasControls": False,
                "hasBorders": False,
                "lockMovementX": True,
                "lockMovementY": True,
                "lockScalingX": True,
                "lockScalingY": True,
                "lockRotation": True,
                "hoverCursor": "default"
            }
        ],
        "background": "#fff"
    })

def generate_document_content(prompt: str) -> str:
    """Generate rich document content using GPT-4"""
    try:
        response = client.chat.completions.create(
            model="gpt-4",
            temperature=0.7,
            messages=[
                {
                    "role": "system", 
                    "content": "You are a professional document writer. Create well-structured, comprehensive content in HTML format with proper headings, paragraphs, lists, and formatting. Make it rich and professional like a Microsoft Word document with multiple sections, subsections, and detailed content."
                },
                {
                    "role": "user", 
                    "content": f"Create a comprehensive, professional document about: {prompt}. Include multiple sections with detailed content, examples, and structured information that would be suitable for a business or academic document."
                }
            ]
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"[Document Generation Error] {e}")

def save_image_to_field(slide, image_url):
    if not image_url:
        return
    try:
        response = requests.get(image_url)
        if response.status_code == 200:
            slide.rendered_image.save(
                f"slide_{slide.id}.png",
                ContentFile(response.content),
                save=True
            )
    except Exception as e:
        print(f"[Rendered Image Download Error] Slide {slide.id}: {e}")

class CreatePresentationView(CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CreatePresentationSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        title = serializer.validated_data["title"]
        prompt = serializer.validated_data["original_prompt"]
        presentation_type = request.data.get("presentation_type", "slides")
        user = request.user
        quality = request.data.get("quality")
        if quality not in ["low", "medium", "high"]:
            return Response({"error": "Invalid or missing quality value."}, status=400)
        try:            
            deduct_credit_for_presentation(user, quality)
            
            if presentation_type == "document":
                # Generate document content
                document_content = generate_document_content(prompt)
                
                # Create presentation with document content
                pres = Presentation.objects.create(
                    user=user, 
                    title=title, 
                    original_prompt=prompt,
                    presentation_type=presentation_type,
                    document_content=document_content,
                    document_settings={
                        'page_size': 'A4',
                        'margins': {'top': 20, 'right': 20, 'bottom': 20, 'left': 20},
                        'font_family': 'Arial',
                        'font_size': 14,
                        'line_height': 1.6,
                        'theme': 'default'
                    }
                )
                
                return Response({"id": pres.id, "message": "Document created successfully."}, status=201)
            else:
                slides_data = decompose_prompt(prompt)
        except Exception as e:
            return Response({"error": f"GPT decomposition failed: {e}"}, status=500)

        enriched_slides = []
        for s in slides_data:
            if presentation_type == "slides":
                try:
                    s["image_url"] = generate_image(s["image_prompt"], request)
                except Exception as e:
                    print(f"[Image Generation Error] {e}")
                    s["image_url"] = ""
            else:
                s["image_url"] = ""
            enriched_slides.append(s)

        with transaction.atomic():
            pres = Presentation.objects.create(
                user=user, 
                title=title, 
                original_prompt=prompt,
                presentation_type=presentation_type
            )
            for idx, s in enumerate(enriched_slides):
                image_url = s.get("image_url", "")
                canvas_json = generate_default_canvas_json(image_url) if image_url else ""
                content_type = "document" if presentation_type == "document" else "slide"
                
                slide = Slide.objects.create(
                    presentation=pres,
                    order=idx,
                    title=s.get("title", f"Slide {idx+1}"),
                    description=s.get("description", ""),
                    content_type=content_type,
                    rich_content=s.get("rich_content", ""),
                    image_prompt=s.get("image_prompt", ""),
                    image_url=image_url,
                    canvas_json=canvas_json,
                )
                
                if image_url:
                    save_image_to_field(slide, image_url)

        return Response({"id": pres.id, "message": "Presentation created successfully."}, status=201)

class PresentationDetailView(RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PresentationSerializer
    lookup_url_kwarg = "pk"

    def get_queryset(self):
        return Presentation.objects.filter(user=self.request.user)


class ReorderSlidesView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        pres = get_object_or_404(Presentation, pk=pk, user=request.user)
        serializer = ReorderSlidesSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        slide_ids = serializer.validated_data["slide_ids"]
        slides = list(pres.slides.all())

        if set(slide.id for slide in slides) != set(slide_ids):
            return Response({"error": "Invalid slide ID list"}, status=400)

        id_to_slide = {slide.id: slide for slide in slides}
        for new_order, slide_id in enumerate(slide_ids):
            slide = id_to_slide[slide_id]
            slide.order = new_order
            slide.save()

        return Response({"detail": "Slides reordered successfully"})


class SlideUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        slide = get_object_or_404(Slide, pk=pk)
        if slide.presentation.user != request.user:
            return Response({"error": "Permission denied"}, status=403)

        serializer = SlideSerializer(slide, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


class SlideDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        slide = get_object_or_404(Slide, pk=pk)
        if slide.presentation.user != request.user:
            return Response({"error": "Permission denied"}, status=403)
        slide.delete()
        return Response({"detail": "Slide deleted"}, status=204)


class SlideRegenerateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        slide = get_object_or_404(Slide, pk=pk)
        if slide.presentation.user != request.user:
            return Response({"error": "Permission denied"}, status=403)

        try:
            updated_data = regenerate_slide_content(slide.image_prompt)
            slide.title = updated_data.get("title", slide.title)
            slide.description = updated_data.get("description", slide.description)
            slide.save()
            return Response(SlideSerializer(slide).data)
        except Exception as e:
            return Response({"error": f"AI regeneration failed: {e}"}, status=500)


class SlideDuplicateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        orig = get_object_or_404(Slide, pk=pk)
        if orig.presentation.user != request.user:
            return Response({"error": "Permission denied"}, status=403)

        last_order = orig.presentation.slides.aggregate(models.Max("order"))["order__max"] or 0

        new_slide = Slide.objects.create(
            presentation=orig.presentation,
            order=last_order + 1,
            title=orig.title + " (copy)",
            description=orig.description,
            image_prompt=orig.image_prompt,
            image_url=orig.image_url,
            canvas_json=orig.canvas_json,
        )

        return Response(SlideSerializer(new_slide).data, status=201)


class UpdateCanvasJSONView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        slide = get_object_or_404(Slide, pk=pk)
        if slide.presentation.user != request.user:
            return Response({"error": "Permission denied"}, status=403)

        canvas_json = request.data.get("canvas_json", "")
        slide.canvas_json = canvas_json
        slide.save()
        return Response({"detail": "Canvas JSON updated"})

class UpdateSlideAnimationsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def patch(self, request, pk):
        slide = get_object_or_404(Slide, pk=pk)
        if slide.presentation.user != request.user:
            return Response({"error": "Permission denied"}, status=403)
            
        animations = request.data.get("animations", [])
        slide.animations = animations
        slide.save()
        
        return Response({"detail": "Animations updated"})

class ConvertTextToDiagramView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        text = request.data.get("text", "")
        diagram_type = request.data.get("diagram_type", "flowchart")
        
        try:
            # Use GPT-4 to analyze text and generate diagram data
            response = client.chat.completions.create(
                model="gpt-4",
                temperature=0.3,
                messages=[
                    {
                        "role": "system",
                        "content": f"Convert the following text into a {diagram_type} structure. Return JSON data that can be used to render the diagram."
                    },
                    {
                        "role": "user",
                        "content": text
                    }
                ]
            )
            
            diagram_data = response.choices[0].message.content
            
            # Generate a simple diagram image (placeholder)
            diagram_url = f"/api/diagrams/generate/{diagram_type}/"
            
            return Response({
                "diagram_url": diagram_url,
                "diagram_data": diagram_data
            })
            
        except Exception as e:
            return Response({"error": f"Diagram conversion failed: {e}"}, status=500)

class ListPresentationsView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PresentationSerializer
    def get_queryset(self):
        return Presentation.objects.filter(user=self.request.user).order_by("-created_at")