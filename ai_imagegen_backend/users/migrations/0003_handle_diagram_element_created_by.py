# Generated migration to handle DiagramElement created_by field

from django.db import migrations, models
import django.db.models.deletion
from django.contrib.auth.models import User


def assign_default_user_to_diagrams(apps, schema_editor):
    """
    Custom migration to assign a default user to existing DiagramElement records.
    """
    DiagramElement = apps.get_model('users', 'DiagramElement')
    User = apps.get_model('auth', 'User')
    
    # Get existing diagram elements count
    diagram_count = DiagramElement.objects.count()
    
    if diagram_count > 0:
        # Try to get a superuser first, or any user, or create one
        default_user = User.objects.filter(is_superuser=True).first()
        if not default_user:
            default_user = User.objects.first()
        
        if not default_user:
            # Create a system user if no users exist
            default_user = User.objects.create_user(
                username='system',
                email='system@example.com',
                password='temp_system_pass123',
                is_staff=True,
                is_superuser=True
            )
            print(f"Created system user for diagram migration")
        
        # Update all existing DiagramElement records
        updated_count = DiagramElement.objects.filter(created_by__isnull=True).update(
            created_by=default_user
        )
        
        print(f"Assigned default user (ID: {default_user.id}) to {updated_count} existing diagram elements")


def reverse_migration(apps, schema_editor):
    """
    Reverse migration - set created_by to null if we need to reverse
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),  # Ensure auth migrations run first
        ('users', '0002_alter_contentsection_image_url'),  # Previous users migration
    ]

    operations = [
        # Add all missing DiagramElement fields with proper defaults
        
        # Text fields with empty string defaults
        migrations.AddField(
            model_name='diagramelement',
            name='original_content',
            field=models.TextField(default=''),
        ),
        
        migrations.AddField(
            model_name='diagramelement',
            name='source_text',
            field=models.TextField(default=''),
        ),
        
        migrations.AddField(
            model_name='diagramelement',
            name='generation_prompt',
            field=models.TextField(default=''),
        ),
        
        migrations.AddField(
            model_name='diagramelement',
            name='svg_data',
            field=models.TextField(blank=True, default=''),
        ),
        
        # JSON fields with empty dict/list defaults
        migrations.AddField(
            model_name='diagramelement',
            name='ai_interpretation',
            field=models.JSONField(default=dict),
        ),
        
        migrations.AddField(
            model_name='diagramelement',
            name='canvas_data',
            field=models.JSONField(default=dict),
        ),
        
        migrations.AddField(
            model_name='diagramelement',
            name='alternative_suggestions',
            field=models.JSONField(default=list),
        ),
        
        migrations.AddField(
            model_name='diagramelement',
            name='data_extraction',
            field=models.JSONField(default=dict),
        ),
        
        migrations.AddField(
            model_name='diagramelement',
            name='replaces_text_range',
            field=models.JSONField(default=dict),
        ),
        
        migrations.AddField(
            model_name='diagramelement',
            name='accessibility_features',
            field=models.JSONField(default=dict),
        ),
        
        migrations.AddField(
            model_name='diagramelement',
            name='export_formats',
            field=models.JSONField(default=list),
        ),
        
        # CharField with default
        migrations.AddField(
            model_name='diagramelement',
            name='replacement_type',
            field=models.CharField(
                max_length=50, 
                choices=[
                    ('inline', 'Inline Replacement'),
                    ('block', 'Block Replacement'),
                    ('sidebar', 'Sidebar Addition'),
                    ('popup', 'Popup/Modal'),
                ], 
                default='inline'
            ),
        ),
        
        # BooleanField defaults
        migrations.AddField(
            model_name='diagramelement',
            name='auto_layout',
            field=models.BooleanField(default=True),
        ),
        
        migrations.AddField(
            model_name='diagramelement',
            name='smart_labeling',
            field=models.BooleanField(default=True),
        ),
        
        migrations.AddField(
            model_name='diagramelement',
            name='auto_update',
            field=models.BooleanField(default=False),
        ),
        
        migrations.AddField(
            model_name='diagramelement',
            name='smart_resize',
            field=models.BooleanField(default=True),
        ),
        
        migrations.AddField(
            model_name='diagramelement',
            name='high_res_available',
            field=models.BooleanField(default=True),
        ),
        
        # Integer fields with defaults
        migrations.AddField(
            model_name='diagramelement',
            name='usage_count',
            field=models.IntegerField(default=0),
        ),
        
        # URL field (nullable)
        migrations.AddField(
            model_name='diagramelement',
            name='image_url',
            field=models.URLField(null=True, blank=True),
        ),
        
        # First, add the created_by field as nullable
        migrations.AddField(
            model_name='diagramelement',
            name='created_by',
            field=models.ForeignKey(
                null=True,  # Temporarily nullable
                on_delete=django.db.models.deletion.CASCADE,
                to='auth.user'
            ),
        ),
        
        # Run the custom data migration to assign default users
        migrations.RunPython(
            assign_default_user_to_diagrams,
            reverse_migration,
        ),
        
        # Now make the created_by field non-nullable
        migrations.AlterField(
            model_name='diagramelement',
            name='created_by',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                to='auth.user'
            ),
        ),
        
        # Handle field renames mentioned in the migration prompt
        migrations.RenameField(
            model_name='diagramelement',
            old_name='position_x',
            new_name='confidence_score',
        ),
        
        migrations.RenameField(
            model_name='slide',
            old_name='canvas_json',
            new_name='notes',
        ),
        
        # Note: ManyToMany fields will be added in a later migration
        # after Document and Slide models are created
    ]