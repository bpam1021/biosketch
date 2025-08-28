"""
New Presentation Views - Clean Architecture
Document = Microsoft Word, Slides = PowerPoint
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction, models
from django.contrib.auth.models import User
import json

from users.models import (
    # New clean models
    Document, DocumentChapter, DocumentSection, DocumentTemplate,
    SlidePresentation, Slide, SlideTemplate, SlideTheme,
    MediaAsset, DiagramElement, PresentationExport
)
from users.serializers_new import (
    DocumentSerializer, DocumentChapterSerializer, DocumentSectionSerializer,
    DocumentTemplateSerializer, SlidePresentationSerializer, SlideSerializer, 
    SlideTemplateSerializer, SlideThemeSerializer, MediaAssetSerializer, 
    DiagramElementSerializer, PresentationExportSerializer, CreateDocumentSerializer, 
    CreateSlidePresentationSerializer, UnifiedPresentationSerializer, 
    PresentationTypeTemplateSerializer
)


class DocumentViewSet(viewsets.ModelViewSet):
    """API endpoints for Word-like documents"""
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Document.objects.filter(created_by=self.request.user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['get'])
    def chapters(self, request, pk=None):
        """Get all chapters for a document"""
        document = self.get_object()
        chapters = document.chapters.all().prefetch_related('sections')
        serializer = DocumentChapterSerializer(chapters, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_chapter(self, request, pk=None):
        """Add a new chapter to document"""
        document = self.get_object()
        
        data = request.data.copy()
        data['document'] = document.id
        data['number'] = document.chapters.count() + 1
        data['order'] = document.chapters.count()
        
        serializer = DocumentChapterSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def generate_toc(self, request, pk=None):
        """Generate table of contents"""
        document = self.get_object()
        chapters = document.chapters.all().prefetch_related('sections')
        
        toc = []
        for chapter in chapters:
            chapter_toc = {
                'type': 'chapter',
                'number': chapter.number,
                'title': chapter.title,
                'page': 1,  # Mock page numbers
                'sections': []
            }
            
            for section in chapter.sections.all():
                section_toc = {
                    'type': 'section',
                    'number': section.number,
                    'title': section.title,
                    'page': 1,
                    'level': section.level
                }
                chapter_toc['sections'].append(section_toc)
            
            toc.append(chapter_toc)
        
        return Response({'table_of_contents': toc})

    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Get document statistics"""
        document = self.get_object()
        
        # Calculate word count, character count, etc.
        all_content = document.content + ' '.join([
            chapter.content for chapter in document.chapters.all()
        ] + [
            section.content for chapter in document.chapters.all()
            for section in chapter.sections.all()
        ])
        
        # Remove HTML tags for accurate counting
        import re
        text_content = re.sub(r'<[^>]+>', '', all_content)
        
        stats = {
            'word_count': len(text_content.split()),
            'character_count': len(text_content),
            'character_count_no_spaces': len(text_content.replace(' ', '')),
            'paragraph_count': text_content.count('\n\n') + 1,
            'page_count': max(1, len(text_content.split()) // 250),  # ~250 words per page
            'chapter_count': document.chapters.count(),
            'section_count': sum([chapter.sections.count() for chapter in document.chapters.all()]),
        }
        
        return Response(stats)

    @action(detail=True, methods=['post'])
    def export(self, request, pk=None):
        """Export document to various formats"""
        document = self.get_object()
        export_format = request.data.get('format', 'pdf')
        export_settings = request.data.get('settings', {})
        
        # Create export job
        export_job = PresentationExport.objects.create(
            document=document,
            export_format=export_format,
            settings=export_settings,
            status='pending'
        )
        
        # TODO: Queue export job with Celery
        # export_document_task.delay(export_job.id)
        
        return Response({
            'export_id': export_job.id,
            'status': 'pending',
            'message': 'Export job queued'
        })


class DocumentChapterViewSet(viewsets.ModelViewSet):
    """API endpoints for document chapters"""
    serializer_class = DocumentChapterSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DocumentChapter.objects.filter(document__created_by=self.request.user)

    @action(detail=True, methods=['get'])
    def sections(self, request, pk=None):
        """Get all sections for a chapter"""
        chapter = self.get_object()
        sections = chapter.sections.all()
        serializer = DocumentSectionSerializer(sections, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_section(self, request, pk=None):
        """Add a new section to chapter"""
        chapter = self.get_object()
        
        data = request.data.copy()
        data['chapter'] = chapter.id
        
        # Auto-generate section number
        parent_id = data.get('parent_section')
        if parent_id:
            parent_section = get_object_or_404(DocumentSection, id=parent_id)
            sibling_count = chapter.sections.filter(parent_section=parent_id).count()
            data['number'] = f"{parent_section.number}.{sibling_count + 1}"
            data['level'] = parent_section.level + 1
        else:
            top_level_count = chapter.sections.filter(level=1).count()
            data['number'] = f"{chapter.number}.{top_level_count + 1}"
            data['level'] = 1
        
        data['order'] = chapter.sections.count()
        
        serializer = DocumentSectionSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DocumentSectionViewSet(viewsets.ModelViewSet):
    """API endpoints for document sections"""
    serializer_class = DocumentSectionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DocumentSection.objects.filter(chapter__document__created_by=self.request.user)


class SlidePresentationViewSet(viewsets.ModelViewSet):
    """API endpoints for PowerPoint-like presentations"""
    serializer_class = SlidePresentationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SlidePresentation.objects.filter(created_by=self.request.user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['get'])
    def slides(self, request, pk=None):
        """Get all slides for a presentation"""
        presentation = self.get_object()
        slides = presentation.slides.all()
        serializer = SlideSerializer(slides, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_slide(self, request, pk=None):
        """Add a new slide to presentation"""
        presentation = self.get_object()
        
        data = request.data.copy()
        data['presentation'] = presentation.id
        data['order'] = presentation.slides.count()
        
        # Get template
        template_id = data.get('template')
        if template_id:
            template = get_object_or_404(SlideTemplate, id=template_id)
            
            # Initialize slide with template zones
            slide_data = {
                'presentation': presentation.id,
                'template': template.id,
                'order': presentation.slides.count(),
                'content': {},
                'background': {
                    'type': 'color',
                    'value': presentation.theme.colors.get('background', '#ffffff')
                }
            }
            
            # Initialize content for each zone
            for zone in template.zones:
                slide_data['content'][zone['id']] = ''
            
            serializer = SlideSerializer(data=slide_data)
            if serializer.is_valid():
                slide = serializer.save()
                
                # Update slide count
                presentation.slide_count = presentation.slides.count()
                presentation.save()
                
                return Response(SlideSerializer(slide).data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({'error': 'Template is required'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def duplicate_slide(self, request, pk=None):
        """Duplicate an existing slide"""
        presentation = self.get_object()
        slide_order = request.data.get('slide_order', 0)
        
        try:
            original_slide = presentation.slides.get(order=slide_order)
            
            # Create duplicate
            new_slide = Slide.objects.create(
                presentation=presentation,
                template=original_slide.template,
                order=presentation.slides.count(),
                content=original_slide.content.copy(),
                notes=original_slide.notes,
                background=original_slide.background.copy(),
                transition=original_slide.transition,
                duration=original_slide.duration
            )
            
            # Update slide count
            presentation.slide_count = presentation.slides.count()
            presentation.save()
            
            return Response(SlideSerializer(new_slide).data, status=status.HTTP_201_CREATED)
            
        except Slide.DoesNotExist:
            return Response({'error': 'Slide not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def reorder_slides(self, request, pk=None):
        """Reorder slides in presentation"""
        presentation = self.get_object()
        slide_orders = request.data.get('slide_orders', [])
        
        with transaction.atomic():
            for i, slide_id in enumerate(slide_orders):
                try:
                    slide = presentation.slides.get(id=slide_id)
                    slide.order = i
                    slide.save()
                except Slide.DoesNotExist:
                    continue
        
        return Response({'message': 'Slides reordered successfully'})

    @action(detail=True, methods=['post'])
    def export(self, request, pk=None):
        """Export presentation to various formats"""
        presentation = self.get_object()
        export_format = request.data.get('format', 'pptx')
        export_settings = request.data.get('settings', {})
        
        # Create export job
        export_job = PresentationExport.objects.create(
            slide_presentation=presentation,
            export_format=export_format,
            settings=export_settings,
            status='pending'
        )
        
        # TODO: Queue export job with Celery
        # export_slides_task.delay(export_job.id)
        
        return Response({
            'export_id': export_job.id,
            'status': 'pending',
            'message': 'Export job queued'
        })


class SlideViewSet(viewsets.ModelViewSet):
    """API endpoints for individual slides"""
    serializer_class = SlideSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Slide.objects.filter(presentation__created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def update_content(self, request, pk=None):
        """Update slide content for specific zones"""
        slide = self.get_object()
        zone_updates = request.data.get('content', {})
        
        # Update content for specific zones
        updated_content = slide.content.copy()
        updated_content.update(zone_updates)
        
        slide.content = updated_content
        slide.save()
        
        return Response({'message': 'Slide content updated'})

    @action(detail=True, methods=['post'])
    def update_background(self, request, pk=None):
        """Update slide background"""
        slide = self.get_object()
        background_data = request.data.get('background', {})
        
        slide.background = background_data
        slide.save()
        
        return Response({'message': 'Slide background updated'})

    @action(detail=True, methods=['post'])
    def add_diagram(self, request, pk=None):
        """Add AI-generated diagram to slide"""
        slide = self.get_object()
        
        diagram_data = request.data.copy()
        diagram_data['created_by'] = self.request.user.id
        
        serializer = DiagramElementSerializer(data=diagram_data)
        if serializer.is_valid():
            diagram = serializer.save()
            diagram.used_in_slides.add(slide)
            
            return Response(DiagramElementSerializer(diagram).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SlideTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoints for slide templates (read-only)"""
    queryset = SlideTemplate.objects.all()
    serializer_class = SlideTemplateSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Get template categories"""
        categories = SlideTemplate.objects.values_list('layout_type', flat=True).distinct()
        return Response({'categories': list(categories)})

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by category if requested
        layout_type = self.request.query_params.get('layout_type')
        if layout_type:
            queryset = queryset.filter(layout_type=layout_type)
        
        # Filter premium templates for non-premium users
        # TODO: Add premium user check
        # if not self.request.user.is_premium:
        #     queryset = queryset.filter(is_premium=False)
        
        return queryset


class SlideThemeViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoints for slide themes (read-only)"""
    queryset = SlideTheme.objects.all()
    serializer_class = SlideThemeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter premium themes for non-premium users
        # TODO: Add premium user check
        # if not self.request.user.is_premium:
        #     queryset = queryset.filter(is_premium=False)
        
        return queryset


class MediaAssetViewSet(viewsets.ModelViewSet):
    """API endpoints for media assets (images, videos, etc.)"""
    serializer_class = MediaAssetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MediaAsset.objects.filter(uploaded_by=self.request.user)

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class DiagramElementViewSet(viewsets.ModelViewSet):
    """API endpoints for AI-generated diagrams"""
    serializer_class = DiagramElementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DiagramElement.objects.filter(created_by=self.request.user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def regenerate(self, request, pk=None):
        """Regenerate diagram with new parameters"""
        diagram = self.get_object()
        
        # TODO: Implement AI regeneration logic
        # This would call your AI service to regenerate the diagram
        
        return Response({'message': 'Diagram regeneration queued'})


class PresentationExportViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoints for export jobs (read-only)"""
    serializer_class = PresentationExportSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PresentationExport.objects.filter(
            models.Q(document__created_by=self.request.user) |
            models.Q(slide_presentation__created_by=self.request.user)
        )

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download exported file"""
        export_job = self.get_object()
        
        if export_job.status == 'completed' and export_job.file_path:
            # TODO: Generate download URL or serve file
            return Response({
                'download_url': export_job.file_path.url,
                'filename': f"{export_job.export_format}_export.{export_job.export_format}"
            })
        
        return Response({
            'error': 'Export not ready',
            'status': export_job.status
        }, status=status.HTTP_400_BAD_REQUEST)


# ============================================================================
# PRESENTATION TYPE SELECTOR API
# ============================================================================

class PresentationTypeViewSet(viewsets.ViewSet):
    """API endpoints for presentation type selection and creation"""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def templates(self, request):
        """Get available templates for document and slide types"""
        document_templates = DocumentTemplate.objects.all()
        slide_themes = SlideTheme.objects.all()
        slide_templates = SlideTemplate.objects.all()
        
        return Response({
            'document_templates': DocumentTemplateSerializer(document_templates, many=True).data,
            'slide_themes': SlideThemeSerializer(slide_themes, many=True).data,
            'slide_templates': SlideTemplateSerializer(slide_templates, many=True).data
        })

    @action(detail=False, methods=['post'])
    def create_document(self, request):
        """Create a new document"""
        data = request.data.copy()
        data['created_by'] = request.user.id
        
        serializer = DocumentSerializer(data=data)
        if serializer.is_valid():
            document = serializer.save()
            return Response(DocumentSerializer(document).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def create_slide_presentation(self, request):
        """Create a new slide presentation"""
        data = request.data.copy()
        data['created_by'] = request.user.id
        
        serializer = SlidePresentationSerializer(data=data)
        if serializer.is_valid():
            presentation = serializer.save()
            return Response(SlidePresentationSerializer(presentation).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)