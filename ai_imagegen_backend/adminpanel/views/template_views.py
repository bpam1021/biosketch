
from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser
from rest_framework.views import APIView
from rest_framework.response import Response
from users.models import TemplateCategory, TemplateImage, TemplateRequest
from users.serializers import TemplateCategorySerializer, TemplateImageSerializer, TemplateRequestAdminSerializer

class AdminTemplateCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = TemplateCategory.objects.all()
    serializer_class = TemplateCategorySerializer

class AdminTemplateImageViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = TemplateImage.objects.all()
    serializer_class = TemplateImageSerializer

class AdminTemplateRequestListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        requests = TemplateRequest.objects.select_related("user").order_by('-submitted_at')
        serializer = TemplateRequestAdminSerializer(requests, many=True)
        return Response(serializer.data)

    def put(self, request):
        request_id = request.data.get("id")
        status_update = request.data.get("status")
        admin_response = request.data.get("admin_response", "")

        try:
            template_request = TemplateRequest.objects.get(pk=request_id)
        except TemplateRequest.DoesNotExist:
            return Response({"error": "Request not found."}, status=404)

        if status_update not in ['accepted', 'rejected']:
            return Response({"error": "Invalid status value."}, status=400)

        template_request.status = status_update
        template_request.admin_response = admin_response
        template_request.save()

        return Response({"message": f"Request {status_update}"})
