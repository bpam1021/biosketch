# Generated migration to add DiagramElement ManyToMany relationships

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_handle_slide_model_fields'),  # After Document and Slide models are created
    ]

    operations = [
        # Add ManyToMany fields now that Document and Slide models exist
        migrations.AddField(
            model_name='diagramelement',
            name='used_in_documents',
            field=models.ManyToManyField('users.Document', blank=True),
        ),
        
        migrations.AddField(
            model_name='diagramelement',
            name='used_in_slides',
            field=models.ManyToManyField('users.Slide', blank=True, related_name='diagram_elements'),
        ),
    ]