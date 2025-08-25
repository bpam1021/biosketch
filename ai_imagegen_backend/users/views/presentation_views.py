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
import json
import uuid
import os
import mimetypes
from datetime import datetime, timedelta
from typing import Dict, List, Any
import logging

# Import your models (adjust according to your actual model structure)
try:
    from users.models import (
        Presentation, ContentSection, DiagramElement, 
        PresentationTemplate, ChartTemplate, PresentationComment,
        User
    )
except ImportError:
    # Fallback imports if models are in different locations
    from django.apps import apps
    Presentation = apps.get_model('users', 'Presentation')
    ContentSection = apps.get_model('users', 'ContentSection')
    DiagramElement = apps.get_model('users', 'DiagramElement')
    PresentationTemplate = apps.get_model('users', 'PresentationTemplate')
    ChartTemplate = apps.get_model('users', 'ChartTemplate')
    PresentationComment = apps.get_model('users', 'PresentationComment')
    User = apps.get_model('users', 'User')

# Import serializers (you'll need to create these)
try:
    from users.serializers.presentation_serializers import (
        PresentationSerializer, PresentationDetailSerializer,
        ContentSectionSerializer, DiagramElementSerializer,
        PresentationTemplateSerializer, ChartTemplateSerializer,
        PresentationCommentSerializer, PresentationListSerializer
    )
except ImportError:
    # Temporary basic serializers - replace with your actual serializers
    from rest_framework import serializers
    
    class PresentationSerializer(serializers.ModelSerializer):
        class Meta:
            model = Presentation
            fields = '__all__'
    
    class PresentationDetailSerializer(serializers.ModelSerializer):
        class Meta:
            model = Presentation
            fields = '__all__'
    
    class PresentationListSerializer(serializers.ModelSerializer):
        class Meta:
            model = Presentation
            fields = ['id', 'title', 'description', 'presentation_type', 'created_at', 'updated_at']
    
    class ContentSectionSerializer(serializers.ModelSerializer):
        class Meta:
            model = ContentSection
            fields = '__all__'
    
    class DiagramElementSerializer(serializers.ModelSerializer):
        class Meta:
            model = DiagramElement
            fields = '__all__'
    
    class PresentationTemplateSerializer(serializers.ModelSerializer):
        class Meta:
            model = PresentationTemplate
            fields = '__all__'
    
    class ChartTemplateSerializer(serializers.ModelSerializer):
        class Meta:
            model = ChartTemplate
            fields = '__all__'
    
    class PresentationCommentSerializer(serializers.ModelSerializer):
        class Meta:
            model = PresentationComment
            fields = '__all__'

logger = logging.getLogger(__name__)

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


# ============================================================================
# MAIN PRESENTATION VIEWSET
# ============================================================================

class PresentationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing presentations with full CRUD operations
    """
    serializer_class = PresentationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        """Filter presentations based on user permissions"""
        user = self.request.user
        queryset = Presentation.objects.filter(
            Q(user=user) | Q(collaborators=user) | Q(is_public=True)
        ).distinct().select_related('user').prefetch_related('sections', 'collaborators')
        
        # Apply filters
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )
        
        presentation_type = self.request.query_params.get('presentation_type')
        if presentation_type and presentation_type != 'all':
            queryset = queryset.filter(presentation_type=presentation_type)
        
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        # Date filters
        date_from = self.request.query_params.get('created_at__gte')
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        
        date_to = self.request.query_params.get('created_at__lte')
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        
        # Ordering
        ordering = self.request.query_params.get('ordering', '-created_at')
        queryset = queryset.order_by(ordering)
        
        return queryset
    
    def get_serializer_class(self):
        """Use different serializers for different actions"""
        if self.action == 'list':
            return PresentationListSerializer
        elif self.action == 'retrieve':
            return PresentationDetailSerializer
        return PresentationSerializer
    
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
                category=original.category,
                original_prompt=original.original_prompt,
                theme_settings=original.theme_settings,
                layout_settings=original.layout_settings,
                created_by=request.user,
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
                    rendered_image=section.rendered_image,
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
                        content_text=diagram.content_text,
                        generation_prompt=diagram.generation_prompt,
                        rendered_image_url=diagram.rendered_image_url,
                        position_x=diagram.position_x,
                        position_y=diagram.position_y,
                        width=diagram.width,
                        height=diagram.height
                    )
            
            serializer = self.get_serializer(new_presentation)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
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
            if template.default_theme_settings:
                presentation.theme_settings = template.default_theme_settings
            if template.default_layout_settings:
                presentation.layout_settings = template.default_layout_settings
            
            presentation.save()
            
            return Response({'message': 'Template applied successfully'})
            
        except Exception as e:
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
            
            # Store export job info (you might want to create an ExportJob model)
            export_data = {
                'job_id': job_id,
                'presentation_id': str(presentation.id),
                'format': export_format,
                'status': 'processing',
                'created_at': timezone.now().isoformat(),
                'settings': export_settings,
                'selected_sections': selected_sections
            }
            
            # In a real implementation, you'd save this to database and queue background job
            # queue_export_job.delay(job_id, export_data)
            
            return Response({
                'job_id': job_id,
                'message': f'Export started. Format: {export_format}'
            })
            
        except Exception as e:
            return Response(
                {'error': f'Export failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def export_status(self, request, pk=None):
        """Get export job status"""
        try:
            # In a real implementation, you'd query your export jobs
            # For now, return mock data
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
            
            # Generate content based on format
            if export_format == 'pdf':
                content = self._generate_pdf_content(presentation)
                content_type = 'application/pdf'
                filename = f"{presentation.title}.pdf"
            elif export_format == 'docx':
                content = self._generate_docx_content(presentation)
                content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                filename = f"{presentation.title}.docx"
            elif export_format == 'pptx':
                content = self._generate_pptx_content(presentation)
                content_type = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
                filename = f"{presentation.title}.pptx"
            elif export_format == 'html':
                content = self._generate_html_content(presentation)
                content_type = 'text/html'
                filename = f"{presentation.title}.html"
            else:
                content = f"Export of {presentation.title}"
                content_type = 'application/octet-stream'
                filename = f"{presentation.title}.{export_format}"
            
            response = HttpResponse(content, content_type=content_type)
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
            
        except Exception as e:
            return Response(
                {'error': f'Export failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _generate_pdf_content(self, presentation):
        """Generate PDF content (mock implementation)"""
        return f"PDF Export of {presentation.title}\n\nGenerated on {timezone.now()}"
    
    def _generate_docx_content(self, presentation):
        """Generate DOCX content (mock implementation)"""
        return f"DOCX Export of {presentation.title}".encode()
    
    def _generate_pptx_content(self, presentation):
        """Generate PPTX content (mock implementation)"""
        return f"PPTX Export of {presentation.title}".encode()
    
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
            ).order_by('order')
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
            
            # Mock content enhancement - replace with actual AI service
            original_content = section.content
            
            enhancement_map = {
                'grammar': f"[Grammar Enhanced] {original_content}",
                'clarity': f"[Clarity Improved] {original_content}",
                'expand': f"{original_content}\n\n[Additional details and examples added for {target_audience} audience. {additional_instructions}]",
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
            
            # Mock content generation - replace with actual AI service
            base_prompt = prompt or f"Generate {content_length} content for {section.title}"
            
            length_map = {
                'short': f"Brief {tone} content for {section.title}. {base_prompt}",
                'medium': f"Detailed {tone} content for {section.title}. {base_prompt} This provides comprehensive information while maintaining clarity.",
                'long': f"Extensive {tone} content for {section.title}. {base_prompt} This is a thorough exploration that covers multiple aspects, provides detailed analysis, includes examples and supporting information, and offers comprehensive insights into the topic."
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
            
            # Mock diagram regeneration - replace with actual AI service
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
            
            # Mock chart suggestion logic - replace with actual AI analysis
            suggestions = []
            templates = []
            
            # Simple keyword-based suggestions
            content_lower = content_text.lower()
            
            if any(word in content_lower for word in ['data', 'statistics', 'numbers', 'percentage']):
                suggestions.append({
                    'chart_type': 'bar_chart',
                    'confidence': 0.8,
                    'reason': 'Content contains numerical data that would work well in a bar chart'
                })
                suggestions.append({
                    'chart_type': 'pie_chart',
                    'confidence': 0.7,
                    'reason': 'Percentage data can be effectively visualized in a pie chart'
                })
            
            if any(word in content_lower for word in ['process', 'steps', 'workflow', 'procedure']):
                suggestions.append({
                    'chart_type': 'flowchart',
                    'confidence': 0.9,
                    'reason': 'Content describes a process that would benefit from a flowchart'
                })
            
            if any(word in content_lower for word in ['timeline', 'history', 'chronological', 'sequence']):
                suggestions.append({
                    'chart_type': 'timeline',
                    'confidence': 0.85,
                    'reason': 'Content has temporal elements suitable for a timeline'
                })
            
            if any(word in content_lower for word in ['organization', 'hierarchy', 'structure', 'team']):
                suggestions.append({
                    'chart_type': 'org_chart',
                    'confidence': 0.8,
                    'reason': 'Content describes organizational structure'
                })
            
            if any(word in content_lower for word in ['trend', 'growth', 'over time', 'progression']):
                suggestions.append({
                    'chart_type': 'line_chart',
                    'confidence': 0.75,
                    'reason': 'Content shows trends that would work well in a line chart'
                })
            
            # If no specific suggestions, provide generic ones
            if not suggestions:
                suggestions.append({
                    'chart_type': 'infographic',
                    'confidence': 0.6,
                    'reason': 'Content can be enhanced with visual infographic elements'
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
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
        if image_file.content_type not in allowed_types:
            return Response(
                {'error': 'Invalid file type. Only JPEG, PNG, GIF, WebP, and SVG are allowed.'}, 
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
            return Response(
                {'error': f'Failed to upload image: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AccessibilityCheckView(APIView):
    """Perform accessibility analysis on presentations"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, presentation_id):
        try:
            presentation = get_object_or_404(
                Presentation.objects.select_related('created_by').prefetch_related('sections'),
                id=presentation_id
            )
            
            # Check user permissions
            if (presentation.created_by != request.user and 
                request.user not in presentation.collaborators.all() and 
                not presentation.is_public):
                return Response(
                    {'error': 'You do not have permission to access this presentation'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            sections = presentation.sections.all()
            
            # Perform accessibility analysis
            accessibility_score = 0
            total_checks = 0
            issues = []
            
            # Check 1: Text contrast
            total_checks += 1
            primary_color = presentation.theme_settings.get('primary_color', '#000000')
            background_color = presentation.theme_settings.get('background_color', '#ffffff')
            
            # Simple contrast check (you'd want a more sophisticated algorithm)
            if primary_color.lower() != background_color.lower():
                accessibility_score += 1
            else:
                issues.append({
                    'severity': 'high',
                    'description': 'Low contrast between primary and background colors',
                    'fix': 'Use colors with higher contrast ratio (minimum 4.5:1)',
                    'section_id': None,
                    'wcag_guideline': '1.4.3 Contrast (Minimum)'
                })
            
            # Check 2: Alt text on images
            image_sections = sections.filter(section_type__in=['image', 'image_slide'])
            for section in image_sections:
                total_checks += 1
                if section.content and section.content.strip():
                    accessibility_score += 1
                else:
                    issues.append({
                        'severity': 'medium',
                        'description': f'Image in section "{section.title}" missing alt text',
                        'fix': 'Add descriptive text for screen readers',
                        'section_id': str(section.id),
                        'wcag_guideline': '1.1.1 Non-text Content'
                    })
            
            # Check 3: Proper heading structure
            heading_sections = sections.filter(section_type='heading').order_by('order')
            prev_level = 0
            for section in heading_sections:
                total_checks += 1
                current_level = self._get_heading_level(section)
                
                if prev_level == 0 or current_level <= prev_level + 1:
                    accessibility_score += 1
                else:
                    issues.append({
                        'severity': 'medium',
                        'description': f'Heading level skip in section "{section.title}" (H{prev_level} to H{current_level})',
                        'fix': 'Use proper heading hierarchy (H1, H2, H3, etc.) without skipping levels',
                        'section_id': str(section.id),
                        'wcag_guideline': '1.3.1 Info and Relationships'
                    })
                prev_level = current_level
            
            # Check 4: Video captions
            video_sections = sections.filter(section_type='video')
            for section in video_sections:
                total_checks += 1
                if section.content_data.get('captions') or section.content_data.get('transcript'):
                    accessibility_score += 1
                else:
                    issues.append({
                        'severity': 'high',
                        'description': f'Video in section "{section.title}" missing captions or transcript',
                        'fix': 'Add captions or transcripts for video content',
                        'section_id': str(section.id),
                        'wcag_guideline': '1.2.2 Captions (Prerecorded)'
                    })
            
            # Check 5: Color-only information
            total_checks += 1
            # This is a simplified check - you'd want more sophisticated analysis
            accessibility_score += 1  # Assume pass for now
            
            # Check 6: Focus indicators
            total_checks += 1
            accessibility_score += 1  # Assume pass for interactive elements
            
            # Calculate final score
            final_score = (accessibility_score / max(total_checks, 1)) * 100
            
            # Determine compliance
            high_severity_issues = [i for i in issues if i['severity'] == 'high']
            medium_severity_issues = [i for i in issues if i['severity'] == 'medium']
            
            wcag_aa_compliant = final_score >= 80 and len(high_severity_issues) == 0
            section_508_compliant = final_score >= 75 and len(high_severity_issues) <= 1
            
            return Response({
                'accessibility_score': round(final_score, 1),
                'compliance_standards': {
                    'wcag_aa': wcag_aa_compliant,
                    'section_508': section_508_compliant,
                    'wcag_aaa': final_score >= 90 and len(issues) == 0
                },
                'issues': issues,
                'summary': {
                    'total_checks': total_checks,
                    'passed_checks': accessibility_score,
                    'high_severity_issues': len(high_severity_issues),
                    'medium_severity_issues': len(medium_severity_issues),
                    'low_severity_issues': len([i for i in issues if i['severity'] == 'low'])
                },
                'recommendations': self._get_accessibility_recommendations(issues),
                'generated_at': timezone.now().isoformat()
            })
            
        except Presentation.DoesNotExist:
            return Response(
                {'error': 'Presentation not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Accessibility check failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_heading_level(self, section):
        """Determine heading level from font size"""
        font_size = section.style_config.get('fontSize', 20)
        level_mapping = {32: 1, 28: 2, 24: 3, 20: 4, 18: 5, 16: 6}
        return level_mapping.get(font_size, 4)
    
    def _get_accessibility_recommendations(self, issues):
        """Generate accessibility recommendations"""
        recommendations = [
            'Ensure sufficient color contrast (4.5:1 minimum)',
            'Provide alt text for all images',
            'Use proper heading hierarchy',
            'Include captions for video content',
            'Test with screen readers',
            'Provide keyboard navigation support'
        ]
        
        # Add specific recommendations based on issues
        if any('contrast' in issue['description'].lower() for issue in issues):
            recommendations.insert(0, 'Use a color contrast checker to verify compliance')
        
        if any('alt text' in issue['description'].lower() for issue in issues):
            recommendations.insert(0, 'Add descriptive alt text for all images')
        
        return recommendations[:5]  # Return top 5 recommendations


class PerformanceAnalysisView(APIView):
    """Analyze presentation performance and provide optimization suggestions"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, presentation_id):
        try:
            presentation = get_object_or_404(
                Presentation.objects.select_related('created_by').prefetch_related('sections'),
                id=presentation_id
            )
            
            # Check user permissions
            if (presentation.created_by != request.user and 
                request.user not in presentation.collaborators.all() and 
                not presentation.is_public):
                return Response(
                    {'error': 'You do not have permission to access this presentation'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            sections = presentation.sections.all()
            
            # Performance analysis
            performance_score = 100
            issues = []
            metrics = {}
            
            # Metric 1: Total sections count
            total_sections = sections.count()
            metrics['total_sections'] = total_sections
            
            if total_sections > 50:
                performance_score -= 15
                issues.append({
                    'severity': 'medium',
                    'description': f'Large number of sections ({total_sections})',
                    'fix': 'Consider breaking into multiple presentations or removing unnecessary sections',
                    'impact': 'Slower loading and navigation'
                })
            elif total_sections > 30:
                performance_score -= 5
                issues.append({
                    'severity': 'low',
                    'description': f'Many sections ({total_sections}) may slow navigation',
                    'fix': 'Consider organizing into chapters or reducing section count',
                    'impact': 'Slightly slower navigation'
                })
            
            # Metric 2: Image sections analysis
            image_sections = sections.filter(section_type__in=['image', 'image_slide'])
            metrics['image_sections'] = image_sections.count()
            
            # Mock large image detection (in real implementation, check actual file sizes)
            large_images = max(0, image_sections.count() - 10)  # Assume images after 10 are "large"
            
            if large_images > 0:
                performance_score -= min(20, large_images * 3)
                issues.append({
                    'severity': 'high' if large_images > 5 else 'medium',
                    'description': f'{large_images} potentially large images detected',
                    'fix': 'Compress images, use WebP format, or implement lazy loading',
                    'impact': 'Significantly slower loading times'
                })
            
            # Metric 3: Complex content analysis
            diagram_sections = sections.filter(section_type__in=['diagram', 'chart_slide'])
            metrics['diagram_sections'] = diagram_sections.count()
            
            if diagram_sections.count() > 15:
                performance_score -= 10
                issues.append({
                    'severity': 'medium',
                    'description': 'Many diagrams may slow rendering',
                    'fix': 'Consider simplifying or combining diagrams where possible',
                    'impact': 'Slower rendering and increased memory usage'
                })
            
            # Metric 4: Content length analysis
            total_content_length = sum(len(s.content or '') + len(s.rich_content or '') for s in sections)
            metrics['content_length'] = total_content_length
            
            if total_content_length > 100000:  # 100k characters
                performance_score -= 10
                issues.append({
                    'severity': 'medium',
                    'description': f'Very long content ({total_content_length:,} characters)',
                    'fix': 'Consider breaking content into smaller, focused sections',
                    'impact': 'Slower rendering and search performance'
                })
            
            # Metric 5: Video content analysis
            video_sections = sections.filter(section_type='video')
            metrics['video_sections'] = video_sections.count()
            
            if video_sections.count() > 5:
                performance_score -= 8
                issues.append({
                    'severity': 'medium',
                    'description': f'Multiple videos ({video_sections.count()}) may impact performance',
                    'fix': 'Consider using video thumbnails with on-demand loading',
                    'impact': 'Higher bandwidth usage and slower loading'
                })
            
            # Memory usage estimation
            estimated_memory = (
                total_sections * 0.5 +  # Base memory per section
                image_sections.count() * 2 +  # Memory per image
                diagram_sections.count() * 1.5 +  # Memory per diagram
                video_sections.count() * 5  # Memory per video
            )
            metrics['estimated_memory_mb'] = round(estimated_memory, 1)
            
            if estimated_memory > 30:
                performance_score -= 15
                issues.append({
                    'severity': 'high',
                    'description': f'High memory usage estimated ({estimated_memory:.1f}MB)',
                    'fix': 'Optimize images, reduce video quality, or implement content pagination',
                    'impact': 'May cause browser slowdowns or crashes'
                })
            elif estimated_memory > 15:
                performance_score -= 5
                issues.append({
                    'severity': 'low',
                    'description': f'Moderate memory usage ({estimated_memory:.1f}MB)',
                    'fix': 'Consider optimizing large media files',
                    'impact': 'May affect performance on lower-end devices'
                })
            
            # Loading time estimation
            estimated_load_time = (
                total_sections * 0.1 +
                image_sections.count() * 0.8 +
                diagram_sections.count() * 0.3 +
                video_sections.count() * 2
            )
            metrics['estimated_load_time_seconds'] = round(estimated_load_time, 1)
            
            if estimated_load_time > 10:
                performance_score -= 15
                issues.append({
                    'severity': 'high',
                    'description': f'Slow loading time estimated ({estimated_load_time:.1f}s)',
                    'fix': 'Implement lazy loading, optimize images, and reduce initial content',
                    'impact': 'Poor user experience, high bounce rate'
                })
            elif estimated_load_time > 5:
                performance_score -= 5
                issues.append({
                    'severity': 'medium',
                    'description': f'Moderate loading time ({estimated_load_time:.1f}s)',
                    'fix': 'Optimize images and implement progressive loading',
                    'impact': 'Slightly degraded user experience'
                })
            
            performance_score = max(0, performance_score)
            
            return Response({
                'performance_score': performance_score,
                'issues': issues,
                'metrics': metrics,
                'recommendations': self._get_performance_recommendations(issues, metrics),
                'optimization_priority': self._get_optimization_priority(issues),
                'estimated_savings': self._calculate_potential_savings(metrics),
                'generated_at': timezone.now().isoformat()
            })
            
        except Presentation.DoesNotExist:
            return Response(
                {'error': 'Presentation not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Performance analysis failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_performance_recommendations(self, issues, metrics):
        """Generate performance recommendations"""
        recommendations = []
        
        if metrics.get('image_sections', 0) > 5:
            recommendations.append({
                'priority': 'high',
                'action': 'Optimize images',
                'description': 'Compress images and convert to WebP format',
                'estimated_improvement': '30-50% loading time reduction'
            })
        
        if metrics.get('total_sections', 0) > 30:
            recommendations.append({
                'priority': 'medium',
                'action': 'Implement pagination',
                'description': 'Load sections on-demand instead of all at once',
                'estimated_improvement': '20-40% initial load time reduction'
            })
        
        if metrics.get('video_sections', 0) > 3:
            recommendations.append({
                'priority': 'medium',
                'action': 'Lazy load videos',
                'description': 'Load videos only when they become visible',
                'estimated_improvement': '15-25% memory usage reduction'
            })
        
        recommendations.extend([
            {
                'priority': 'low',
                'action': 'Enable browser caching',
                'description': 'Cache static assets for faster subsequent loads',
                'estimated_improvement': '50-80% return visit speed improvement'
            },
            {
                'priority': 'low',
                'action': 'Implement progressive loading',
                'description': 'Show content as it loads instead of waiting for everything',
                'estimated_improvement': 'Better perceived performance'
            }
        ])
        
        return recommendations[:5]
    
    def _get_optimization_priority(self, issues):
        """Determine optimization priority based on issues"""
        high_severity = len([i for i in issues if i.get('severity') == 'high'])
        medium_severity = len([i for i in issues if i.get('severity') == 'medium'])
        
        if high_severity > 0:
            return 'critical'
        elif medium_severity > 2:
            return 'high'
        elif medium_severity > 0:
            return 'medium'
        else:
            return 'low'
    
    def _calculate_potential_savings(self, metrics):
        """Calculate potential performance savings"""
        total_load_time = metrics.get('estimated_load_time_seconds', 0)
        total_memory = metrics.get('estimated_memory_mb', 0)
        
        # Potential savings with optimizations
        load_time_savings = min(total_load_time * 0.4, total_load_time - 2)  # Up to 40% or down to 2s
        memory_savings = min(total_memory * 0.3, total_memory - 5)  # Up to 30% or down to 5MB
        
        return {
            'load_time_reduction_seconds': round(max(0, load_time_savings), 1),
            'memory_reduction_mb': round(max(0, memory_savings), 1),
            'potential_score_improvement': min(30, len(metrics) * 2)
        }


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
            
            # Mock AI generation - replace with actual AI service
            generated_content = self._generate_content(generation_type, prompt, context)
            
            return Response({
                'generated_content': generated_content,
                'generation_type': generation_type,
                'prompt': prompt,
                'generated_at': timezone.now().isoformat(),
                'word_count': len(generated_content.split()),
                'character_count': len(generated_content)
            })
            
        except Exception as e:
            return Response(
                {'error': f'AI generation failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _generate_content(self, generation_type, prompt, context):
        """Mock content generation"""
        base_responses = {
            'text': f"Generated text content based on: {prompt}",
            'title': f"Generated Title: {prompt[:50]}",
            'summary': f"Summary: {prompt}",
            'outline': f"Outline based on: {prompt}\n1. Introduction\n2. Main Points\n3. Conclusion",
            'presentation': f"Presentation content for: {prompt}"
        }
        
        return base_responses.get(generation_type, f"Generated content: {prompt}")


class PresentationAnalyticsView(APIView):
    """Get analytics for a specific presentation"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, presentation_id):
        try:
            presentation = get_object_or_404(Presentation, id=presentation_id)
            
            # Check permissions
            if (presentation.created_by != request.user and 
                request.user not in presentation.collaborators.all() and 
                not presentation.is_public):
                return Response(
                    {'error': 'You do not have permission to access this presentation'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Mock analytics data - replace with actual analytics tracking
            sections = ContentSection.objects.filter(presentation=presentation)
            comments = PresentationComment.objects.filter(presentation=presentation)
            
            analytics_data = {
                'views_count': 150,  # Mock data
                'unique_viewers': 45,
                'average_time_spent': 420,  # seconds
                'export_count': 12,
                'comment_count': comments.count(),
                'collaboration_stats': {
                    'collaborators_count': presentation.collaborators.count(),
                    'active_collaborators': min(presentation.collaborators.count(), 3)  # Mock active count
                },
                'section_engagement': [
                    {
                        'section_id': str(section.id),
                        'title': section.title,
                        'views': max(50, 150 - (index * 10)),  # Mock decreasing views
                        'time_spent': max(30, 120 - (index * 5)),
                        'engagement_rate': max(0.3, 0.8 - (index * 0.05))
                    }
                    for index, section in enumerate(sections[:10])
                ],
                'word_count': sum(len((s.content or '').split()) for s in sections),
                'estimated_duration': sum(len((s.content or '').split()) for s in sections) // 200,  # Reading time
                'credits_used': 5  # Mock credits
            }
            
            return Response(analytics_data)
            
        except Presentation.DoesNotExist:
            return Response(
                {'error': 'Presentation not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Analytics retrieval failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )