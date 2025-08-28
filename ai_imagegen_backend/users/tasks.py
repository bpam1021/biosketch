# ai_imagegen_backend/users/tasks.py
# ADD these new tasks to your existing tasks.py file

import os
import gc
import tempfile
import numpy as np
from PIL import Image
from celery import shared_task
from gtts import gTTS
from django.conf import settings
from django.core.files import File
from moviepy.video.VideoClip import ImageClip
from moviepy.audio.io.AudioFileClip import AudioFileClip
from moviepy.video.compositing.CompositeVideoClip import CompositeVideoClip
from moviepy.video.fx import resize
from django.core.files.base import ContentFile
from django.utils import timezone
from decimal import Decimal
import json
import logging
import traceback
import uuid

# Import your existing models and new presentation models
from users.models import (
    CreditTransaction, 
    # New presentation models
    Presentation, ContentSection, PresentationExportJob, AIGenerationLog
)

logger = logging.getLogger(__name__)


# ============================================================================
# NEW ENHANCED PRESENTATION TASKS
# ============================================================================

@shared_task(bind=True, max_retries=3)
def generate_presentation_content(self, presentation_id, user_id, estimated_cost):
    """
    Generate presentation content using AI
    """
    try:
        from django.contrib.auth.models import User
        
        presentation = Presentation.objects.get(id=presentation_id)
        user = User.objects.get(id=user_id)
        
        logger.info(f"Starting content generation for presentation {presentation_id}")
        
        # Update status
        presentation.status = 'generating'
        presentation.save()
        
        # Generate outline based on prompt and type
        outline = generate_presentation_outline(
            presentation.original_prompt,
            presentation.presentation_type,
            presentation.quality
        )
        
        # Store generated outline
        presentation.generated_outline = outline
        presentation.save()
        
        # Initialize variables
        sections_created = []
        
        # Handle content generation differently for documents vs slides
        if presentation.presentation_type == 'document':
            # Generate unified document content
            unified_content = generate_unified_document_content(
                presentation.original_prompt,
                outline,
                presentation.quality
            )
            
            # Store unified content in presentation.document_content
            presentation.document_content = unified_content
            presentation.save()
            
            # Update word count
            from django.utils.html import strip_tags
            presentation.word_count = len(strip_tags(unified_content).split())
            presentation.save()
            
            logger.info(f"Generated unified document content ({presentation.word_count} words)")
            
        else:
            # Create sections for slide presentations
            for i, section_data in enumerate(outline.get('sections', [])):
                try:
                    # Generate detailed content for each section
                    detailed_content = generate_content_with_ai(
                        f"Write detailed content for: {section_data.get('title', '')}. Context: {presentation.original_prompt}",
                        length='medium' if presentation.quality == 'medium' else 'long' if presentation.quality == 'high' else 'short',
                        tone='professional'
                    )
                    
                    # Create section for slides
                    section = ContentSection.objects.create(
                        presentation=presentation,
                        section_type=section_data.get('type', 'content_slide'),
                        title=section_data.get('title', f'Section {i+1}'),
                        order=i,
                        content=detailed_content,
                        rich_content=detailed_content,
                        content_data={
                            'ai_generated': True,
                            'generation_prompt': section_data.get('title', ''),
                            'original_outline': section_data
                        },
                        image_prompt=section_data.get('image_prompt', ''),
                        ai_generated=True,
                        generation_prompt=section_data.get('title', '')
                    )
                    
                    sections_created.append(str(section.id))
                    logger.info(f"Created section {section.id} for presentation {presentation_id}")
                    
                    # Update progress
                    progress = int((i + 1) / len(outline.get('sections', [])) * 80)
                    self.update_state(state='PROGRESS', meta={'progress': progress})
                    
                except Exception as e:
                    logger.error(f"Failed to create section {i}: {e}")
                    continue
        
        # Generate images for sections that need them
        image_generation_tasks = []
        for section_id in sections_created:
            try:
                section = ContentSection.objects.get(id=section_id)
                if section.image_prompt:
                    # Queue image generation
                    task = generate_section_image.delay(section_id)
                    image_generation_tasks.append(str(task.id))
            except Exception as e:
                logger.error(f"Failed to queue image generation for section {section_id}: {e}")
        
        # Apply theme if template is selected
        if presentation.template:
            apply_template_styling.delay(presentation_id)
        
        # Deduct credits
        user.profile.credits -= Decimal(str(estimated_cost))
        user.profile.save()
        
        CreditTransaction.objects.create(
            user=user,
            amount=-Decimal(str(estimated_cost)),
            type='usage',
            description=f"Presentation generation: {presentation.title}"
        )
        
        # Log generation
        AIGenerationLog.objects.create(
            user=user,
            presentation=presentation,
            generation_type='presentation_outline',
            prompt=presentation.original_prompt,
            model_used='gpt-4',
            credits_used=Decimal(str(estimated_cost)),
            generated_content={
                'outline': outline,
                'sections_created': len(sections_created),
                'image_tasks': image_generation_tasks
            },
            success=True
        )
        
        # Update presentation status
        presentation.status = 'ready'
        presentation.generation_cost = Decimal(str(estimated_cost))
        presentation.total_credits_used = Decimal(str(estimated_cost))
        presentation.save()
        
        logger.info(f"Successfully generated presentation {presentation_id}")
        return {
            'status': 'completed',
            'sections_created': len(sections_created),
            'presentation_id': str(presentation_id)
        }
        
    except Exception as e:
        logger.error(f"Presentation generation failed: {e}")
        logger.error(traceback.format_exc())
        
        # Update presentation status
        try:
            presentation = Presentation.objects.get(id=presentation_id)
            presentation.status = 'error'
            presentation.save()
            
            # Log error
            from django.contrib.auth.models import User
            user = User.objects.get(id=user_id)
            AIGenerationLog.objects.create(
                user=user,
                presentation=presentation,
                generation_type='presentation_outline',
                prompt=presentation.original_prompt,
                model_used='gpt-4',
                credits_used=Decimal('0'),
                success=False,
                error_message=str(e)
            )
        except:
            pass
        
        # Retry if possible
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=60, exc=e)
        
        return {'status': 'failed', 'error': str(e)}


