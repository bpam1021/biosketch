# Generated migration to handle RNASeqPresentation model change from presentation to document

from django.db import migrations, models
import django.db.models.deletion


def migrate_presentations_to_documents(apps, schema_editor):
    """
    Custom migration to handle the transition from presentation to document field.
    Since we're moving from old Presentation model to new Document model,
    we'll need to delete existing RNASeqPresentation records as they reference
    the old presentation system that was completely rebuilt.
    """
    RNASeqPresentation = apps.get_model('rnaseq', 'RNASeqPresentation')
    
    # Delete existing RNASeqPresentation records since they reference
    # the old presentation system that was completely rebuilt
    deleted_count = RNASeqPresentation.objects.count()
    RNASeqPresentation.objects.all().delete()
    
    print(f"Deleted {deleted_count} old RNASeqPresentation records due to model restructure")


def reverse_migration(apps, schema_editor):
    """
    Reverse migration - nothing to do since we deleted the data
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_handle_slide_model_fields'),  # Ensure all users migrations run first
        ('rnaseq', '0001_initial'),  # Previous rnaseq migration
    ]

    operations = [
        # First, remove the old presentation field
        migrations.RemoveField(
            model_name='rnaseqpresentation',
            name='presentation',
        ),
        
        # Run the custom data migration to clean up old records
        migrations.RunPython(
            migrate_presentations_to_documents,
            reverse_migration,
        ),
        
        # Add the new document field
        migrations.AddField(
            model_name='rnaseqpresentation',
            name='document',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                to='users.document'
            ),
        ),
        
        # Update the unique_together constraint
        migrations.AlterUniqueTogether(
            name='rnaseqpresentation',
            unique_together={('job', 'document')},
        ),
    ]