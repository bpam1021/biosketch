# Generated migration for enhanced presentation system

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0010_enhanced_presentation_features'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='presentation',
            name='document_content',
            field=models.TextField(blank=True, help_text='Rich HTML content for document type'),
        ),
        migrations.AddField(
            model_name='presentation',
            name='document_settings',
            field=models.JSONField(blank=True, default=dict, help_text='Document formatting settings'),
        ),
        migrations.AddField(
            model_name='presentation',
            name='is_public',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='presentation',
            name='allow_comments',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='presentation',
            name='collaborators',
            field=models.ManyToManyField(blank=True, related_name='collaborated_presentations', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='presentation',
            name='is_template',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='presentation',
            name='template_category',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='slide',
            name='content_blocks',
            field=models.JSONField(blank=True, default=list, help_text='Structured content blocks'),
        ),
        migrations.AddField(
            model_name='slide',
            name='interactive_elements',
            field=models.JSONField(blank=True, default=list, help_text='Interactive elements like buttons, links'),
        ),
        migrations.AddField(
            model_name='slide',
            name='layout_template',
            field=models.CharField(blank=True, help_text='Layout template name', max_length=50),
        ),
        migrations.AddField(
            model_name='slide',
            name='custom_css',
            field=models.TextField(blank=True, help_text='Custom CSS for this slide/section'),
        ),
        migrations.AddField(
            model_name='slide',
            name='background_settings',
            field=models.JSONField(blank=True, default=dict, help_text='Background color, image, gradient'),
        ),
        migrations.AddField(
            model_name='slide',
            name='comments',
            field=models.JSONField(blank=True, default=list, help_text='Comments on this slide/section'),
        ),
        migrations.AddField(
            model_name='slide',
            name='version_history',
            field=models.JSONField(blank=True, default=list, help_text='Version history for tracking changes'),
        ),
        migrations.AddField(
            model_name='slide',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AlterField(
            model_name='presentation',
            name='export_format',
            field=models.CharField(blank=True, choices=[('pptx', 'PowerPoint'), ('pdf', 'PDF'), ('mp4', 'Video'), ('docx', 'Word Document')], max_length=10),
        ),
        migrations.AlterField(
            model_name='slide',
            name='content_type',
            field=models.CharField(choices=[('slide', 'Presentation Slide'), ('section', 'Document Section')], default='slide', max_length=20),
        ),
    ]