@shared_task(bind=True, max_retries=3)
def generate_section_image(self, section_id):
    """
    Generate image for a specific section
    """
    try:
        section = ContentSection.objects.get(id=section_id)
        
        if not section.image_prompt:
            return {'status': 'skipped', 'reason': 'No image prompt'}
        
        logger.info(f"Generating image for section {section_id}")
        
        # Generate image using OpenAI DALL-E (v1.0+ API)
        from openai import OpenAI
        
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        
        response = client.images.generate(
            model="dall-e-3",
            prompt=section.image_prompt,
            n=1,
            size="1024x1024",
            response_format="url"
        )
        
        image_url = response.data[0].url
        
        # Update section with image URL
        section.image_url = image_url
        section.save()
        
        logger.info(f"Successfully generated image for section {section_id}")
        return {
            'status': 'completed',
            'section_id': str(section_id),
            'image_url': image_url
        }
        
    except Exception as e:
        logger.error(f"Image generation failed for section {section_id}: {e}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=30, exc=e)
        
        return {'status': 'failed', 'error': str(e)}


@shared_task
def apply_template_styling(presentation_id):
    """
    Apply template styling to presentation sections
    """
    try:
        presentation = Presentation.objects.get(id=presentation_id)
        template = presentation.template
        
        if not template:
            return {'status': 'skipped', 'reason': 'No template selected'}
        
        logger.info(f"Applying template styling to presentation {presentation_id}")
        
        # Apply template data to presentation
        template_data = template.template_data
        
        # Update theme settings
        if 'theme' in template_data:
            presentation.theme_settings.update(template_data['theme'])
        
        # Apply section-specific styling
        if 'section_styles' in template_data:
            for section in presentation.sections.all():
                section_style = template_data['section_styles'].get(section.section_type, {})
                if section_style:
                    section.style_config.update(section_style)
                    section.save()
        
        presentation.save()
        
        logger.info(f"Successfully applied template styling to presentation {presentation_id}")
        return {'status': 'completed'}
        
    except Exception as e:
        logger.error(f"Template styling failed: {e}")
        return {'status': 'failed', 'error': str(e)}


@shared_task(bind=True, max_retries=2)
def export_presentation_task(self, export_job_id):
    """
    Export presentation to various formats
    """
    try:
        export_job = PresentationExportJob.objects.get(id=export_job_id)
        presentation = export_job.presentation
        
        logger.info(f"Starting export job {export_job_id} for presentation {presentation.id}")
        
        # Update job status
        export_job.status = 'processing'
        export_job.started_at = timezone.now()
        export_job.save()
        
        # Get sections to export
        if export_job.selected_sections:
            sections = presentation.sections.filter(id__in=export_job.selected_sections)
        else:
            sections = presentation.sections.all()
        
        sections = sections.order_by('order')
        
        # Export based on format
        export_format = export_job.export_format
        export_settings = export_job.export_settings
        
        output_file = None
        output_url = None
        
        if export_format == 'pdf':
            output_file = export_to_pdf(presentation, sections, export_settings)
        elif export_format == 'docx':
            output_file = export_to_docx(presentation, sections, export_settings)
        elif export_format == 'pptx':
            output_file = export_to_pptx(presentation, sections, export_settings)
        elif export_format == 'html':
            output_url = export_to_html(presentation, sections, export_settings)
        elif export_format == 'mp4':
            output_file = export_to_video(presentation, sections, export_settings)
        else:
            raise ValueError(f"Unsupported export format: {export_format}")
        
        # Save output
        if output_file:
            filename = f"{presentation.title}_{export_format}_{uuid.uuid4().hex[:8]}.{export_format}"
            export_job.output_file.save(filename, output_file)
        
        if output_url:
            export_job.output_url = output_url
        
        # Update job status
        export_job.status = 'completed'
        export_job.completed_at = timezone.now()
        export_job.progress = 100
        export_job.expires_at = timezone.now() + timezone.timedelta(days=7)
        export_job.save()
        
        logger.info(f"Successfully completed export job {export_job_id}")
        return {
            'status': 'completed',
            'export_job_id': str(export_job_id),
            'output_file': export_job.output_file.url if export_job.output_file else None,
            'output_url': export_job.output_url
        }
        
    except Exception as e:
        logger.error(f"Export job {export_job_id} failed: {e}")
        logger.error(traceback.format_exc())
        
        # Update job status
        try:
            export_job = PresentationExportJob.objects.get(id=export_job_id)
            export_job.status = 'failed'
            export_job.error_message = str(e)
            export_job.save()
        except:
            pass
        
        # Retry if possible
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=120, exc=e)
        
        return {'status': 'failed', 'error': str(e)}


