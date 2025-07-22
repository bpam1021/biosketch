from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q, Exists, OuterRef
from users.models import TemplateCategory, TemplateImage
from users.serializers import TemplateRequestSerializer, TemplateCategoryWithImagesSerializer, TemplateRequest

class PublicTemplateCategoryView(APIView):
    def get(self, request):
        query = request.GET.get("q")
        image_type = request.GET.get("type")
        qs = TemplateCategory.objects.all()
        if image_type:
            qs = qs.annotate(
                has_type_image=Exists(
                    TemplateImage.objects.filter(
                        category=OuterRef('pk'),
                        type=image_type
                    )
                )
            ).filter(has_type_image=True)
        if query:
            qs = qs.filter(Q(name__icontains=query) | Q(images__name__icontains=query)).distinct()
        
        serializer = TemplateCategoryWithImagesSerializer(
            qs.order_by("name"),
            many=True,
            context={"request": request, "query": query, "type": image_type}
        )
        data = serializer.data
        if query:
            data = [cat for cat in data if cat['images']]
        return Response(data)


class TemplateRequestCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = TemplateRequestSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=400)

class TemplateRequestStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        requests = TemplateRequest.objects.filter(user=request.user).order_by('-submitted_at')
        serializer = TemplateRequestSerializer(requests, many=True)
        return Response(serializer.data)
