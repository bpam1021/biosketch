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
# ENHANCED PRESENTATION MODELS - NEW LOGIC
# ============================================================================

class PresentationTemplate(models.Model):
    """Pre-built templates for presentations with enhanced features"""
    TEMPLATE_TYPES = [
        ('document', 'Document Template'),
        ('slide', 'Slide Template'),
    ]
    
    TEMPLATE_CATEGORIES = [
        ('academic', 'Academic Research'),
        ('business', 'Business Presentation'),
        ('creative', 'Creative Portfolio'),
        ('technical', 'Technical Documentation'),
        ('medical', 'Medical Case Study'),
        ('educational', 'Educational Content'),
        ('marketing', 'Marketing Presentation'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField()
    template_type = models.CharField(max_length=20, choices=TEMPLATE_TYPES)
    category = models.CharField(max_length=50, choices=TEMPLATE_CATEGORIES)
    thumbnail = models.ImageField(upload_to='presentation_templates/', blank=True, null=True)
    template_data = models.JSONField(default=dict, help_text="Template structure and styling")
    style_config = models.JSONField(default=dict, help_text="Default styling configuration")
    layout_config = models.JSONField(default=dict, help_text="Layout configuration")
    is_premium = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    usage_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-usage_count', 'name']

    def __str__(self):
        return f"{self.name} ({self.get_template_type_display()})"


class ChartTemplate(models.Model):
    """Available chart/diagram templates for AI generation"""
    CHART_CATEGORIES = [
        ('data_viz', 'Data Visualization'),
        ('process', 'Process Diagrams'),
        ('hierarchy', 'Organizational Charts'),
        ('comparison', 'Comparison Charts'),
        ('timeline', 'Timeline Charts'),
        ('geographic', 'Maps and Geographic'),
        ('scientific', 'Scientific Diagrams'),
        ('flowchart', 'Flowcharts'),
        ('mindmap', 'Mind Maps'),
        ('infographic', 'Infographics'),
    ]
    
    CHART_TYPES = [
        ('bar_chart', 'Bar Chart'),
        ('line_chart', 'Line Chart'), 
        ('pie_chart', 'Pie Chart'),
        ('scatter_plot', 'Scatter Plot'),
        ('flowchart', 'Flowchart'),
        ('process_diagram', 'Process Diagram'),
        ('org_chart', 'Organizational Chart'),
        ('timeline', 'Timeline'),
        ('venn_diagram', 'Venn Diagram'),
        ('mindmap', 'Mind Map'),
        ('network_diagram', 'Network Diagram'),
        ('infographic', 'Infographic'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=30, choices=CHART_CATEGORIES)
    chart_type = models.CharField(max_length=50, choices=CHART_TYPES)
    template_config = models.JSONField(default=dict, help_text="Chart.js/D3.js/Mermaid config template")
    style_options = models.JSONField(default=list, help_text="Available styling options")
    data_requirements = models.JSONField(default=dict, help_text="Required data structure and fields")
    sample_data = models.JSONField(default=dict, help_text="Sample data for preview")
    generation_prompts = models.JSONField(default=dict, help_text="AI prompts for generating this chart type")
    content_keywords = models.JSONField(default=list, help_text="Keywords that suggest this chart type")
    thumbnail = models.ImageField(upload_to='chart_templates/', blank=True, null=True)
    usage_count = models.PositiveIntegerField(default=0)
    is_premium = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-usage_count', 'name']

    def __str__(self):
        return f"{self.name} ({self.get_chart_type_display()})"


class Presentation(models.Model):
    """Enhanced presentation model supporting both documents and slides"""
    TYPE_CHOICES = [
        ('document', 'Document'),
        ('slide', 'Slide Deck'),
    ]
    
    QUALITY_CHOICES = [
        ('low', 'Low Quality'),
        ('medium', 'Medium Quality'), 
        ('high', 'High Quality'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('generating', 'Generating'),
        ('ready', 'Ready'),
        ('error', 'Error'),
        ('archived', 'Archived'),
    ]

    # Basic Info
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='new_presentations')
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    presentation_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='slide')
    
    # AI Generation Info
    original_prompt = models.TextField()
    quality = models.CharField(max_length=20, choices=QUALITY_CHOICES, default='medium')
    generated_outline = models.JSONField(default=dict, help_text="AI-generated presentation outline")
    generation_settings = models.JSONField(default=dict, help_text="Settings used for AI generation")
    
    # Template and Styling
    template = models.ForeignKey(PresentationTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    theme_settings = models.JSONField(default=dict, help_text="Colors, fonts, layout settings")
    brand_settings = models.JSONField(default=dict, help_text="Brand colors, logos, etc.")
    
    # Document-specific fields
    document_content = models.TextField(blank=True, help_text="Rich HTML content for document type")
    document_settings = models.JSONField(default=dict, help_text="Document formatting settings")
    page_layout = models.CharField(max_length=20, choices=[
        ('single_column', 'Single Column'),
        ('two_column', 'Two Column'),
        ('three_column', 'Three Column'),
    ], default='single_column')
    
    # Collaboration
    collaborators = models.ManyToManyField(User, related_name='collaborated_new_presentations', blank=True)
    is_public = models.BooleanField(default=False)
    allow_comments = models.BooleanField(default=True)
    sharing_settings = models.JSONField(default=dict, help_text="Sharing and permission settings")
    
    # Status and Metadata
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    word_count = models.PositiveIntegerField(default=0)
    estimated_duration = models.PositiveIntegerField(default=0, help_text="Estimated presentation duration in minutes")
    
    # Export and Publishing
    export_settings = models.JSONField(default=dict, help_text="Export configuration")
    published_url = models.URLField(blank=True, help_text="Public sharing URL")
    
    # Analytics
    view_count = models.PositiveIntegerField(default=0)
    analytics_data = models.JSONField(default=dict, help_text="Usage and engagement analytics")
    
    # Credits and Costs
    generation_cost = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal('0.00'))
    total_credits_used = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal('0.00'))
    
    # Export tracking
    is_exported = models.BooleanField(default=False)
    export_format = models.CharField(
        max_length=10, blank=True, 
        choices=[
            ('pptx', 'PowerPoint'), 
            ('pdf', 'PDF'), 
            ('mp4', 'Video'), 
            ('docx', 'Word Document'),
            ('html', 'HTML')
        ]
    )
    exported_file = models.FileField(upload_to='presentation_exports/', null=True, blank=True)
    video_settings = models.JSONField(default=dict, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_accessed = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.title} ({self.get_presentation_type_display()})"


class ContentSection(models.Model):
    """Universal content section for both documents and slides"""
    SECTION_TYPES = [
        # Document sections
        ('heading', 'Heading'),
        ('paragraph', 'Paragraph'),
        ('list', 'List'),
        ('table', 'Table'),
        ('image', 'Image'),
        ('code', 'Code Block'),
        ('quote', 'Quote'),
        
        # Slide sections
        ('title_slide', 'Title Slide'),
        ('content_slide', 'Content Slide'),
        ('image_slide', 'Image Slide'),
        ('chart_slide', 'Chart Slide'),
        ('comparison_slide', 'Comparison Slide'),
        
        # Shared
        ('diagram', 'Diagram/Chart'),
        ('video', 'Video'),
        ('audio', 'Audio'),
        ('interactive', 'Interactive Element'),
    ]

    # Basic Info
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    presentation = models.ForeignKey(Presentation, on_delete=models.CASCADE, related_name='content_sections')
    section_type = models.CharField(max_length=30, choices=SECTION_TYPES)
    title = models.CharField(max_length=500, blank=True)
    order = models.PositiveIntegerField(default=0)
    
    # Content
    content = models.TextField(blank=True, help_text="Raw content text")
    rich_content = models.TextField(blank=True, help_text="HTML/Markdown formatted content")
    content_data = models.JSONField(default=dict, help_text="Structured content data")
    
    # Media
    image_url = models.URLField(max_length=1000, blank=True)
    image_prompt = models.TextField(blank=True)
    media_files = models.JSONField(default=list, help_text="Associated media file URLs")
    
    # Layout and Styling
    layout_config = models.JSONField(default=dict, help_text="Section-specific layout")
    style_config = models.JSONField(default=dict, help_text="Colors, fonts, spacing")
    
    # Animation and Interaction (for slides)
    animation_config = models.JSONField(default=dict, help_text="Animation settings")
    interaction_config = models.JSONField(default=dict, help_text="Interactive elements")
    
    # AI Generation Tracking
    ai_generated = models.BooleanField(default=False)
    generation_prompt = models.TextField(blank=True)
    generation_metadata = models.JSONField(default=dict)
    
    # Canvas and visual elements (for slides)
    canvas_json = models.TextField(blank=True)
    rendered_image = models.ImageField(upload_to='rendered_sections/', blank=True, null=True)
    
    # Comments and collaboration
    comments = models.JSONField(default=list, blank=True, help_text="Comments on this section")
    version_history = models.JSONField(default=list, blank=True, help_text="Version history for tracking changes")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.title or 'Untitled'} ({self.get_section_type_display()})"


