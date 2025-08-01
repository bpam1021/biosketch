# Generated migration for RNA-seq models

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('users', '0010_enhanced_presentation_features'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='RNASeqDataset',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True)),
                ('counts_file', models.FileField(blank=True, null=True, upload_to='rnaseq/counts/')),
                ('metadata_file', models.FileField(blank=True, null=True, upload_to='rnaseq/metadata/')),
                ('organism', models.CharField(default='human', max_length=100)),
                ('analysis_type', models.CharField(choices=[('differential', 'Differential Expression'), ('pathway', 'Pathway Analysis'), ('clustering', 'Clustering Analysis'), ('volcano', 'Volcano Plot'), ('heatmap', 'Heatmap')], default='differential', max_length=50)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('processing', 'Processing'), ('completed', 'Completed'), ('failed', 'Failed')], default='pending', max_length=20)),
                ('results_file', models.FileField(blank=True, null=True, upload_to='rnaseq/results/')),
                ('visualization_image', models.ImageField(blank=True, null=True, upload_to='rnaseq/visualizations/')),
                ('ai_interpretation', models.TextField(blank=True, help_text='AI-generated interpretation of results')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='rnaseq_datasets', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='RNASeqPresentation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('slide_order', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('dataset', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='rnaseq.rnaseqdataset')),
                ('presentation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='users.presentation')),
            ],
            options={
                'ordering': ['slide_order'],
            },
        ),
        migrations.CreateModel(
            name='RNASeqAnalysisResult',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('gene_id', models.CharField(max_length=100)),
                ('gene_name', models.CharField(blank=True, max_length=100)),
                ('log2_fold_change', models.FloatField(blank=True, null=True)),
                ('p_value', models.FloatField(blank=True, null=True)),
                ('adjusted_p_value', models.FloatField(blank=True, null=True)),
                ('base_mean', models.FloatField(blank=True, null=True)),
                ('chromosome', models.CharField(blank=True, max_length=10)),
                ('gene_type', models.CharField(blank=True, max_length=50)),
                ('description', models.TextField(blank=True)),
                ('dataset', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='analysis_results', to='rnaseq.rnaseqdataset')),
            ],
        ),
        migrations.AddIndex(
            model_name='rnaseqanalysisresult',
            index=models.Index(fields=['gene_id'], name='rnaseq_rnas_gene_id_8a5c4e_idx'),
        ),
        migrations.AddIndex(
            model_name='rnaseqanalysisresult',
            index=models.Index(fields=['p_value'], name='rnaseq_rnas_p_value_9b2d1f_idx'),
        ),
        migrations.AddIndex(
            model_name='rnaseqanalysisresult',
            index=models.Index(fields=['log2_fold_change'], name='rnaseq_rnas_log2_fo_4c8e2a_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='rnaseqpresentation',
            unique_together={('dataset', 'presentation')},
        ),
        migrations.AlterUniqueTogether(
            name='rnaseqanalysisresult',
            unique_together={('dataset', 'gene_id')},
        ),
    ]