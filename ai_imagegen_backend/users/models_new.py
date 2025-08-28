# New Presentation Models - Clean Architecture
# Document = Microsoft Word, Slides = PowerPoint

from django.db import models
from django.contrib.auth.models import User
import json

class DocumentTemplate(models.Model):
    """Professional document templates (Academic, Business, Technical, etc.)"""
    name = models.CharField(max_length=100)  # "Academic Paper", "Business Report"
    description = models.TextField()
    structure = models.JSONField()  # Default chapter/section structure
    formatting = models.JSONField()  # Fonts, margins, spacing
    created_at = models.DateTimeField(auto_now_add=True)

class Document(models.Model):
    """Word-like documents with professional structure"""
    title = models.CharField(max_length=255)
    template = models.ForeignKey(DocumentTemplate, null=True, on_delete=models.SET_NULL)
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

class DocumentChapter(models.Model):
    """Document chapters (1, 2, 3...)"""
    document = models.ForeignKey(Document, related_name='chapters', on_delete=models.CASCADE)
    number = models.IntegerField()
    title = models.CharField(max_length=255)
    content = models.TextField()
    order = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

class DocumentSection(models.Model):
    """Document sections (1.1, 1.2, 2.1...)"""
    chapter = models.ForeignKey(DocumentChapter, related_name='sections', on_delete=models.CASCADE)
    parent_section = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE)
    level = models.IntegerField()  # 1, 2, 3 (for 1.1, 1.1.1, 1.1.1.1)
    number = models.CharField(max_length=20)  # "1.1", "1.1.1"
    title = models.CharField(max_length=255)
    content = models.TextField()
    order = models.IntegerField()

class SlideTheme(models.Model):
    """PowerPoint-style themes"""
    name = models.CharField(max_length=100)  # "Corporate Blue", "Modern Dark"
    colors = models.JSONField()  # Primary, secondary, accent colors
    fonts = models.JSONField()   # Heading and body fonts
    effects = models.JSONField() # Shadows, gradients, animations
    is_premium = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

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
    zones = models.JSONField()  # Layout zones (title, content, image areas)
    preview_image = models.ImageField(upload_to='slide_templates/', null=True)
    is_premium = models.BooleanField(default=False)

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

# Shared models for both documents and slides
class MediaAsset(models.Model):
    """Images, videos, files used in presentations"""
    file = models.FileField(upload_to='presentation_media/')
    file_type = models.CharField(max_length=50)
    title = models.CharField(max_length=255, blank=True)
    alt_text = models.CharField(max_length=500, blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

class DiagramElement(models.Model):
    """AI-generated diagrams for both documents and slides"""
    title = models.CharField(max_length=255)
    chart_type = models.CharField(max_length=50)
    data = models.JSONField()
    image_url = models.URLField(null=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Can be used in documents or slides
    used_in_documents = models.ManyToManyField(Document, blank=True)
    used_in_slides = models.ManyToManyField(Slide, blank=True)

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
    file_path = models.FileField(upload_to='exports/', null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True)