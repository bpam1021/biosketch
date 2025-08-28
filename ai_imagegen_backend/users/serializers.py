from django.contrib.auth.models import User
from django.db import models
from django.core.files.base import ContentFile
import uuid
import base64
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from .models import (
    UserProfile, NotificationSettings, FriendInvitation, CreditTransaction, 
    UserSubscription, Achievement, Feedback,
    # Clean Presentation Models
    Document, DocumentChapter, DocumentSection, DocumentTemplate,
    SlidePresentation, Slide, SlideTemplate, SlideTheme,
    MediaAsset, DiagramElement, PresentationExport,
    # Template Models
    TemplateCategory, TemplateImage, TemplateRequest
)


# ============================================================================
# EXISTING USER SERIALIZERS - UNCHANGED
# ============================================================================

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user

class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = ["id", "user", "name", "email", "message", "submitted_at"]
        read_only_fields = ["id", "user", "submitted_at"]

    def create(self, validated_data):
        user = self.context['request'].user if self.context.get('request') and self.context['request'].user.is_authenticated else None
        return Feedback.objects.create(user=user, **validated_data)
    
class TokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'password']

class PublicUserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username')
    first_name = serializers.CharField(source='user.first_name', allow_blank=True)
    last_name = serializers.CharField(source='user.last_name', allow_blank=True)
    profile_picture = serializers.SerializerMethodField()
    bio = serializers.CharField()
    profile_visibility = serializers.CharField()
    
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    badges = serializers.SerializerMethodField()

    total_images_generated = serializers.SerializerMethodField()
    total_images_published = serializers.SerializerMethodField()
    total_community_posts = serializers.SerializerMethodField()
    total_challenge_entries = serializers.SerializerMethodField()
    total_likes_received = serializers.SerializerMethodField()
    challenges_won = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            'username', 'first_name', 'last_name', 'profile_picture', 'bio', 'profile_visibility',
            'followers_count', 'following_count', 'total_images_generated', 'total_images_published', 'total_community_posts',
            'total_challenge_entries', 'total_likes_received', 'challenges_won', 'badges',
        ]

    def get_profile_picture(self, obj):
        request = self.context.get('request')
        if obj.profile_picture and hasattr(obj.profile_picture, 'url'):
            return request.build_absolute_uri(obj.profile_picture.url)
        return None

    def get_followers_count(self, obj):
        return obj.followers.count()

    def get_following_count(self, obj):
        return obj.user.following.count()

    def get_badges(self, obj):
        return [
            {
                "name": badge.name,
                "icon_url": self.context['request'].build_absolute_uri(badge.icon_url)
                if badge.icon_url else None,
                "description": badge.description
            }
            for badge in obj.badges.all()
        ]
    def get_total_images_generated(self, obj):
        return obj.user.generatedimage_set.count()

    def get_total_images_published(self, obj):
        return obj.user.generatedimage_set.filter(is_published=True).count()

    def get_total_community_posts(self, obj):
        return obj.user.community_posts.count()

    def get_total_challenge_entries(self, obj):
        return obj.user.challenge_entries.count()

    def get_total_likes_received(self, obj):
        from community.models import GeneratedImage
        return obj.user.generatedimage_set.aggregate(total=models.Count("upvotes", distinct=True))["total"] or 0

    def get_challenges_won(self, obj):
        return obj.challenges_won


class UserProfileEditSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source='user.first_name', allow_blank=True, required=False)
    last_name = serializers.CharField(source='user.last_name', allow_blank=True, required=False)
    email = serializers.EmailField(source='user.email', allow_blank=True, required=False)
    profile_picture = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = UserProfile
        fields = [
            'first_name', 'last_name', 'email',
            'bio', 'phone_number', 'profile_picture', 'profile_visibility'
        ]

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        for attr, value in user_data.items():
            setattr(instance.user, attr, value)
        instance.user.save()

        if 'profile_picture' in self.context['request'].FILES:
            instance.profile_picture = self.context['request'].FILES['profile_picture']

        return super().update(instance, validated_data)

class NotificationSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationSettings
        fields = ['email_notifications', 'push_notifications', 'new_follower_alert', 'challenge_update_alert']

class FriendInvitationSerializer(serializers.ModelSerializer):
    inviter_username = serializers.CharField(source='inviter.username', read_only=True)
    invitee_username = serializers.CharField(source='invitee.username', read_only=True)

    class Meta:
        model = FriendInvitation
        fields = ['id', 'inviter', 'inviter_username', 'invitee', 'invitee_username', 'invited_at', 'reward_credited']

class AchievementSerializer(serializers.ModelSerializer):
    icon = serializers.ImageField(required=False)
    icon_url = serializers.SerializerMethodField()

    class Meta:
        model = Achievement
        fields = ['id', 'name', 'description', 'icon', 'icon_url', 'criteria_code']

    def get_icon_url(self, obj):
        request = self.context.get('request')
        if obj.icon:
            return request.build_absolute_uri(obj.icon.url)
        return None

class CreditTransactionSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = CreditTransaction
        fields = ['id', 'user_username', 'amount', 'type', 'timestamp', 'description']

class UserSubscriptionSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = UserSubscription
        fields = ['id', 'user_username', 'purchase_date', 'amount', 'credits_added', 'stripe_payment_intent_id']

class LeaderboardUserSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="user.id")
    username = serializers.CharField(source="user.username")
    avatar_url = serializers.SerializerMethodField()

    total_images_generated = serializers.IntegerField()
    total_images_published = serializers.IntegerField()
    total_upvotes = serializers.IntegerField()
    total_posts = serializers.IntegerField()
    total_challenges = serializers.IntegerField()
    followers_count = serializers.IntegerField()

    class Meta:
        model = UserProfile
        fields = [
            "id", "username", "avatar_url",
            "total_images_generated", "total_images_published",
            "total_upvotes", "total_posts", "total_challenges", "followers_count"
        ]

    def get_avatar_url(self, obj):
        request = self.context.get("request")
        if obj.profile_picture and request:
            return request.build_absolute_uri(obj.profile_picture.url)
        return None


# ============================================================================
# CLEAN PRESENTATION SERIALIZERS - Simple serializers for new clean models
# ============================================================================

# Basic serializers for the clean models - if needed, these will be expanded later
# For now, the main serializers are in serializers_new.py


# ============================================================================
# EXISTING TEMPLATE SERIALIZERS - UNCHANGED
# ============================================================================

class TemplateImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateImage
        fields = ['id', 'name', 'image', 'category', 'type']

class TemplateImageInlineSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = TemplateImage
        fields = ['id', 'name', 'image']

    def get_image(self, obj):
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url

class TemplateCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateCategory
        fields = ['id', 'name', 'description']

class TemplateCategoryWithImagesSerializer(serializers.ModelSerializer):
    images = serializers.SerializerMethodField()

    class Meta:
        model = TemplateCategory
        fields = ['id', 'name', 'description', 'images']

    def get_images(self, obj):
        query = self.context.get('query')
        image_type = self.context.get('type')
        images_qs = obj.images.all()
        if image_type:
            images_qs = images_qs.filter(type=image_type)
        if query:
            images_qs = images_qs.filter(name__icontains=query)
        return TemplateImageInlineSerializer(images_qs, many=True, context=self.context).data

class TemplateRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateRequest
        fields = ['id', 'user', 'message', 'submitted_at', 'status', 'admin_response']
        read_only_fields = ['user', 'submitted_at', 'status', 'admin_response']

class TemplateRequestAdminSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = TemplateRequest
        fields = ['id', 'username', 'message', 'submitted_at', 'status', 'admin_response']
