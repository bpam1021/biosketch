# ai_imagegen_backend/users/migrations/0002_initial_templates.py
from django.db import migrations

def create_initial_templates(apps, schema_editor):
    PresentationTemplate = apps.get_model('users', 'PresentationTemplate')
    ChartTemplate = apps.get_model('users', 'ChartTemplate')
    
    # Create Presentation Templates
    presentation_templates = [
        {
            'name': 'Academic Research Paper',
            'description': 'Professional template for academic research papers with proper formatting and citation support.',
            'template_type': 'document',
            'category': 'academic',
            'template_data': {
                'theme': {
                    'primary_color': '#2563EB',
                    'font_family': 'Times New Roman',
                    'line_spacing': 1.5
                },
                'sections': ['abstract', 'introduction', 'methodology', 'results', 'discussion', 'conclusion', 'references']
            },
            'style_config': {
                'heading_style': {'font_size': '16pt', 'font_weight': 'bold'},
                'body_style': {'font_size': '12pt', 'line_height': '1.5'},
                'citation_style': 'apa'
            },
            'layout_config': {
                'page_layout': 'single_column',
                'margins': {'top': '1in', 'bottom': '1in', 'left': '1in', 'right': '1in'}
            },
            'is_premium': False,
            'is_active': True
        },
        {
            'name': 'Business Presentation',
            'description': 'Clean and professional template for business presentations with charts and corporate styling.',
            'template_type': 'slide',
            'category': 'business',
            'template_data': {
                'theme': {
                    'primary_color': '#1F2937',
                    'secondary_color': '#3B82F6',
                    'background_color': '#FFFFFF',
                    'font_family': 'Arial'
                },
                'slide_layouts': ['title', 'content', 'two_column', 'chart', 'conclusion']
            },
            'style_config': {
                'title_style': {'font_size': '28pt', 'color': '#1F2937'},
                'content_style': {'font_size': '18pt', 'color': '#374151'}
            },
            'layout_config': {
                'slide_size': '16:9',
                'template': 'corporate'
            },
            'is_premium': False,
            'is_active': True
        },
        {
            'name': 'Creative Portfolio',
            'description': 'Vibrant and modern template perfect for creative portfolios and design presentations.',
            'template_type': 'slide',
            'category': 'creative',
            'template_data': {
                'theme': {
                    'primary_color': '#7C3AED',
                    'secondary_color': '#EC4899',
                    'accent_color': '#F59E0B',
                    'background_color': '#FAFAFA',
                    'font_family': 'Montserrat'
                }
            },
            'style_config': {
                'title_style': {'font_size': '32pt', 'gradient': True},
                'content_style': {'font_size': '16pt'}
            },
            'layout_config': {
                'slide_size': '16:9',
                'template': 'creative'
            },
            'is_premium': True,
            'is_active': True
        },
        {
            'name': 'Technical Documentation',
            'description': 'Structured template for technical documentation with code blocks and diagrams.',
            'template_type': 'document',
            'category': 'technical',
            'template_data': {
                'theme': {
                    'primary_color': '#059669',
                    'font_family': 'Source Code Pro',
                    'code_font': 'Monaco'
                },
                'sections': ['overview', 'installation', 'configuration', 'usage', 'api_reference', 'troubleshooting']
            },
            'style_config': {
                'code_style': {'background': '#F3F4F6', 'font_family': 'Monaco'},
                'heading_style': {'color': '#059669'}
            },
            'layout_config': {
                'page_layout': 'single_column',
                'code_highlighting': True
            },
            'is_premium': False,
            'is_active': True
        },
        {
            'name': 'Medical Case Study',
            'description': 'Professional medical template with proper formatting for case studies and research.',
            'template_type': 'document',
            'category': 'medical',
            'template_data': {
                'theme': {
                    'primary_color': '#DC2626',
                    'font_family': 'Arial',
                    'medical_formatting': True
                },
                'sections': ['patient_info', 'chief_complaint', 'history', 'examination', 'diagnosis', 'treatment', 'outcome']
            },
            'style_config': {
                'patient_style': {'background': '#FEF2F2', 'border': '1px solid #FCA5A5'},
                'warning_style': {'background': '#FEF3C7', 'border': '1px solid #F59E0B'}
            },
            'layout_config': {
                'page_layout': 'single_column',
                'confidentiality_header': True
            },
            'is_premium': True,
            'is_active': True
        }
    ]
    
    for template_data in presentation_templates:
        PresentationTemplate.objects.create(**template_data)
    
    # Create Chart Templates
    chart_templates = [
        {
            'name': 'Bar Chart',
            'description': 'Standard bar chart for comparing categories of data.',
            'category': 'data_viz',
            'chart_type': 'bar_chart',
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
            'style_options': [
                {'name': 'Classic', 'colors': ['#3B82F6', '#EF4444', '#10B981']},
                {'name': 'Vibrant', 'colors': ['#7C3AED', '#EC4899', '#F59E0B']},
                {'name': 'Professional', 'colors': ['#1F2937', '#6B7280', '#9CA3AF']}
            ],
            'data_requirements': {
                'labels': 'array',
                'datasets': [{'label': 'string', 'data': 'array'}]
            },
            'sample_data': {
                'labels': ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
                'datasets': [{'label': 'Sales', 'data': [12, 19, 3, 5, 2]}]
            },
            'generation_prompts': {
                'analysis': 'Analyze the data for bar chart representation',
                'insights': 'Provide insights about the comparative data'
            },
            'content_keywords': ['compare', 'categories', 'data', 'statistics', 'values'],
            'is_premium': False,
            'is_active': True
        },
        {
            'name': 'Line Chart',
            'description': 'Line chart perfect for showing trends over time.',
            'category': 'data_viz',
            'chart_type': 'line_chart',
            'template_config': {
                'type': 'line',
                'options': {
                    'responsive': True,
                    'scales': {
                        'y': {'beginAtZero': True}
                    }
                }
            },
            'style_options': [
                {'name': 'Smooth', 'tension': 0.4},
                {'name': 'Sharp', 'tension': 0},
                {'name': 'Curved', 'tension': 0.8}
            ],
            'data_requirements': {
                'labels': 'array',
                'datasets': [{'label': 'string', 'data': 'array'}]
            },
            'sample_data': {
                'labels': ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
                'datasets': [{'label': 'Revenue', 'data': [10, 15, 12, 20, 18]}]
            },
            'generation_prompts': {
                'trend': 'Analyze trends in the time series data',
                'forecast': 'Provide forecasting insights'
            },
            'content_keywords': ['trend', 'time', 'over time', 'progress', 'growth'],
            'is_premium': False,
            'is_active': True
        },
        {
            'name': 'Process Flowchart',
            'description': 'Flowchart for visualizing processes and workflows.',
            'category': 'process',
            'chart_type': 'flowchart',
            'template_config': {
                'type': 'flowchart',
                'direction': 'TB',
                'nodeDefaults': {
                    'shape': 'rect',
                    'style': 'fill:#f9f9f9;stroke:#333;stroke-width:2px'
                }
            },
            'style_options': [
                {'name': 'Modern', 'theme': 'modern'},
                {'name': 'Classic', 'theme': 'classic'},
                {'name': 'Minimal', 'theme': 'minimal'}
            ],
            'data_requirements': {
                'nodes': [{'id': 'string', 'label': 'string', 'type': 'string'}],
                'edges': [{'from': 'string', 'to': 'string'}]
            },
            'sample_data': {
                'nodes': [
                    {'id': 'start', 'label': 'Start', 'type': 'start'},
                    {'id': 'process', 'label': 'Process', 'type': 'process'},
                    {'id': 'end', 'label': 'End', 'type': 'end'}
                ],
                'edges': [
                    {'from': 'start', 'to': 'process'},
                    {'from': 'process', 'to': 'end'}
                ]
            },
            'generation_prompts': {
                'workflow': 'Create a workflow diagram from the process description',
                'optimization': 'Suggest process improvements'
            },
            'content_keywords': ['process', 'workflow', 'steps', 'procedure', 'flow'],
            'is_premium': False,
            'is_active': True
        },
        {
            'name': 'Organization Chart',
            'description': 'Hierarchical chart for organizational structures.',
            'category': 'hierarchy',
            'chart_type': 'org_chart',
            'template_config': {
                'type': 'org_chart',
                'layout': 'hierarchical',
                'nodeSpacing': 50,
                'levelSpacing': 100
            },
            'style_options': [
                {'name': 'Corporate', 'style': 'corporate'},
                {'name': 'Modern', 'style': 'modern'},
                {'name': 'Compact', 'style': 'compact'}
            ],
            'data_requirements': {
                'nodes': [{'id': 'string', 'name': 'string', 'title': 'string', 'parent': 'string'}]
            },
            'sample_data': {
                'nodes': [
                    {'id': '1', 'name': 'CEO', 'title': 'Chief Executive Officer'},
                    {'id': '2', 'name': 'CTO', 'title': 'Chief Technology Officer', 'parent': '1'},
                    {'id': '3', 'name': 'CFO', 'title': 'Chief Financial Officer', 'parent': '1'}
                ]
            },
            'generation_prompts': {
                'structure': 'Create organizational structure from description',
                'hierarchy': 'Analyze reporting relationships'
            },
            'content_keywords': ['organization', 'hierarchy', 'structure', 'reporting', 'management'],
            'is_premium': True,
            'is_active': True
        },
        {
            'name': 'Timeline',
            'description': 'Timeline chart for showing events chronologically.',
            'category': 'timeline',
            'chart_type': 'timeline',
            'template_config': {
                'type': 'timeline',
                'orientation': 'horizontal',
                'showLabels': True,
                'showDates': True
            },
            'style_options': [
                {'name': 'Modern', 'theme': 'modern'},
                {'name': 'Classic', 'theme': 'classic'},
                {'name': 'Minimal', 'theme': 'minimal'}
            ],
            'data_requirements': {
                'events': [{'date': 'string', 'title': 'string', 'description': 'string'}]
            },
            'sample_data': {
                'events': [
                    {'date': '2020-01-01', 'title': 'Project Start', 'description': 'Project initiated'},
                    {'date': '2020-06-01', 'title': 'Milestone 1', 'description': 'First major milestone'},
                    {'date': '2020-12-01', 'title': 'Completion', 'description': 'Project completed'}
                ]
            },
            'generation_prompts': {
                'chronology': 'Create timeline from chronological information',
                'milestones': 'Identify key milestones and events'
            },
            'content_keywords': ['timeline', 'chronology', 'history', 'events', 'milestones'],
            'is_premium': False,
            'is_active': True
        }
    ]
    
    for template_data in chart_templates:
        ChartTemplate.objects.create(**template_data)

def reverse_templates(apps, schema_editor):
    PresentationTemplate = apps.get_model('users', 'PresentationTemplate')
    ChartTemplate = apps.get_model('users', 'ChartTemplate')
    
    PresentationTemplate.objects.all().delete()
    ChartTemplate.objects.all().delete()

class Migration(migrations.Migration):
    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_initial_templates, reverse_templates),
    ]