class DiagramElement(models.Model):
    """Individual diagrams/charts within content sections"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    content_section = models.ForeignKey(ContentSection, on_delete=models.CASCADE, related_name='diagrams')
    chart_template = models.ForeignKey(ChartTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Chart Configuration
    title = models.CharField(max_length=500, blank=True)
    chart_type = models.CharField(max_length=50)
    chart_data = models.JSONField(default=dict, help_text="Chart data and configuration")
    style_config = models.JSONField(default=dict, help_text="Custom styling")
    
    # AI Generation
    source_content = models.TextField(help_text="Original content used to generate chart")
    generation_prompt = models.TextField(blank=True)
    ai_suggestions = models.JSONField(default=list, help_text="AI-suggested improvements")
    
    # Position and Layout
    position_x = models.FloatField(default=0)
    position_y = models.FloatField(default=0)
    width = models.FloatField(default=100)
    height = models.FloatField(default=100)
    z_index = models.IntegerField(default=1)
    
    # Export
    rendered_image = models.ImageField(upload_to='rendered_charts/', blank=True, null=True)
    svg_data = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.title or 'Untitled Chart'} ({self.chart_type})"


class PresentationVersion(models.Model):
    """Version control for presentations"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    presentation = models.ForeignKey(Presentation, on_delete=models.CASCADE, related_name='versions')
    version_number = models.PositiveIntegerField()
    
    # Version Data
    content_snapshot = models.JSONField(help_text="Full presentation content at this version")
    changes_summary = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    
    # Auto-save info
    is_auto_save = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-version_number']
        unique_together = ['presentation', 'version_number']


