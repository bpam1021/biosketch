"""
Management command to create initial document templates and slide themes
"""

from django.core.management.base import BaseCommand
from users.models import DocumentTemplate, SlideTheme, SlideTemplate


class Command(BaseCommand):
    help = 'Create initial document templates and slide themes'

    def handle(self, *args, **options):
        self.stdout.write('Creating initial document templates and slide themes...')
        
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
            template, created = DocumentTemplate.objects.get_or_create(
                name=template_data['name'],
                defaults=template_data
            )
            if created:
                self.stdout.write(f'✓ Created document template: {template.name}')
            else:
                self.stdout.write(f'- Document template already exists: {template.name}')
        
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
            theme, created = SlideTheme.objects.get_or_create(
                name=theme_data['name'],
                defaults=theme_data
            )
            if created:
                self.stdout.write(f'✓ Created slide theme: {theme.name}')
            else:
                self.stdout.write(f'- Slide theme already exists: {theme.name}')
        
        # Create Slide Templates
        slide_templates = [
            {
                'name': 'Title Slide',
                'layout_type': 'title',
                'zones': [
                    {'id': 'title', 'type': 'text', 'x': 10, 'y': 30, 'width': 80, 'height': 25},
                    {'id': 'subtitle', 'type': 'text', 'x': 10, 'y': 60, 'width': 80, 'height': 15}
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
                'name': 'Two Column',
                'layout_type': 'two_column',
                'zones': [
                    {'id': 'title', 'type': 'text', 'x': 5, 'y': 5, 'width': 90, 'height': 15},
                    {'id': 'left_content', 'type': 'text', 'x': 5, 'y': 25, 'width': 42.5, 'height': 70},
                    {'id': 'right_content', 'type': 'text', 'x': 52.5, 'y': 25, 'width': 42.5, 'height': 70}
                ],
                'is_premium': False
            }
        ]
        
        for template_data in slide_templates:
            template, created = SlideTemplate.objects.get_or_create(
                name=template_data['name'],
                defaults=template_data
            )
            if created:
                self.stdout.write(f'✓ Created slide template: {template.name}')
            else:
                self.stdout.write(f'- Slide template already exists: {template.name}')
        
        self.stdout.write(self.style.SUCCESS('✓ Initial templates and themes created successfully!'))
        self.stdout.write('\nNow you can:')
        self.stdout.write('1. Test the /api/v2/presentation-types/templates/ endpoint')
        self.stdout.write('2. Create documents and slide presentations with AI')
        self.stdout.write('3. Use manual creation workflows')