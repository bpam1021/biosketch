import uuid
from django.db import models
from django.utils.timezone import now
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from decimal import Decimal
from django.conf import settings


class Badge(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icon_url = models.URLField(blank=True)

    def __str__(self):
        return self.name

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(blank=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    followers = models.ManyToManyField(User, related_name='following', blank=True)
    credits = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=Decimal("5.00"),
        help_text="User's available credits (supports fractional values)"
    )

    # 📋 Newly added fields
    first_name = models.CharField(max_length=30, blank=True)
    last_name = models.CharField(max_length=30, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    profile_visibility = models.CharField(
        max_length=10,
        choices=[('public', 'Public'), ('private', 'Private')],
        default='public'
    )
    challenges_won = models.PositiveIntegerField(default=0)

    # 🏆 Achievements / Badges
    badges = models.ManyToManyField(Badge, blank=True)

    def __str__(self):
        return f"{self.user.username}'s profile"

class Feedback(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="feedbacks"
    )
    name = models.CharField(max_length=100)
    email = models.EmailField()
    message = models.TextField()
    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Feedback from {self.name} ({self.email})"
    
class FriendInvitation(models.Model):
    inviter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invitations')
    invitee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_invitations')
    invited_at = models.DateTimeField(auto_now_add=True)
    reward_credited = models.BooleanField(default=False)

    class Meta:
        unique_together = ('inviter', 'invitee')

    def __str__(self):
        return f"{self.inviter.username} invited {self.invitee.username}"

class NotificationSettings(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_settings')
    
    email_notifications = models.BooleanField(default=True)
    push_notifications = models.BooleanField(default=True)
    new_follower_alert = models.BooleanField(default=True)
    challenge_update_alert = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.username}'s Notification Settings"
    
# Automatically create a UserProfile when a User is created
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

class CreditTransaction(models.Model):
    TRANSACTION_TYPES = [
        ('recharge', 'Recharge'),
        ('usage', 'Usage'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    amount = models.DecimalField(
        max_digits=8,  # Allows up to 999,999.99 credits
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Positive for recharges, negative for usage"
    )
    type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    timestamp = models.DateTimeField(auto_now_add=True)
    description = models.TextField(blank=True)

    def __str__(self):
        sign = "+" if self.amount >= 0 else "-"
        return f"{self.user.username} | {self.type} | {sign}{abs(self.amount)} credits @ {self.timestamp}"

class Achievement(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()
    icon = models.ImageField(upload_to="achievement_icons/", blank=True, null=True)
    criteria_code = models.CharField(max_length=100, unique=True)  # e.g., "100_images", "win_3_challenges"

    def __str__(self):
        return self.name

class UserAchievement(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_achievements')
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE, related_name='user_achievements')
    achieved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'achievement')

    def __str__(self):
        return f"{self.user.username} achieved {self.achievement.name}"

class UserSubscription(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    purchase_date = models.DateTimeField(auto_now_add=True, null=True)
    plan_name = models.CharField(max_length=50, blank=True, null=True)
    amount = models.PositiveIntegerField(default=0, help_text="Actual payment in cents after discount")
    base_price = models.PositiveIntegerField(default=0, help_text="Base price in cents before discount")
    credits_added = models.PositiveIntegerField(default=0)
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.user.username} | {self.plan_name} | ${self.amount / 100:.2f} | +{self.credits_added} credits"

class GeneratedImage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    image_name = models.CharField(max_length=255, default="default_image.png")
    image_url = models.TextField()
    token_count = models.IntegerField(default=0)
    image_title = models.CharField(max_length=255, default="default_title")
    image_size = models.CharField(max_length=50, default="default_size")
    image_type = models.CharField(max_length=50, default="default_type")
    image_model = models.CharField(max_length=50, default="default_model")
    image_quality = models.CharField(max_length=50, default="default_quality")
    prompt = models.TextField(blank=True, null=True)
    prompt_key = models.CharField(max_length=255, default='default_value')
    is_published = models.BooleanField(default=False)
    is_remixed = models.BooleanField(default=False)
    sequence_index = models.IntegerField(default=0)
    sci_description = models.TextField(blank=True, null=True)
    user_description = models.TextField(blank=True, null=True)
    field = models.ForeignKey('Field', null=True, blank=True, on_delete=models.SET_NULL, related_name='images')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.image_name} - {self.user.username}"

class Field(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name
    
class Presentation(models.Model):
    """
    A presentation or document created by a user. Can contain slides or rich document content.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="presentations")
    title = models.CharField(max_length=255)
    original_prompt = models.TextField()
    presentation_type = models.CharField(
        max_length=20, 
        choices=[('slides', 'Slide Presentation'), ('document', 'Rich Document')], 
        default='slides'
    )
    
    # Document-specific fields
    document_content = models.TextField(blank=True, help_text="Rich HTML content for document type")
    document_settings = models.JSONField(default=dict, blank=True, help_text="Document formatting settings")
    
    # Collaboration features
    is_public = models.BooleanField(default=False)
    allow_comments = models.BooleanField(default=False)
    collaborators = models.ManyToManyField(User, related_name='collaborated_presentations', blank=True)
    
    # Template and reuse
    is_template = models.BooleanField(default=False)
    template_category = models.CharField(max_length=100, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    is_exported = models.BooleanField(default=False)
    export_format = models.CharField(
        max_length=10, blank=True, 
        choices=[('pptx', 'PowerPoint'), ('pdf', 'PDF'), ('mp4', 'Video'), ('docx', 'Word Document')]
    )
    exported_file = models.FileField(upload_to='exports/', null=True, blank=True)
    video_settings = models.JSONField(default=dict, blank=True)
    
    def __str__(self):
        return f"{self.title} (by {self.user.username})"


class Slide(models.Model):
    """
    A single slide within a presentation or a section within a document.
    """
    presentation = models.ForeignKey(Presentation, on_delete=models.CASCADE, related_name="slides")
    
    order = models.PositiveIntegerField(default=0)
    title = models.CharField(max_length=255)
    description = models.TextField()
    content_type = models.CharField(
        max_length=20, 
        choices=[('slide', 'Presentation Slide'), ('section', 'Document Section')], 
        default='slide'
    )
    
    # Rich content for documents
    rich_content = models.TextField(blank=True, help_text="Rich HTML content for document sections")
    content_blocks = models.JSONField(default=list, blank=True, help_text="Structured content blocks")
    
    # Canvas and visual elements
    canvas_json = models.TextField(blank=True)
    rendered_image = models.ImageField(upload_to='rendered_slides/', blank=True, null=True)  # Generated image for the slide
    
    # Interactive elements
    diagrams = models.JSONField(default=list, blank=True, help_text="Diagram elements data")
    animations = models.JSONField(default=list, blank=True, help_text="Animation configurations")
    interactive_elements = models.JSONField(default=list, blank=True, help_text="Interactive elements like buttons, links")
    
    # Styling and layout
    layout_template = models.CharField(max_length=50, blank=True, help_text="Layout template name")
    custom_css = models.TextField(blank=True, help_text="Custom CSS for this slide/section")
    background_settings = models.JSONField(default=dict, blank=True, help_text="Background color, image, gradient")
    
    # AI-generated content
    image_prompt = models.TextField(blank=True)  # original AI image prompt
    image_url = models.URLField(blank=True)      # generated image link (e.g., from OpenAI)
    
    # Comments and collaboration
    comments = models.JSONField(default=list, blank=True, help_text="Comments on this slide/section")
    version_history = models.JSONField(default=list, blank=True, help_text="Version history for tracking changes")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order']  # Always return slides ordered

    def __str__(self):
        return "Slide object"

class PresentationExportLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    presentation = models.ForeignKey(Presentation, on_delete=models.CASCADE)
    export_format = models.CharField(max_length=10, choices=[('pptx', 'PPTX'), ('pdf', 'PDF')], null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    success = models.BooleanField(default=True)

class TemplateCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class TemplateImage(models.Model):
    TEMPLATE_TYPE_CHOICES = [
        ('2d', '2D'),
        ('3d', '3D'),
    ]
    category = models.ForeignKey(TemplateCategory, related_name='images', on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    image = models.ImageField(upload_to='templates/')
    type = models.CharField(max_length=2, choices=TEMPLATE_TYPE_CHOICES, default='2d')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class TemplateRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    submitted_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    admin_response = models.TextField(blank=True)

class Donation(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    name = models.CharField(max_length=100, blank=True)
    email = models.EmailField()
    amount = models.DecimalField(max_digits=8, decimal_places=2)
    stripe_payment_intent = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_guest(self):
        return self.user is None

    def __str__(self):
        return f"${self.amount} from {'user: ' + self.user.username if self.user else self.email}"

