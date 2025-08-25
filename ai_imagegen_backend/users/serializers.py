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
    # Enhanced Presentation Models
    Presentation, ContentSection, DiagramElement, PresentationTemplate, 
    ChartTemplate, PresentationVersion, PresentationComment, PresentationExportJob, 
    AIGenerationLog,
    # Existing Template Models
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
# NEW ENHANCED PRESENTATION SERIALIZERS - REPLACING OLD PRESENTATION LOGIC
# ============================================================================

class PresentationTemplateSerializer(serializers.ModelSerializer):
    """Serializer for presentation templates"""
    thumbnail_url = serializers.SerializerMethodField()
    
    class Meta:
        model = PresentationTemplate
        fields = [
            'id', 'name', 'description', 'template_type', 'category',
            'thumbnail_url', 'template_data', 'style_config', 'layout_config',
            'is_premium', 'is_active', 'usage_count', 'created_at'
        ]
    
    def get_thumbnail_url(self, obj):
        if obj.thumbnail:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.thumbnail.url)
            return obj.thumbnail.url
        return None


class ChartTemplateSerializer(serializers.ModelSerializer):
    """Serializer for chart templates"""
    thumbnail_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ChartTemplate
        fields = [
            'id', 'name', 'description', 'category', 'chart_type',
            'template_config', 'style_options', 'data_requirements', 'sample_data',
            'generation_prompts', 'content_keywords', 'thumbnail_url', 
            'usage_count', 'is_premium', 'is_active'
        ]
    
    def get_thumbnail_url(self, obj):
        if obj.thumbnail:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.thumbnail.url)
            return obj.thumbnail.url
        return None


class DiagramElementSerializer(serializers.ModelSerializer):
    """Serializer for diagram elements"""
    chart_template_name = serializers.CharField(source='chart_template.name', read_only=True)
    
    class Meta:
        model = DiagramElement
        fields = [
            'id', 'chart_template', 'chart_template_name', 'title', 'chart_type',
            'chart_data', 'style_config', 'source_content', 'generation_prompt',
            'ai_suggestions', 'position_x', 'position_y', 'width', 'height',
            'z_index', 'rendered_image', 'svg_data', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class ContentSectionSerializer(serializers.ModelSerializer):
    """Serializer for content sections"""
    diagrams_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ContentSection
        fields = [
            'id', 'section_type', 'title', 'order', 'content', 'rich_content',
            'content_data', 'image_url', 'image_prompt', 'media_files',
            'layout_config', 'style_config', 'animation_config', 'interaction_config',
            'ai_generated', 'generation_prompt', 'generation_metadata',
            'canvas_json', 'rendered_image', 'diagrams_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_diagrams_count(self, obj):
        return obj.diagrams.count()

class PresentationCommentSerializer(serializers.ModelSerializer):
    """Serializer for presentation comments"""
    author_name = serializers.CharField(source='author.username', read_only=True)
    author_avatar = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()
    
    class Meta:
        model = PresentationComment
        fields = [
            'id', 'author', 'author_name', 'author_avatar', 'content',
            'position_data', 'parent', 'is_resolved', 'resolved_by',
            'resolved_at', 'replies', 'created_at', 'updated_at'
        ]
        read_only_fields = ['author', 'created_at', 'updated_at']
    
    def get_author_avatar(self, obj):
        if hasattr(obj.author, 'profile') and obj.author.profile.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.author.profile.profile_picture.url)
        return None
    
    def get_replies(self, obj):
        if obj.replies.exists():
            return PresentationCommentSerializer(obj.replies.all(), many=True, context=self.context).data
        return []


class PresentationVersionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = PresentationVersion
        fields = [
            'id', 'version_number', 'changes_summary', 'created_by',
            'created_by_name', 'is_auto_save', 'created_at'
        ]


class PresentationExportJobSerializer(serializers.ModelSerializer):
    output_file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = PresentationExportJob
        fields = [
            'id', 'export_format', 'export_settings', 'selected_sections',
            'status', 'progress', 'output_file_url', 'output_url',
            'error_message', 'started_at', 'completed_at', 'expires_at',
            'created_at'
        ]
    
    def get_output_file_url(self, obj):
        if obj.output_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.output_file.url)
            return obj.output_file.url
        return None


class PresentationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing presentations"""
    user = serializers.StringRelatedField(read_only=True)
    sections_count = serializers.SerializerMethodField()
    template_name = serializers.CharField(source='template.name', read_only=True)
    
    class Meta:
        model = Presentation
        fields = [
            'id', 'title', 'description', 'presentation_type', 'status',
            'template_name', 'sections_count', 'is_public', 'user',
            'word_count', 'estimated_duration', 'view_count',
            'created_at', 'updated_at', 'last_accessed'
        ]
    
    def get_sections_count(self, obj):
        return obj.content_sections.count()


class PresentationDetailSerializer(serializers.ModelSerializer):
    """Full serializer with all related data"""
    content_sections = ContentSectionSerializer(many=True, read_only=True)
    template = serializers.StringRelatedField(read_only=True)
    collaborators = serializers.StringRelatedField(many=True, read_only=True)
    user = serializers.StringRelatedField(read_only=True)
    is_owner = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    
    class Meta:
        model = Presentation
        fields = [
            'id', 'title', 'description', 'presentation_type', 'original_prompt',
            'quality', 'generated_outline', 'generation_settings', 'template', 
            'theme_settings', 'brand_settings', 'document_content', 'document_settings',
            'page_layout', 'collaborators', 'is_public', 'allow_comments', 
            'sharing_settings', 'status', 'word_count', 'estimated_duration',
            'export_settings', 'published_url', 'is_exported', 'export_format',
            'video_settings', 'view_count', 'analytics_data', 'generation_cost',
            'total_credits_used', 'content_sections', 'user',
            'is_owner', 'can_edit', 'created_at', 'updated_at', 'last_accessed'
        ]
    
    def get_is_owner(self, obj):
        request = self.context.get('request')
        return request and request.user == obj.user
    
    def get_can_edit(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return (request.user == obj.user or 
                request.user in obj.collaborators.all())


class CreatePresentationSerializer(serializers.ModelSerializer):
    """Serializer for creating new presentations"""
    template_id = serializers.UUIDField(required=False, allow_null=True, write_only=True)
    class Meta:
        model = Presentation
        fields = '__all__'
        read_only_fields = ['user']

    def validate_title(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Title cannot be empty")
        return value.strip()
    
    def validate_template_id(self, value):
        if value:
            try:
                template = PresentationTemplate.objects.get(id=value)
                if template.is_premium:
                    user = self.context.get('request').user if self.context.get('request') else None
                    if not user or not hasattr(user, 'profile'):
                        raise serializers.ValidationError("Premium template requires premium subscription")
                return value
            except PresentationTemplate.DoesNotExist:
                raise serializers.ValidationError("Template not found")
        return value
    
    def create(self, validated_data):
        template_id = validated_data.pop('template_id', None)
        
        if template_id:
            try:
                template = PresentationTemplate.objects.get(id=template_id)
                validated_data['template'] = template
            except PresentationTemplate.DoesNotExist:
                pass
        
        # User should be set in the view's perform_create
        return super().create(validated_data)


class UpdateContentSectionSerializer(serializers.ModelSerializer):
    """Serializer for updating content sections"""
    
    class Meta:
        model = ContentSection
        fields = [
            'title', 'content', 'rich_content', 'content_data',
            'image_url', 'image_prompt', 'media_files', 'layout_config',
            'style_config', 'animation_config', 'interaction_config',
            'canvas_json'
        ]


class CreateDiagramSerializer(serializers.ModelSerializer):
    """Serializer for creating diagrams from content"""
    content_text = serializers.CharField(write_only=True)
    suggested_chart_types = serializers.ListField(read_only=True)
    
    class Meta:
        model = DiagramElement
        fields = [
            'chart_template', 'title', 'chart_type', 'chart_data',
            'style_config', 'content_text', 'generation_prompt',
            'position_x', 'position_y', 'width', 'height',
            'suggested_chart_types'
        ]
    
    def validate(self, data):
        if data.get('chart_template') and data.get('chart_type'):
            template = data['chart_template']
            if template.chart_type != data['chart_type']:
                raise serializers.ValidationError(
                    "Chart type must match the selected template"
                )
        return data
    
    def create(self, validated_data):
        content_text = validated_data.pop('content_text', '')
        validated_data['source_content'] = content_text
        return super().create(validated_data)


class BulkUpdateSectionsSerializer(serializers.Serializer):
    """Serializer for bulk updating multiple sections"""
    sections = UpdateContentSectionSerializer(many=True)
    
    def update(self, instance, validated_data):
        sections_data = validated_data['sections']
        sections_mapping = {section.id: section for section in instance.sections.all()}
        
        for section_data in sections_data:
            section_id = section_data.get('id')
            if section_id and section_id in sections_mapping:
                section = sections_mapping[section_id]
                for attr, value in section_data.items():
                    if attr != 'id':
                        setattr(section, attr, value)
                section.save()
        
        return instance


class ExportRequestSerializer(serializers.Serializer):
    """Serializer for export requests"""
    export_format = serializers.ChoiceField(choices=PresentationExportJob.EXPORT_FORMATS)
    selected_sections = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        default=list
    )
    export_settings = serializers.JSONField(required=False, default=dict)
    
    def validate_export_settings(self, value):
        format_type = self.initial_data.get('export_format')
        
        if format_type == 'mp4':
            required_fields = ['resolution', 'fps', 'duration_per_slide']
            for field in required_fields:
                if field not in value:
                    raise serializers.ValidationError(
                        f"'{field}' is required for video export"
                    )
        
        return value


class AIGenerationRequestSerializer(serializers.Serializer):
    """Serializer for AI generation requests"""
    generation_type = serializers.ChoiceField(choices=AIGenerationLog.GENERATION_TYPES)
    prompt = serializers.CharField(max_length=5000)
    presentation_id = serializers.UUIDField(required=False, allow_null=True)
    section_id = serializers.UUIDField(required=False, allow_null=True)
    
    # Content generation options
    content_length = serializers.ChoiceField(
        choices=[('short', 'Short'), ('medium', 'Medium'), ('long', 'Long')],
        required=False,
        default='medium'
    )
    tone = serializers.ChoiceField(
        choices=[
            ('professional', 'Professional'),
            ('casual', 'Casual'),
            ('academic', 'Academic'),
            ('creative', 'Creative'),
            ('technical', 'Technical')
        ],
        required=False,
        default='professional'
    )
    
    # Image generation options
    image_style = serializers.CharField(max_length=100, required=False)
    image_dimensions = serializers.CharField(max_length=20, required=False, default='1024x1024')
    
    # Chart generation options
    chart_type = serializers.CharField(max_length=50, required=False)
    data_source = serializers.CharField(required=False)
    
    def validate(self, data):
        generation_type = data['generation_type']
        
        if generation_type == 'image_generation' and not data.get('image_style'):
            raise serializers.ValidationError(
                "Image style is required for image generation"
            )
        
        if generation_type == 'chart_generation' and not data.get('chart_type'):
            raise serializers.ValidationError(
                "Chart type is required for chart generation"
            )
        
        return data


class ChartSuggestionSerializer(serializers.Serializer):
    """Serializer for chart suggestions based on content"""
    content_text = serializers.CharField(max_length=10000)
    current_section_type = serializers.CharField(max_length=30, required=False)
    
    def validate_content_text(self, value):
        if len(value.strip()) < 50:
            raise serializers.ValidationError(
                "Content must be at least 50 characters long for chart suggestions"
            )
        return value


class PresentationSearchSerializer(serializers.Serializer):
    """Serializer for searching presentations"""
    query = serializers.CharField(max_length=500, required=False)
    presentation_type = serializers.ChoiceField(
        choices=[('all', 'All'), ('document', 'Document'), ('slide', 'Slide')],
        required=False,
        default='all'
    )
    category = serializers.CharField(max_length=50, required=False)
    date_from = serializers.DateTimeField(required=False)
    date_to = serializers.DateTimeField(required=False)
    sort_by = serializers.ChoiceField(
        choices=[
            ('updated', 'Last Updated'),
            ('created', 'Date Created'),
            ('title', 'Title'),
            ('type', 'Type')
        ],
        required=False,
        default='updated'
    )
    order = serializers.ChoiceField(
        choices=[('asc', 'Ascending'), ('desc', 'Descending')],
        required=False,
        default='desc'
    )


class ContentEnhancementSerializer(serializers.Serializer):
    """Serializer for AI content enhancement"""
    section_id = serializers.UUIDField()
    enhancement_type = serializers.ChoiceField(choices=[
        ('grammar', 'Grammar & Spelling'),
        ('clarity', 'Clarity & Readability'),
        ('expand', 'Expand Content'),
        ('summarize', 'Summarize'),
        ('rephrase', 'Rephrase'),
        ('format', 'Improve Formatting')
    ])
    target_audience = serializers.ChoiceField(
        choices=[
            ('general', 'General Audience'),
            ('technical', 'Technical Audience'),
            ('academic', 'Academic Audience'),
            ('business', 'Business Audience'),
            ('students', 'Students')
        ],
        required=False,
        default='general'
    )
    additional_instructions = serializers.CharField(
        max_length=1000, 
        required=False,
        help_text="Additional instructions for enhancement"
    )


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
