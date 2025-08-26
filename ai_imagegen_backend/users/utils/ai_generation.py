from openai import OpenAI
import os
import json
from PIL import Image
from io import BytesIO
import hashlib
import base64
import uuid
from django.conf import settings

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def decompose_prompt(prompt: str):
    """
    Breaks a topic into 4–6 slides using GPT-4.
    Each slide includes title, description, and image prompt.
    """
    system_message = (
        "You are an assistant that transforms topics into presentations.\n"
        "Given a topic, return 4–6 slides as JSON:\n"
        "[\n"
        "  {\"title\": ..., \"description\": ..., \"image_prompt\": ...},\n"
        "  ...\n"
        "]\n"
        "Each description should be 2–3 sentences and be informative and educational.\n"
        "Make image_prompt clear, detailed, and specific enough for an AI image generator like DALL·E or GPT-4 image.\n"
        "Focus on creating professional, scientific, and visually appealing content."
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4",
            temperature=0.8,
            max_tokens=2000,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": f"Topic: {prompt}"},
            ]
        )

        content = response.choices[0].message.content
        if not content:
            raise ValueError("Empty response from GPT-4")
            
        return json.loads(content)

    except Exception as e:
        print("[GPT Error]", e)
        # Return fallback slides if GPT fails
        return [
            {
                "title": "Introduction",
                "description": f"Overview of {prompt}",
                "image_prompt": f"Professional scientific illustration of {prompt}, clean background"
            },
            {
                "title": "Key Concepts",
                "description": f"Main concepts and principles related to {prompt}",
                "image_prompt": f"Educational diagram showing key concepts of {prompt}, scientific style"
            },
            {
                "title": "Analysis",
                "description": f"Detailed analysis and findings about {prompt}",
                "image_prompt": f"Data visualization and analysis charts for {prompt}, professional presentation style"
            },
            {
                "title": "Conclusion",
                "description": f"Summary and conclusions about {prompt}",
                "image_prompt": f"Summary infographic for {prompt}, clean scientific design"
            }
        ]


def generate_image(prompt: str, request) -> str:
    """
    Generates an image using OpenAI's gpt-image-1 model and returns the saved file URL.
    """
    try:
        # Enhanced prompt for better image generation
        enhanced_prompt = f"Professional scientific illustration: {prompt}. High quality, detailed, educational, clean background, suitable for academic presentation."
        
        response = client.images.generate(
            model="gpt-image-1",
            prompt=enhanced_prompt,
            n=1,
            size="1536x1024",
            quality="hd",
        )
        b64_data = response.data[0].b64_json
        if not b64_data:
            print("[Image Generation Warning] Empty image data, using fallback")
            return ""

        image = Image.open(BytesIO(base64.b64decode(b64_data)))
        hashed = hashlib.md5(prompt.encode()).hexdigest()[:10]
        filename = f"slide_{hashed}_{uuid.uuid4().hex[:6]}.png"
        
        # Ensure directory exists
        os.makedirs(os.path.join(settings.MEDIA_ROOT, "generated_slides"), exist_ok=True)
        path = os.path.join(settings.MEDIA_ROOT, "generated_slides", filename)
        image.save(path)

        return f"{request.scheme}://{request.get_host()}{settings.MEDIA_URL}generated_slides/{filename}"
    except Exception as e:
        print("[Image Generation Error]", e)
        return ""

def regenerate_slide_content(image_prompt: str):
    """
    Regenerates slide title and description from an image prompt using GPT-4.
    """
    system_message = (
        "Given an AI image prompt, generate a suitable slide title and a 2–3 sentence description.\n"
        "Make the content educational, informative, and professional.\n"
        "Respond as JSON: {\"title\": ..., \"description\": ...}\n"
        "Ensure the title is clear and the description provides valuable information."
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4",
            temperature=0.8,
            max_tokens=500,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": f"Prompt: {image_prompt}"},
            ]
        )

        content = response.choices[0].message.content
        if not content:
            raise ValueError("Empty response from GPT-4")
            
        return json.loads(content)

    except Exception as e:
        print("[GPT Regeneration Error]", e)
        # Return fallback content
        return {
            "title": "Generated Content",
            "description": "AI-generated content based on the provided prompt. This slide contains relevant information for your presentation."
        }


# ============================================================================
# PRESENTATION CONTENT GENERATION (NEW)
# ============================================================================