@shared_task
def cleanup_expired_exports():
    """
    Clean up expired export files
    """
    try:
        expired_jobs = PresentationExportJob.objects.filter(
            expires_at__lt=timezone.now(),
            status='completed'
        )
        
        cleaned_count = 0
        for job in expired_jobs:
            try:
                if job.output_file:
                    job.output_file.delete()
                job.delete()
                cleaned_count += 1
            except Exception as e:
                logger.error(f"Failed to clean up export job {job.id}: {e}")
        
        logger.info(f"Cleaned up {cleaned_count} expired export jobs")
        return {'status': 'completed', 'cleaned_count': cleaned_count}
        
    except Exception as e:
        logger.error(f"Export cleanup failed: {e}")
        return {'status': 'failed', 'error': str(e)}


@shared_task
def auto_save_presentation(presentation_id, user_id):
    """
    Auto-save presentation as a version
    """
    try:
        from users.models import PresentationVersion
        from django.contrib.auth.models import User
        
        presentation = Presentation.objects.get(id=presentation_id)
        user = User.objects.get(id=user_id)
        
        # Get latest version number
        latest_version = presentation.versions.first()
        version_number = (latest_version.version_number + 1) if latest_version else 1
        
        # Create content snapshot
        content_snapshot = {
            'presentation': {
                'title': presentation.title,
                'description': presentation.description,
                'theme_settings': presentation.theme_settings,
                'document_content': presentation.document_content,
                'document_settings': presentation.document_settings,
            },
            'sections': []
        }
        
        for section in presentation.sections.all():
            content_snapshot['sections'].append({
                'id': str(section.id),
                'title': section.title,
                'content': section.content,
                'rich_content': section.rich_content,
                'section_type': section.section_type,
                'order': section.order,
                'style_config': section.style_config,
                'layout_config': section.layout_config
            })
        
        # Create version
        PresentationVersion.objects.create(
            presentation=presentation,
            version_number=version_number,
            content_snapshot=content_snapshot,
            created_by=user,
            is_auto_save=True,
            changes_summary="Auto-save"
        )
        
        # Keep only last 10 auto-save versions
        old_versions = presentation.versions.filter(is_auto_save=True)[10:]
        for version in old_versions:
            version.delete()
        
        logger.info(f"Auto-saved presentation {presentation_id} as version {version_number}")
        return {'status': 'completed', 'version_number': version_number}
        
    except Exception as e:
        logger.error(f"Auto-save failed for presentation {presentation_id}: {e}")
        return {'status': 'failed', 'error': str(e)}


