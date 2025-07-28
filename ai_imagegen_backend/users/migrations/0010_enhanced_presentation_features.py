# Generated migration for enhanced presentation features

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0009_alter_presentation_export_format'),
    ]

    operations = [
        migrations.AddField(
            model_name='presentation',
            name='presentation_type',
            field=models.CharField(
                choices=[('slides', 'Slides'), ('document', 'Document')],
                default='slides',
                max_length=20
            ),
        ),
        migrations.AddField(
            model_name='presentation',
            name='video_settings',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='slide',
            name='content_type',
            field=models.CharField(
                choices=[('slide', 'Slide'), ('document', 'Document')],
                default='slide',
                max_length=20
            ),
        ),
        migrations.AddField(
            model_name='slide',
            name='rich_content',
            field=models.TextField(blank=True, help_text='Rich HTML content for document type'),
        ),
        migrations.AddField(
            model_name='slide',
            name='diagrams',
            field=models.JSONField(blank=True, default=list, help_text='Diagram elements data'),
        ),
        migrations.AddField(
            model_name='slide',
            name='animations',
            field=models.JSONField(blank=True, default=list, help_text='Animation configurations'),
        ),
    ]