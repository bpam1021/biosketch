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

def generate_default_canvas_json(image_url: str) -> str:
    """
    Generate a default Fabric.js canvas JSON with the image as background
    """
    if not image_url:
        return json.dumps({
            "version": "6.6.1",
            "objects": [],
            "background": "#ffffff"
        })
        
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
                "scaleX": 0.5,
                "scaleY": 0.5,
                "angle": 0,
                "opacity": 1,
                "src": image_url,
                "crossOrigin": "anonymous",
                "selectable": True,
                "evented": True,
                "hasControls": True,
                "hasBorders": True,
                "erasable": True,
                "hoverCursor": "default"
            }
        ],
        "background": "#ffffff"
    })


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
        prompt = serializer.validated_data["prompt"]
        user = request.user
        quality = request.data.get("quality")
        if quality not in ["low", "medium", "high"]:
            return Response({"error": "Invalid or missing quality value."}, status=400)
        try:            
            deduct_credit_for_presentation(user, quality)
            slides_data = decompose_prompt(prompt)
        except Exception as e:
            return Response({"error": f"GPT decomposition failed: {e}"}, status=500)

        enriched_slides = []
        for s in slides_data:
            try:
                s["image_url"] = generate_image(s["image_prompt"], request)
            except Exception as e:
                print(f"[Image Generation Error] {e}")
                s["image_url"] = ""
            enriched_slides.append(s)

        with transaction.atomic():
            pres = Presentation.objects.create(
                user=user, title=title, original_prompt=prompt
            )
            for idx, s in enumerate(enriched_slides):
                image_url = s.get("image_url", "")
                canvas_json = generate_default_canvas_json(image_url) if image_url else ""
                slide = Slide.objects.create(
                    presentation=pres,
                    order=idx,
                    title=s.get("title", f"Slide {idx+1}"),
                    description=s.get("description", ""),
                    image_prompt=s.get("image_prompt", ""),
                    image_url=image_url,
                    canvas_json=canvas_json,
                )
                # Option 1: Save initial AI image to rendered_image
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
            updated_slide = serializer.save()
            print(f"[Slide Update] Successfully updated slide {pk}")
            return Response(serializer.data)
        else:
            print(f"[Slide Update] Validation errors for slide {pk}: {serializer.errors}")
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
            print(f"[Slide Regenerate] Starting regeneration for slide {pk}")
            updated_data = regenerate_slide_content(slide.image_prompt)
            slide.title = updated_data.get("title", slide.title)
            slide.description = updated_data.get("description", slide.description)
            slide.save()
            print(f"[Slide Regenerate] Successfully regenerated slide {pk}")
            return Response(SlideSerializer(slide).data)
        except Exception as e:
            print(f"[Slide Regenerate] Failed for slide {pk}: {e}")
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

class ListPresentationsView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PresentationSerializer

    def get_queryset(self):
        return Presentation.objects.filter(user=self.request.user).order_by("-created_at")