# ============================================================================
# AI HELPER FUNCTIONS
# ============================================================================

def generate_presentation_outline(prompt, presentation_type, quality):
    """
    Generate a structured outline for a presentation using AI
    """
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        
        type_instructions = {
            'document': 'Create a document structure with sections like introduction, main content, conclusion',
            'slide': 'Create a slide presentation structure with title slide, content slides, and summary'
        }

        quality_instructions = {
            'low': 'Create 3-5 basic sections with simple content',
            'medium': 'Create 5-8 well-developed sections with detailed content',
            'high': 'Create 8-12 comprehensive sections with rich, detailed content and examples'
        }

        system_prompt = f"""
        You are an expert presentation designer. Create a structured outline for a {presentation_type}.
        
        {type_instructions.get(presentation_type, type_instructions['slide'])}
        {quality_instructions.get(quality, quality_instructions['medium'])}
        
        Generate a JSON response with:
        1. title: Presentation title
        2. sections: Array of sections with:
           - title: Section title
           - type: Section type (heading, paragraph, list, image, etc.)
           - content_outline: Brief content outline
           - image_prompt: Suggested image description (if applicable)
           - order: Section order
        3. theme_suggestions: Suggested theme colors and fonts
        4. estimated_duration: Estimated duration for presentation
        """

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Create a {presentation_type} about: {prompt}"}
            ],
            temperature=0.6,
            max_tokens=2500
        )
        
        result = json.loads(response.choices[0].message.content)
        return result
        
    except Exception as e:
        logger.error(f"Outline generation failed: {e}")
        # Return fallback outline
        return {
            "title": "Generated Presentation",
            "sections": [
                {
                    "title": "Introduction",
                    "type": "title_slide" if presentation_type == 'slide' else "heading",
                    "content_outline": f"Introduction to {prompt}",
                    "image_prompt": f"Professional introduction image for {prompt}",
                    "order": 0
                },
                {
                    "title": "Main Content",
                    "type": "content_slide" if presentation_type == 'slide' else "paragraph",
                    "content_outline": f"Main content about {prompt}",
                    "image_prompt": f"Relevant illustration for {prompt}",
                    "order": 1
                },
                {
                    "title": "Conclusion",
                    "type": "content_slide" if presentation_type == 'slide' else "paragraph",
                    "content_outline": f"Conclusion and summary of {prompt}",
                    "image_prompt": f"Summary image for {prompt}",
                    "order": 2
                }
            ],
            "theme_suggestions": {
                "primary_color": "#2563EB",
                "secondary_color": "#7C3AED",
                "background_color": "#FFFFFF",
                "font_family": "Inter"
            },
            "estimated_duration": "10 minutes"
        }


