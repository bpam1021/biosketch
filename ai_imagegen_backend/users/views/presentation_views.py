# Add these classes to your existing presentation_views.py file

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import action
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import uuid
import json
from datetime import datetime, timedelta

class ImageUploadView(APIView):
    """Handle image uploads for presentations"""
    
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
        
        # Validate file size (e.g., 10MB limit)
        if image_file.size > 10 * 1024 * 1024:
            return Response(
                {'error': 'File too large. Maximum size is 10MB.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Generate unique filename
            file_extension = image_file.name.split('.')[-1]
            filename = f"presentations/{uuid.uuid4()}.{file_extension}"
            
            # Save file
            saved_path = default_storage.save(filename, ContentFile(image_file.read()))
            file_url = default_storage.url(saved_path)
            
            return Response({
                'url': file_url,
                'filename': saved_path,
                'size': image_file.size,
                'content_type': image_file.content_type
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to upload image: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AccessibilityCheckView(APIView):
    """Perform accessibility analysis on presentations"""
    
    def get(self, request, presentation_id):
        try:
            from django.apps import apps
            Presentation = apps.get_model('users', 'Presentation')
            ContentSection = apps.get_model('users', 'ContentSection')
            
            presentation = Presentation.objects.get(id=presentation_id)
            sections = ContentSection.objects.filter(presentation=presentation)
            
            # Perform accessibility analysis
            accessibility_score = 0
            total_checks = 0
            issues = []
            
            # Check for text contrast (mock analysis)
            total_checks += 1
            if presentation.theme_settings.get('primary_color', '').lower() != '#ffffff':
                accessibility_score += 1
            else:
                issues.append({
                    'severity': 'high',
                    'description': 'Low contrast between text and background',
                    'fix': 'Use darker colors for better contrast',
                    'section_id': None
                })
            
            # Check for alt text on images
            image_sections = sections.filter(section_type__in=['image', 'image_slide'])
            for section in image_sections:
                total_checks += 1
                if section.content or section.title:
                    accessibility_score += 1
                else:
                    issues.append({
                        'severity': 'medium',
                        'description': f'Image in section "{section.title}" missing alt text',
                        'fix': 'Add descriptive text for screen readers',
                        'section_id': str(section.id)
                    })
            
            # Check for proper heading structure
            heading_sections = sections.filter(section_type='heading').order_by('order')
            prev_level = 0
            for section in heading_sections:
                total_checks += 1
                current_level = section.style_config.get('fontSize', 20)
                level_mapping = {32: 1, 28: 2, 24: 3, 20: 4, 18: 5, 16: 6}
                current_h_level = level_mapping.get(current_level, 4)
                
                if prev_level == 0 or current_h_level <= prev_level + 1:
                    accessibility_score += 1
                else:
                    issues.append({
                        'severity': 'medium',
                        'description': f'Heading level skip in section "{section.title}"',
                        'fix': 'Use proper heading hierarchy (H1, H2, H3, etc.)',
                        'section_id': str(section.id)
                    })
                prev_level = current_h_level
            
            # Check for video captions (if any video sections exist)
            video_sections = sections.filter(section_type='video')
            for section in video_sections:
                total_checks += 1
                if 'captions' in section.content_data:
                    accessibility_score += 1
                else:
                    issues.append({
                        'severity': 'high',
                        'description': f'Video in section "{section.title}" missing captions',
                        'fix': 'Add captions or transcripts for video content',
                        'section_id': str(section.id)
                    })
            
            # Calculate final score
            final_score = (accessibility_score / max(total_checks, 1)) * 100
            
            # Determine compliance
            wcag_aa_compliant = final_score >= 80 and len([i for i in issues if i['severity'] == 'high']) == 0
            section_508_compliant = final_score >= 75
            
            return Response({
                'accessibility_score': round(final_score, 1),
                'compliance_standards': {
                    'wcag_aa': wcag_aa_compliant,
                    'section_508': section_508_compliant
                },
                'issues': issues,
                'total_checks': total_checks,
                'passed_checks': accessibility_score,
                'generated_at': datetime.now().isoformat()
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


class PerformanceAnalysisView(APIView):
    """Analyze presentation performance and provide optimization suggestions"""
    
    def get(self, request, presentation_id):
        try:
            from django.apps import apps
            Presentation = apps.get_model('users', 'Presentation')
            ContentSection = apps.get_model('users', 'ContentSection')
            
            presentation = Presentation.objects.get(id=presentation_id)
            sections = ContentSection.objects.filter(presentation=presentation)
            
            # Performance analysis
            performance_score = 100
            issues = []
            
            # Check file sizes (mock analysis)
            total_sections = sections.count()
            if total_sections > 50:
                performance_score -= 10
                issues.append({
                    'severity': 'medium',
                    'description': f'Large number of sections ({total_sections})',
                    'fix': 'Consider breaking into multiple presentations or removing unnecessary sections'
                })
            
            # Check for large images
            image_sections = sections.filter(section_type__in=['image', 'image_slide'])
            large_images = image_sections.filter(
                content_data__isnull=False
            ).count()  # Mock: assume some images are large
            
            if large_images > 0:
                performance_score -= 15
                issues.append({
                    'severity': 'high',
                    'description': f'{large_images} large images detected',
                    'fix': 'Compress images or use WebP format for better performance'
                })
            
            # Check for complex diagrams
            diagram_sections = sections.filter(section_type__in=['diagram', 'chart_slide'])
            if diagram_sections.count() > 10:
                performance_score -= 5
                issues.append({
                    'severity': 'low',
                    'description': 'Many diagrams may slow loading',
                    'fix': 'Consider simplifying or combining diagrams'
                })
            
            # Check content length
            total_content_length = sum(len(s.content or '') for s in sections)
            if total_content_length > 50000:  # 50k characters
                performance_score -= 5
                issues.append({
                    'severity': 'low',
                    'description': 'Very long content may impact performance',
                    'fix': 'Consider breaking content into smaller sections'
                })
            
            # Memory usage estimation (mock)
            estimated_memory = total_sections * 0.5 + large_images * 2  # MB
            if estimated_memory > 20:
                performance_score -= 10
                issues.append({
                    'severity': 'medium',
                    'description': f'High memory usage estimated ({estimated_memory:.1f}MB)',
                    'fix': 'Optimize images and reduce section complexity'
                })
            
            # Loading time estimation
            estimated_load_time = total_sections * 0.1 + large_images * 0.5  # seconds
            if estimated_load_time > 5:
                performance_score -= 10
                issues.append({
                    'severity': 'medium',
                    'description': f'Slow loading time estimated ({estimated_load_time:.1f}s)',
                    'fix': 'Optimize content and images for faster loading'
                })
            
            performance_score = max(0, performance_score)
            
            return Response({
                'performance_score': performance_score,
                'issues': issues,
                'metrics': {
                    'total_sections': total_sections,
                    'image_sections': image_sections.count(),
                    'diagram_sections': diagram_sections.count(),
                    'estimated_memory_mb': round(estimated_memory, 1),
                    'estimated_load_time_seconds': round(estimated_load_time, 1),
                    'content_length': total_content_length
                },
                'recommendations': [
                    'Optimize images before uploading',
                    'Keep sections focused and concise',
                    'Use efficient diagram types',
                    'Consider lazy loading for large presentations'
                ],
                'generated_at': datetime.now().isoformat()
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


# Add these methods to your existing PresentationViewSet class:

# In PresentationViewSet, add this method:
@action(detail=True, methods=['get'])
def force_download(self, request, pk=None):
    """Force download export file"""
    try:
        presentation = self.get_object()
        export_format = request.query_params.get('format', 'pdf')
        
        # Mock export file generation
        if export_format == 'pdf':
            content = f"PDF export of {presentation.title}"
            content_type = 'application/pdf'
        elif export_format == 'docx':
            content = f"DOCX export of {presentation.title}"
            content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        elif export_format == 'pptx':
            content = f"PPTX export of {presentation.title}"
            content_type = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        else:
            content = f"Export of {presentation.title}"
            content_type = 'application/octet-stream'
        
        from django.http import HttpResponse
        response = HttpResponse(content.encode(), content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{presentation.title}.{export_format}"'
        return response
        
    except Exception as e:
        return Response(
            {'error': f'Export failed: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# Add these methods to your existing ContentSectionViewSet class:

@action(detail=True, methods=['post'])
def enhance_content(self, request, presentation_pk=None, pk=None):
    """Enhance section content using AI"""
    try:
        section = self.get_object()
        enhancement_type = request.data.get('enhancement_type')
        target_audience = request.data.get('target_audience', 'general')
        additional_instructions = request.data.get('additional_instructions', '')
        
        # Mock content enhancement
        original_content = section.content
        
        if enhancement_type == 'grammar':
            enhanced_content = f"[Grammar Enhanced] {original_content}"
        elif enhancement_type == 'clarity':
            enhanced_content = f"[Clarity Improved] {original_content}"
        elif enhancement_type == 'expand':
            enhanced_content = f"{original_content}\n\n[Additional details and examples added for {target_audience} audience]"
        elif enhancement_type == 'summarize':
            enhanced_content = f"[Summarized] {original_content[:100]}..."
        else:
            enhanced_content = f"[Enhanced] {original_content}"
        
        section.content = enhanced_content
        section.rich_content = enhanced_content
        section.ai_generated = True
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
        
        # Mock content generation
        if generation_type == 'section_content':
            if content_length == 'short':
                generated_content = f"Brief content for {section.title} in {tone} tone."
            elif content_length == 'long':
                generated_content = f"Detailed and comprehensive content for {section.title}. This is an extensive explanation that covers multiple aspects and provides in-depth analysis in a {tone} tone."
            else:
                generated_content = f"Generated content for {section.title} in {tone} tone. {prompt if prompt else 'This content has been created using AI.'}"
        else:
            generated_content = f"AI generated: {prompt}"
        
        section.content = generated_content
        section.rich_content = generated_content
        section.ai_generated = True
        section.generation_metadata = {
            'generation_type': generation_type,
            'prompt': prompt,
            'content_length': content_length,
            'tone': tone,
            'generated_at': datetime.now().isoformat()
        }
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
                    from django.apps import apps
                    ContentSection = apps.get_model('users', 'ContentSection')
                    section = ContentSection.objects.get(id=section_id, presentation_id=presentation_pk)
                    
                    # Update only provided fields
                    for field, value in section_data.items():
                        if field != 'id' and hasattr(section, field):
                            setattr(section, field, value)
                    
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
        
        from django.apps import apps
        ContentSection = apps.get_model('users', 'ContentSection')
        
        for order_data in section_orders:
            section_id = order_data.get('id')
            new_order = order_data.get('order')
            
            if section_id and new_order is not None:
                try:
                    section = ContentSection.objects.get(id=section_id, presentation_id=presentation_pk)
                    section.order = new_order
                    section.save()
                except ContentSection.DoesNotExist:
                    continue
        
        return Response({'message': 'Sections reordered successfully'})
        
    except Exception as e:
        return Response(
            {'error': f'Reorder failed: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# Add this method to your existing DiagramElementViewSet class:

@action(detail=True, methods=['post'])
def regenerate(self, request, presentation_pk=None, section_pk=None, pk=None):
    """Regenerate a diagram"""
    try:
        diagram = self.get_object()
        additional_prompt = request.data.get('additional_prompt', '')
        
        # Mock diagram regeneration
        diagram.generation_prompt = f"{diagram.generation_prompt} {additional_prompt}".strip()
        diagram.chart_data = {
            'regenerated': True,
            'timestamp': datetime.now().isoformat(),
            'additional_prompt': additional_prompt
        }
        diagram.save()
        
        serializer = self.get_serializer(diagram)
        return Response(serializer.data)
        
    except Exception as e:
        return Response(
            {'error': f'Diagram regeneration failed: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )