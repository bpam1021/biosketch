from rest_framework import serializers
from .models import SystemSetting
from users.models import Feedback

class SystemSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSetting
        fields = ['id', 'key', 'value', 'description', 'updated_at']

class FeedbackAdminSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()
    
    class Meta:
        model = Feedback
        fields = [
            "id", "user", "username", "user_email",
            "name", "email", "message", "submitted_at"
        ]

    def get_username(self, obj):
        return obj.user.username if obj.user else None

    def get_user_email(self, obj):
        return obj.user.email if obj.user else None
