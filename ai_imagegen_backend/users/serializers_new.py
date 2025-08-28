"""
New Presentation Serializers - Clean Architecture
Document = Microsoft Word, Slides = PowerPoint
"""

from rest_framework import serializers
from users.models import (
    Document, DocumentChapter, DocumentSection, DocumentTemplate,
    SlidePresentation, Slide, SlideTemplate, SlideTheme,
    MediaAsset, DiagramElement, PresentationExport
)


class DocumentTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentTemplate
        fields = '__all__'


class DocumentSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentSection
        fields = '__all__'

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Add subsections if they exist
        if hasattr(instance, 'documentsection_set'):
            subsections = instance.documentsection_set.all()
            data['subsections'] = DocumentSectionSerializer(subsections, many=True).data
        return data


class DocumentChapterSerializer(serializers.ModelSerializer):
    sections = DocumentSectionSerializer(many=True, read_only=True)
    
    class Meta:
        model = DocumentChapter
        fields = '__all__'


class DocumentSerializer(serializers.ModelSerializer):
    chapters = DocumentChapterSerializer(many=True, read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = Document
        fields = '__all__'
        read_only_fields = ('created_by', 'created_at', 'updated_at', 'word_count', 'page_count')

    def create(self, validated_data):
        # Set default formatting if not provided
        if not validated_data.get('formatting'):
            validated_data['formatting'] = {
                'fontSize': 16,
                'fontFamily': 'Georgia, serif',
                'lineHeight': 1.6,
                'headingStyles': {
                    'h1': {'fontSize': 28, 'color': '#111827', 'spacing': 24},
                    'h2': {'fontSize': 22, 'color': '#374151', 'spacing': 20},
                    'h3': {'fontSize': 18, 'color': '#4b5563', 'spacing': 16}
                },
                'paragraphSpacing': 16,
                'indentation': 0
            }
        
        # Set default page settings if not provided
        if not validated_data.get('page_settings'):
            validated_data['page_settings'] = {
                'size': 'A4',
                'orientation': 'portrait',
                'margins': {'top': 25, 'right': 25, 'bottom': 25, 'left': 25},
                'header': False,
                'footer': True,
                'pageNumbers': True
            }
        
        return super().create(validated_data)


class SlideThemeSerializer(serializers.ModelSerializer):
    class Meta:
        model = SlideTheme
        fields = '__all__'


class SlideTemplateSerializer(serializers.ModelSerializer):
    preview_url = serializers.CharField(source='preview_image.url', read_only=True)
    
    class Meta:
        model = SlideTemplate
        fields = '__all__'


class SlideSerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(source='template.name', read_only=True)
    template_layout = serializers.CharField(source='template.layout_type', read_only=True)
    template_zones = serializers.JSONField(source='template.zones', read_only=True)
    
    class Meta:
        model = Slide
        fields = '__all__'

    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        # Add template information for easier frontend handling
        if instance.template:
            data['template_info'] = {
                'name': instance.template.name,
                'layout_type': instance.template.layout_type,
                'zones': instance.template.zones
            }
        
        return data


class SlidePresentationSerializer(serializers.ModelSerializer):
    slides = SlideSerializer(many=True, read_only=True)
    theme_name = serializers.CharField(source='theme.name', read_only=True)
    theme_colors = serializers.JSONField(source='theme.colors', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = SlidePresentation
        fields = '__all__'
        read_only_fields = ('created_by', 'created_at', 'updated_at', 'slide_count')

    def create(self, validated_data):
        # Set default settings if not provided
        if not validated_data.get('slide_size'):
            validated_data['slide_size'] = '16:9'
        
        if not validated_data.get('transition_type'):
            validated_data['transition_type'] = 'fade'
        
        if not validated_data.get('timing'):
            validated_data['timing'] = {}
        
        return super().create(validated_data)


class MediaAssetSerializer(serializers.ModelSerializer):
    file_url = serializers.CharField(source='file.url', read_only=True)
    file_size = serializers.IntegerField(source='file.size', read_only=True)
    uploaded_by_username = serializers.CharField(source='uploaded_by.username', read_only=True)
    
    class Meta:
        model = MediaAsset
        fields = '__all__'
        read_only_fields = ('uploaded_by', 'created_at')

    def create(self, validated_data):
        # Auto-detect file type from uploaded file
        file_obj = validated_data.get('file')
        if file_obj and not validated_data.get('file_type'):
            content_type = getattr(file_obj, 'content_type', '')
            if content_type.startswith('image/'):
                validated_data['file_type'] = 'image'
            elif content_type.startswith('video/'):
                validated_data['file_type'] = 'video'
            elif content_type.startswith('audio/'):
                validated_data['file_type'] = 'audio'
            else:
                validated_data['file_type'] = 'document'
        
        return super().create(validated_data)


class DiagramElementSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    used_in_documents_count = serializers.IntegerField(source='used_in_documents.count', read_only=True)
    used_in_slides_count = serializers.IntegerField(source='used_in_slides.count', read_only=True)
    
    class Meta:
        model = DiagramElement
        fields = '__all__'
        read_only_fields = ('created_by', 'created_at')

    def create(self, validated_data):
        # Set default data structure if not provided
        if not validated_data.get('data'):
            validated_data['data'] = {
                'type': validated_data.get('chart_type', 'bar'),
                'data': {
                    'labels': [],
                    'datasets': []
                },
                'options': {
                    'responsive': True,
                    'plugins': {
                        'legend': {'position': 'top'},
                        'title': {
                            'display': True,
                            'text': validated_data.get('title', 'Chart')
                        }
                    }
                }
            }
        
        return super().create(validated_data)


class PresentationExportSerializer(serializers.ModelSerializer):
    content_title = serializers.SerializerMethodField()
    content_type = serializers.SerializerMethodField()
    file_url = serializers.CharField(source='file_path.url', read_only=True)
    
    class Meta:
        model = PresentationExport
        fields = '__all__'
        read_only_fields = ('created_at', 'completed_at', 'status')

    def get_content_title(self, obj):
        if obj.document:
            return obj.document.title
        elif obj.slide_presentation:
            return obj.slide_presentation.title
        return 'Unknown'

    def get_content_type(self, obj):
        if obj.document:
            return 'document'
        elif obj.slide_presentation:
            return 'slide_presentation'
        return 'unknown'


# ============================================================================
# PRESENTATION TYPE SELECTOR SERIALIZERS
# ============================================================================

class PresentationTypeTemplateSerializer(serializers.Serializer):
    """Serializer for presentation type selection templates"""
    document_templates = DocumentTemplateSerializer(many=True, read_only=True)
    slide_themes = SlideThemeSerializer(many=True, read_only=True)
    slide_templates = SlideTemplateSerializer(many=True, read_only=True)


class CreateDocumentSerializer(serializers.Serializer):
    """Serializer for creating a new document"""
    title = serializers.CharField(max_length=255)
    template_id = serializers.IntegerField(required=False)
    abstract = serializers.CharField(required=False, allow_blank=True)
    keywords = serializers.CharField(required=False, allow_blank=True)
    authors = serializers.ListField(child=serializers.CharField(), required=False)
    
    def create(self, validated_data):
        template_id = validated_data.pop('template_id', None)
        template = None
        
        if template_id:
            try:
                template = DocumentTemplate.objects.get(id=template_id)
            except DocumentTemplate.DoesNotExist:
                pass
        
        return Document.objects.create(
            template=template,
            **validated_data
        )


class CreateSlidePresentationSerializer(serializers.Serializer):
    """Serializer for creating a new slide presentation"""
    title = serializers.CharField(max_length=255)
    theme_id = serializers.IntegerField()
    slide_size = serializers.ChoiceField(choices=['16:9', '4:3'], default='16:9')
    transition_type = serializers.CharField(default='fade')
    
    def create(self, validated_data):
        theme_id = validated_data.pop('theme_id')
        theme = SlideTheme.objects.get(id=theme_id)
        
        return SlidePresentation.objects.create(
            theme=theme,
            **validated_data
        )


# ============================================================================
# UNIFIED PRESENTATION SERIALIZER (FOR BOTH TYPES)
# ============================================================================

class UnifiedPresentationSerializer(serializers.Serializer):
    """Unified serializer that can handle both documents and slide presentations"""
    id = serializers.UUIDField(read_only=True)
    title = serializers.CharField()
    type = serializers.CharField()  # 'document' or 'slide_presentation'
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    created_by = serializers.CharField(source='created_by.username', read_only=True)
    
    # Document-specific fields
    word_count = serializers.IntegerField(required=False)
    page_count = serializers.IntegerField(required=False)
    chapter_count = serializers.SerializerMethodField()
    
    # Slide presentation-specific fields
    slide_count = serializers.IntegerField(required=False)
    theme_name = serializers.SerializerMethodField()
    
    def get_chapter_count(self, obj):
        if hasattr(obj, 'chapters'):
            return obj.chapters.count()
        return 0
    
    def get_theme_name(self, obj):
        if hasattr(obj, 'theme') and obj.theme:
            return obj.theme.name
        return None

    def to_representation(self, instance):
        # Determine the type based on the model
        if isinstance(instance, Document):
            data = DocumentSerializer(instance).data
            data['type'] = 'document'
        elif isinstance(instance, SlidePresentation):
            data = SlidePresentationSerializer(instance).data
            data['type'] = 'slide_presentation'
        else:
            data = super().to_representation(instance)
        
        return data