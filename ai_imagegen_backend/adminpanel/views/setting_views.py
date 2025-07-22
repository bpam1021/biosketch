from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.conf import settings
from ..models import SystemSetting
from ..serializers import SystemSettingSerializer

class AdminSystemSettingsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        settings_qs = SystemSetting.objects.all()
        serializer = SystemSettingSerializer(settings_qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        for key, value in request.data.items():
            setting, created = SystemSetting.objects.get_or_create(key=key)
            setting.value = value
            setting.save()
        return Response({"message": "Settings updated successfully"})