def generate_content_with_ai(prompt, length='medium', tone='professional'):
    """
    Generate content using AI based on prompt, length, and tone
    """
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        
        length_mapping = {
            'short': 'Write 1-2 paragraphs (100-200 words)',
            'medium': 'Write 3-4 paragraphs (300-500 words)',
            'long': 'Write 5-8 paragraphs (700-1000 words)'
        }

        tone_mapping = {
            'professional': 'Use a professional, business-appropriate tone',
            'casual': 'Use a casual, conversational tone',
            'academic': 'Use an academic, scholarly tone with proper citations style',
            'creative': 'Use a creative, engaging tone with storytelling elements',
            'technical': 'Use a technical, precise tone with industry terminology'
        }

        system_prompt = f"""
        You are an expert content writer. {tone_mapping.get(tone, tone_mapping['professional'])}.
        {length_mapping.get(length, length_mapping['medium'])}.
        
        Ensure the content is:
        - Well-structured with clear flow
        - Factually accurate and informative
        - Engaging and relevant to the topic
        - Properly formatted
        """

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1500
        )
        
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        logger.error(f"Content generation failed: {e}")
        return f"Content for: {prompt}\n\nThis content will be generated when the AI service is available."


def generate_unified_document_content(prompt, outline, quality):
    """
    Generate unified document content instead of sections
    """
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        
        # Extract section titles from outline to create document structure
        sections = outline.get('sections', [])
        section_titles = [s.get('title', '') for s in sections]
        
        quality_mapping = {
            'low': 'Write a comprehensive document with 1000-1500 words',
            'medium': 'Write a detailed document with 2000-3000 words', 
            'high': 'Write an extensive, research-quality document with 3000-5000 words'
        }

        system_prompt = f"""
        You are an expert technical writer creating a unified, well-structured document.
        
        {quality_mapping.get(quality, quality_mapping['medium'])}.
        
        Create a complete document with:
        1. Proper HTML structure with headings (h1, h2, h3)
        2. Professional paragraphs with logical flow
        3. Lists where appropriate (ul, ol)
        4. Tables for data comparison when relevant
        5. Blockquotes for important information
        6. Proper document hierarchy and organization
        
        Structure the document to cover these main areas: {', '.join(section_titles)}
        
        Format as clean HTML with semantic elements:
        - Use h1 for main title
        - Use h2 for major sections  
        - Use h3 for subsections
        - Use p for paragraphs
        - Use ul/ol for lists
        - Use table for data
        - Use blockquote for important notes
        
        Make it professional, informative, and well-organized like a research paper or business document.
        """

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Write a comprehensive document about: {prompt}"}
            ],
            temperature=0.7,
            max_tokens=4000
        )
        
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        logger.error(f"Unified document content generation failed: {e}")
        
        # Return structured fallback content
        return f"""
        <h1>{outline.get('title', 'Generated Document')}</h1>
        
        <h2>Introduction</h2>
        <p>This document provides a comprehensive overview of {prompt}. The content covers key concepts, analysis, and conclusions drawn from current research and understanding.</p>
        
        <h2>Overview</h2>
        <p>The main focus areas of this document include:</p>
        <ul>
            {''.join(f'<li>{section.get("title", "")}</li>' for section in outline.get('sections', []))}
        </ul>
        
        <h2>Main Content</h2>
        <p>Detailed content about {prompt} will be provided here. This section explores the fundamental aspects, applications, and significance of the topic.</p>
        
        <h3>Key Points</h3>
        <ul>
            <li>Important aspect 1 related to {prompt}</li>
            <li>Important aspect 2 related to {prompt}</li>
            <li>Important aspect 3 related to {prompt}</li>
        </ul>
        
        <h2>Analysis</h2>
        <p>This section provides in-depth analysis and examination of {prompt}, including methodologies, findings, and interpretations.</p>
        
        <blockquote>
            <p>This is a key insight or important note about {prompt} that deserves special attention.</p>
        </blockquote>
        
        <h2>Conclusion</h2>
        <p>In conclusion, {prompt} represents an important area of study with significant implications. The document has covered the essential aspects and provided a comprehensive overview of the topic.</p>
        
        <p><em>This document was generated automatically. Content will be enhanced when the AI service is fully available.</em></p>
        """


# ============================================================================
# EXPORT HELPER FUNCTIONS
# ============================================================================

