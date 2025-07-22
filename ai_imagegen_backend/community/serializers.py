from rest_framework import serializers
from community.models import *
from users.models import GeneratedImage, Field
from django.contrib.auth.models import User
from users.serializers import UserSerializer

class ChatMessageSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', default="Guest")

    class Meta:
        model = ChatMessage
        fields = ['id', 'message', 'username', 'timestamp']

class ImageCommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = ImageComment
        fields = ["id", "user", "content", "created_at"]

class UpvoteSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Upvote
        fields = ["id", "user", "created_at"]

class RemixSerializer(serializers.ModelSerializer):
    remixer = UserSerializer(read_only=True)

    class Meta:
        model = Remix
        fields = ["id", "original", "remixed_image", "remixer", "created_at"]

class ChallengeSerializer(serializers.ModelSerializer):
    entries_count = serializers.SerializerMethodField()
    entries = serializers.SerializerMethodField()

    class Meta:
        model = Challenge
        fields = [
            "id", "title", "description", "start_date", "end_date",
            "is_active", "entries_count", "entries",
        ]

    def get_entries(self, obj):
        entries = ChallengeEntry.objects.filter(challenge=obj).select_related("user")
        return [
            {
                "id": entry.id,
                "image_url": entry.image.url if entry.image else None,
                "upvotes": entry.votes.count(),
                "author": {
                    "id": entry.user.id,
                    "username": entry.user.username
                }
            }
            for entry in entries
        ]

    def get_entries_count(self, obj):
        return ChallengeEntry.objects.filter(challenge=obj).count()

class ChallengeEntryCommentSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = ChallengeEntryComment
        fields = ["id", "user", "user_username", "text", "created_at"]


class ChallengeEntrySerializer(serializers.ModelSerializer):
    image = serializers.ImageField(read_only=True)
    challenge_title = serializers.ReadOnlyField(source='challenge.title')
    user_username = serializers.ReadOnlyField(source='user.username')
    comments = ChallengeEntryCommentSerializer(many=True, read_only=True)
    upvotes = serializers.SerializerMethodField()

    class Meta:
        model = ChallengeEntry
        fields = [
            'id', 'challenge', 'challenge_title', 'user', 'user_username', 'image',
            'title', 'description', 'prompt', 'generator_name', 'source_url',
            'edited', 'is_public', 'is_flagged', 'upvotes', 'comments', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'is_flagged']

    def get_image_url(self, obj):
        return obj.image.url if obj.image else None

    def get_upvotes(self, obj):
        return obj.votes.count()

class ChallengeEntryVoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChallengeEntryVote
        fields = ['id', 'user', 'entry', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']

class FieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = Field
        fields = ['id', 'name', 'description']

class GeneratedImageSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    field = FieldSerializer()
    upvotes = serializers.SerializerMethodField()

    class Meta:
        model = GeneratedImage
        fields = [
            "id", "user", "image_url", "image_name", "image_title",
            "image_size", "image_type", "prompt", "prompt_key",
            "user_description", "token_count", "sequence_index", "created_at", "upvotes", "field",
        ]

    def get_upvotes(self, obj):
        return obj.upvotes.count()

class CommunityMemberSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = CommunityMembership
        fields = ['id', 'user_username', 'role']


class CommunityGroupSerializer(serializers.ModelSerializer):
    creator_username = serializers.CharField(source='creator.username', read_only=True)
    member_count = serializers.SerializerMethodField()
    posts_count = serializers.SerializerMethodField()
    is_private = serializers.SerializerMethodField()
    members = CommunityMemberSerializer(source="memberships", many=True, read_only=True)

    class Meta:
        model = CommunityGroup
        fields = [
            "id", "name", "description", "compliance_rules", "privacy", "is_private",
            "created_at", "group_image", "creator_username",
            "member_count", "posts_count", "members", "is_approved", "is_banned", "is_deleted",
        ]

    def get_member_count(self, obj):
        return obj.memberships.count()

    def get_posts_count(self, obj):
        return obj.posts.count()
    
    def get_is_private(self, obj):
        return obj.privacy == "private"


class CommunityMembershipSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = CommunityMembership
        fields = ["id", "community", "user", "user_username", "role", "joined_at"]

class CommunityPostSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    community_name = serializers.CharField(source='community.name', read_only=True)
    likes_count = serializers.SerializerMethodField()
    class Meta:
        model = CommunityPost
        fields = ["id", "community", "community_name", "user", "user_username", "title", "content", "image", "created_at", "updated_at", "likes_count"]
        read_only_fields = ["community", "user", "created_at", "updated_at"]

    def get_likes_count(self, obj):
        return obj.likes.count()
    
    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image:
            return request.build_absolute_uri(obj.image.url)
        return None

class CommunityCommentSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = CommunityComment
        fields = ["id", "post", "user", "user_username", "content", "created_at"]
        read_only_fields = ["post", "user", "user_username", "created_at"]
        read_only_fields = ["post", "user", "user_username", "created_at"]