def generate_presentation_content_sync(presentation_id, user_id, estimated_cost):
    """
    Synchronous presentation content generation (fallback when Celery is not available)
    """
    from decimal import Decimal
    from django.utils import timezone
    from django.contrib.auth.models import User
    from users.models import (
        Presentation, ContentSection, CreditTransaction, 
        AIGenerationLog
    )
    import logging
    
    logger = logging.getLogger(__name__)
    
    try:
        presentation = Presentation.objects.get(id=presentation_id)
        user = User.objects.get(id=user_id)
        
        logger.info(f"Starting synchronous content generation for presentation {presentation_id}")
        
        # Update status
        presentation.status = 'generating'
        presentation.save()
        
        # Generate outline based on prompt and type
        outline = generate_presentation_outline_sync(
            presentation.original_prompt,
            presentation.presentation_type,
            presentation.quality
        )
        
        # Store generated outline
        presentation.generated_outline = outline
        presentation.save()
        
        # Create sections based on outline
        sections_created = []
        for i, section_data in enumerate(outline.get('sections', [])):
            try:
                # Generate detailed content for each section
                detailed_content = generate_content_with_ai_sync(
                    f"Write detailed content for: {section_data.get('title', '')}. Context: {presentation.original_prompt}",
                    length='medium' if presentation.quality == 'medium' else 'long' if presentation.quality == 'high' else 'short',
                    tone='professional'
                )
                
                # Determine section type based on presentation type
                if presentation.presentation_type == 'document':
                    section_type = section_data.get('type', 'paragraph')
                else:
                    section_type = section_data.get('type', 'content_slide')
                
                # Create section
                section = ContentSection.objects.create(
                    presentation=presentation,
                    section_type=section_type,
                    title=section_data.get('title', f'Section {i+1}'),
                    order=i,
                    content=detailed_content,
                    rich_content=detailed_content,
                    content_data={
                        'ai_generated': True,
                        'generation_prompt': section_data.get('title', ''),
                        'original_outline': section_data,
                        'sync_generated': True
                    },
                    image_prompt=section_data.get('image_prompt', ''),
                    ai_generated=True,
                    generation_prompt=section_data.get('title', '')
                )
                
                sections_created.append(str(section.id))
                logger.info(f"Created section {section.id} for presentation {presentation_id}")
                
            except Exception as e:
                logger.error(f"Failed to create section {i}: {e}")
                continue
        
        # Deduct credits
        if hasattr(user, 'profile'):
            user.profile.credits -= Decimal(str(estimated_cost))
            user.profile.save()
        
        CreditTransaction.objects.create(
            user=user,
            amount=-Decimal(str(estimated_cost)),
            type='usage',
            description=f"Presentation generation (sync): {presentation.title}"
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
                'sync_generated': True
            },
            success=True
        )
        
        # Update presentation status
        presentation.status = 'ready'
        presentation.generation_cost = Decimal(str(estimated_cost))
        presentation.total_credits_used = Decimal(str(estimated_cost))
        presentation.save()
        
        logger.info(f"Successfully generated presentation {presentation_id} synchronously")
        return {
            'status': 'completed',
            'sections_created': len(sections_created),
            'presentation_id': str(presentation_id)
        }
        
    except Exception as e:
        logger.error(f"Synchronous presentation generation failed: {e}")
        
        # Update presentation status
        try:
            presentation = Presentation.objects.get(id=presentation_id)
            presentation.status = 'error'
            presentation.save()
            
            # Log error
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
        
        raise e


def generate_presentation_outline_sync(prompt, presentation_type, quality):
    """
    Generate a structured outline for a presentation using AI (synchronous)
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Check if OpenAI API key is available
        if not hasattr(settings, 'OPENAI_API_KEY') or not settings.OPENAI_API_KEY:
            logger.warning("OpenAI API key not found, using fallback outline")
            return get_fallback_outline(prompt, presentation_type, quality)
        
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
        logger.error(f"AI outline generation failed: {e}")
        # Return fallback outline
        return get_fallback_outline(prompt, presentation_type, quality)


def generate_content_with_ai_sync(prompt, length='medium', tone='professional'):
    """
    Generate content using AI based on prompt, length, and tone (synchronous)
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Check if OpenAI API key is available
        if not hasattr(settings, 'OPENAI_API_KEY') or not settings.OPENAI_API_KEY:
            logger.warning("OpenAI API key not found, using fallback content")
            return get_fallback_content(prompt, length)
        
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
        logger.error(f"AI content generation failed: {e}")
        return get_fallback_content(prompt, length)


def get_fallback_outline(prompt, presentation_type, quality):
    """
    Return a fallback outline when AI generation fails
    """
    quality_section_count = {
        'low': 3,
        'medium': 5,
        'high': 8
    }
    
    section_count = quality_section_count.get(quality, 5)
    
    sections = []
    
    if presentation_type == 'document':
        base_sections = [
            {"title": "Introduction", "type": "heading"},
            {"title": "Background", "type": "paragraph"}, 
            {"title": "Main Analysis", "type": "paragraph"},
            {"title": "Results", "type": "paragraph"},
            {"title": "Discussion", "type": "paragraph"},
            {"title": "Conclusion", "type": "paragraph"},
            {"title": "References", "type": "paragraph"},
            {"title": "Appendix", "type": "paragraph"}
        ]
    else:
        base_sections = [
            {"title": "Title Slide", "type": "title_slide"},
            {"title": "Overview", "type": "content_slide"},
            {"title": "Key Points", "type": "content_slide"},
            {"title": "Details", "type": "content_slide"},
            {"title": "Analysis", "type": "content_slide"},
            {"title": "Findings", "type": "content_slide"},
            {"title": "Implications", "type": "content_slide"},
            {"title": "Summary", "type": "content_slide"}
        ]
    
    for i in range(min(section_count, len(base_sections))):
        section = base_sections[i].copy()
        section.update({
            "content_outline": f"Content about {prompt}",
            "image_prompt": f"Professional image for {section['title']} about {prompt}",
            "order": i
        })
        sections.append(section)
    
    return {
        "title": f"Presentation: {prompt}",
        "sections": sections,
        "theme_suggestions": {
            "primary_color": "#2563EB",
            "secondary_color": "#7C3AED",
            "background_color": "#FFFFFF",
            "font_family": "Inter"
        },
        "estimated_duration": f"{section_count * 2} minutes"
    }


def get_fallback_content(prompt, length='medium'):
    """
    Return fallback content when AI generation fails
    """
    length_mapping = {
        'short': "Brief overview of the topic.",
        'medium': "Detailed discussion of the key aspects and important considerations.",
        'long': "Comprehensive analysis covering all relevant aspects, including background, methodology, and implications."
    }
    
    base_content = length_mapping.get(length, length_mapping['medium'])
    
    return f"Content for: {prompt}\n\n{base_content}\n\nThis content was generated as a fallback and should be reviewed and expanded upon."