class PresentationComment(models.Model):
    """Comments on presentations or sections"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    presentation = models.ForeignKey(Presentation, on_delete=models.CASCADE, related_name='presentation_comments')
    content_section = models.ForeignKey(ContentSection, on_delete=models.CASCADE, null=True, blank=True, related_name='section_comments')
    
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    position_data = models.JSONField(default=dict, help_text="Position within content")
    
    # Threading
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    
    # Status
    is_resolved = models.BooleanField(default=False)
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_presentation_comments')
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']


class PresentationExportJob(models.Model):
    """Track export jobs for presentations"""
    EXPORT_FORMATS = [
        ('pdf', 'PDF Document'),
        ('docx', 'Word Document'),
        ('pptx', 'PowerPoint'),
        ('html', 'HTML'),
        ('mp4', 'Video'),
        ('png', 'Images'),
        ('json', 'JSON Data'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    presentation = models.ForeignKey(Presentation, on_delete=models.CASCADE, related_name='export_jobs')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    
    export_format = models.CharField(max_length=10, choices=EXPORT_FORMATS)
    export_settings = models.JSONField(default=dict)
    selected_sections = models.JSONField(default=list, help_text="Specific sections to export")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    progress = models.PositiveIntegerField(default=0)
    
    # Results
    output_file = models.FileField(upload_to='presentation_exports/', blank=True, null=True)
    output_url = models.URLField(blank=True)
    error_message = models.TextField(blank=True)
    
    # Processing info
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']


class AIGenerationLog(models.Model):
    """Track AI generation requests and costs for presentations"""
    GENERATION_TYPES = [
        ('presentation_outline', 'Presentation Outline'),
        ('section_content', 'Section Content'),
        ('chart_generation', 'Chart Generation'),
        ('image_generation', 'Image Generation'),
        ('content_enhancement', 'Content Enhancement'),
        ('summary_generation', 'Summary Generation'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='presentation_ai_generations')
    presentation = models.ForeignKey(Presentation, on_delete=models.CASCADE, null=True, blank=True)
    content_section = models.ForeignKey(ContentSection, on_delete=models.CASCADE, null=True, blank=True)
    
    generation_type = models.CharField(max_length=30, choices=GENERATION_TYPES)
    prompt = models.TextField()
    model_used = models.CharField(max_length=100, default='gpt-4')
    
    # Cost tracking
    credits_used = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal('0.00'))
    tokens_consumed = models.PositiveIntegerField(default=0)
    
    # Results
    generated_content = models.JSONField(default=dict)
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)
    
    # Performance
    processing_time = models.FloatField(null=True, blank=True, help_text="Processing time in seconds")
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']


# ============================================================================
# KEEP OLD PRESENTATION MODELS FOR BACKWARD COMPATIBILITY (DEPRECATED)
# ============================================================================

# Keep old Slide model for existing data
class Slide(models.Model):
    """
    DEPRECATED: Old slide model - keeping for backward compatibility
    Use ContentSection with section_type='content_slide' for new presentations
    """
    id = models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')
    presentation = models.ForeignKey('OldPresentation', on_delete=models.CASCADE, related_name="slides")
    order = models.PositiveIntegerField(default=0)
    title = models.CharField(max_length=255)
    description = models.TextField()
    content_type = models.CharField(
        max_length=20, 
        choices=[('slide', 'Presentation Slide'), ('section', 'Document Section')], 
        default='slide'
    )
    rich_content = models.TextField(blank=True, help_text="Rich HTML content for document sections")
    content_blocks = models.JSONField(default=list, blank=True, help_text="Structured content blocks")
    canvas_json = models.TextField(blank=True)
    rendered_image = models.ImageField(upload_to='rendered_slides/', blank=True, null=True)
    diagrams = models.JSONField(default=list, blank=True, help_text="Diagram elements data")
    animations = models.JSONField(default=list, blank=True, help_text="Animation configurations")
    interactive_elements = models.JSONField(default=list, blank=True, help_text="Interactive elements like buttons, links")
    layout_template = models.CharField(max_length=50, blank=True, help_text="Layout template name")
    custom_css = models.TextField(blank=True, help_text="Custom CSS for this slide/section")
    background_settings = models.JSONField(default=dict, blank=True, help_text="Background color, image, gradient")
    image_prompt = models.TextField(blank=True)
    image_url = models.URLField(blank=True)
    comments = models.JSONField(default=list, blank=True, help_text="Comments on this slide/section")
    version_history = models.JSONField(default=list, blank=True, help_text="Version history for tracking changes")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return "Slide object"


# Keep old Presentation model for existing data
class OldPresentation(models.Model):
    """
    DEPRECATED: Old presentation model - keeping for backward compatibility
    Use new Presentation model for new presentations
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="old_presentations")
    title = models.CharField(max_length=255)
    original_prompt = models.TextField()
    presentation_type = models.CharField(
        max_length=20, 
        choices=[('slides', 'Slide Presentation'), ('document', 'Rich Document')], 
        default='slides'
    )
    document_content = models.TextField(blank=True, help_text="Rich HTML content for document type")
    document_settings = models.JSONField(default=dict, blank=True, help_text="Document formatting settings")
    is_public = models.BooleanField(default=False)
    allow_comments = models.BooleanField(default=False)
    collaborators = models.ManyToManyField(User, related_name='old_collaborated_presentations', blank=True)
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


class PresentationExportLog(models.Model):
    """Export logs for both old and new presentations"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    
    # Support both old and new presentation models
    old_presentation = models.ForeignKey(OldPresentation, on_delete=models.CASCADE, null=True, blank=True)
    new_presentation = models.ForeignKey(Presentation, on_delete=models.CASCADE, null=True, blank=True)
    
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
    used_in_documents = models.ManyToManyField(Document, blank=True)
    used_in_slides = models.ManyToManyField(Slide, blank=True)

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