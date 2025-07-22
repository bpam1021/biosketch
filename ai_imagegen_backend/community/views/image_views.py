from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, JSONParser
from rest_framework.decorators import api_view, permission_classes
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.db.models import Count
from django.contrib.auth.models import User

from users.models import GeneratedImage, Field
from community.models import ImageComment, Upvote, Remix
from community.serializers import (
    ImageCommentSerializer,
    GeneratedImageSerializer,
    FieldSerializer
)


class FieldListView(generics.ListAPIView):
    queryset = Field.objects.all()
    serializer_class = FieldSerializer
    permission_classes = [permissions.AllowAny]


class FilteredImageListView(generics.ListAPIView):
    serializer_class = GeneratedImageSerializer

    def get_queryset(self):
        queryset = GeneratedImage.objects.filter(is_published=True)
        field = self.request.query_params.get('field')
        prompt = self.request.query_params.get('prompt')
        date = self.request.query_params.get('date')
        sort = self.request.query_params.get('sort')

        if field:
            try:
                queryset = queryset.filter(field_id=int(field))
            except ValueError:
                pass

        if prompt:
            queryset = queryset.filter(prompt__icontains=prompt)

        if date:
            queryset = queryset.filter(created_at__date=date)

        if sort == "upvotes":
            queryset = queryset.annotate(upvote_count=Count("upvotes")).order_by("-upvote_count")
        elif sort == "comments":
            queryset = queryset.annotate(comment_count=Count("comments")).order_by("-comment_count")
        else:
            queryset = queryset.order_by("-created_at")

        return queryset


class GeneratedImageDetailView(generics.RetrieveAPIView):
    queryset = GeneratedImage.objects.all()
    serializer_class = GeneratedImageSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'id'
    lookup_url_kwarg = 'image_id'


class PublicImageListView(generics.ListAPIView):
    queryset = GeneratedImage.objects.filter(is_published=True).order_by('-created_at')
    serializer_class = GeneratedImageSerializer
    permission_classes = [permissions.AllowAny]


class PublishImageView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        image_url = request.data.get("image_url")
        image_name = request.data.get("image_name")
        prompt = request.data.get("prompt")
        field_id = request.data.get("field")

        image = GeneratedImage.objects.filter(user=request.user, image_url=image_url).first()
        if not image:
            return Response({"error": "Image not found"}, status=404)

        image.image_title = image_name or image.image_name
        image.user_description = prompt or image.prompt
        image.is_published = True
        image.field_id = field_id or image.field_id
        image.save()

        return Response({"status": "published", "id": image.id}, status=200)


class CommentListCreateView(generics.ListCreateAPIView):
    serializer_class = ImageCommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ImageComment.objects.filter(image_id=self.kwargs['image_id']).order_by('-created_at')

    def perform_create(self, serializer):
        image = get_object_or_404(GeneratedImage, id=self.kwargs['image_id'])
        serializer.save(user=self.request.user, image=image)


class UpvoteToggleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, image_id):
        image = get_object_or_404(GeneratedImage, id=image_id)
        upvote, created = Upvote.objects.get_or_create(user=request.user, image=image)

        if not created:
            upvote.delete()
            return Response({"status": "unliked", "upvotes": image.upvotes.count()}, status=200)

        return Response({"status": "liked", "upvotes": image.upvotes.count()}, status=200)


class RemixImageView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, image_id):
        original = get_object_or_404(GeneratedImage, id=image_id)
        remixed_id = request.data.get('remixed_id')
        remixed_image = get_object_or_404(GeneratedImage, id=remixed_id)
        Remix.objects.create(original=original, remixer=request.user, remixed_image=remixed_image)
        return Response({"message": "Remix saved"}, status=201)