def export_to_pdf(presentation, sections, settings):
    """Export presentation to PDF"""
    try:
        from weasyprint import HTML, CSS
        import io
        
        # Generate HTML content
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>{presentation.title}</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }}
                h1 {{ color: #333; border-bottom: 3px solid #007bff; padding-bottom: 10px; }}
                h2 {{ color: #555; margin-top: 30px; }}
                .section {{ margin-bottom: 30px; page-break-inside: avoid; }}
                .meta {{ color: #666; font-size: 12px; margin-bottom: 20px; }}
                img {{ max-width: 100%; height: auto; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <h1>{presentation.title}</h1>
            <div class="meta">Generated on {timezone.now().strftime('%B %d, %Y at %I:%M %p')}</div>
        """
        
        for section in sections:
            html_content += f"""
            <div class="section">
                <h2>{section.title}</h2>
                {section.rich_content or section.content}
                {f'<img src="{section.image_url}" alt="{section.title}">' if section.image_url else ''}
            </div>
            """
        
        html_content += """
        </body>
        </html>
        """
        
        # Convert to PDF
        pdf_buffer = io.BytesIO()
        HTML(string=html_content).write_pdf(pdf_buffer)
        pdf_buffer.seek(0)
        
        return ContentFile(pdf_buffer.getvalue())
        
    except Exception as e:
        logger.error(f"PDF export failed: {e}")
        raise


def export_to_docx(presentation, sections, settings):
    """Export presentation to Word document"""
    try:
        from docx import Document
        from docx.shared import Inches
        import io
        import requests
        
        doc = Document()
        
        # Add title
        doc.add_heading(presentation.title, 0)
        
        # Add metadata
        p = doc.add_paragraph(f"Generated on {timezone.now().strftime('%B %d, %Y at %I:%M %p')}")
        p.style = 'Subtitle'
        
        # Add sections
        for section in sections:
            doc.add_heading(section.title, level=1)
            doc.add_paragraph(section.content)
            
            # Add image if available
            if section.image_url:
                try:
                    response = requests.get(section.image_url)
                    if response.status_code == 200:
                        image_stream = io.BytesIO(response.content)
                        doc.add_picture(image_stream, width=Inches(4))
                except Exception as e:
                    logger.warning(f"Failed to add image to docx: {e}")
        
        # Save to buffer
        buffer = io.BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        
        return ContentFile(buffer.getvalue())
        
    except Exception as e:
        logger.error(f"DOCX export failed: {e}")
        raise


def export_to_pptx(presentation, sections, settings):
    """Export presentation to PowerPoint"""
    try:
        from pptx import Presentation as PPTXPresentation
        from pptx.util import Inches, Pt
        from pptx.enum.text import PP_ALIGN
        import io
        import requests
        
        prs = PPTXPresentation()
        
        # Title slide
        title_slide_layout = prs.slide_layouts[0]
        slide = prs.slides.add_slide(title_slide_layout)
        title = slide.shapes.title
        subtitle = slide.placeholders[1]
        
        title.text = presentation.title
        subtitle.text = f"Generated on {timezone.now().strftime('%B %d, %Y')}"
        
        # Content slides
        for section in sections:
            slide_layout = prs.slide_layouts[1]  # Title and Content layout
            slide = prs.slides.add_slide(slide_layout)
            
            title = slide.shapes.title
            content = slide.placeholders[1]
            
            title.text = section.title
            content.text = section.content
            
            # Add image if available
            if section.image_url:
                try:
                    response = requests.get(section.image_url)
                    if response.status_code == 200:
                        image_stream = io.BytesIO(response.content)
                        slide.shapes.add_picture(
                            image_stream, 
                            Inches(1), 
                            Inches(3), 
                            width=Inches(4)
                        )
                except Exception as e:
                    logger.warning(f"Failed to add image to pptx: {e}")
        
        # Save to buffer
        buffer = io.BytesIO()
        prs.save(buffer)
        buffer.seek(0)
        
        return ContentFile(buffer.getvalue())
        
    except Exception as e:
        logger.error(f"PPTX export failed: {e}")
        raise


def export_to_html(presentation, sections, settings):
    """Export presentation to HTML"""
    try:
        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{presentation.title}</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.6;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                    color: #333;
                }}
                .header {{
                    text-align: center;
                    border-bottom: 2px solid #007bff;
                    padding-bottom: 20px;
                    margin-bottom: 40px;
                }}
                .section {{
                    margin-bottom: 40px;
                    padding: 20px;
                    border-left: 4px solid #007bff;
                    background: #f8f9fa;
                }}
                .section h2 {{
                    margin-top: 0;
                    color: #007bff;
                }}
                img {{
                    max-width: 100%;
                    height: auto;
                    border-radius: 8px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }}
                .meta {{
                    color: #666;
                    font-size: 14px;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>{presentation.title}</h1>
                <p class="meta">Generated on {timezone.now().strftime('%B %d, %Y at %I:%M %p')}</p>
            </div>
        """
        
        for section in sections:
            html_content += f"""
            <div class="section">
                <h2>{section.title}</h2>
                <div>{section.rich_content or section.content}</div>
                {f'<img src="{section.image_url}" alt="{section.title}">' if section.image_url else ''}
            </div>
            """
        
        html_content += """
        </body>
        </html>
        """
        
        # Save HTML file and return URL
        filename = f"presentation_{presentation.id}_{uuid.uuid4().hex[:8]}.html"
        file_path = os.path.join(settings.MEDIA_ROOT, 'exports', filename)
        
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        return f"{settings.MEDIA_URL}exports/{filename}"
        
    except Exception as e:
        logger.error(f"HTML export failed: {e}")
        raise


def export_to_video(presentation, sections, settings):
    """Export presentation to video"""
    try:
        from moviepy.editor import ImageClip, TextClip, CompositeVideoClip, concatenate_videoclips
        import requests
        from PIL import Image, ImageDraw, ImageFont
        
        clips = []
        duration_per_slide = settings.get('duration_per_slide', 5)
        
        for section in sections:
            # Create background image
            img = Image.new('RGB', (1920, 1080), color=(255, 255, 255))
            draw = ImageDraw.Draw(img)
            
            # Add title and content
            try:
                font_title = ImageFont.truetype("arial.ttf", 72)
                font_content = ImageFont.truetype("arial.ttf", 36)
            except:
                font_title = ImageFont.load_default()
                font_content = ImageFont.load_default()
            
            # Draw title
            title_bbox = draw.textbbox((0, 0), section.title, font=font_title)
            title_x = (1920 - title_bbox[2]) // 2
            draw.text((title_x, 100), section.title, fill=(0, 0, 0), font=font_title)
            
            # Draw content (truncated)
            content_lines = section.content[:300].split('\n')[:5]
            y_offset = 300
            for line in content_lines:
                if len(line) > 60:
                    line = line[:57] + "..."
                draw.text((100, y_offset), line, fill=(64, 64, 64), font=font_content)
                y_offset += 50
            
            # Save temporary image
            temp_img_path = f"/tmp/slide_{section.id}_{uuid.uuid4().hex[:8]}.png"
            img.save(temp_img_path)
            
            # Create video clip
            clip = ImageClip(temp_img_path).set_duration(duration_per_slide)
            clips.append(clip)
            
            # Clean up temp file
            os.remove(temp_img_path)
        
        # Concatenate all clips
        final_video = concatenate_videoclips(clips, method="compose")
        
        # Save to buffer
        temp_video_path = f"/tmp/presentation_{presentation.id}_{uuid.uuid4().hex[:8]}.mp4"
        final_video.write_videofile(
            temp_video_path,
            fps=24,
            codec='libx264',
            audio_codec='aac',
            temp_audiofile='temp-audio.m4a',
            remove_temp=True
        )
        
        # Read file and create ContentFile
        with open(temp_video_path, 'rb') as f:
            video_content = f.read()
        
        # Clean up
        os.remove(temp_video_path)
        final_video.close()
        
        return ContentFile(video_content)
        
    except Exception as e:
        logger.error(f"Video export failed: {e}")
        raise


# ============================================================================
# KEEP ALL YOUR EXISTING TASKS BELOW THIS LINE
# ============================================================================

# Your existing export_presentation_pdf_task, export_presentation_pptx_task, etc.
# should remain unchanged...