# Generated migration to handle Slide model missing fields

from django.db import migrations, models
import django.db.models.deletion


def create_default_slide_template(apps, schema_editor):
    """
    Create a default slide template for existing slides
    """
    SlideTemplate = apps.get_model('users', 'SlideTemplate')
    Slide = apps.get_model('users', 'Slide')
    
    # Create a default template if none exists
    default_template, created = SlideTemplate.objects.get_or_create(
        name='Default Template',
        defaults={
            'layout_type': 'title_content',
            'zones': [
                {'id': 'title', 'type': 'text', 'x': 0, 'y': 0, 'width': 100, 'height': 20},
                {'id': 'content', 'type': 'text', 'x': 0, 'y': 25, 'width': 100, 'height': 70}
            ],
            'is_premium': False
        }
    )
    
    if created:
        print(f"Created default slide template: {default_template.name}")
    
    # Update all existing slides that don't have a template
    slides_updated = Slide.objects.filter(template__isnull=True).update(template=default_template)
    print(f"Assigned default template to {slides_updated} existing slides")


def reverse_migration(apps, schema_editor):
    """
    Reverse migration
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_handle_diagram_element_created_by'),
    ]

    operations = [
        # First, add the template field as nullable
        migrations.AddField(
            model_name='slide',
            name='template',
            field=models.ForeignKey(
                null=True,  # Temporarily nullable
                on_delete=django.db.models.deletion.CASCADE,
                to='users.slidetemplate'
            ),
        ),
        
        # Add other missing Slide fields
        migrations.AddField(
            model_name='slide',
            name='order',
            field=models.IntegerField(default=0),
        ),
        
        migrations.AddField(
            model_name='slide',
            name='content',
            field=models.JSONField(default=dict),
        ),
        
        migrations.AddField(
            model_name='slide',
            name='transition',
            field=models.CharField(max_length=50, blank=True),
        ),
        
        migrations.AddField(
            model_name='slide',
            name='duration',
            field=models.IntegerField(null=True),
        ),
        
        migrations.AddField(
            model_name='slide',
            name='background',
            field=models.JSONField(default=dict),
        ),
        
        # Run the custom data migration to create default templates
        migrations.RunPython(
            create_default_slide_template,
            reverse_migration,
        ),
        
        # Now make the template field non-nullable
        migrations.AlterField(
            model_name='slide',
            name='template',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                to='users.slidetemplate'
            ),
        ),
    ]