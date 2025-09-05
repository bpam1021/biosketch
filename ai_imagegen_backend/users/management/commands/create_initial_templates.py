"""
Management command to create initial document templates and slide themes
"""

from django.core.management.base import BaseCommand
from users.models import DocumentTemplate, SlideTheme, SlideTemplate


class Command(BaseCommand):
    help = 'Create and update document templates, slide themes, and slide templates'

    def handle(self, *args, **options):
        self.stdout.write('Creating and updating document templates and slide themes...')
        
        # Create Document Templates
        doc_templates = [
            {
                'name': 'Academic Paper',
                'description': 'Professional academic paper with abstract, sections, and bibliography',
                'structure': {
                    'chapters': [
                        {'name': 'Abstract', 'required': True},
                        {'name': 'Introduction', 'required': True},
                        {'name': 'Literature Review', 'required': False},
                        {'name': 'Methodology', 'required': True},
                        {'name': 'Results', 'required': True},
                        {'name': 'Discussion', 'required': True},
                        {'name': 'Conclusion', 'required': True},
                        {'name': 'References', 'required': True}
                    ]
                },
                'formatting': {
                    'fonts': {'heading': 'Times New Roman', 'body': 'Times New Roman'},
                    'margins': {'top': 1.0, 'bottom': 1.0, 'left': 1.0, 'right': 1.0},
                    'spacing': 'double'
                }
            },
            {
                'name': 'Business Report',
                'description': 'Professional business report with executive summary and recommendations',
                'structure': {
                    'chapters': [
                        {'name': 'Executive Summary', 'required': True},
                        {'name': 'Introduction', 'required': True},
                        {'name': 'Background', 'required': False},
                        {'name': 'Analysis', 'required': True},
                        {'name': 'Findings', 'required': True},
                        {'name': 'Recommendations', 'required': True},
                        {'name': 'Conclusion', 'required': True},
                        {'name': 'Appendices', 'required': False}
                    ]
                },
                'formatting': {
                    'fonts': {'heading': 'Calibri', 'body': 'Calibri'},
                    'margins': {'top': 1.0, 'bottom': 1.0, 'left': 1.0, 'right': 1.0},
                    'spacing': 'single'
                }
            },
            {
                'name': 'Technical Manual',
                'description': 'Technical documentation with detailed procedures and specifications',
                'structure': {
                    'chapters': [
                        {'name': 'Overview', 'required': True},
                        {'name': 'Requirements', 'required': True},
                        {'name': 'Installation', 'required': True},
                        {'name': 'Configuration', 'required': True},
                        {'name': 'Usage', 'required': True},
                        {'name': 'Troubleshooting', 'required': True},
                        {'name': 'FAQ', 'required': False},
                        {'name': 'Glossary', 'required': False}
                    ]
                },
                'formatting': {
                    'fonts': {'heading': 'Arial', 'body': 'Arial'},
                    'margins': {'top': 1.0, 'bottom': 1.0, 'left': 1.0, 'right': 1.0},
                    'spacing': 'single'
                }
            }
        ]
        
        for template_data in doc_templates:
            template, created = DocumentTemplate.objects.update_or_create(
                name=template_data['name'],
                defaults=template_data
            )
            action = '✓ Created' if created else '🔄 Updated'
            self.stdout.write(f'{action} document template: {template.name}')
        
        # Create Slide Themes
        slide_themes = [
            {
                'name': 'Corporate Blue',
                'colors': {
                    'primary': '#1f4e79',
                    'secondary': '#70ad47',
                    'accent': '#ffc000',
                    'text': '#000000',
                    'background': '#ffffff'
                },
                'fonts': {
                    'heading': 'Calibri',
                    'body': 'Calibri'
                },
                'effects': {
                    'shadow': True,
                    'gradients': False,
                    'animations': 'subtle'
                },
                'is_premium': False
            },
            {
                'name': 'Modern Dark',
                'colors': {
                    'primary': '#2c2c2c',
                    'secondary': '#4472c4',
                    'accent': '#e74c3c',
                    'text': '#ffffff',
                    'background': '#1a1a1a'
                },
                'fonts': {
                    'heading': 'Segoe UI',
                    'body': 'Segoe UI'
                },
                'effects': {
                    'shadow': True,
                    'gradients': True,
                    'animations': 'modern'
                },
                'is_premium': False
            },
            {
                'name': 'Academic Clean',
                'colors': {
                    'primary': '#2f5597',
                    'secondary': '#70ad47',
                    'accent': '#c55a11',
                    'text': '#000000',
                    'background': '#ffffff'
                },
                'fonts': {
                    'heading': 'Times New Roman',
                    'body': 'Times New Roman'
                },
                'effects': {
                    'shadow': False,
                    'gradients': False,
                    'animations': 'none'
                },
                'is_premium': False
            }
        ]
        
        for theme_data in slide_themes:
            theme, created = SlideTheme.objects.update_or_create(
                name=theme_data['name'],
                defaults=theme_data
            )
            action = '✓ Created' if created else '🔄 Updated'
            self.stdout.write(f'{action} slide theme: {theme.name}')
        
        # Create Comprehensive Slide Templates for AI Generation System
        slide_templates = [
            {
                'name': 'Title Slide',
                'layout_type': 'title',
                'zones': [
                    {'id': 'title', 'type': 'text', 'x': 10, 'y': 25, 'width': 80, 'height': 30},
                    {'id': 'subtitle', 'type': 'text', 'x': 10, 'y': 60, 'width': 80, 'height': 20},
                    {'id': 'presenter', 'type': 'text', 'x': 10, 'y': 85, 'width': 80, 'height': 10}
                ],
                'is_premium': False
            },
            {
                'name': 'Title and Content',
                'layout_type': 'title_content',
                'zones': [
                    {'id': 'title', 'type': 'text', 'x': 5, 'y': 5, 'width': 90, 'height': 15},
                    {'id': 'content', 'type': 'text', 'x': 5, 'y': 25, 'width': 90, 'height': 70}
                ],
                'is_premium': False
            },
            {
                'name': 'Two Column Layout',
                'layout_type': 'two_column',
                'zones': [
                    {'id': 'title', 'type': 'text', 'x': 5, 'y': 5, 'width': 90, 'height': 15},
                    {'id': 'left_content', 'type': 'text', 'x': 5, 'y': 25, 'width': 42.5, 'height': 70},
                    {'id': 'right_content', 'type': 'text', 'x': 52.5, 'y': 25, 'width': 42.5, 'height': 70}
                ],
                'is_premium': False
            },
            {
                'name': 'Image and Content',
                'layout_type': 'image_content',
                'zones': [
                    {'id': 'title', 'type': 'text', 'x': 5, 'y': 5, 'width': 90, 'height': 15},
                    {'id': 'content', 'type': 'text', 'x': 5, 'y': 25, 'width': 45, 'height': 70},
                    {'id': 'image', 'type': 'image', 'x': 55, 'y': 25, 'width': 40, 'height': 70}
                ],
                'is_premium': False
            },
            {
                'name': 'Full Image Background',
                'layout_type': 'full_image',
                'zones': [
                    {'id': 'background_image', 'type': 'image', 'x': 0, 'y': 0, 'width': 100, 'height': 100},
                    {'id': 'title', 'type': 'text', 'x': 10, 'y': 40, 'width': 80, 'height': 20}
                ],
                'is_premium': False
            },
            {
                'name': 'Comparison Layout',
                'layout_type': 'comparison',
                'zones': [
                    {'id': 'title', 'type': 'text', 'x': 5, 'y': 5, 'width': 90, 'height': 15},
                    {'id': 'option_a_title', 'type': 'text', 'x': 5, 'y': 25, 'width': 42.5, 'height': 10},
                    {'id': 'option_a_content', 'type': 'text', 'x': 5, 'y': 35, 'width': 42.5, 'height': 60},
                    {'id': 'option_b_title', 'type': 'text', 'x': 52.5, 'y': 25, 'width': 42.5, 'height': 10},
                    {'id': 'option_b_content', 'type': 'text', 'x': 52.5, 'y': 35, 'width': 42.5, 'height': 60}
                ],
                'is_premium': False
            },
            {
                'name': 'Agenda or List',
                'layout_type': 'agenda',
                'zones': [
                    {'id': 'title', 'type': 'text', 'x': 5, 'y': 5, 'width': 90, 'height': 15},
                    {'id': 'agenda_items', 'type': 'text', 'x': 10, 'y': 25, 'width': 80, 'height': 70}
                ],
                'is_premium': False
            },
            {
                'name': 'Chart or Graph',
                'layout_type': 'chart',
                'zones': [
                    {'id': 'title', 'type': 'text', 'x': 5, 'y': 5, 'width': 90, 'height': 15},
                    {'id': 'chart', 'type': 'chart', 'x': 5, 'y': 25, 'width': 60, 'height': 70},
                    {'id': 'insights', 'type': 'text', 'x': 70, 'y': 25, 'width': 25, 'height': 70}
                ],
                'is_premium': False
            },
            {
                'name': 'Data Table',
                'layout_type': 'table',
                'zones': [
                    {'id': 'title', 'type': 'text', 'x': 5, 'y': 5, 'width': 90, 'height': 15},
                    {'id': 'table', 'type': 'table', 'x': 10, 'y': 25, 'width': 80, 'height': 60},
                    {'id': 'notes', 'type': 'text', 'x': 10, 'y': 90, 'width': 80, 'height': 5}
                ],
                'is_premium': False
            },
            {
                'name': 'Quote or Citation',
                'layout_type': 'quote',
                'zones': [
                    {'id': 'quote', 'type': 'text', 'x': 15, 'y': 30, 'width': 70, 'height': 40},
                    {'id': 'attribution', 'type': 'text', 'x': 15, 'y': 75, 'width': 70, 'height': 15}
                ],
                'is_premium': False
            },
            # AI-specific templates for Celery task compatibility
            {
                'name': 'AI Title Slide',
                'layout_type': 'title_slide',
                'zones': [
                    {'id': 'title_zone', 'type': 'text', 'x': 10, 'y': 25, 'width': 80, 'height': 30},
                    {'id': 'subtitle_zone', 'type': 'text', 'x': 10, 'y': 60, 'width': 80, 'height': 20},
                    {'id': 'presenter_zone', 'type': 'text', 'x': 10, 'y': 85, 'width': 80, 'height': 10}
                ],
                'is_premium': False
            },
            {
                'name': 'AI Agenda Overview',
                'layout_type': 'agenda_overview',
                'zones': [
                    {'id': 'title_zone', 'type': 'text', 'x': 5, 'y': 5, 'width': 90, 'height': 15},
                    {'id': 'agenda_zone', 'type': 'text', 'x': 10, 'y': 25, 'width': 80, 'height': 70}
                ],
                'is_premium': False
            },
            {
                'name': 'AI Section Divider',
                'layout_type': 'section_divider',
                'zones': [
                    {'id': 'section_title_zone', 'type': 'text', 'x': 10, 'y': 40, 'width': 80, 'height': 20}
                ],
                'is_premium': False
            },
            {
                'name': 'AI Content + Image',
                'layout_type': 'content_image',
                'zones': [
                    {'id': 'title_zone', 'type': 'text', 'x': 5, 'y': 5, 'width': 90, 'height': 15},
                    {'id': 'content_zone', 'type': 'text', 'x': 5, 'y': 25, 'width': 45, 'height': 70},
                    {'id': 'image_zone', 'type': 'image', 'x': 55, 'y': 25, 'width': 40, 'height': 70}
                ],
                'is_premium': False
            },
            {
                'name': 'AI Data Visual',
                'layout_type': 'data_visual',
                'zones': [
                    {'id': 'title_zone', 'type': 'text', 'x': 5, 'y': 5, 'width': 90, 'height': 15},
                    {'id': 'chart_zone', 'type': 'chart', 'x': 5, 'y': 25, 'width': 60, 'height': 70},
                    {'id': 'insights_zone', 'type': 'text', 'x': 70, 'y': 25, 'width': 25, 'height': 70}
                ],
                'is_premium': False
            },
            {
                'name': 'AI Quote/Testimonial',
                'layout_type': 'quote_testimonial',
                'zones': [
                    {'id': 'quote_zone', 'type': 'text', 'x': 15, 'y': 30, 'width': 70, 'height': 40},
                    {'id': 'attribution_zone', 'type': 'text', 'x': 15, 'y': 75, 'width': 70, 'height': 15}
                ],
                'is_premium': False
            },
            {
                'name': 'AI Conclusion/CTA',
                'layout_type': 'conclusion_cta',
                'zones': [
                    {'id': 'title_zone', 'type': 'text', 'x': 5, 'y': 5, 'width': 90, 'height': 15},
                    {'id': 'conclusion_zone', 'type': 'text', 'x': 10, 'y': 25, 'width': 80, 'height': 50},
                    {'id': 'cta_zone', 'type': 'text', 'x': 10, 'y': 80, 'width': 80, 'height': 15}
                ],
                'is_premium': False
            },
            {
                'name': 'AI Thank You',
                'layout_type': 'thank_you',
                'zones': [
                    {'id': 'thank_you_zone', 'type': 'text', 'x': 10, 'y': 30, 'width': 80, 'height': 25},
                    {'id': 'contact_zone', 'type': 'text', 'x': 10, 'y': 60, 'width': 80, 'height': 35}
                ],
                'is_premium': False
            },
        ]
        
        for template_data in slide_templates:
            template, created = SlideTemplate.objects.update_or_create(
                layout_type=template_data['layout_type'],
                defaults=template_data
            )
            action = '✓ Created' if created else '🔄 Updated'
            self.stdout.write(f'{action} slide template: {template.name} ({template.layout_type})')
        
        self.stdout.write(self.style.SUCCESS('✅ Templates and themes created/updated successfully!'))
        self.stdout.write(f'\n📊 Summary:')
        self.stdout.write(f'   📄 Document templates: {len(doc_templates)}')
        self.stdout.write(f'   🎨 Slide themes: {len(slide_themes)}') 
        self.stdout.write(f'   📊 Slide templates: {len(slide_templates)}')
        self.stdout.write('\n🚀 Available slide template types for AI generation:')
        
        # Group templates by type
        core_templates = [t for t in slide_templates if not t["layout_type"].startswith(('title_slide', 'agenda_', 'section_', 'content_image', 'data_visual', 'quote_testimonial', 'conclusion_', 'thank_you'))]
        ai_templates = [t for t in slide_templates if t["layout_type"].startswith(('title_slide', 'agenda_', 'section_', 'content_image', 'data_visual', 'quote_testimonial', 'conclusion_', 'thank_you'))]
        
        self.stdout.write('   📋 Core templates:')
        for template in core_templates:
            self.stdout.write(f'      • {template["layout_type"]}: {template["name"]}')
            
        self.stdout.write('   🤖 AI-specific templates:')
        for template in ai_templates:
            self.stdout.write(f'      • {template["layout_type"]}: {template["name"]}')
            
        self.stdout.write('\n✅ System ready:')
        self.stdout.write('   • Frontend template selection will work')
        self.stdout.write('   • AI slide generation has all required templates')
        self.stdout.write('   • Backend API endpoints have template data')
        self.stdout.write('   • Celery tasks can match all template types')