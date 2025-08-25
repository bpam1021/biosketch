# ai_imagegen_backend/users/views/presentation_views.py

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.http import HttpResponse, JsonResponse
from django.db.models import Q, Count, Avg
from django.utils import timezone
from django.conf import settings
from django.contrib.auth.models import User
import json
import uuid
import os
import mimetypes
from datetime import datetime, timedelta
from typing import Dict, List, Any
import logging

# Import your models
from users.models import (
    Presentation, ContentSection, DiagramElement, 
    PresentationTemplate, ChartTemplate, PresentationComment
)

# Import serializers - fix the import issues
from users.serializers import (
    PresentationDetailSerializer, PresentationListSerializer,
    ContentSectionSerializer, DiagramElementSerializer,
    PresentationTemplateSerializer, ChartTemplateSerializer,
    PresentationCommentSerializer, CreatePresentationSerializer
)

logger = logging.getLogger(__name__)

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


# ============================================================================
# MAIN PRESENTATION VIEWSET - FIXED
# ============================================================================

class PresentationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing presentations with full CRUD operations
    """
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        """Filter presentations based on user permissions"""
        user = self.request.user
        queryset = Presentation.objects.filter(
            Q(user=user) | Q(collaborators=user) | Q(is_public=True)
        ).distinct().select_related('user', 'template').prefetch_related('content_sections', 'collaborators')
        
        # Apply filters
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )
        
        presentation_type = self.request.query_params.get('presentation_type')
        if presentation_type and presentation_type != 'all':
            queryset = queryset.filter(presentation_type=presentation_type)
        
        # Date filters
        date_from = self.request.query_params.get('created_at__gte')
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        
        date_to = self.request.query_params.get('created_at__lte')
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        
        # Ordering
        ordering = self.request.query_params.get('ordering', '-updated_at')
        queryset = queryset.order_by(ordering)
        
        return queryset
    
    def get_serializer_class(self):
        """Use different serializers for different actions"""
        if self.action == 'list':
            return PresentationListSerializer
        elif self.action == 'retrieve':
            return PresentationDetailSerializer
        elif self.action == 'create':
            return CreatePresentationSerializer
        return PresentationDetailSerializer
    
    def perform_create(self, serializer):
        """Set the creator when creating a presentation"""
        serializer.save(user=self.request.user)
    
    def perform_update(self, serializer):
        """Update the modified timestamp"""
        serializer.save(updated_at=timezone.now())
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Create a copy of an existing presentation"""
        try:
            original = self.get_object()
            
            # Create new presentation
            new_presentation = Presentation.objects.create(
                title=f"{original.title} (Copy)",
                description=original.description,
                presentation_type=original.presentation_type,
                original_prompt=original.original_prompt,
                theme_settings=original.theme_settings,
                brand_settings=original.brand_settings,
                document_settings=original.document_settings,
                page_layout=original.page_layout,
                user=request.user,
                is_public=False  # Copies are private by default
            )
            
            # Copy all sections
            sections = ContentSection.objects.filter(presentation=original).order_by('order')
            for section in sections:
                new_section = ContentSection.objects.create(
                    presentation=new_presentation,
                    section_type=section.section_type,
                    title=section.title,
                    content=section.content,
                    rich_content=section.rich_content,
                    image_url=section.image_url,
                    image_prompt=section.image_prompt,
                    canvas_json=section.canvas_json,
                    order=section.order,
                    content_data=section.content_data,
                    layout_config=section.layout_config,
                    style_config=section.style_config,
                    animation_config=section.animation_config,
                    interaction_config=section.interaction_config,
                    ai_generated=section.ai_generated,
                    generation_metadata=section.generation_metadata
                )
                
                # Copy diagrams
                diagrams = DiagramElement.objects.filter(content_section=section)
                for diagram in diagrams:
                    DiagramElement.objects.create(
                        content_section=new_section,
                        chart_template=diagram.chart_template,
                        title=diagram.title,
                        chart_type=diagram.chart_type,
                        chart_data=diagram.chart_data,
                        style_config=diagram.style_config,
                        source_content=diagram.source_content,
                        generation_prompt=diagram.generation_prompt,
                        position_x=diagram.position_x,
                        position_y=diagram.position_y,
                        width=diagram.width,
                        height=diagram.height
                    )
            
            serializer = self.get_serializer(new_presentation)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Duplication error: {str(e)}")
            return Response(
                {'error': f'Failed to duplicate presentation: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def apply_template(self, request, pk=None):
        """Apply a template to an existing presentation"""
        try:
            presentation = self.get_object()
            template_id = request.data.get('template_id')
            
            if not template_id:
                return Response(
                    {'error': 'template_id is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            template = get_object_or_404(PresentationTemplate, id=template_id)
            
            # Apply template settings
            if template.style_config:
                presentation.theme_settings.update(template.style_config)
            if template.layout_config:
                presentation.brand_settings.update(template.layout_config)
            
            presentation.template = template
            presentation.save()
            
            return Response({'message': 'Template applied successfully'})
            
        except Exception as e:
            logger.error(f"Template application error: {str(e)}")
            return Response(
                {'error': f'Failed to apply template: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def export(self, request, pk=None):
        """Start export process for presentation"""
        try:
            presentation = self.get_object()
            export_format = request.data.get('export_format', 'pdf')
            selected_sections = request.data.get('selected_sections', [])
            export_settings = request.data.get('export_settings', {})
            
            # Create export job
            job_id = str(uuid.uuid4())
            
            # Here you would typically queue a background job
            # For now, we'll simulate the process
            
            return Response({
                'job_id': job_id,
                'message': f'Export started. Format: {export_format}',
                'status': 'processing'
            })
            
        except Exception as e:
            logger.error(f"Export error: {str(e)}")
            return Response(
                {'error': f'Export failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def export_status(self, request, pk=None):
        """Get export job status"""
        try:
            # Mock export status - replace with actual implementation
            return Response({
                'jobs': [
                    {
                        'job_id': 'mock-job-id',
                        'status': 'completed',
                        'format': 'pdf',
                        'created_at': timezone.now().isoformat(),
                        'completed_at': timezone.now().isoformat(),
                        'download_url': f'/presentations/{pk}/export/force-download/?format=pdf'
                    }
                ]
            })
            
        except Exception as e:
            logger.error(f"Export status error: {str(e)}")
            return Response(
                {'error': f'Failed to get export status: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def force_download(self, request, pk=None):
        """Force download export file"""
        try:
            presentation = self.get_object()
            export_format = request.query_params.get('format', 'pdf')
            
            # Generate simple HTML content for testing
            content = self._generate_html_content(presentation)
            content_type = 'text/html'
            filename = f"{presentation.title}.html"
            
            response = HttpResponse(content, content_type=content_type)
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
            
        except Exception as e:
            logger.error(f"Force download error: {str(e)}")
            return Response(
                {'error': f'Export failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _generate_html_content(self, presentation):
        """Generate HTML content"""
        sections = ContentSection.objects.filter(presentation=presentation).order_by('order')
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>{presentation.title}</title>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }}
                h1 {{ color: #333; border-bottom: 2px solid #007bff; }}
                .section {{ margin: 20px 0; padding: 15px; border-left: 4px solid #007bff; }}
                .section-title {{ font-size: 1.2em; font-weight: bold; margin-bottom: 10px; }}
                .section-content {{ line-height: 1.6; }}
                img {{ max-width: 100%; height: auto; }}
            </style>
        </head>
        <body>
            <h1>{presentation.title}</h1>
            <p>{presentation.description or ''}</p>
        """
        
        for section in sections:
            html_content += f"""
            <div class="section">
                <div class="section-title">{section.title}</div>
                <div class="section-content">
                    {section.rich_content or section.content}
                    {f'<img src="{section.image_url}" alt="{section.title}">' if section.image_url else ''}
                </div>
            </div>
            """
        
        html_content += """
        </body>
        </html>
        """
        
        return html_content


# ============================================================================
# CONTENT SECTION VIEWSET
# ============================================================================

class ContentSectionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing content sections within presentations
    """
    serializer_class = ContentSectionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter sections by presentation"""
        presentation_pk = self.kwargs.get('presentation_pk')
        if presentation_pk:
            return ContentSection.objects.filter(
                presentation_id=presentation_pk
            ).select_related('presentation').prefetch_related('diagrams').order_by('order')
        return ContentSection.objects.none()
    
    def perform_create(self, serializer):
        """Set presentation when creating section"""
        presentation_pk = self.kwargs.get('presentation_pk')
        presentation = get_object_or_404(Presentation, pk=presentation_pk)
        
        # Auto-assign order if not provided
        if not serializer.validated_data.get('order'):
            last_section = ContentSection.objects.filter(
                presentation=presentation
            ).order_by('-order').first()
            order = (last_section.order + 1) if last_section else 0
            serializer.validated_data['order'] = order
        
        serializer.save(presentation=presentation)
    
    @action(detail=True, methods=['post'])
    def enhance_content(self, request, presentation_pk=None, pk=None):
        """Enhance section content using AI"""
        try:
            section = self.get_object()
            enhancement_type = request.data.get('enhancement_type')
            target_audience = request.data.get('target_audience', 'general')
            additional_instructions = request.data.get('additional_instructions', '')
            
            if not enhancement_type:
                return Response(
                    {'error': 'enhancement_type is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Mock content enhancement
            original_content = section.content
            
            enhancement_map = {
                'grammar': f"[Grammar Enhanced] {original_content}",
                'clarity': f"[Clarity Improved] {original_content}",
                'expand': f"{original_content}\n\n[Additional details added for {target_audience} audience. {additional_instructions}]",
                'summarize': f"[Summarized] {original_content[:100]}..." if len(original_content) > 100 else original_content,
                'rephrase': f"[Rephrased] {original_content}",
                'format': f"[Formatted] {original_content}"
            }
            
            enhanced_content = enhancement_map.get(enhancement_type, f"[Enhanced] {original_content}")
            
            section.content = enhanced_content
            section.rich_content = enhanced_content
            section.ai_generated = True
            section.generation_metadata = {
                'enhancement_type': enhancement_type,
                'target_audience': target_audience,
                'additional_instructions': additional_instructions,
                'enhanced_at': timezone.now().isoformat(),
                'original_length': len(original_content),
                'enhanced_length': len(enhanced_content)
            }
            section.updated_at = timezone.now()
            section.save()
            
            serializer = self.get_serializer(section)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Content enhancement error: {str(e)}")
            return Response(
                {'error': f'Content enhancement failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def generate_content(self, request, presentation_pk=None, pk=None):
        """Generate content for a section using AI"""
        try:
            section = self.get_object()
            generation_type = request.data.get('generation_type', 'section_content')
            prompt = request.data.get('prompt', '')
            content_length = request.data.get('content_length', 'medium')
            tone = request.data.get('tone', 'professional')
            
            # Mock content generation
            base_prompt = prompt or f"Generate {content_length} content for {section.title}"
            
            length_map = {
                'short': f"Brief {tone} content for {section.title}. {base_prompt}",
                'medium': f"Detailed {tone} content for {section.title}. {base_prompt} This provides comprehensive information.",
                'long': f"Extensive {tone} content for {section.title}. {base_prompt} This is a thorough exploration with detailed analysis."
            }
            
            generated_content = length_map.get(content_length, f"Generated {tone} content: {base_prompt}")
            
            section.content = generated_content
            section.rich_content = generated_content
            section.ai_generated = True
            section.generation_metadata = {
                'generation_type': generation_type,
                'prompt': prompt,
                'content_length': content_length,
                'tone': tone,
                'generated_at': timezone.now().isoformat(),
                'word_count': len(generated_content.split())
            }
            section.updated_at = timezone.now()
            section.save()
            
            serializer = self.get_serializer(section)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Content generation error: {str(e)}")
            return Response(
                {'error': f'Content generation failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def bulk_update(self, request, presentation_pk=None):
        """Bulk update multiple sections"""
        try:
            sections_data = request.data.get('sections', [])
            updated_sections = []
            
            for section_data in sections_data:
                section_id = section_data.get('id')
                if section_id:
                    try:
                        section = ContentSection.objects.get(
                            id=section_id, 
                            presentation_id=presentation_pk
                        )
                        
                        # Update only provided fields
                        updatable_fields = [
                            'title', 'content', 'rich_content', 'image_url', 
                            'order', 'content_data', 'layout_config', 
                            'style_config', 'animation_config'
                        ]
                        
                        for field in updatable_fields:
                            if field in section_data:
                                setattr(section, field, section_data[field])
                        
                        section.updated_at = timezone.now()
                        section.save()
                        updated_sections.append(section)
                        
                    except ContentSection.DoesNotExist:
                        continue
            
            serializer = self.get_serializer(updated_sections, many=True)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Bulk update error: {str(e)}")
            return Response(
                {'error': f'Bulk update failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def reorder(self, request, presentation_pk=None):
        """Reorder sections"""
        try:
            section_orders = request.data.get('section_orders', [])
            
            for order_data in section_orders:
                section_id = order_data.get('id')
                new_order = order_data.get('order')
                
                if section_id and new_order is not None:
                    try:
                        section = ContentSection.objects.get(
                            id=section_id, 
                            presentation_id=presentation_pk
                        )
                        section.order = new_order
                        section.updated_at = timezone.now()
                        section.save()
                    except ContentSection.DoesNotExist:
                        continue
            
            return Response({'message': 'Sections reordered successfully'})
            
        except Exception as e:
            logger.error(f"Reorder error: {str(e)}")
            return Response(
                {'error': f'Reorder failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================================================
# DIAGRAM ELEMENT VIEWSET
# ============================================================================

class DiagramElementViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing diagram elements within sections
    """
    serializer_class = DiagramElementSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter diagrams by section"""
        section_pk = self.kwargs.get('section_pk')
        if section_pk:
            return DiagramElement.objects.filter(content_section_id=section_pk)
        return DiagramElement.objects.none()
    
    def perform_create(self, serializer):
        """Set section when creating diagram"""
        section_pk = self.kwargs.get('section_pk')
        section = get_object_or_404(ContentSection, pk=section_pk)
        serializer.save(content_section=section)
    
    @action(detail=True, methods=['post'])
    def regenerate(self, request, presentation_pk=None, section_pk=None, pk=None):
        """Regenerate a diagram"""
        try:
            diagram = self.get_object()
            additional_prompt = request.data.get('additional_prompt', '')
            
            # Mock diagram regeneration
            original_prompt = diagram.generation_prompt or ''
            new_prompt = f"{original_prompt} {additional_prompt}".strip()
            
            diagram.generation_prompt = new_prompt
            diagram.chart_data = {
                **diagram.chart_data,
                'regenerated': True,
                'regeneration_timestamp': timezone.now().isoformat(),
                'additional_prompt': additional_prompt,
                'regeneration_count': diagram.chart_data.get('regeneration_count', 0) + 1
            }
            diagram.updated_at = timezone.now()
            diagram.save()
            
            serializer = self.get_serializer(diagram)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Diagram regeneration error: {str(e)}")
            return Response(
                {'error': f'Diagram regeneration failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================================================
# TEMPLATE VIEWSETS
# ============================================================================

class PresentationTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for presentation templates (read-only)
    """
    queryset = PresentationTemplate.objects.filter(is_active=True)
    serializer_class = PresentationTemplateSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter templates based on query parameters"""
        queryset = super().get_queryset()
        
        template_type = self.request.query_params.get('template_type')
        if template_type:
            queryset = queryset.filter(template_type=template_type)
        
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(description__icontains=search)
            )
        
        return queryset.order_by('-usage_count', 'name')


class ChartTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for chart templates (read-only)
    """
    queryset = ChartTemplate.objects.filter(is_active=True)
    serializer_class = ChartTemplateSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter chart templates"""
        queryset = super().get_queryset()
        
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        chart_type = self.request.query_params.get('chart_type')
        if chart_type:
            queryset = queryset.filter(chart_type=chart_type)
        
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(description__icontains=search)
            )
        
        return queryset.order_by('-usage_count', 'name')
    
    @action(detail=False, methods=['post'])
    def suggest_for_content(self, request):
        """Suggest chart types based on content"""
        try:
            content_text = request.data.get('content_text', '')
            current_section_type = request.data.get('current_section_type', '')
            
            if not content_text:
                return Response(
                    {'error': 'content_text is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Mock chart suggestion logic
            suggestions = []
            templates = []
            
            # Simple keyword-based suggestions
            content_lower = content_text.lower()
            
            if any(word in content_lower for word in ['data', 'statistics', 'numbers', 'percentage']):
                suggestions.append({
                    'chart_type': 'bar_chart',
                    'confidence': 0.8,
                    'reason': 'Content contains numerical data suitable for bar chart'
                })
            
            if any(word in content_lower for word in ['process', 'steps', 'workflow']):
                suggestions.append({
                    'chart_type': 'flowchart',
                    'confidence': 0.9,
                    'reason': 'Content describes a process suitable for flowchart'
                })
            
            if any(word in content_lower for word in ['timeline', 'history', 'chronological']):
                suggestions.append({
                    'chart_type': 'timeline',
                    'confidence': 0.85,
                    'reason': 'Content has temporal elements suitable for timeline'
                })
            
            # Default suggestion
            if not suggestions:
                suggestions.append({
                    'chart_type': 'infographic',
                    'confidence': 0.6,
                    'reason': 'Content can be enhanced with visual elements'
                })
            
            # Get matching templates
            suggested_chart_types = [s['chart_type'] for s in suggestions]
            templates = list(ChartTemplate.objects.filter(
                chart_type__in=suggested_chart_types,
                is_active=True
            )[:5])
            
            return Response({
                'suggestions': suggestions,
                'templates': ChartTemplateSerializer(templates, many=True).data
            })
            
        except Exception as e:
            logger.error(f"Chart suggestion error: {str(e)}")
            return Response(
                {'error': f'Chart suggestion failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================================================
# COMMENT VIEWSET
# ============================================================================

class PresentationCommentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing comments on presentations
    """
    serializer_class = PresentationCommentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter comments by presentation"""
        presentation_pk = self.kwargs.get('presentation_pk')
        if presentation_pk:
            return PresentationComment.objects.filter(
                presentation_id=presentation_pk
            ).select_related('author', 'content_section').order_by('-created_at')
        return PresentationComment.objects.none()
    
    def perform_create(self, serializer):
        """Set presentation and author when creating comment"""
        presentation_pk = self.kwargs.get('presentation_pk')
        presentation = get_object_or_404(Presentation, pk=presentation_pk)
        serializer.save(presentation=presentation, author=self.request.user)


# ============================================================================
# UTILITY VIEWS
# ============================================================================

class ImageUploadView(APIView):
    """Handle image uploads for presentations"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        if 'image' not in request.FILES:
            return Response(
                {'error': 'No image file provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        image_file = request.FILES['image']
        
        # Validate file type
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if image_file.content_type not in allowed_types:
            return Response(
                {'error': 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file size (10MB limit)
        max_size = 10 * 1024 * 1024  # 10MB
        if image_file.size > max_size:
            return Response(
                {'error': 'File too large. Maximum size is 10MB.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Generate unique filename
            file_extension = image_file.name.split('.')[-1] if '.' in image_file.name else 'jpg'
            filename = f"presentations/{self.request.user.id}/{uuid.uuid4()}.{file_extension}"
            
            # Save file
            saved_path = default_storage.save(filename, ContentFile(image_file.read()))
            file_url = default_storage.url(saved_path)
            
            # Make URL absolute if it's relative
            if file_url.startswith('/'):
                file_url = request.build_absolute_uri(file_url)
            
            return Response({
                'url': file_url,
                'filename': saved_path,
                'size': image_file.size,
                'content_type': image_file.content_type,
                'uploaded_at': timezone.now().isoformat()
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Image upload error: {str(e)}")
            return Response(
                {'error': f'Failed to upload image: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AccessibilityCheckView(APIView):
    """Perform accessibility analysis on presentations"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, presentation_id):
        try:
            presentation = get_object_or_404(Presentation, id=presentation_id)
            
            # Check permissions
            if (presentation.user != request.user and 
                request.user not in presentation.collaborators.all() and 
                not presentation.is_public):
                return Response(
                    {'error': 'You do not have permission to access this presentation'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Mock accessibility analysis
            return Response({
                'accessibility_score': 85.5,
                'compliance_standards': {
                    'wcag_aa': True,
                    'section_508': True,
                    'wcag_aaa': False
                },
                'issues': [
                    {
                        'severity': 'medium',
                        'description': 'Some images missing alt text',
                        'fix': 'Add descriptive alt text for screen readers',
                        'wcag_guideline': '1.1.1 Non-text Content'
                    }
                ],
                'generated_at': timezone.now().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Accessibility check error: {str(e)}")
            return Response(
                {'error': f'Accessibility check failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PerformanceAnalysisView(APIView):
    """Analyze presentation performance"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, presentation_id):
        try:
            presentation = get_object_or_404(Presentation, id=presentation_id)
            
            # Check permissions
            if (presentation.user != request.user and 
                request.user not in presentation.collaborators.all() and 
                not presentation.is_public):
                return Response(
                    {'error': 'You do not have permission to access this presentation'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            sections = ContentSection.objects.filter(presentation=presentation)
            
            # Mock performance analysis
            return Response({
                'performance_score': 92,
                'issues': [
                    {
                        'severity': 'low',
                        'description': f'Presentation has {sections.count()} sections',
                        'fix': 'Consider organizing content into chapters',
                        'impact': 'Minimal performance impact'
                    }
                ],
                'metrics': {
                    'total_sections': sections.count(),
                    'estimated_load_time_seconds': 2.5,
                    'estimated_memory_mb': 8.2
                },
                'generated_at': timezone.now().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Performance analysis error: {str(e)}")
            return Response(
                {'error': f'Performance analysis failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AIGenerationView(APIView):
    """Handle AI content generation requests"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            generation_type = request.data.get('generation_type', 'text')
            prompt = request.data.get('prompt', '')
            context = request.data.get('context', {})
            
            if not prompt:
                return Response(
                    {'error': 'prompt is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Mock AI generation
            generated_content = f"AI generated {generation_type} content based on: {prompt}"
            
            return Response({
                'generated_content': generated_content,
                'generation_type': generation_type,
                'prompt': prompt,
                'generated_at': timezone.now().isoformat(),
                'word_count': len(generated_content.split()),
                'character_count': len(generated_content)
            })
            
        except Exception as e:
            logger.error(f"AI generation error: {str(e)}")
            return Response(
                {'error': f'AI generation failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PresentationAnalyticsView(APIView):
    """Get analytics for a specific presentation"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, presentation_id):
        try:
            presentation = get_object_or_404(Presentation, id=presentation_id)
            
            # Check permissions
            if (presentation.user != request.user and 
                request.user not in presentation.collaborators.all() and 
                not presentation.is_public):
                return Response(
                    {'error': 'You do not have permission to access this presentation'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Mock analytics data
            sections = ContentSection.objects.filter(presentation=presentation)
            
            analytics_data = {
                'views_count': 150,
                'unique_viewers': 45,
                'average_time_spent': 420,  # seconds
                'export_count': 12,
                'comment_count': 5,
                'word_count': sum(len((s.content or '').split()) for s in sections),
                'estimated_duration': sum(len((s.content or '').split()) for s in sections) // 200,
                'credits_used': 5
            }
            
            return Response(analytics_data)
            
        except Exception as e:
            logger.error(f"Analytics error: {str(e)}")
            return Response(
                {'error': f'Analytics retrieval failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )