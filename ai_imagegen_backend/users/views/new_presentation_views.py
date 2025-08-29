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
    convert_text_to_diagram_task
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
        """Convert selected text to diagram using Napkin.ai-style AI"""
        text = request.data.get('text', '')
        chart_type = request.data.get('chart_type', '')
        document_id = request.data.get('document_id')
        slide_id = request.data.get('slide_id')
        
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
            
            # Queue AI text-to-diagram conversion using Celery
            task_result = convert_text_to_diagram_task.delay(
                text=text,
                chart_type=chart_type,
                user_id=request.user.id,
                document_id=document_id,
                slide_id=slide_id
            )
            
            return Response({
                'task_id': task_result.id,
                'status': 'processing',
                'message': 'Diagram conversion started. Use task_id to check status.',
                'text': text[:100] + '...' if len(text) > 100 else text,
                'chart_type': chart_type
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