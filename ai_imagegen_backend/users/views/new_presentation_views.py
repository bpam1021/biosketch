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
from django.utils import timezone

# Import Celery tasks for AI generation
from users.tasks import (
    generate_document_ai_task,
    generate_slides_ai_task,
    convert_text_to_diagram_task,
    export_presentation_task
)
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
    
    def retrieve(self, request, pk=None):
        """Retrieve a specific presentation (document or slide presentation)"""
        user = request.user
        
        # Try to find the presentation in documents first
        try:
            document = Document.objects.get(id=pk, created_by=user)
            serializer = DocumentSerializer(document)
            return Response({
                'type': 'document',
                'data': serializer.data
            })
        except Document.DoesNotExist:
            pass
        
        # Try to find the presentation in slide presentations
        try:
            slide_presentation = SlidePresentation.objects.get(id=pk, created_by=user)
            serializer = SlidePresentationSerializer(slide_presentation)
            return Response({
                'type': 'slide_presentation', 
                'data': serializer.data
            })
        except SlidePresentation.DoesNotExist:
            pass
        
        # If not found in either, return 404
        return Response(
            {'error': 'Presentation not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    def update(self, request, pk=None):
        """Update a specific presentation (document or slide presentation)"""
        user = request.user
        
        # Try to find the presentation in documents first
        try:
            document = Document.objects.get(id=pk, created_by=user)
            serializer = DocumentSerializer(document, data=request.data, partial=True)
            if serializer.is_valid():
                document = serializer.save()
                # Update statistics after saving content changes
                if 'content' in request.data:
                    document.update_statistics()
                return Response({
                    'type': 'document',
                    'data': DocumentSerializer(document).data
                })
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Document.DoesNotExist:
            pass
        
        # Try to find the presentation in slide presentations
        try:
            slide_presentation = SlidePresentation.objects.get(id=pk, created_by=user)
            serializer = SlidePresentationSerializer(slide_presentation, data=request.data, partial=True)
            if serializer.is_valid():
                slide_presentation = serializer.save()
                return Response({
                    'type': 'slide_presentation',
                    'data': SlidePresentationSerializer(slide_presentation).data
                })
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except SlidePresentation.DoesNotExist:
            pass
        
        # If not found in either, return 404
        return Response(
            {'error': 'Presentation not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    def partial_update(self, request, pk=None):
        """Partially update a specific presentation (document or slide presentation) - PATCH method"""
        user = request.user
        
        # Try to find the presentation in documents first
        try:
            document = Document.objects.get(id=pk, created_by=user)
            serializer = DocumentSerializer(document, data=request.data, partial=True)
            if serializer.is_valid():
                document = serializer.save()
                # Update statistics after saving content changes
                if 'content' in request.data:
                    document.update_statistics()
                return Response({
                    'type': 'document',
                    'data': DocumentSerializer(document).data
                })
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Document.DoesNotExist:
            pass
        
        # Try to find the presentation in slide presentations
        try:
            slide_presentation = SlidePresentation.objects.get(id=pk, created_by=user)
            serializer = SlidePresentationSerializer(slide_presentation, data=request.data, partial=True)
            if serializer.is_valid():
                slide_presentation = serializer.save()
                return Response({
                    'type': 'slide_presentation',
                    'data': SlidePresentationSerializer(slide_presentation).data
                })
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except SlidePresentation.DoesNotExist:
            pass
        
        # If not found in either, return 404
        return Response(
            {'error': 'Presentation not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    def destroy(self, request, pk=None):
        """Delete a specific presentation (document or slide presentation)"""
        user = request.user
        
        # Try to find the presentation in documents first
        try:
            document = Document.objects.get(id=pk, created_by=user)
            document.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Document.DoesNotExist:
            pass
        
        # Try to find the presentation in slide presentations
        try:
            slide_presentation = SlidePresentation.objects.get(id=pk, created_by=user)
            slide_presentation.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except SlidePresentation.DoesNotExist:
            pass
        
        # If not found in either, return 404
        return Response(
            {'error': 'Presentation not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )

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

    @action(detail=False, methods=['post'])
    def generate_document_ai(self, request):
        """Generate complete document using AI from user prompt"""
        prompt = request.data.get('prompt', '')
        document_type = request.data.get('document_type', 'business')
        template_id = request.data.get('template_id')
        
        if not prompt:
            return Response({'error': 'Prompt is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Queue AI document generation using Celery
            task_result = generate_document_ai_task.delay(
                prompt=prompt,
                document_type=document_type,
                template_id=template_id,
                user_id=request.user.id
            )
            
            return Response({
                'task_id': task_result.id,
                'status': 'processing',
                'message': 'Document generation started. Use task_id to check status.',
                'prompt': prompt,
                'document_type': document_type
            }, status=status.HTTP_202_ACCEPTED)
            
        except Exception as e:
            return Response({
                'error': 'AI generation failed to start',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def check_generation_status(self, request):
        """Check status of AI generation task"""
        task_id = request.query_params.get('task_id')
        if not task_id:
            return Response({'error': 'task_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from celery.result import AsyncResult
            from celery import current_app
            import logging
            
            logger = logging.getLogger(__name__)
            logger.info(f"Checking status for task_id: {task_id}")
            
            # Check if Celery broker is accessible
            try:
                # Get Celery connection info
                broker_info = current_app.control.inspect().stats()
                if not broker_info:
                    return Response({
                        'error': 'Celery broker not available',
                        'details': 'Cannot connect to Celery broker. Make sure Redis/RabbitMQ is running.',
                        'task_id': task_id,
                        'status': 'broker_error'
                    }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            except Exception as broker_error:
                logger.error(f"Celery broker connection failed: {broker_error}")
                # Continue anyway, try to get task result
            
            task_result = AsyncResult(task_id)
            
            # Check task state
            task_state = task_result.state
            logger.info(f"Task {task_id} state: {task_state}")
            
            if task_result.ready():
                result = task_result.result
                logger.info(f"Task {task_id} result: {result}")
                
                if isinstance(result, dict) and result.get('status') == 'success':
                    # Task completed successfully
                    return Response({
                        'status': 'completed',
                        'result': result,
                        'task_state': task_state
                    })
                else:
                    # Task failed or returned error
                    error_msg = result.get('error') if isinstance(result, dict) else str(result)
                    return Response({
                        'status': 'failed',
                        'error': error_msg,
                        'task_state': task_state,
                        'task_id': task_id
                    })
            else:
                # Task still processing
                info = getattr(task_result, 'info', {})
                progress = 0
                
                if isinstance(info, dict):
                    progress = info.get('progress', 0)
                
                return Response({
                    'status': 'processing',
                    'progress': progress,
                    'task_state': task_state,
                    'task_id': task_id,
                    'info': info if isinstance(info, dict) else {}
                })
                
        except ImportError as e:
            return Response({
                'error': 'Celery not properly configured',
                'details': f'Import error: {str(e)}',
                'task_id': task_id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            import traceback
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to check task status for {task_id}: {e}")
            logger.error(traceback.format_exc())
            
            return Response({
                'error': 'Failed to check task status',
                'details': str(e),
                'task_id': task_id,
                'exception_type': type(e).__name__
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def generate_slides_ai(self, request):
        """Generate complete slide presentation using AI from user prompt"""
        prompt = request.data.get('prompt', '')
        theme_id = request.data.get('theme_id')
        slide_size = request.data.get('slide_size', '16:9')
        
        if not prompt:
            return Response({'error': 'Prompt is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not theme_id:
            return Response({'error': 'Theme is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Verify theme exists
            SlideTheme.objects.get(id=theme_id)
            
            # Queue AI slide generation using Celery
            task_result = generate_slides_ai_task.delay(
                prompt=prompt,
                theme_id=theme_id,
                slide_size=slide_size,
                user_id=request.user.id
            )
            
            return Response({
                'task_id': task_result.id,
                'status': 'processing',
                'message': 'Slide presentation generation started. Use task_id to check status.',
                'prompt': prompt,
                'theme_id': theme_id,
                'slide_size': slide_size
            }, status=status.HTTP_202_ACCEPTED)
                
        except SlideTheme.DoesNotExist:
            return Response({'error': 'Theme not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': 'AI generation failed to start',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def convert_text_to_diagram(self, request):
        """Convert selected text to diagram using Napkin.ai-style AI and replace the content"""
        text = request.data.get('text', '')
        chart_type = request.data.get('chart_type', '')
        document_id = request.data.get('document_id')
        slide_id = request.data.get('slide_id')
        
        # Content replacement parameters
        selection_start = request.data.get('selection_start')
        selection_end = request.data.get('selection_end')
        content_section_id = request.data.get('content_section_id')  # For documents: chapter/section ID
        slide_zone_id = request.data.get('slide_zone_id')  # For slides: content zone ID
        
        if not text:
            return Response({'error': 'Text is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # If no chart type specified, provide quick pattern-based analysis without Celery
            if not chart_type:
                # Quick pattern analysis for suggestions (no AI call needed)
                import re
                suggestions = []
                text_lower = text.lower()
                
                patterns = [
                    (r'\d+%|\d+\.\d+%|percentage|percent', 'pie_chart', 0.8, 'Contains percentage data'),
                    (r'step|process|workflow|procedure|then|next|first|second', 'flowchart', 0.9, 'Sequential process'),
                    (r'versus|vs|compare|comparison|advantage|disadvantage', 'comparison_table', 0.9, 'Comparison content'),
                    (r'timeline|chronology|history|year|month|date', 'timeline', 0.9, 'Temporal sequence'),
                    (r'team|organization|hierarchy|manager|department', 'org_chart', 0.8, 'Organizational structure'),
                ]
                
                for pattern, chart_type_suggestion, confidence, reason in patterns:
                    if re.search(pattern, text_lower):
                        suggestions.append({
                            'chart_type': chart_type_suggestion,
                            'confidence': confidence,
                            'reason': reason
                        })
                
                return Response({
                    'suggestions': suggestions[:5],
                    'text_analysis': {
                        'length': len(text),
                        'words': len(text.split()),
                        'analysis_complete': True
                    }
                })
            
            # Queue AI text-to-diagram conversion with content replacement parameters
            task_result = convert_text_to_diagram_task.delay(
                text=text,
                chart_type=chart_type,
                user_id=request.user.id,
                document_id=document_id,
                slide_id=slide_id,
                # Content replacement parameters
                selection_start=selection_start,
                selection_end=selection_end,
                content_section_id=content_section_id,
                slide_zone_id=slide_zone_id,
                replace_content=True  # Flag to enable content replacement
            )
            
            return Response({
                'task_id': task_result.id,
                'status': 'processing',
                'message': 'Diagram conversion and content replacement started. Use task_id to check status.',
                'text': text[:100] + '...' if len(text) > 100 else text,
                'chart_type': chart_type,
                'will_replace_content': True
            }, status=status.HTTP_202_ACCEPTED)
            
        except Exception as e:
            return Response({
                'error': 'Diagram conversion failed to start',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def analyze_content_for_diagrams(self, request):
        """Analyze content and suggest diagram opportunities"""
        content = request.data.get('content', '')
        content_type = request.data.get('type', 'document')  # 'document' or 'slide'
        
        if not content:
            return Response({'error': 'Content is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Use Napkin.ai-style analysis
            suggestions = diagram_converter.analyze_text_for_diagrams(content)
            
            # Extract potential diagram text segments
            import re
            sentences = re.split(r'[.!?]+', content)
            
            opportunities = []
            for i, sentence in enumerate(sentences[:10]):  # Analyze first 10 sentences
                if len(sentence.strip()) > 20:  # Only analyze substantial sentences
                    sentence_suggestions = diagram_converter.analyze_text_for_diagrams(sentence)
                    if sentence_suggestions:
                        opportunities.append({
                            'text': sentence.strip(),
                            'position': i,
                            'suggestions': sentence_suggestions[:3],  # Top 3 suggestions
                            'segment_type': 'sentence'
                        })
            
            return Response({
                'overall_suggestions': suggestions[:5],
                'opportunities': opportunities,
                'analysis': {
                    'total_segments': len(opportunities),
                    'high_confidence_count': len([o for o in opportunities if o['suggestions'] and o['suggestions'][0]['confidence'] > 0.8]),
                    'recommended_diagrams': min(3, len(opportunities))
                }
            })
            
        except Exception as e:
            return Response({
                'error': 'Content analysis failed',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def replace_content_with_diagram(self, request):
        """Replace selected text content with generated diagram"""
        try:
            # Get replacement parameters
            diagram_id = request.data.get('diagram_id')
            document_id = request.data.get('document_id')
            slide_id = request.data.get('slide_id')
            
            # Content location parameters
            selection_start = request.data.get('selection_start')
            selection_end = request.data.get('selection_end')
            content_section_id = request.data.get('content_section_id')  # For documents: chapter/section ID
            slide_zone_id = request.data.get('slide_zone_id')  # For slides: content zone ID
            
            if not diagram_id:
                return Response({'error': 'Diagram ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Get the diagram
            user = request.user
            diagram = get_object_or_404(DiagramElement, id=diagram_id, created_by=user)
            
            # Create diagram HTML embed code
            diagram_html = self._create_diagram_embed_html(diagram)
            
            # Handle document content replacement
            if document_id and content_section_id:
                return self._replace_document_content(
                    document_id, content_section_id, diagram_html,
                    selection_start, selection_end, user
                )
            
            # Handle slide content replacement
            elif slide_id and slide_zone_id:
                return self._replace_slide_content(
                    slide_id, slide_zone_id, diagram_html, user
                )
            
            else:
                return Response({
                    'error': 'Either document_id+content_section_id or slide_id+slide_zone_id is required'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Content replacement failed: {e}")
            return Response({
                'error': 'Content replacement failed',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _create_diagram_embed_html(self, diagram):
        """Create HTML embed code for a diagram"""
        return f'''<div class="ai-diagram" data-diagram-id="{diagram.id}" data-chart-type="{diagram.chart_type}">
    <div class="diagram-container">
        <div class="diagram-title">{diagram.title}</div>
        <div class="diagram-content" data-chart-data="{json.dumps(diagram.data)}" data-chart-config="{json.dumps(diagram.config)}">
            <canvas class="chart-canvas" width="{diagram.width}" height="{diagram.height}"></canvas>
        </div>
        <div class="diagram-caption">Generated from: "{diagram.source_text[:100]}..."</div>
    </div>
</div>'''

    def _replace_document_content(self, document_id, content_section_id, diagram_html, selection_start, selection_end, user):
        """Replace content in a document section"""
        try:
            # Get the document and verify ownership
            document = get_object_or_404(Document, id=document_id, created_by=user)
            
            # Handle different types of content sections
            if content_section_id == 'main_content':
                # Replace in main document content
                content = document.content or ''
                if selection_start is not None and selection_end is not None:
                    # Replace selected text with diagram
                    new_content = content[:selection_start] + diagram_html + content[selection_end:]
                else:
                    # Append diagram to end
                    new_content = content + '\n\n' + diagram_html
                
                document.content = new_content
                document.save()
                
            else:
                # Replace in chapter or section content
                try:
                    section = get_object_or_404(DocumentSection, id=content_section_id, chapter__document=document)
                    content = section.content or ''
                    
                    if selection_start is not None and selection_end is not None:
                        new_content = content[:selection_start] + diagram_html + content[selection_end:]
                    else:
                        new_content = content + '\n\n' + diagram_html
                    
                    section.content = new_content
                    section.save()
                    
                except DocumentSection.DoesNotExist:
                    # Try chapter
                    chapter = get_object_or_404(DocumentChapter, id=content_section_id, document=document)
                    content = chapter.content or ''
                    
                    if selection_start is not None and selection_end is not None:
                        new_content = content[:selection_start] + diagram_html + content[selection_end:]
                    else:
                        new_content = content + '\n\n' + diagram_html
                    
                    chapter.content = new_content
                    chapter.save()
            
            return Response({
                'success': True,
                'message': 'Content replaced with diagram successfully',
                'document_id': document_id,
                'section_id': content_section_id,
                'diagram_html': diagram_html
            })
            
        except Exception as e:
            raise Exception(f"Document content replacement failed: {str(e)}")

    def _replace_slide_content(self, slide_id, slide_zone_id, diagram_html, user):
        """Replace content in a slide zone"""
        try:
            # Get the slide and verify ownership
            slide = get_object_or_404(Slide, id=slide_id, presentation__created_by=user)
            
            # Update slide content for the specified zone
            content = slide.content.copy() if slide.content else {}
            content[slide_zone_id] = diagram_html
            
            slide.content = content
            slide.save()
            
            return Response({
                'success': True,
                'message': 'Slide content replaced with diagram successfully',
                'slide_id': slide_id,
                'zone_id': slide_zone_id,
                'diagram_html': diagram_html
            })
            
        except Exception as e:
            raise Exception(f"Slide content replacement failed: {str(e)}")

    @action(detail=False, methods=['get'])
    def unified_list(self, request):
        """Get comprehensive unified list of both documents and slide presentations with rich details"""
        # Get user's documents with related data
        documents = Document.objects.filter(created_by=request.user).prefetch_related('chapters__sections')
        slide_presentations = SlidePresentation.objects.filter(created_by=request.user).prefetch_related('slides')
        
        # Convert to unified format with rich information
        unified_list = []
        
        for doc in documents:
            # Get content preview (first 200 characters of clean text)
            import re
            clean_content = re.sub(r'<[^>]+>', '', doc.content or '')
            content_preview = clean_content[:200] + '...' if len(clean_content) > 200 else clean_content
            
            # Get chapter structure for display
            chapter_structure = []
            for chapter in doc.chapters.all()[:5]:  # Limit to first 5 chapters for display
                sections = [{'title': s.title, 'number': s.number} for s in chapter.sections.all()[:3]]
                chapter_structure.append({
                    'title': chapter.title,
                    'number': chapter.number,
                    'sections': sections,
                    'section_count': chapter.sections.count()
                })
            
            unified_list.append({
                'id': doc.id,
                'title': doc.title,
                'type': 'document',
                'created_at': doc.created_at,
                'updated_at': doc.updated_at,
                'last_accessed': doc.last_accessed,
                
                # Document-specific details
                'word_count': doc.word_count,
                'page_count': doc.page_count,
                'character_count': doc.character_count,
                'paragraph_count': doc.paragraph_count,
                'reading_time': doc.reading_time,
                'chapter_count': doc.chapters.count(),
                'total_sections': sum([chapter.sections.count() for chapter in doc.chapters.all()]),
                
                # Content preview and structure
                'content_preview': content_preview,
                'chapter_structure': chapter_structure,
                'abstract': doc.abstract[:150] + '...' if len(doc.abstract or '') > 150 else doc.abstract,
                'keywords': doc.keywords,
                'authors': doc.authors,
                'subject': doc.subject,
                'category': doc.category,
                
                # Template and formatting
                'template_name': doc.template.name if doc.template else 'Default',
                'template_id': doc.template.id if doc.template else None,
                
                # AI and enhancement features
                'ai_opportunities': len(doc.diagram_opportunities),
                'diagram_opportunities': doc.diagram_opportunities[:3],  # Show first 3 opportunities
                'ai_suggestions_count': len(doc.ai_suggestions),
                
                # Version and collaboration
                'version': doc.version,
                'track_changes_enabled': doc.track_changes,
                'has_comments': bool(doc.comments),
                
                # Statistics and status
                'completion_status': 'Complete' if doc.word_count > 1000 else 'Draft' if doc.word_count > 100 else 'Started',
                'quality_score': min(100, max(0, (doc.word_count / 50) + (doc.chapters.count() * 10))),  # Simple quality metric
            })
        
        for pres in slide_presentations:
            # Get slide structure for display
            slide_structure = []
            for slide in pres.slides.all()[:5]:  # Limit to first 5 slides for display
                # Get slide content preview
                slide_content = ''
                if isinstance(slide.content, dict):
                    for zone_content in slide.content.values():
                        slide_content += str(zone_content) + ' '
                slide_content = re.sub(r'<[^>]+>', '', slide_content)[:100]
                
                slide_structure.append({
                    'order': slide.order,
                    'template_type': slide.template.layout_type if slide.template else 'unknown',
                    'content_preview': slide_content + '...' if len(slide_content) > 100 else slide_content,
                    'has_notes': bool(slide.notes),
                    'duration': slide.duration
                })
            
            unified_list.append({
                'id': pres.id,
                'title': pres.title,
                'type': 'slide_presentation',
                'created_at': pres.created_at,
                'updated_at': pres.updated_at,
                'last_accessed': pres.last_accessed,
                
                # Presentation-specific details
                'slide_count': pres.slide_count,
                'total_duration': pres.total_duration,
                'estimated_duration_minutes': round(pres.total_duration / 60) if pres.total_duration else 0,
                'slide_size': pres.slide_size,
                'orientation': pres.orientation,
                
                # Theme and design
                'theme_name': pres.theme.name if pres.theme else 'Default',
                'theme_id': pres.theme.id if pres.theme else None,
                'theme_colors': pres.theme.colors if pres.theme else {},
                
                # Content structure
                'slide_structure': slide_structure,
                'outline_structure': pres.outline_structure,
                'has_animations': bool(pres.animation_schemes),
                'transition_type': pres.global_transition,
                
                # AI and enhancement features
                'ai_opportunities': len(pres.diagram_opportunities),
                'diagram_opportunities': pres.diagram_opportunities[:3],
                'design_consistency_score': pres.design_consistency_score,
                'ai_design_suggestions_count': len(pres.ai_design_suggestions),
                
                # Features and settings
                'has_presenter_notes': pres.presenter_notes,
                'has_slide_numbers': pres.slide_numbers,
                'auto_advance_enabled': pres.auto_advance,
                'comments_enabled': pres.comments_enabled,
                
                # Collaboration
                'coauthor_count': pres.co_authors.count(),
                'track_changes_enabled': pres.track_changes,
                
                # Statistics and status  
                'view_count': pres.view_count,
                'version': pres.version,
                'completion_status': 'Complete' if pres.slide_count > 5 else 'Draft' if pres.slide_count > 1 else 'Started',
                'quality_score': min(100, max(0, (pres.slide_count * 15) + (pres.design_consistency_score * 20))),
                
                # Export and sharing
                'published_url': pres.published_url,
                'is_published': bool(pres.published_url),
            })
        
        # Sort by updated date (most recent first)
        unified_list.sort(key=lambda x: x['updated_at'], reverse=True)
        
        # Calculate summary statistics
        total_words = sum([item['word_count'] for item in unified_list if item['type'] == 'document'])
        total_slides = sum([item['slide_count'] for item in unified_list if item['type'] == 'slide_presentation'])
        total_pages = sum([item['page_count'] for item in unified_list if item['type'] == 'document'])
        
        return Response({
            'presentations': unified_list,
            'summary': {
                'total_count': len(unified_list),
                'document_count': documents.count(),
                'slide_count': slide_presentations.count(),
                'total_words': total_words,
                'total_slides': total_slides,
                'total_pages': total_pages,
                'recent_activity_count': len([item for item in unified_list if (timezone.now() - item['updated_at']).days <= 7]),
            },
            'filters': {
                'document_types': list(set([item['category'] for item in unified_list if item['type'] == 'document' and item.get('category')])),
                'themes': list(set([item['theme_name'] for item in unified_list if item['type'] == 'slide_presentation' and item.get('theme_name')])),
                'templates': list(set([item['template_name'] for item in unified_list if item['type'] == 'document' and item.get('template_name')])),
                'completion_statuses': ['Started', 'Draft', 'Complete']
            }
        })

    @action(detail=False, methods=['get'])
    def chart_templates(self, request):
        """Get available chart templates for diagram conversion"""
        # Return mock chart templates data for diagram conversion functionality
        chart_templates = [
            {
                'id': 1,
                'name': 'Bar Chart',
                'description': 'Standard bar chart for comparing categories of data.',
                'category': 'data_viz',
                'chart_type': 'bar_chart',
                'thumbnail': '/static/chart-templates/bar_chart.png',
                'template_config': {
                    'type': 'bar',
                    'options': {
                        'responsive': True,
                        'plugins': {
                            'legend': {'position': 'top'},
                            'title': {'display': True}
                        }
                    }
                },
                'content_keywords': ['compare', 'categories', 'data', 'statistics', 'values'],
                'is_premium': False,
                'is_active': True
            },
            {
                'id': 2,
                'name': 'Line Chart',
                'description': 'Line chart perfect for showing trends over time.',
                'category': 'data_viz',
                'chart_type': 'line_chart',
                'thumbnail': '/static/chart-templates/line_chart.png',
                'template_config': {
                    'type': 'line',
                    'options': {
                        'responsive': True,
                        'scales': {
                            'y': {'beginAtZero': True}
                        }
                    }
                },
                'content_keywords': ['trend', 'time', 'growth', 'change', 'over time'],
                'is_premium': False,
                'is_active': True
            },
            {
                'id': 3,
                'name': 'Pie Chart',
                'description': 'Pie chart for showing proportions and percentages.',
                'category': 'data_viz',
                'chart_type': 'pie_chart',
                'thumbnail': '/static/chart-templates/pie_chart.png',
                'template_config': {
                    'type': 'pie',
                    'options': {
                        'responsive': True,
                        'plugins': {
                            'legend': {'position': 'right'}
                        }
                    }
                },
                'content_keywords': ['percentage', 'proportion', 'share', 'distribution'],
                'is_premium': False,
                'is_active': True
            },
            {
                'id': 4,
                'name': 'Flowchart',
                'description': 'Process flowchart for workflows and decision trees.',
                'category': 'process',
                'chart_type': 'flowchart',
                'thumbnail': '/static/chart-templates/flowchart.png',
                'template_config': {
                    'type': 'flowchart',
                    'style': 'top-down'
                },
                'content_keywords': ['process', 'steps', 'workflow', 'decision', 'procedure'],
                'is_premium': False,
                'is_active': True
            },
            {
                'id': 5,
                'name': 'Timeline',
                'description': 'Timeline for chronological events and milestones.',
                'category': 'timeline',
                'chart_type': 'timeline',
                'thumbnail': '/static/chart-templates/timeline.png',
                'template_config': {
                    'type': 'timeline',
                    'orientation': 'horizontal'
                },
                'content_keywords': ['timeline', 'history', 'chronological', 'events', 'milestones'],
                'is_premium': False,
                'is_active': True
            },
            {
                'id': 6,
                'name': 'Organization Chart',
                'description': 'Organizational hierarchy and team structure.',
                'category': 'organization',
                'chart_type': 'org_chart',
                'thumbnail': '/static/chart-templates/org_chart.png',
                'template_config': {
                    'type': 'org_chart',
                    'layout': 'tree'
                },
                'content_keywords': ['organization', 'team', 'hierarchy', 'structure', 'management'],
                'is_premium': True,
                'is_active': True
            }
        ]
        
        # Filter by category if specified
        category = request.query_params.get('category')
        if category:
            chart_templates = [t for t in chart_templates if t['category'] == category]
        
        # Filter by chart type if specified
        chart_type = request.query_params.get('chart_type')
        if chart_type:
            chart_templates = [t for t in chart_templates if t['chart_type'] == chart_type]
        
        # Filter by search if specified
        search = request.query_params.get('search')
        if search:
            search_lower = search.lower()
            chart_templates = [
                t for t in chart_templates 
                if search_lower in t['name'].lower() or 
                   search_lower in t['description'].lower() or
                   any(keyword for keyword in t['content_keywords'] if search_lower in keyword)
            ]
        
        return Response(chart_templates)

    @action(detail=False, methods=['post'])
    def create_diagram(self, request, presentation_id=None, section_id=None):
        """Create a new diagram for a presentation section using AI processing"""
        try:
            # Validate that the user owns the presentation
            user = request.user
            
            # Try to find the presentation in documents or slides
            presentation = None
            presentation_type = None
            
            # Check documents first
            try:
                document = Document.objects.get(id=presentation_id, created_by=user)
                presentation = document
                presentation_type = 'document'
            except Document.DoesNotExist:
                # Check slide presentations
                try:
                    slide_presentation = SlidePresentation.objects.get(id=presentation_id, created_by=user)
                    presentation = slide_presentation
                    presentation_type = 'slide_presentation'
                except SlidePresentation.DoesNotExist:
                    return Response(
                        {'error': 'Presentation not found'}, 
                        status=status.HTTP_404_NOT_FOUND
                    )
            
            # Get diagram data from request
            data = request.data
            text = data.get('content_text', '')
            chart_type = data.get('chart_type', 'flowchart')
            
            if not text:
                return Response({'error': 'content_text is required for AI diagram generation'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            # Use the existing AI task for text-to-diagram conversion
            try:
                task_result = convert_text_to_diagram_task.delay(
                    text=text,
                    chart_type=chart_type,
                    user_id=user.id,
                    document_id=presentation_id if presentation_type == 'document' else None,
                    slide_id=presentation_id if presentation_type == 'slide_presentation' else None
                )
                
                # Return task information - the actual diagram will be created by the AI task
                return Response({
                    'task_id': task_result.id,
                    'status': 'processing',
                    'message': 'AI diagram generation started. Use task_id to check status.',
                    'chart_type': chart_type,
                    'text_preview': text[:100] + '...' if len(text) > 100 else text
                }, status=status.HTTP_202_ACCEPTED)
                
            except Exception as task_error:
                # Fallback: create basic diagram if AI task fails
                logger = logging.getLogger(__name__)
                logger.warning(f"AI task failed, creating basic diagram: {task_error}")
                
                # Validate and truncate fields to prevent database errors
                title = data.get('title', f'{chart_type.replace("_", " ").title()} Diagram')
                generation_prompt = data.get('generation_prompt', f'Create {chart_type} from: {text[:100]}')
                
                # Ensure title and generation_prompt fit database constraints
                if len(title) > 1255:  # DiagramElement.title max_length
                    title = title[:1252] + '...'
                
                diagram_data = {
                    'title': title,
                    'chart_type': chart_type,
                    'data': data.get('data', data.get('chart_data', {})),  # Support both old and new key names
                    'config': data.get('config', data.get('style_config', {})),
                    'styling': data.get('styling', {}),
                    'source_text': text,
                    'generation_prompt': generation_prompt,  # TextField - no length limit
                    'position_x': data.get('position_x', 0),
                    'position_y': data.get('position_y', 0),
                    'width': data.get('width', 400),
                    'height': data.get('height', 300),
                    'created_by': user
                }
                
                diagram = DiagramElement.objects.create(**diagram_data)
                
                return Response({
                    'id': diagram.id,
                    'title': diagram.title,
                    'chart_type': diagram.chart_type,
                    'chart_data': diagram.data,  # Use correct field name
                    'style_config': diagram.config,  # Use correct field name
                    'source_content': diagram.source_text,  # Use correct field name
                    'generation_prompt': diagram.generation_prompt,
                    'position_x': diagram.position_x,
                    'position_y': diagram.position_y,
                    'width': diagram.width,
                    'height': diagram.height,
                    'image_url': f'/static/diagrams/placeholder_{diagram.chart_type}.png',
                    'created_at': diagram.created_at.isoformat(),
                    'updated_at': diagram.updated_at.isoformat(),
                    'status': 'fallback_created'
                }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to create diagram: {e}")
            return Response({
                'error': 'Failed to create diagram',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['patch'])
    def update_diagram(self, request, pk=None, presentation_id=None, section_id=None):
        """Update an existing diagram"""
        try:
            # Get diagram_id from multiple possible sources
            diagram_id = (
                self.kwargs.get('diagram_id') or 
                request.data.get('diagram_id') or 
                request.query_params.get('diagram_id')
            )
            
            # Also try to extract from URL path manually if needed
            if not diagram_id and hasattr(request, 'resolver_match'):
                url_kwargs = getattr(request.resolver_match, 'kwargs', {})
                diagram_id = url_kwargs.get('diagram_id')
            
            if not diagram_id:
                return Response({
                    'error': 'Diagram ID is required. Please provide it in the request data, query params, or URL path.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate that the user owns the diagram
            user = request.user
            diagram = get_object_or_404(DiagramElement, id=diagram_id, created_by=user)
            
            # Update diagram fields
            data = request.data
            if 'title' in data:
                diagram.title = data['title']
            if 'chart_data' in data:
                diagram.data = data['chart_data']  # Use correct field name
            if 'data' in data:
                diagram.data = data['data']
            if 'style_config' in data:
                diagram.config = data['style_config']  # Use correct field name
            if 'config' in data:
                diagram.config = data['config']
            if 'styling' in data:
                diagram.styling = data['styling']
            if 'source_content' in data:
                diagram.source_text = data['source_content']  # Use correct field name
            if 'source_text' in data:
                diagram.source_text = data['source_text']
            if 'generation_prompt' in data:
                diagram.generation_prompt = data['generation_prompt']
            if 'position_x' in data:
                diagram.position_x = data['position_x']
            if 'position_y' in data:
                diagram.position_y = data['position_y']
            if 'width' in data:
                diagram.width = data['width']
            if 'height' in data:
                diagram.height = data['height']
            
            diagram.save()
            
            # Return updated diagram
            return Response({
                'id': diagram.id,
                'title': diagram.title,
                'chart_type': diagram.chart_type,
                'chart_data': diagram.data,  # Use correct field name
                'style_config': diagram.config,  # Use correct field name
                'source_content': diagram.source_text,  # Use correct field name
                'generation_prompt': diagram.generation_prompt,
                'position_x': diagram.position_x,
                'position_y': diagram.position_y,
                'width': diagram.width,
                'height': diagram.height,
                'image_url': f'/static/diagrams/placeholder_{diagram.chart_type}.png',  # Mock image URL
                'created_at': diagram.created_at.isoformat(),
                'updated_at': diagram.updated_at.isoformat()
            })
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to update diagram: {e}")
            return Response({
                'error': 'Failed to update diagram',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['delete'])
    def delete_diagram(self, request, presentation_id=None, section_id=None, diagram_id=None):
        """Delete a diagram"""
        try:
            # Validate that the user owns the diagram
            user = request.user
            diagram = get_object_or_404(DiagramElement, id=diagram_id, created_by=user)
            
            # Delete the diagram
            diagram.delete()
            
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to delete diagram: {e}")
            return Response({
                'error': 'Failed to delete diagram',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Removed: create_diagram_fallback (visual diagram generation)

    @action(detail=False, methods=['get'])
    def diagram_task_status(self, request, task_id=None, presentation_id=None):
        """Check the status of a diagram generation task"""
        from celery.result import AsyncResult
        
        # Get task_id from URL parameter or query params
        if not task_id:
            task_id = request.query_params.get('task_id')
        
        if not task_id:
            return Response({'error': 'task_id parameter is required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Get task result
            result = AsyncResult(task_id)
            
            if result.state == 'PENDING':
                return Response({
                    'task_id': task_id,
                    'status': 'pending',
                    'message': 'Task is still processing...'
                })
            elif result.state == 'PROGRESS':
                return Response({
                    'task_id': task_id,
                    'status': 'progress',
                    'message': result.info.get('message', 'Task in progress...'),
                    'progress': result.info.get('progress', 0)
                })
            elif result.state == 'SUCCESS':
                # Task completed successfully, get the diagram
                try:
                    diagram_id = result.result.get('diagram_id') if isinstance(result.result, dict) else None
                    if diagram_id:
                        diagram = DiagramElement.objects.get(id=diagram_id, created_by=request.user)
                        return Response({
                            'task_id': task_id,
                            'status': 'completed',
                            'diagram': DiagramElementSerializer(diagram).data,
                            'message': 'Diagram generation completed successfully!'
                        })
                    else:
                        return Response({
                            'task_id': task_id,
                            'status': 'completed',
                            'result': result.result,
                            'message': 'Task completed successfully!'
                        })
                except DiagramElement.DoesNotExist:
                    return Response({
                        'task_id': task_id,
                        'status': 'completed',
                        'result': result.result,
                        'message': 'Task completed but diagram not found'
                    })
            else:
                # Task failed
                error_message = str(result.info) if result.info else 'Unknown error occurred'
                return Response({
                    'task_id': task_id,
                    'status': 'failed',
                    'error': error_message,
                    'message': 'Diagram generation failed'
                })
        
        except Exception as e:
            return Response({
                'task_id': task_id,
                'status': 'error',
                'error': str(e),
                'message': 'Error checking task status'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def upload_image(self, request):
        """Upload image for slide presentation"""
        try:
            # Get required parameters
            presentation_id = request.data.get('presentation_id')
            section_id = request.data.get('section_id')
            image_file = request.FILES.get('image')
            
            if not image_file:
                return Response({'error': 'Image file is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            if not presentation_id:
                return Response({'error': 'Presentation ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            if not section_id:
                return Response({'error': 'Section ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Verify user owns the presentation
            try:
                slide_presentation = SlidePresentation.objects.get(id=presentation_id, created_by=request.user)
            except SlidePresentation.DoesNotExist:
                return Response({'error': 'Presentation not found or access denied'}, status=status.HTTP_404_NOT_FOUND)
            
            # Verify section exists
            try:
                slide = Slide.objects.get(id=section_id, presentation=slide_presentation)
            except Slide.DoesNotExist:
                return Response({'error': 'Slide not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Validate image file
            allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
            if image_file.content_type not in allowed_types:
                return Response({'error': 'Invalid image type. Allowed: JPEG, PNG, GIF, WebP'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Check file size (max 10MB)
            if image_file.size > 10 * 1024 * 1024:
                return Response({'error': 'Image file too large. Maximum size: 10MB'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Create MediaAsset for the uploaded image
            media_asset = MediaAsset.objects.create(
                file=image_file,
                file_type='image',
                title=image_file.name,
                alt_text=f"Image for slide {slide.id}",
                uploaded_by=request.user
            )
            
            # Update slide content with the image URL
            content = slide.content.copy() if slide.content else {}
            content['image_url'] = media_asset.file.url
            content['image_asset_id'] = str(media_asset.id)
            content['image_name'] = image_file.name
            slide.content = content
            slide.save()
            
            return Response({
                'message': 'Image uploaded successfully',
                'image_url': media_asset.file.url,
                'image_id': str(media_asset.id),
                'slide_id': str(slide.id)
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Image upload failed: {e}")
            return Response({
                'error': 'Image upload failed',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def simple_image_upload(self, request):
        """Simple image upload that just returns the URL"""
        try:
            image_file = request.FILES.get('image')
            
            if not image_file:
                return Response({'error': 'Image file is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate image file
            allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
            if image_file.content_type not in allowed_types:
                return Response({'error': 'Invalid image type. Allowed: JPEG, PNG, GIF, WebP'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Check file size (max 10MB)
            if image_file.size > 10 * 1024 * 1024:
                return Response({'error': 'Image file too large. Maximum size: 10MB'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Create MediaAsset for the uploaded image
            media_asset = MediaAsset.objects.create(
                file=image_file,
                file_type='image',
                title=image_file.name,
                alt_text="Uploaded image",
                uploaded_by=request.user
            )
            
            return Response({
                'url': media_asset.file.url,
                'id': str(media_asset.id),
                'name': image_file.name
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Simple image upload failed: {e}")
            return Response({
                'error': 'Image upload failed',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def export_presentation(self, request, presentation_id=None):
        """Export presentation to various formats (PDF, MP4, etc.)"""
        try:
            # Get presentation ID from URL parameter
            if not presentation_id:
                return Response({'error': 'Presentation ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Get export parameters
            export_format = request.data.get('export_format', 'pdf')
            selected_sections = request.data.get('selected_sections')
            export_settings = request.data.get('export_settings', {})
            
            # Validate export format
            valid_formats = ['pdf', 'docx', 'pptx', 'html', 'mp4']
            if export_format not in valid_formats:
                return Response({
                    'error': f'Invalid export format. Supported formats: {", ".join(valid_formats)}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verify user owns the presentation
            user = request.user
            presentation = None
            presentation_type = None
            
            # Check documents first
            try:
                document = Document.objects.get(id=presentation_id, created_by=user)
                presentation = document
                presentation_type = 'document'
            except Document.DoesNotExist:
                # Check slide presentations
                try:
                    slide_presentation = SlidePresentation.objects.get(id=presentation_id, created_by=user)
                    presentation = slide_presentation
                    presentation_type = 'slide_presentation'
                except SlidePresentation.DoesNotExist:
                    return Response(
                        {'error': 'Presentation not found or access denied'}, 
                        status=status.HTTP_404_NOT_FOUND
                    )
            
            # Validate format compatibility
            if presentation_type == 'document' and export_format in ['pptx', 'mp4']:
                return Response({
                    'error': f'Cannot export document as {export_format}. Documents support: pdf, docx, html'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if presentation_type == 'slide_presentation' and export_format == 'docx':
                return Response({
                    'error': 'Cannot export slides as DOCX. Slides support: pdf, pptx, html, mp4'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create export job
            export_job = PresentationExport.objects.create(
                **({
                    'document': presentation if presentation_type == 'document' else None,
                    'slide_presentation': presentation if presentation_type == 'slide_presentation' else None,
                    'export_format': export_format,
                    'settings': {
                        'selected_sections': selected_sections,
                        'export_settings': export_settings,
                        'user_id': user.id,
                        'created_at': timezone.now().isoformat()
                    },
                    'status': 'pending'
                })
            )
            
            # Queue export task with Celery
            import logging
            logger = logging.getLogger(__name__)
            try:
                from users.tasks import export_presentation_task
                task = export_presentation_task.delay(str(export_job.id))
                logger.info(f"Queued export task {task.id} for job {export_job.id}")
            except Exception as task_error:
                logger.error(f"Failed to queue export task: {task_error}")
                export_job.status = 'failed'
                export_job.save()
            
            return Response({
                'job_id': str(export_job.id),
                'message': f'{export_format.upper()} export job created successfully',
                'status': 'pending',
                'export_format': export_format,
                'estimated_completion': '2-5 minutes',
                'presentation_type': presentation_type,
                'presentation_title': presentation.title
            }, status=status.HTTP_202_ACCEPTED)
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Export creation failed: {e}")
            return Response({
                'error': 'Failed to create export job',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def export_status(self, request, presentation_id=None):
        """Get export job status for a presentation"""
        import logging
        logger = logging.getLogger(__name__)
        
        # Check authentication
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            # Get presentation ID from URL parameter or path
            if not presentation_id:
                presentation_id = self.kwargs.get('pk') or request.query_params.get('presentation_id')
            
            if not presentation_id:
                return Response({'error': 'Presentation ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate presentation ID format
            try:
                int(presentation_id)  # Ensure it's a valid integer
            except (ValueError, TypeError):
                return Response({'error': 'Invalid presentation ID format'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Verify user owns the presentation
            user = request.user
            presentation = None
            presentation_type = None
            
            # Check documents first
            try:
                document = Document.objects.get(id=presentation_id, created_by=user)
                presentation = document
                presentation_type = 'document'
                logger.info(f"Found document {presentation_id} for user {user.id}")
            except Document.DoesNotExist:
                # Check slide presentations
                try:
                    slide_presentation = SlidePresentation.objects.get(id=presentation_id, created_by=user)
                    presentation = slide_presentation
                    presentation_type = 'slide_presentation'
                    logger.info(f"Found slide presentation {presentation_id} for user {user.id}")
                except SlidePresentation.DoesNotExist:
                    logger.warning(f"Presentation {presentation_id} not found for user {user.id}")
                    return Response({'error': 'Presentation not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Get export jobs for this presentation based on model type with pagination
            if presentation_type == 'document':
                export_jobs_queryset = PresentationExport.objects.filter(
                    document=presentation
                ).select_related('document').order_by('-created_at')
            else:  # slide_presentation
                export_jobs_queryset = PresentationExport.objects.filter(
                    slide_presentation=presentation
                ).select_related('slide_presentation').order_by('-created_at')
            
            # Apply pagination (limit to latest 20 jobs to prevent performance issues)
            export_jobs = export_jobs_queryset[:20]
            
            logger.info(f"Found {export_jobs_queryset.count()} export jobs for presentation {presentation_id}")
            
            # Serialize export jobs with comprehensive error handling
            jobs_data = []
            for job in export_jobs:
                try:
                    # Calculate progress more accurately
                    if job.status == 'completed':
                        progress = 100
                    elif job.status == 'processing':
                        progress = 50
                    elif job.status == 'failed':
                        progress = 0
                    else:  # pending
                        progress = 10
                    
                    job_data = {
                        'id': str(job.id),
                        'export_format': job.export_format,
                        'status': job.status,
                        'progress': progress,
                        'started_at': job.created_at.isoformat() if job.created_at else None,
                        'completed_at': job.completed_at.isoformat() if job.completed_at else None,
                        'presentation_type': presentation_type,
                        'export_settings': job.settings or {},
                        'selected_sections': job.settings.get('selected_sections', []) if job.settings else []
                    }
                    
                    # Add output file URL if completed and file exists
                    if job.status == 'completed' and job.file_path:
                        try:
                            job_data['output_file_url'] = request.build_absolute_uri(job.file_path.url)
                            job_data['output_url'] = job_data['output_file_url']  # For backward compatibility
                            job_data['file_size'] = job.file_path.size if job.file_path.size else 0
                        except Exception as file_error:
                            logger.warning(f"Failed to get file URL for job {job.id}: {file_error}")
                            job_data['file_error'] = 'File not accessible'
                    
                    # Add error message if failed
                    if job.status == 'failed':
                        if job.settings and job.settings.get('error_message'):
                            job_data['error_message'] = job.settings.get('error_message')
                        else:
                            job_data['error_message'] = 'Export failed - no specific error message available'
                    
                    # Add timing information
                    if job.created_at and job.completed_at:
                        duration_seconds = (job.completed_at - job.created_at).total_seconds()
                        job_data['duration_seconds'] = duration_seconds
                    
                    jobs_data.append(job_data)
                    
                except Exception as job_error:
                    logger.error(f"Error serializing job {job.id}: {job_error}")
                    # Add minimal job data even if serialization fails
                    jobs_data.append({
                        'id': str(job.id),
                        'export_format': getattr(job, 'export_format', 'unknown'),
                        'status': getattr(job, 'status', 'error'),
                        'error_message': f'Job serialization failed: {job_error}',
                        'progress': 0
                    })
            
            # Return comprehensive response
            return Response({
                'success': True,
                'presentation_id': str(presentation_id),
                'presentation_type': presentation_type,
                'presentation_title': getattr(presentation, 'title', 'Untitled'),
                'total_jobs': export_jobs_queryset.count(),
                'jobs_returned': len(jobs_data),
                'jobs': jobs_data
            }, status=status.HTTP_200_OK)
            
        except (Document.DoesNotExist, SlidePresentation.DoesNotExist) as not_found_error:
            logger.error(f"Presentation not found: {not_found_error}")
            return Response({
                'error': 'Presentation not found',
                'presentation_id': str(presentation_id) if presentation_id else None
            }, status=status.HTTP_404_NOT_FOUND)
            
        except ValueError as validation_error:
            logger.error(f"Validation error in export status: {validation_error}")
            return Response({
                'error': 'Invalid request parameters',
                'details': str(validation_error)
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Unexpected error in export status check: {e}")
            logger.error(f"Exception type: {type(e).__name__}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            
            return Response({
                'error': 'Internal server error while checking export status',
                'details': str(e) if hasattr(e, '__str__') else 'Unknown error occurred',
                'presentation_id': str(presentation_id) if presentation_id else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ============================================================================
    # CHART EDITING AND IMAGE ELEMENT FUNCTIONALITY
    # ============================================================================

    @action(detail=False, methods=['post'])
    def update_chart_data(self, request):
        """Update chart data and configuration for interactive editing"""
        try:
            diagram_id = request.data.get('diagram_id')
            chart_data = request.data.get('chart_data', {})
            chart_config = request.data.get('chart_config', {})
            styling_options = request.data.get('styling', {})
            
            if not diagram_id:
                return Response({'error': 'diagram_id is required'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            # Get diagram and verify ownership
            diagram = get_object_or_404(DiagramElement, id=diagram_id, created_by=request.user)
            
            # Update diagram fields
            if chart_data:
                diagram.data.update(chart_data)
            if chart_config:
                diagram.config.update(chart_config)
            if styling_options:
                diagram.styling.update(styling_options)
            
            # Update title if provided
            if 'title' in request.data:
                diagram.title = request.data['title']
            
            diagram.save()
            
            return Response({
                'success': True,
                'message': 'Chart updated successfully',
                'diagram': {
                    'id': diagram.id,
                    'title': diagram.title,
                    'chart_type': diagram.chart_type,
                    'data': diagram.data,
                    'config': diagram.config,
                    'styling': diagram.styling,
                    'updated_at': diagram.updated_at.isoformat()
                }
            })
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Chart data update failed: {e}")
            return Response({
                'error': 'Failed to update chart data',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def add_image_element(self, request):
        """Add image element to chart or presentation section"""
        try:
            # Get target information
            diagram_id = request.data.get('diagram_id')
            presentation_id = request.data.get('presentation_id')
            section_id = request.data.get('section_id')  # slide_id or document_section_id
            
            # Get image information
            image_url = request.data.get('image_url')
            image_file = request.FILES.get('image_file')
            element_type = request.data.get('element_type', 'image')  # 'image', 'icon', 'logo'
            position = request.data.get('position', {'x': 0, 'y': 0, 'width': 100, 'height': 100})
            
            # Validate required fields
            if not any([diagram_id, presentation_id]):
                return Response({'error': 'diagram_id or presentation_id is required'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            if not any([image_url, image_file]):
                return Response({'error': 'image_url or image_file is required'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            # Handle image file upload
            if image_file:
                # Validate image file
                allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
                if image_file.content_type not in allowed_types:
                    return Response({'error': 'Invalid image type. Allowed: JPEG, PNG, GIF, WebP'}, 
                                  status=status.HTTP_400_BAD_REQUEST)
                
                # Create MediaAsset
                media_asset = MediaAsset.objects.create(
                    file=image_file,
                    media_type='image',
                    file_name=image_file.name,
                    file_size=image_file.size,
                    mime_type=image_file.content_type,
                    created_by=request.user
                )
                image_url = media_asset.file.url
                image_asset_id = media_asset.id
            else:
                image_asset_id = None
            
            # Update target with image element
            if diagram_id:
                # Add image to diagram
                diagram = get_object_or_404(DiagramElement, id=diagram_id, created_by=request.user)
                
                # Add image element to diagram styling
                image_elements = diagram.styling.get('image_elements', [])
                new_element = {
                    'id': f'img_{len(image_elements)}_{timezone.now().timestamp()}',
                    'type': element_type,
                    'image_url': image_url,
                    'asset_id': image_asset_id,
                    'position': position,
                    'created_at': timezone.now().isoformat()
                }
                image_elements.append(new_element)
                diagram.styling['image_elements'] = image_elements
                diagram.save()
                
                return Response({
                    'success': True,
                    'message': 'Image element added to chart',
                    'element': new_element,
                    'diagram_id': diagram.id
                })
                
            elif presentation_id and section_id:
                # Add image to presentation section (slide or document section)
                user = request.user
                
                # Try slide first
                try:
                    slide = Slide.objects.get(id=section_id, presentation__created_by=user)
                    
                    # Add image to slide content
                    content = slide.content.copy() if slide.content else {}
                    image_elements = content.get('image_elements', [])
                    
                    new_element = {
                        'id': f'img_{len(image_elements)}_{timezone.now().timestamp()}',
                        'type': element_type,
                        'image_url': image_url,
                        'asset_id': image_asset_id,
                        'position': position,
                        'created_at': timezone.now().isoformat()
                    }
                    image_elements.append(new_element)
                    content['image_elements'] = image_elements
                    slide.content = content
                    slide.save()
                    
                    return Response({
                        'success': True,
                        'message': 'Image element added to slide',
                        'element': new_element,
                        'slide_id': slide.id
                    })
                    
                except Slide.DoesNotExist:
                    # Try document section
                    try:
                        document = Document.objects.get(id=presentation_id, created_by=user)
                        
                        # Add image element info to document metadata
                        image_elements = document.metadata.get('image_elements', []) if document.metadata else []
                        new_element = {
                            'id': f'img_{len(image_elements)}_{timezone.now().timestamp()}',
                            'type': element_type,
                            'image_url': image_url,
                            'asset_id': image_asset_id,
                            'section_id': section_id,
                            'position': position,
                            'created_at': timezone.now().isoformat()
                        }
                        image_elements.append(new_element)
                        
                        if not document.metadata:
                            document.metadata = {}
                        document.metadata['image_elements'] = image_elements
                        document.save()
                        
                        return Response({
                            'success': True,
                            'message': 'Image element added to document',
                            'element': new_element,
                            'document_id': document.id
                        })
                        
                    except Document.DoesNotExist:
                        return Response({'error': 'Presentation section not found'}, 
                                      status=status.HTTP_404_NOT_FOUND)
            
            else:
                return Response({'error': 'section_id is required when using presentation_id'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Add image element failed: {e}")
            return Response({
                'error': 'Failed to add image element',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['patch'])
    def update_image_element(self, request):
        """Update image element position, size, or properties"""
        try:
            # Get target information
            diagram_id = request.data.get('diagram_id')
            presentation_id = request.data.get('presentation_id')
            section_id = request.data.get('section_id')
            element_id = request.data.get('element_id')
            
            # Get update data
            position = request.data.get('position')
            image_url = request.data.get('image_url')
            element_type = request.data.get('element_type')
            
            if not element_id:
                return Response({'error': 'element_id is required'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            # Update in diagram
            if diagram_id:
                diagram = get_object_or_404(DiagramElement, id=diagram_id, created_by=request.user)
                image_elements = diagram.styling.get('image_elements', [])
                
                for element in image_elements:
                    if element['id'] == element_id:
                        if position:
                            element['position'].update(position)
                        if image_url:
                            element['image_url'] = image_url
                        if element_type:
                            element['type'] = element_type
                        element['updated_at'] = timezone.now().isoformat()
                        break
                else:
                    return Response({'error': 'Image element not found'}, 
                                  status=status.HTTP_404_NOT_FOUND)
                
                diagram.styling['image_elements'] = image_elements
                diagram.save()
                
                return Response({
                    'success': True,
                    'message': 'Image element updated',
                    'diagram_id': diagram.id
                })
                
            elif presentation_id and section_id:
                # Update in presentation section
                user = request.user
                
                # Try slide first
                try:
                    slide = Slide.objects.get(id=section_id, presentation__created_by=user)
                    content = slide.content.copy() if slide.content else {}
                    image_elements = content.get('image_elements', [])
                    
                    for element in image_elements:
                        if element['id'] == element_id:
                            if position:
                                element['position'].update(position)
                            if image_url:
                                element['image_url'] = image_url
                            if element_type:
                                element['type'] = element_type
                            element['updated_at'] = timezone.now().isoformat()
                            break
                    else:
                        return Response({'error': 'Image element not found'}, 
                                      status=status.HTTP_404_NOT_FOUND)
                    
                    content['image_elements'] = image_elements
                    slide.content = content
                    slide.save()
                    
                    return Response({
                        'success': True,
                        'message': 'Image element updated',
                        'slide_id': slide.id
                    })
                    
                except Slide.DoesNotExist:
                    # Try document
                    document = get_object_or_404(Document, id=presentation_id, created_by=user)
                    image_elements = document.metadata.get('image_elements', []) if document.metadata else []
                    
                    for element in image_elements:
                        if element['id'] == element_id:
                            if position:
                                element['position'].update(position)
                            if image_url:
                                element['image_url'] = image_url
                            if element_type:
                                element['type'] = element_type
                            element['updated_at'] = timezone.now().isoformat()
                            break
                    else:
                        return Response({'error': 'Image element not found'}, 
                                      status=status.HTTP_404_NOT_FOUND)
                    
                    if not document.metadata:
                        document.metadata = {}
                    document.metadata['image_elements'] = image_elements
                    document.save()
                    
                    return Response({
                        'success': True,
                        'message': 'Image element updated',
                        'document_id': document.id
                    })
            
            else:
                return Response({'error': 'diagram_id or (presentation_id + section_id) is required'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Update image element failed: {e}")
            return Response({
                'error': 'Failed to update image element',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['delete'])
    def remove_image_element(self, request):
        """Remove image element from chart or presentation"""
        try:
            # Get target information
            diagram_id = request.query_params.get('diagram_id')
            presentation_id = request.query_params.get('presentation_id')
            section_id = request.query_params.get('section_id')
            element_id = request.query_params.get('element_id')
            
            if not element_id:
                return Response({'error': 'element_id is required'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            # Remove from diagram
            if diagram_id:
                diagram = get_object_or_404(DiagramElement, id=diagram_id, created_by=request.user)
                image_elements = diagram.styling.get('image_elements', [])
                
                # Remove element with matching ID
                image_elements = [elem for elem in image_elements if elem['id'] != element_id]
                diagram.styling['image_elements'] = image_elements
                diagram.save()
                
                return Response({
                    'success': True,
                    'message': 'Image element removed from chart',
                    'diagram_id': diagram.id
                })
                
            elif presentation_id and section_id:
                # Remove from presentation section
                user = request.user
                
                # Try slide first
                try:
                    slide = Slide.objects.get(id=section_id, presentation__created_by=user)
                    content = slide.content.copy() if slide.content else {}
                    image_elements = content.get('image_elements', [])
                    
                    # Remove element with matching ID
                    image_elements = [elem for elem in image_elements if elem['id'] != element_id]
                    content['image_elements'] = image_elements
                    slide.content = content
                    slide.save()
                    
                    return Response({
                        'success': True,
                        'message': 'Image element removed from slide',
                        'slide_id': slide.id
                    })
                    
                except Slide.DoesNotExist:
                    # Try document
                    document = get_object_or_404(Document, id=presentation_id, created_by=user)
                    image_elements = document.metadata.get('image_elements', []) if document.metadata else []
                    
                    # Remove element with matching ID
                    image_elements = [elem for elem in image_elements if elem['id'] != element_id]
                    
                    if not document.metadata:
                        document.metadata = {}
                    document.metadata['image_elements'] = image_elements
                    document.save()
                    
                    return Response({
                        'success': True,
                        'message': 'Image element removed from document',
                        'document_id': document.id
                    })
            
            else:
                return Response({'error': 'diagram_id or (presentation_id + section_id) is required'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Remove image element failed: {e}")
            return Response({
                'error': 'Failed to remove image element',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def get_chart_elements(self, request):
        """Get all elements (charts and images) for a presentation section"""
        try:
            diagram_id = request.query_params.get('diagram_id')
            presentation_id = request.query_params.get('presentation_id')
            section_id = request.query_params.get('section_id')
            
            if diagram_id:
                # Get diagram with all elements
                diagram = get_object_or_404(DiagramElement, id=diagram_id, created_by=request.user)
                
                return Response({
                    'chart': {
                        'id': diagram.id,
                        'title': diagram.title,
                        'chart_type': diagram.chart_type,
                        'data': diagram.data,
                        'config': diagram.config,
                        'styling': diagram.styling
                    },
                    'image_elements': diagram.styling.get('image_elements', [])
                })
                
            elif presentation_id and section_id:
                # Get presentation section with all elements
                user = request.user
                
                # Try slide first
                try:
                    slide = Slide.objects.get(id=section_id, presentation__created_by=user)
                    content = slide.content if slide.content else {}
                    
                    # Get associated diagrams
                    diagrams = []
                    for diagram in slide.diagram_elements.filter(created_by=user):
                        diagrams.append({
                            'id': diagram.id,
                            'title': diagram.title,
                            'chart_type': diagram.chart_type,
                            'data': diagram.data,
                            'config': diagram.config,
                            'styling': diagram.styling
                        })
                    
                    return Response({
                        'slide_id': slide.id,
                        'diagrams': diagrams,
                        'image_elements': content.get('image_elements', []),
                        'content': content
                    })
                    
                except Slide.DoesNotExist:
                    # Try document
                    document = get_object_or_404(Document, id=presentation_id, created_by=user)
                    
                    # Get associated diagrams
                    diagrams = []
                    for diagram in document.diagram_elements.filter(created_by=user):
                        diagrams.append({
                            'id': diagram.id,
                            'title': diagram.title,
                            'chart_type': diagram.chart_type,
                            'data': diagram.data,
                            'config': diagram.config,
                            'styling': diagram.styling
                        })
                    
                    return Response({
                        'document_id': document.id,
                        'diagrams': diagrams,
                        'image_elements': document.metadata.get('image_elements', []) if document.metadata else []
                    })
            
            else:
                return Response({'error': 'diagram_id or (presentation_id + section_id) is required'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Get chart elements failed: {e}")
            return Response({
                'error': 'Failed to get chart elements',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)