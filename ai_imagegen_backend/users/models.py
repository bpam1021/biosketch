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
    """Microsoft Word-Perfect Documents with Professional Features"""
    title = models.CharField(max_length=255)
    template = models.ForeignKey(DocumentTemplate, null=True, blank=True, on_delete=models.SET_NULL)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    
    # Document metadata (like Word Properties)
    abstract = models.TextField(blank=True)
    keywords = models.CharField(max_length=500, blank=True)
    authors = models.JSONField(default=list)
    subject = models.CharField(max_length=255, blank=True)
    category = models.CharField(max_length=100, blank=True)
    comments = models.TextField(blank=True)
    
    # Content structure (Word-perfect hierarchy)
    content = models.TextField()  # Rich HTML with Word-like formatting
    structure = models.JSONField(default=dict)  # Chapter/section/subsection tree
    table_of_contents = models.BooleanField(default=True)
    auto_numbering = models.BooleanField(default=True)
    
    # Professional Word Features
    headers_footers = models.JSONField(default=dict)  # Different for odd/even/first pages
    page_breaks = models.JSONField(default=list)  # Manual page breaks
    section_breaks = models.JSONField(default=list)  # Section breaks
    bookmarks = models.JSONField(default=dict)  # Named bookmarks
    cross_references = models.JSONField(default=list)  # Cross-reference links
    footnotes = models.JSONField(default=dict)  # Footnotes and endnotes
    bibliography = models.JSONField(default=dict)  # Citations and bibliography
    
    # Document settings (Word-like)
    formatting = models.JSONField(default=dict)  # Styles, fonts, spacing
    page_settings = models.JSONField(default=dict)  # Size, margins, orientation
    print_settings = models.JSONField(default=dict)  # Print layout options
    review_settings = models.JSONField(default=dict)  # Track changes, comments
    
    # Collaboration (Word-like)
    track_changes = models.BooleanField(default=False)
    protection = models.JSONField(default=dict)  # Document protection settings
    sharing_permissions = models.JSONField(default=dict)  # Read/write permissions
    
    # Advanced Features
    mail_merge_data = models.JSONField(default=dict)  # Mail merge fields
    macros = models.JSONField(default=dict)  # Custom automation
    custom_properties = models.JSONField(default=dict)  # Custom document properties
    
    # Statistics (Word-like)
    word_count = models.IntegerField(default=0)
    character_count = models.IntegerField(default=0)
    paragraph_count = models.IntegerField(default=0)
    line_count = models.IntegerField(default=0)
    page_count = models.IntegerField(default=1)
    reading_time = models.IntegerField(default=0)  # Estimated reading time in minutes
    
    # AI Enhancement (Napkin.ai-style)
    ai_suggestions = models.JSONField(default=list)  # AI writing suggestions
    diagram_opportunities = models.JSONField(default=list)  # Text that could become diagrams
    content_analysis = models.JSONField(default=dict)  # AI content analysis
    
    # Version Control
    version = models.CharField(max_length=20, default='1.0')
    revision_history = models.JSONField(default=list)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_accessed = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.title

    def update_statistics(self):
        """Update word count, character count, etc. like Word"""
        import re
        from bs4 import BeautifulSoup
        
        # Parse HTML content
        soup = BeautifulSoup(self.content, 'html.parser')
        text = soup.get_text()
        
        # Calculate statistics
        self.word_count = len(text.split())
        self.character_count = len(text)
        self.paragraph_count = len(re.findall(r'\n\s*\n', text)) + 1
        self.line_count = len(text.split('\n'))
        self.reading_time = max(1, self.word_count // 200)  # Average reading speed
        
        # Estimate page count (approximately 250 words per page)
        self.page_count = max(1, self.word_count // 250)
        
        self.save(update_fields=['word_count', 'character_count', 'paragraph_count', 
                               'line_count', 'page_count', 'reading_time'])

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
    """Microsoft PowerPoint-Perfect Presentations with Professional Features"""
    title = models.CharField(max_length=255)
    theme = models.ForeignKey(SlideTheme, on_delete=models.CASCADE)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    
    # Presentation settings (PowerPoint-like)
    slide_size = models.CharField(max_length=20, default='16:9')  # 16:9, 4:3, custom
    orientation = models.CharField(max_length=20, default='landscape')  # landscape, portrait
    
    # Master Slides (PowerPoint feature)
    master_slides = models.JSONField(default=dict)  # Master slide layouts
    slide_masters = models.JSONField(default=list)  # Custom slide masters
    
    # Transitions and Animations (PowerPoint-perfect)
    global_transition = models.CharField(max_length=50, default='fade')
    transition_duration = models.FloatField(default=1.0)  # seconds
    auto_advance = models.BooleanField(default=False)
    timing = models.JSONField(default=dict)  # Per-slide timing
    animation_schemes = models.JSONField(default=dict)  # Animation settings
    
    # Presentation Features
    presenter_notes = models.BooleanField(default=True)
    slide_numbers = models.BooleanField(default=True)
    handout_settings = models.JSONField(default=dict)  # Handout layouts
    
    # Professional Features (PowerPoint-like)
    slide_sorter_view = models.JSONField(default=dict)  # Slide thumbnails arrangement
    outline_structure = models.JSONField(default=dict)  # Presentation outline
    comments_enabled = models.BooleanField(default=True)
    rehearsal_timings = models.JSONField(default=dict)  # Slide rehearsal times
    
    # Collaboration (PowerPoint-like)
    track_changes = models.BooleanField(default=False)
    protection = models.JSONField(default=dict)  # Presentation protection
    sharing_permissions = models.JSONField(default=dict)  # Read/write permissions
    co_authors = models.ManyToManyField(User, related_name='coauthored_presentations', blank=True)
    
    # Advanced Features
    macros = models.JSONField(default=dict)  # VBA-like macros
    custom_shows = models.JSONField(default=list)  # Custom slide sequences
    hyperlinks = models.JSONField(default=dict)  # Internal/external links
    action_buttons = models.JSONField(default=list)  # Interactive buttons
    
    # AI Enhancement (Napkin.ai-style)
    ai_design_suggestions = models.JSONField(default=list)  # AI layout suggestions
    content_analysis = models.JSONField(default=dict)  # AI content analysis
    diagram_opportunities = models.JSONField(default=list)  # Text that could become diagrams
    design_consistency_score = models.FloatField(default=0.0)  # AI-calculated design score
    
    # Export and Publishing
    export_settings = models.JSONField(default=dict)  # Export options
    published_url = models.URLField(blank=True)  # Online presentation URL
    
    # Statistics
    slide_count = models.IntegerField(default=0)
    total_duration = models.IntegerField(default=0)  # Total presentation time
    view_count = models.IntegerField(default=0)
    
    # Version Control
    version = models.CharField(max_length=20, default='1.0')
    revision_history = models.JSONField(default=list)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_accessed = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.title

    def calculate_total_duration(self):
        """Calculate total presentation duration like PowerPoint"""
        total_seconds = 0
        for slide in self.slides.all():
            duration = slide.duration or self.timing.get('default_duration', 30)
            total_seconds += duration
        
        self.total_duration = total_seconds
        self.save(update_fields=['total_duration'])
        return total_seconds

    def update_slide_count(self):
        """Update slide count like PowerPoint"""
        self.slide_count = self.slides.count()
        self.save(update_fields=['slide_count'])

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
    """Napkin.ai-Style Intelligent Diagram Generation System"""
    
    # Chart Types (Napkin.ai-style comprehensive)
    CHART_TYPES = [
        # Data Visualization
        ('bar_chart', 'Bar Chart'),
        ('line_chart', 'Line Chart'),
        ('pie_chart', 'Pie Chart'),
        ('scatter_plot', 'Scatter Plot'),
        ('histogram', 'Histogram'),
        ('heatmap', 'Heat Map'),
        ('treemap', 'Tree Map'),
        ('bubble_chart', 'Bubble Chart'),
        
        # Process & Flow
        ('flowchart', 'Flowchart'),
        ('process_flow', 'Process Flow'),
        ('user_journey', 'User Journey'),
        ('workflow', 'Workflow Diagram'),
        ('swimlane', 'Swimlane Diagram'),
        
        # Organizational & Structure  
        ('org_chart', 'Organizational Chart'),
        ('hierarchy', 'Hierarchy Diagram'),
        ('mind_map', 'Mind Map'),
        ('concept_map', 'Concept Map'),
        ('network_diagram', 'Network Diagram'),
        
        # Comparison & Analysis
        ('comparison_table', 'Comparison Table'),
        ('pros_cons', 'Pros & Cons'),
        ('swot_analysis', 'SWOT Analysis'),
        ('matrix', 'Decision Matrix'),
        ('venn_diagram', 'Venn Diagram'),
        
        # Timeline & Planning
        ('timeline', 'Timeline'),
        ('gantt_chart', 'Gantt Chart'),
        ('roadmap', 'Roadmap'),
        ('milestones', 'Milestones'),
        
        # Business & Strategy
        ('business_model_canvas', 'Business Model Canvas'),
        ('value_proposition', 'Value Proposition Canvas'),
        ('customer_journey', 'Customer Journey Map'),
        ('funnel', 'Sales/Marketing Funnel'),
        
        # Technical
        ('architecture_diagram', 'Architecture Diagram'),
        ('database_schema', 'Database Schema'),
        ('wireframe', 'Wireframe'),
        ('system_diagram', 'System Diagram'),
    ]
    
    title = models.CharField(max_length=255)
    chart_type = models.CharField(max_length=50, choices=CHART_TYPES)
    
    # Napkin.ai-style data structure
    data = models.JSONField(default=dict)  # Chart.js/D3.js compatible data
    config = models.JSONField(default=dict)  # Chart configuration
    styling = models.JSONField(default=dict)  # Colors, fonts, layout
    
    # AI-generated content (like Napkin.ai)
    source_text = models.TextField()  # Original text that generated this diagram
    ai_interpretation = models.JSONField(default=dict)  # AI's understanding of the text
    generation_prompt = models.TextField()  # AI prompt used for generation
    confidence_score = models.FloatField(default=0.0)  # AI confidence in diagram choice
    
    # Visual generation
    image_url = models.URLField(null=True, blank=True)  # Generated diagram image
    svg_data = models.TextField(blank=True)  # SVG representation
    canvas_data = models.JSONField(default=dict)  # Canvas/fabric.js data
    
    # Napkin.ai-style intelligence
    alternative_suggestions = models.JSONField(default=list)  # Other chart types AI suggests
    auto_layout = models.BooleanField(default=True)  # AI-optimized layout
    smart_labeling = models.BooleanField(default=True)  # AI-generated labels
    data_extraction = models.JSONField(default=dict)  # Extracted entities, numbers, relationships
    
    # Content replacement (like Napkin.ai)
    replaces_text_range = models.JSONField(default=dict)  # Which text this diagram replaces
    original_content = models.TextField()  # Original text content
    replacement_type = models.CharField(max_length=50, choices=[
        ('inline', 'Inline Replacement'),
        ('block', 'Block Replacement'),
        ('sidebar', 'Sidebar Addition'),
        ('popup', 'Popup/Modal'),
    ], default='inline')
    
    # Usage tracking
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    usage_count = models.IntegerField(default=0)  # How often this diagram is viewed/used
    
    # Document/Slide integration  
    used_in_documents = models.ManyToManyField('Document', blank=True)
    used_in_slides = models.ManyToManyField('Slide', blank=True, related_name='diagram_elements')
    
    # AI Enhancement
    auto_update = models.BooleanField(default=False)  # Auto-update when source text changes
    smart_resize = models.BooleanField(default=True)  # AI-optimized sizing
    accessibility_features = models.JSONField(default=dict)  # Screen reader friendly
    
    # Export capabilities
    export_formats = models.JSONField(default=list)  # Supported export formats
    high_res_available = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} ({self.get_chart_type_display()})"
    
    def analyze_text_for_diagram(self, text):
        """Napkin.ai-style text analysis for diagram suggestions"""
        import re
        
        suggestions = []
        
        # Data patterns
        if re.search(r'\d+%|\d+\.\d+%|percentage|percent', text, re.IGNORECASE):
            suggestions.append(('pie_chart', 0.8, 'Contains percentage data'))
            suggestions.append(('bar_chart', 0.7, 'Percentage data works well in bars'))
        
        # Process patterns
        if re.search(r'step|process|workflow|procedure|then|next|first|second', text, re.IGNORECASE):
            suggestions.append(('flowchart', 0.9, 'Sequential process detected'))
            suggestions.append(('process_flow', 0.8, 'Step-by-step workflow'))
        
        # Comparison patterns
        if re.search(r'versus|vs|compare|comparison|difference|advantage|disadvantage', text, re.IGNORECASE):
            suggestions.append(('comparison_table', 0.9, 'Comparison content detected'))
            suggestions.append(('pros_cons', 0.8, 'Pros/cons structure found'))
        
        # Timeline patterns
        if re.search(r'timeline|chronology|history|year|month|date|before|after', text, re.IGNORECASE):
            suggestions.append(('timeline', 0.9, 'Temporal sequence detected'))
            suggestions.append(('roadmap', 0.7, 'Sequential timeline content'))
        
        # Organizational patterns
        if re.search(r'team|organization|hierarchy|manager|report|department', text, re.IGNORECASE):
            suggestions.append(('org_chart', 0.8, 'Organizational structure detected'))
        
        # Relationship patterns  
        if re.search(r'connect|relationship|link|network|node|graph', text, re.IGNORECASE):
            suggestions.append(('network_diagram', 0.8, 'Network relationships found'))
            suggestions.append(('mind_map', 0.7, 'Conceptual relationships'))
        
        return sorted(suggestions, key=lambda x: x[1], reverse=True)
    
    def generate_smart_layout(self):
        """AI-optimized layout like Napkin.ai"""
        # This would integrate with AI services for optimal layout
        layout_config = {
            'auto_spacing': True,
            'smart_alignment': True,
            'responsive_sizing': True,
            'accessibility_compliant': True,
            'brand_consistent': True
        }
        return layout_config
    
    def extract_data_from_text(self, text):
        """Extract structured data from text like Napkin.ai"""
        import re
        
        extracted = {
            'numbers': re.findall(r'\d+(?:\.\d+)?', text),
            'percentages': re.findall(r'\d+(?:\.\d+)?%', text),
            'entities': [],  # Would use NLP for entity extraction
            'relationships': [],  # Would use AI for relationship detection
            'categories': [],  # Would use AI for category identification
        }
        
        return extracted

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