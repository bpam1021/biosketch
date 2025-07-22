from django.db import models
from django.contrib.auth.models import User
from users.models import GeneratedImage
from django.core.validators import FileExtensionValidator

# 🖼️ Comments on Generated Images
class ImageComment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    image = models.ForeignKey(GeneratedImage, on_delete=models.CASCADE, related_name="comments")
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

# 👍 Upvotes on Generated Images
class Upvote(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    image = models.ForeignKey(GeneratedImage, on_delete=models.CASCADE, related_name="upvotes")
    created_at = models.DateTimeField(auto_now_add=True)

# 🔄 Remixes of Generated Images
class Remix(models.Model):
    original = models.ForeignKey(GeneratedImage, on_delete=models.CASCADE, related_name="remixed_by")
    remixer = models.ForeignKey(User, on_delete=models.CASCADE)
    remixed_image = models.ForeignKey(GeneratedImage, on_delete=models.CASCADE, related_name="remix_source")
    created_at = models.DateTimeField(auto_now_add=True)

# 🏁 Challenge structure
class Challenge(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        return self.title

class ChallengeEntry(models.Model):
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE, related_name='entries')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='challenge_entries')
    image = models.ImageField(upload_to='challenge_entries/')
    title = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    prompt = models.TextField(blank=True, null=True)
    generator_name = models.CharField(max_length=100, blank=True, null=True)
    source_url = models.URLField(blank=True, null=True)
    edited = models.BooleanField(default=False)
    is_public = models.BooleanField(default=True)
    is_flagged = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('challenge', 'user')

    def __str__(self):
        return f"{self.user.username} - {self.challenge.title}"

    @property
    def like_count(self):
        return self.votes.count()

    @property
    def comment_count(self):
        return self.comments.count()

class ChallengeEntryVote(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    entry = models.ForeignKey(ChallengeEntry, related_name='votes', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'entry')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} voted {self.entry.id}"

class ChallengeEntryComment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    entry = models.ForeignKey(ChallengeEntry, related_name='comments', on_delete=models.CASCADE)
    text = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} on {self.entry.id}"

# 💬 Chat
class ChatMessage(models.Model):
    room_name = models.CharField(max_length=255)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField(blank=True)
    media = models.FileField(upload_to="chat_media/", null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

# 🏛️ Community Grouping
class CommunityGroup(models.Model):
    PRIVACY_CHOICES = [
        ('public', 'Public'),
        ('private', 'Private'),
    ]

    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    compliance_rules = models.TextField(help_text="Rules to follow when participating", blank=True)
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_communities')
    privacy = models.CharField(max_length=10, choices=PRIVACY_CHOICES, default='public')
    is_approved = models.BooleanField(default=False)
    is_banned = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    ban_reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    group_image = models.ImageField(
        upload_to='community_images/',
        blank=True,
        null=True,
        validators=[FileExtensionValidator(['jpg', 'jpeg', 'png', 'webp'])]
    )

    def __str__(self):
        return self.name

class CommunityMembership(models.Model):
    ROLE_CHOICES = [
        ('member', 'Member'),
        ('admin', 'Admin'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='community_memberships')
    community = models.ForeignKey(CommunityGroup, on_delete=models.CASCADE, related_name='memberships')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='member')
    joined_at = models.DateTimeField(auto_now_add=True)
    invited_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='invited_members')

    class Meta:
        unique_together = ('user', 'community')

    def __str__(self):
        return f"{self.user.username} in {self.community.name} as {self.role}"

class CommunityPost(models.Model):
    community = models.ForeignKey(CommunityGroup, on_delete=models.CASCADE, related_name='posts')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='community_posts')
    title = models.CharField(max_length=255)
    content = models.TextField(blank=True)
    
    # ✅ Change from URLField to ImageField
    image = models.ImageField(
        upload_to="community_images/",
        blank=True,
        null=True,
        validators=[FileExtensionValidator(['jpg', 'jpeg', 'png', 'webp'])]
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    likes = models.ManyToManyField(User, related_name='liked_community_posts', blank=True)

    def __str__(self):
        return f"{self.title} by {self.user.username} in {self.community.name}"

class CommunityComment(models.Model):
    post = models.ForeignKey(CommunityPost, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='community_comments')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comment by {self.user.username} on {self.post.title}"
