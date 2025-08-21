# ai_imagegen_backend/users/views/__init__.py
# Keep all your existing view files and add new presentation views

# ============================================================================
# NEW ENHANCED PRESENTATION VIEWS - presentation_views.py
# ============================================================================

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
import json
import uuid
from decimal import Decimal

from users.models import (
    Presentation, ContentSection, ChartTemplate, DiagramElement,
    PresentationTemplate, PresentationExportJob, AIGenerationLog, 
    PresentationComment, CreditTransaction
)
from users.serializers import (
    PresentationListSerializer, PresentationDetailSerializer,
    CreatePresentationSerializer, ContentSectionSerializer,
    ChartTemplateSerializer, DiagramElementSerializer,
    CreateDiagramSerializer, ExportRequestSerializer,
    AIGenerationRequestSerializer, ChartSuggestionSerializer,
    PresentationCommentSerializer, UpdateContentSectionSerializer,
    BulkUpdateSectionsSerializer, PresentationTemplateSerializer
)


class PresentationTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for presentation templates"""
    queryset = PresentationTemplate.objects.filter(is_active=True)
    serializer_class = PresentationTemplateSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['template_type', 'category', 'is_premium']
    search_fields = ['name', 'description']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter premium templates for non-premium users
        user = self.request.user
        if user.is_authenticated and not getattr(user.profile, 'has_premium', False):
            queryset = queryset.filter(is_premium=False)
        
        return queryset


class ChartTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for chart templates"""
    queryset = ChartTemplate.objects.filter(is_active=True)
    serializer_class = ChartTemplateSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['category', 'chart_type', 'is_premium']
    search_fields = ['name', 'description']
    
    @action(detail=False, methods=['post'])
    def suggest_for_content(self, request):
        """Suggest chart types for given content"""
        serializer = ChartSuggestionSerializer(data=request.data)
        if serializer.is_valid():
            content_text = serializer.validated_data['content_text']
            
            # AI-powered chart suggestions
            suggestions = self._analyze_content_for_charts(content_text)
            
            # Get matching templates
            suggested_templates = self.get_queryset().filter(
                chart_type__in=[s['chart_type'] for s in suggestions]
            )
            
            return Response({
                'suggestions': suggestions,
                'templates': ChartTemplateSerializer(
                    suggested_templates, many=True, context={'request': request}
                ).data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _analyze_content_for_charts(self, content):
        """Analyze content and suggest appropriate chart types"""
        content_lower = content.lower()
        suggestions = []
        
        # Data visualization patterns
        if any(word in content_lower for word in ['data', 'statistics', 'numbers', 'results']):
            if 'comparison' in content_lower or 'vs' in content_lower:
                suggestions.append({
                    'chart_type': 'bar_chart',
                    'confidence': 0.8,
                    'reason': 'Content contains comparative data'
                })
            if 'trend' in content_lower or 'over time' in content_lower:
                suggestions.append({
                    'chart_type': 'line_chart',
                    'confidence': 0.8,
                    'reason': 'Content shows trends over time'
                })
            if 'percentage' in content_lower or '%' in content:
                suggestions.append({
                    'chart_type': 'pie_chart',
                    'confidence': 0.7,
                    'reason': 'Content contains percentage data'
                })
        
        # Process patterns
        if any(word in content_lower for word in ['process', 'workflow', 'steps']):
            suggestions.append({
                'chart_type': 'flowchart',
                'confidence': 0.9,
                'reason': 'Content describes a process or workflow'
            })
        
        # Organizational patterns
        if any(word in content_lower for word in ['organization', 'hierarchy', 'structure']):
            suggestions.append({
                'chart_type': 'org_chart',
                'confidence': 0.8,
                'reason': 'Content describes organizational structure'
            })
        
        # Timeline patterns
        if any(word in content_lower for word in ['timeline', 'history', 'chronology']):
            suggestions.append({
                'chart_type': 'timeline',
                'confidence': 0.8,
                'reason': 'Content has temporal information'
            })
        
        return suggestions


class PresentationViewSet(viewsets.ModelViewSet):
    """Main ViewSet for presentations"""
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['presentation_type', 'status', 'is_public']
    search_fields = ['title', 'description', 'original_prompt']
    ordering_fields = ['created_at', 'updated_at', 'title']
    ordering = ['-updated_at']
    
    def get_queryset(self):
        user = self.request.user
        queryset = Presentation.objects.filter(user=user)
        
        # Include presentations where user is a collaborator
        if self.action in ['list', 'retrieve']:
            from django.db.models import Q
            queryset = Presentation.objects.filter(
                Q(user=user) | Q(collaborators=user)
            ).distinct()
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'list':
            return PresentationListSerializer
        elif self.action == 'create':
            return CreatePresentationSerializer
        return PresentationDetailSerializer
    
    def perform_create(self, serializer):
        # Check credits before creation
        quality = serializer.validated_data.get('quality', 'medium')
        cost = self._estimate_generation_cost('presentation', quality)
        
        if not self._check_credits(self.request.user, cost):
            raise serializers.ValidationError("Insufficient credits")
        
        # Create presentation
        presentation = serializer.save(user=self.request.user, status='generating')
        
        # Start async content generation
        from users.tasks import generate_presentation_content
        generate_presentation_content.delay(
            str(presentation.id),
            self.request.user.id,
            float(cost)
        )
    
    def perform_update(self, serializer):
        serializer.save(updated_at=timezone.now())
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate a presentation"""
        original = self.get_object()
        
        # Create duplicate
        duplicate = Presentation.objects.create(
            user=request.user,
            title=f"{original.title} (Copy)",
            description=original.description,
            presentation_type=original.presentation_type,
            original_prompt=original.original_prompt,
            quality=original.quality,
            theme_settings=original.theme_settings,
            template=original.template
        )
        
        # Duplicate sections
        for section in original.sections.all():
            ContentSection.objects.create(
                presentation=duplicate,
                section_type=section.section_type,
                title=section.title,
                order=section.order,
                content=section.content,
                rich_content=section.rich_content,
                content_data=section.content_data,
                image_url=section.image_url,
                layout_config=section.layout_config,
                style_config=section.style_config
            )
        
        serializer = self.get_serializer(duplicate)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def apply_template(self, request, pk=None):
        """Apply a template to existing presentation"""
        presentation = self.get_object()
        template_id = request.data.get('template_id')
        
        try:
            template = PresentationTemplate.objects.get(id=template_id)
            
            # Apply template
            presentation.template = template
            presentation.theme_settings.update(template.template_data.get('theme', {}))
            presentation.save()
            
            return Response({'message': 'Template applied successfully'})
        except PresentationTemplate.DoesNotExist:
            return Response(
                {'error': 'Template not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['get'])
    def export_status(self, request, pk=None):
        """Get export status for a presentation"""
        presentation = self.get_object()
        latest_jobs = presentation.export_jobs.order_by('-created_at')[:5]
        
        from users.serializers import PresentationExportJobSerializer
        return Response({
            'jobs': PresentationExportJobSerializer(latest_jobs, many=True, context={'request': request}).data
        })
    
    @action(detail=True, methods=['post'])
    def export(self, request, pk=None):
        """Export presentation in various formats"""
        presentation = self.get_object()
        serializer = ExportRequestSerializer(data=request.data)
        
        if serializer.is_valid():
            # Create export job
            export_job = PresentationExportJob.objects.create(
                presentation=presentation,
                user=request.user,
                export_format=serializer.validated_data['export_format'],
                export_settings=serializer.validated_data['export_settings'],
                selected_sections=serializer.validated_data['selected_sections']
            )
            
            # Start async export
            from users.tasks import export_presentation_task
            export_presentation_task.delay(str(export_job.id))
            
            return Response({
                'job_id': str(export_job.id),
                'message': 'Export started'
            }, status=status.HTTP_202_ACCEPTED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _estimate_generation_cost(self, generation_type, quality):
        """Estimate the cost in credits for different generation types"""
        base_costs = {
            'presentation': {'low': 0.5, 'medium': 1.5, 'high': 5.0},
            'content': {'low': 0.1, 'medium': 0.3, 'high': 0.8},
            'chart': {'low': 0.8, 'medium': 1.5, 'high': 3.0},
        }
        cost = base_costs.get(generation_type, {}).get(quality, 1.0)
        return Decimal(str(cost))
    
    def _check_credits(self, user, cost):
        """Check if user has enough credits"""
        return user.profile.credits >= cost


class ContentSectionViewSet(viewsets.ModelViewSet):
    """ViewSet for content sections"""
    serializer_class = ContentSectionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        presentation_id = self.kwargs.get('presentation_pk')
        if presentation_id:
            # Check if user has access to this presentation
            presentation = get_object_or_404(
                Presentation,
                id=presentation_id,
                user=self.request.user
            )
            return presentation.sections.all()
        return ContentSection.objects.none()
    
    def perform_create(self, serializer):
        presentation_id = self.kwargs.get('presentation_pk')
        presentation = get_object_or_404(
            Presentation,
            id=presentation_id,
            user=self.request.user
        )
        serializer.save(presentation=presentation)
    
    @action(detail=True, methods=['post'])
    def generate_content(self, request, **kwargs):
        """Generate AI content for a section"""
        section = self.get_object()
        serializer = AIGenerationRequestSerializer(data=request.data)
        
        if serializer.is_valid():
            generation_type = serializer.validated_data['generation_type']
            prompt = serializer.validated_data['prompt']
            
            # Check credits
            cost = self._estimate_generation_cost(generation_type, 'medium')
            if not self._check_credits(request.user, cost):
                return Response(
                    {'error': 'Insufficient credits'},
                    status=status.HTTP_402_PAYMENT_REQUIRED
                )
            
            # Generate content using AI
            if generation_type == 'section_content':
                generated_content = self._generate_content_with_ai(
                    prompt,
                    serializer.validated_data.get('content_length', 'medium'),
                    serializer.validated_data.get('tone', 'professional')
                )
                
                section.content = generated_content
                section.rich_content = generated_content
                section.ai_generated = True
                section.generation_prompt = prompt
                section.save()
                
                # Deduct credits
                self._deduct_credits(request.user, cost, f"Content generation for section {section.id}")
                
            return Response(ContentSectionSerializer(section, context={'request': request}).data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def create_diagram(self, request, **kwargs):
        """Create a diagram from section content"""
        section = self.get_object()
        serializer = CreateDiagramSerializer(data=request.data)
        
        if serializer.is_valid():
            # Check credits for chart generation
            cost = Decimal('2.0')
            if not self._check_credits(request.user, cost):
                return Response(
                    {'error': 'Insufficient credits'},
                    status=status.HTTP_402_PAYMENT_REQUIRED
                )
            
            diagram = serializer.save(content_section=section)
            
            # Generate chart data using AI
            chart_data = self._generate_chart_from_content(
                serializer.validated_data['content_text'],
                serializer.validated_data['chart_type']
            )
            
            diagram.chart_data = chart_data
            diagram.save()
            
            # Deduct credits
            self._deduct_credits(request.user, cost, f"Chart generation for section {section.id}")
            
            return Response(
                DiagramElementSerializer(diagram, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def enhance_content(self, request, **kwargs):
        """Enhance section content with AI"""
        section = self.get_object()
        enhancement_type = request.data.get('enhancement_type')
        
        if not enhancement_type:
            return Response(
                {'error': 'enhancement_type is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check credits
        cost = Decimal('0.5')
        if not self._check_credits(request.user, cost):
            return Response(
                {'error': 'Insufficient credits'},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )
        
        # Enhance content
        enhanced_content = self._enhance_content_with_ai(
            section.content,
            enhancement_type,
            request.data.get('target_audience', 'general')
        )
        
        # Save enhanced content
        section.content = enhanced_content
        section.rich_content = enhanced_content
        section.save()
        
        # Deduct credits
        self._deduct_credits(request.user, cost, f"Content enhancement for section {section.id}")
        
        return Response(ContentSectionSerializer(section, context={'request': request}).data)
    
    @action(detail=False, methods=['post'])
    def bulk_update(self, request, **kwargs):
        """Bulk update multiple sections"""
        presentation_id = self.kwargs.get('presentation_pk')
        presentation = get_object_or_404(
            Presentation,
            id=presentation_id,
            user=request.user
        )
        
        serializer = BulkUpdateSectionsSerializer(data=request.data)
        if serializer.is_valid():
            serializer.update(presentation, serializer.validated_data)
            return Response({'message': 'Sections updated successfully'})
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def reorder(self, request, **kwargs):
        """Reorder sections"""
        section_orders = request.data.get('section_orders', [])
        
        with transaction.atomic():
            for item in section_orders:
                try:
                    section = ContentSection.objects.get(id=item['id'])
                    if section.presentation.user == request.user:
                        section.order = item['order']
                        section.save()
                except ContentSection.DoesNotExist:
                    continue
        
        return Response({'message': 'Sections reordered successfully'})
    
    def _estimate_generation_cost(self, generation_type, quality):
        """Estimate generation cost"""
        costs = {
            'section_content': 0.3,
            'chart_generation': 2.0,
            'content_enhancement': 0.5
        }
        return Decimal(str(costs.get(generation_type, 1.0)))
    
    def _check_credits(self, user, cost):
        """Check if user has enough credits"""
        return user.profile.credits >= cost
    
    def _deduct_credits(self, user, cost, description):
        """Deduct credits from user"""
        user.profile.credits -= cost
        user.profile.save()
        
        CreditTransaction.objects.create(
            user=user,
            amount=-cost,
            type='usage',
            description=description
        )
    
    def _generate_content_with_ai(self, prompt, length, tone):
        """Generate content using AI"""
        # This would integrate with OpenAI API
        # For now, return placeholder
        return f"AI-generated content for: {prompt}"
    
    def _generate_chart_from_content(self, content, chart_type):
        """Generate chart data from content"""
        # This would integrate with OpenAI API to analyze content and generate chart data
        return {
            "title": f"Generated {chart_type.replace('_', ' ').title()}",
            "data": {
                "labels": ["Sample 1", "Sample 2", "Sample 3"],
                "datasets": [{
                    "data": [10, 20, 30],
                    "backgroundColor": ["#FF6384", "#36A2EB", "#FFCE56"]
                }]
            },
            "type": chart_type
        }
    
    def _enhance_content_with_ai(self, content, enhancement_type, target_audience):
        """Enhance content using AI"""
        # This would integrate with OpenAI API
        return f"Enhanced content ({enhancement_type}): {content}"


class DiagramElementViewSet(viewsets.ModelViewSet):
    """ViewSet for diagram elements"""
    serializer_class = DiagramElementSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        section_id = self.kwargs.get('section_pk')
        if section_id:
            return DiagramElement.objects.filter(
                content_section_id=section_id,
                content_section__presentation__user=self.request.user
            )
        return DiagramElement.objects.none()
    
    @action(detail=True, methods=['post'])
    def regenerate(self, request, **kwargs):
        """Regenerate diagram with new data"""
        diagram = self.get_object()
        
        # Check credits
        cost = Decimal('1.5')
        if not self._check_credits(request.user, cost):
            return Response(
                {'error': 'Insufficient credits'},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )
        
        # Regenerate chart data
        new_chart_data = self._generate_chart_from_content(
            diagram.source_content,
            diagram.chart_type,
            request.data.get('additional_prompt', '')
        )
        
        diagram.chart_data = new_chart_data
        diagram.save()
        
        # Deduct credits
        self._deduct_credits(request.user, cost, f"Chart regeneration for diagram {diagram.id}")
        
        return Response(DiagramElementSerializer(diagram, context={'request': request}).data)
    
    def _check_credits(self, user, cost):
        return user.profile.credits >= cost
    
    def _deduct_credits(self, user, cost, description):
        user.profile.credits -= cost
        user.profile.save()
        
        CreditTransaction.objects.create(
            user=user,
            amount=-cost,
            type='usage',
            description=description
        )
    
    def _generate_chart_from_content(self, content, chart_type, additional_prompt=""):
        """Generate chart data from content"""
        return {
            "title": f"Regenerated {chart_type.replace('_', ' ').title()}",
            "data": {
                "labels": ["New 1", "New 2", "New 3"],
                "datasets": [{
                    "data": [15, 25, 35],
                    "backgroundColor": ["#FF6384", "#36A2EB", "#FFCE56"]
                }]
            },
            "type": chart_type
        }


class AIGenerationView(APIView):
    """General AI generation endpoint"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = AIGenerationRequestSerializer(data=request.data)
        
        if serializer.is_valid():
            generation_type = serializer.validated_data['generation_type']
            prompt = serializer.validated_data['prompt']
            
            # Check credits
            cost = self._estimate_generation_cost(generation_type, 'medium')
            if not self._check_credits(request.user, cost):
                return Response(
                    {'error': 'Insufficient credits'},
                    status=status.HTTP_402_PAYMENT_REQUIRED
                )
            
            # Log generation request
            log_entry = AIGenerationLog.objects.create(
                user=request.user,
                generation_type=generation_type,
                prompt=prompt,
                model_used='gpt-4',
                credits_used=cost
            )
            
            try:
                # Generate content based on type
                if generation_type == 'section_content':
                    result = self._generate_content_with_ai(
                        prompt,
                        serializer.validated_data.get('content_length', 'medium'),
                        serializer.validated_data.get('tone', 'professional')
                    )
                elif generation_type == 'chart_generation':
                    result = self._generate_chart_from_content(
                        prompt,
                        serializer.validated_data.get('chart_type', 'bar_chart')
                    )
                else:
                    result = {'content': f'Generated content for {generation_type}'}
                
                # Update log entry
                log_entry.generated_content = result
                log_entry.success = True
                log_entry.save()
                
                # Deduct credits
                self._deduct_credits(request.user, cost, f"AI generation: {generation_type}")
                
                return Response(result)
                
            except Exception as e:
                # Log error
                log_entry.success = False
                log_entry.error_message = str(e)
                log_entry.save()
                
                return Response(
                    {'error': 'Generation failed'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _estimate_generation_cost(self, generation_type, quality):
        costs = {
            'presentation_outline': 1.0,
            'section_content': 0.3,
            'chart_generation': 2.0,
            'image_generation': 1.5,
            'content_enhancement': 0.5,
            'summary_generation': 0.2
        }
        return Decimal(str(costs.get(generation_type, 1.0)))
    
    def _check_credits(self, user, cost):
        return user.profile.credits >= cost
    
    def _deduct_credits(self, user, cost, description):
        user.profile.credits -= cost
        user.profile.save()
        
        CreditTransaction.objects.create(
            user=user,
            amount=-cost,
            type='usage',
            description=description
        )
    
    def _generate_content_with_ai(self, prompt, length, tone):
        return f"AI-generated {tone} content ({length}): {prompt}"
    
    def _generate_chart_from_content(self, prompt, chart_type):
        return {
            "title": f"Generated {chart_type.replace('_', ' ').title()}",
            "data": {"labels": ["A", "B", "C"], "datasets": [{"data": [1, 2, 3]}]},
            "type": chart_type
        }


class PresentationCommentViewSet(viewsets.ModelViewSet):
    """ViewSet for comments"""
    serializer_class = PresentationCommentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        presentation_id = self.kwargs.get('presentation_pk')
        if presentation_id:
            return PresentationComment.objects.filter(
                presentation_id=presentation_id,
                presentation__user=self.request.user
            ).select_related('author').prefetch_related('replies')
        return PresentationComment.objects.none()
    
    def perform_create(self, serializer):
        presentation_id = self.kwargs.get('presentation_pk')
        presentation = get_object_or_404(
            Presentation,
            id=presentation_id
        )
        
        # Check if user can comment
        if not presentation.allow_comments and presentation.user != self.request.user:
            raise permissions.PermissionDenied("Comments not allowed")
        
        serializer.save(
            author=self.request.user,
            presentation=presentation
        )


class PresentationAnalyticsView(APIView):
    """View for presentation analytics"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, presentation_id):
        presentation = get_object_or_404(
            Presentation,
            id=presentation_id,
            user=request.user
        )
        
        # Calculate analytics
        analytics = {
            'views_count': presentation.view_count,
            'unique_viewers': 0,  # Implement view tracking
            'average_time_spent': 0.0,
            'export_count': presentation.export_jobs.filter(status='completed').count(),
            'comment_count': presentation.presentation_comments.count(),
            'collaboration_stats': {
                'collaborators_count': presentation.collaborators.count(),
                'active_collaborators': 0  # Implement activity tracking
            },
            'section_engagement': {},  # Implement section-level analytics
            'word_count': presentation.word_count,
            'estimated_duration': presentation.estimated_duration,
            'credits_used': float(presentation.total_credits_used)
        }
        
        return Response(analytics)