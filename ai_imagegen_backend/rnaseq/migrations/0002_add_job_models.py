# Generated migration for RNA-seq job tracking models

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('rnaseq', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AnalysisJob',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('analysis_type', models.CharField(choices=[('bulk_rnaseq', 'Bulk RNA-seq'), ('scrna_seq', 'Single-cell RNA-seq')], max_length=20)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('processing', 'Processing'), ('completed', 'Completed'), ('failed', 'Failed'), ('waiting_for_input', 'Waiting for User Input')], default='pending', max_length=30)),
                ('current_step', models.IntegerField(default=0)),
                ('current_step_name', models.CharField(blank=True, max_length=200)),
                ('progress_percentage', models.IntegerField(default=0)),
                ('job_config', models.JSONField(default=dict)),
                ('sample_files', models.JSONField(default=dict, help_text='Sample file paths and metadata')),
                ('sample_metadata', models.JSONField(default=dict, help_text='Sample metadata for analysis')),
                ('num_samples', models.IntegerField(default=0)),
                ('total_reads', models.BigIntegerField(default=0)),
                ('mapped_reads', models.BigIntegerField(default=0)),
                ('alignment_rate', models.FloatField(default=0.0)),
                ('genes_quantified', models.IntegerField(default=0)),
                ('cells_detected', models.IntegerField(default=0)),
                ('cell_clusters', models.IntegerField(default=0)),
                ('significant_genes', models.IntegerField(default=0)),
                ('enriched_pathways', models.IntegerField(default=0)),
                ('user_hypothesis', models.TextField(blank=True)),
                ('current_user_input', models.TextField(blank=True)),
                ('waiting_for_input', models.BooleanField(default=False)),
                ('enable_ai_interpretation', models.BooleanField(default=True)),
                ('result_files', models.JSONField(default=list, help_text='List of generated result files')),
                ('error_message', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('started_at', models.DateTimeField(blank=True, null=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('dataset', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='analysis_jobs', to='rnaseq.rnaseqdataset')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='rnaseq_jobs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='PipelineStep',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('step_number', models.IntegerField()),
                ('step_name', models.CharField(max_length=200)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('running', 'Running'), ('completed', 'Completed'), ('failed', 'Failed')], default='pending', max_length=20)),
                ('input_files', models.JSONField(default=list)),
                ('output_files', models.JSONField(default=list)),
                ('parameters', models.JSONField(default=dict)),
                ('metrics', models.JSONField(default=dict)),
                ('started_at', models.DateTimeField(blank=True, null=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('duration_seconds', models.IntegerField(default=0)),
                ('error_message', models.TextField(blank=True)),
                ('retry_count', models.IntegerField(default=0)),
                ('job', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='pipeline_steps', to='rnaseq.analysisjob')),
            ],
            options={
                'ordering': ['step_number'],
            },
        ),
        migrations.CreateModel(
            name='AIInterpretation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('analysis_type', models.CharField(choices=[('pca_clustering', 'PCA and Clustering'), ('differential_expression', 'Differential Expression'), ('pathway_enrichment', 'Pathway Enrichment'), ('cell_clustering', 'Cell Clustering'), ('cell_type_annotation', 'Cell Type Annotation'), ('quality_control', 'Quality Control')], max_length=50)),
                ('user_input', models.TextField(blank=True, help_text="User's question or hypothesis")),
                ('ai_response', models.TextField(help_text='AI-generated interpretation')),
                ('context_data', models.JSONField(default=dict, help_text='Analysis data used for interpretation')),
                ('confidence_score', models.FloatField(default=0.0, help_text='AI confidence in interpretation')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('job', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='ai_interpretations', to='rnaseq.analysisjob')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddField(
            model_name='rnaseqdataset',
            name='is_multi_sample',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='rnaseqdataset',
            name='sample_sheet',
            field=models.FileField(blank=True, null=True, upload_to='rnaseq/sample_sheets/'),
        ),
        migrations.AddField(
            model_name='rnaseqdataset',
            name='batch_id',
            field=models.CharField(blank=True, help_text='Batch identifier for multi-sample runs', max_length=100),
        ),
        migrations.AddField(
            model_name='rnaseqdataset',
            name='processing_config',
            field=models.JSONField(default=dict, help_text='Pipeline processing configuration'),
        ),
        migrations.AddField(
            model_name='rnaseqdataset',
            name='quality_thresholds',
            field=models.JSONField(default=dict, help_text='Quality control thresholds'),
        ),
        migrations.AlterUniqueTogether(
            name='pipelinestep',
            unique_together={('job', 'step_number')},
        ),
    ]