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


# ============================================================================
# CLEAN PRESENTATION MODELS - Document vs Slide Architecture
# ============================================================================


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


# ============================================================================
# NEW CLEAN PRESENTATION MODELS - COMPLETE REBUILD
# ============================================================================
# Document = Microsoft Word, Slides = PowerPoint

class DocumentTemplate(models.Model):
    """Professional document templates (Academic, Business, Technical, etc.)"""
    name = models.CharField(max_length=100)  # "Academic Paper", "Business Report"
    description = models.TextField()
    structure = models.JSONField(default=dict)  # Default chapter/section structure
    formatting = models.JSONField(default=dict)  # Fonts, margins, spacing
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Document(models.Model):
    """Word-like documents with professional structure"""
    title = models.CharField(max_length=255)
    template = models.ForeignKey(DocumentTemplate, null=True, blank=True, on_delete=models.SET_NULL)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    
    # Document metadata
    abstract = models.TextField(blank=True)
    keywords = models.CharField(max_length=500, blank=True)
    authors = models.JSONField(default=list)  # Multiple authors support
    
    # Content structure
    content = models.TextField()  # Rich HTML content
    structure = models.JSONField(default=dict)  # Chapter/section hierarchy
    table_of_contents = models.BooleanField(default=True)
    
    # Document settings
    formatting = models.JSONField(default=dict)  # Fonts, margins, spacing
    page_settings = models.JSONField(default=dict)  # Size, orientation, margins
    
    # Status
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    word_count = models.IntegerField(default=0)
    page_count = models.IntegerField(default=1)

    def __str__(self):
        return self.title

class DocumentChapter(models.Model):
    """Document chapters (1, 2, 3...)"""
    document = models.ForeignKey(Document, related_name='chapters', on_delete=models.CASCADE)
    number = models.IntegerField()
    title = models.CharField(max_length=255)
    content = models.TextField()
    order = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"Chapter {self.number}: {self.title}"

class DocumentSection(models.Model):
    """Document sections (1.1, 1.2, 2.1...)"""
    chapter = models.ForeignKey(DocumentChapter, related_name='sections', on_delete=models.CASCADE)
    parent_section = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE)
    level = models.IntegerField()  # 1, 2, 3 (for 1.1, 1.1.1, 1.1.1.1)
    number = models.CharField(max_length=20)  # "1.1", "1.1.1"
    title = models.CharField(max_length=255)
    content = models.TextField()
    order = models.IntegerField()

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"Section {self.number}: {self.title}"

class SlideTheme(models.Model):
    """PowerPoint-style themes"""
    name = models.CharField(max_length=100)  # "Corporate Blue", "Modern Dark"
    colors = models.JSONField(default=dict)  # Primary, secondary, accent colors
    fonts = models.JSONField(default=dict)   # Heading and body fonts
    effects = models.JSONField(default=dict) # Shadows, gradients, animations
    is_premium = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class SlideTemplate(models.Model):
    """PowerPoint-style slide layouts"""
    name = models.CharField(max_length=100)
    layout_type = models.CharField(max_length=50, choices=[
        ('title', 'Title Slide'),
        ('title_content', 'Title + Content'),
        ('two_column', 'Two Column'),
        ('image_content', 'Image + Content'),
        ('full_image', 'Full Image'),
        ('comparison', 'Comparison'),
        ('agenda', 'Agenda/List'),
        ('chart', 'Chart/Graph'),
        ('table', 'Table'),
        ('quote', 'Quote/Citation'),
    ])
    zones = models.JSONField(default=list)  # Layout zones (title, content, image areas)
    preview_image = models.ImageField(upload_to='slide_templates/', null=True, blank=True)
    is_premium = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.name} ({self.layout_type})"

class SlidePresentation(models.Model):
    """PowerPoint-like presentations"""
    title = models.CharField(max_length=255)
    theme = models.ForeignKey(SlideTheme, on_delete=models.CASCADE)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    
    # Presentation settings
    slide_size = models.CharField(max_length=20, default='16:9')  # 16:9, 4:3, custom
    transition_type = models.CharField(max_length=50, default='fade')
    auto_advance = models.BooleanField(default=False)
    timing = models.JSONField(default=dict)  # Per-slide timing
    
    # Status
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    slide_count = models.IntegerField(default=0)

    def __str__(self):
        return self.title

class Slide(models.Model):
    """Individual PowerPoint-style slides"""
    presentation = models.ForeignKey(SlidePresentation, related_name='slides', on_delete=models.CASCADE)
    template = models.ForeignKey(SlideTemplate, on_delete=models.CASCADE)
    order = models.IntegerField()
    
    # Slide content - structured by zones
    content = models.JSONField(default=dict)  # {zone_id: content}
    notes = models.TextField(blank=True)  # Speaker notes
    
    # Slide-specific settings
    transition = models.CharField(max_length=50, blank=True)
    duration = models.IntegerField(null=True)  # Auto-advance timing
    background = models.JSONField(default=dict)  # Custom background
    
    # Status
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"Slide {self.order + 1} - {self.presentation.title}"

# Shared models for both documents and slides
class MediaAsset(models.Model):
    """Images, videos, files used in presentations"""
    file = models.FileField(upload_to='presentation_media/')
    file_type = models.CharField(max_length=50)
    title = models.CharField(max_length=255, blank=True)
    alt_text = models.CharField(max_length=500, blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title or f"Media {self.id}"

class DiagramElement(models.Model):
    """AI-generated diagrams for both documents and slides"""
    title = models.CharField(max_length=255)
    chart_type = models.CharField(max_length=50)
    data = models.JSONField(default=dict)
    image_url = models.URLField(null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Can be used in documents or slides
    used_in_documents = models.ManyToManyField('Document', blank=True)
    used_in_slides = models.ManyToManyField('Slide', blank=True, related_name='diagram_elements')

    def __str__(self):
        return self.title

class PresentationExport(models.Model):
    """Export jobs for documents and presentations"""
    # Content reference (either document or slide presentation)
    document = models.ForeignKey(Document, null=True, blank=True, on_delete=models.CASCADE)
    slide_presentation = models.ForeignKey(SlidePresentation, null=True, blank=True, on_delete=models.CASCADE)
    
    export_format = models.CharField(max_length=10, choices=[
        ('pdf', 'PDF'),
        ('docx', 'Word Document'),
        ('pptx', 'PowerPoint'),
        ('html', 'HTML'),
        ('png', 'Images'),
    ])
    
    # Export settings
    settings = models.JSONField(default=dict)
    
    # Status
    status = models.CharField(max_length=20, default='pending')
    file_path = models.FileField(upload_to='exports/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        content_type = "Document" if self.document else "Slides"
        content_title = self.document.title if self.document else self.slide_presentation.title
        return f"{content_type}: {content_title} ({self.export_format.upper()})"