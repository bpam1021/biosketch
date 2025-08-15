from rest_framework import serializers
from .models import (
    RNASeqDataset, RNASeqAnalysisResult, RNASeqPresentation, AnalysisJob, PipelineStep,
    RNASeqCluster, RNASeqPathwayResult, RNASeqAIChat
)
from users.models import Presentation

class PipelineStepSerializer(serializers.ModelSerializer):
    duration_minutes = serializers.SerializerMethodField()
    
    class Meta:
        model = PipelineStep
        fields = [
            'step_number', 'step_name', 'status', 'input_files', 'output_files',
            'parameters', 'metrics', 'started_at', 'completed_at', 'duration_minutes',
            'error_message'
        ]
    
    def get_duration_minutes(self, obj):
        if obj.duration_seconds:
            return round(obj.duration_seconds / 60, 2)
        return 0

class AnalysisJobSerializer(serializers.ModelSerializer):
    pipeline_steps = PipelineStepSerializer(many=True, read_only=True)
    duration_minutes = serializers.SerializerMethodField()
    
    class Meta:
        model = AnalysisJob
        fields = [
            'id', 'analysis_type', 'status', 'current_step', 'current_step_name',
            'progress_percentage', 'total_steps',
            'job_config', 'user_hypothesis', 'current_user_input', 'waiting_for_input',
            'enable_ai_interpretation',
            'num_samples', 'total_reads', 'mapped_reads', 'alignment_rate',
            'genes_quantified', 'cells_detected', 'cell_clusters', 
            'significant_genes', 'enriched_pathways', 'duration_minutes',
            'error_message', 'created_at', 'started_at', 'completed_at', 'updated_at',
            'pipeline_steps'
        ]
    
    def get_duration_minutes(self, obj):
        if obj.completed_at and obj.started_at:
            duration = obj.completed_at - obj.started_at
            return int(duration.total_seconds() / 60)
        return 0

class RNASeqDatasetSerializer(serializers.ModelSerializer):
    current_job = serializers.SerializerMethodField()
    results_count = serializers.SerializerMethodField()
    clusters_count = serializers.SerializerMethodField()
    pathways_count = serializers.SerializerMethodField()
    
    class Meta:
        model = RNASeqDataset
        fields = [
            'id', 'name', 'description', 'dataset_type', 'organism', 
            'selected_pipeline_stage', 'status', 'is_multi_sample', 'sample_count',
            'fastq_files', 'metadata_file', 'expression_matrix',
            'upstream_results', 'downstream_results', 'analysis_plots',
            'ai_chat_history', 'processing_config',
            'created_at', 'updated_at', 'current_job',
            'results_count', 'clusters_count', 'pathways_count'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'status', 'upstream_results',
            'downstream_results', 'analysis_plots', 'current_job'
        ]
    
    def get_current_job(self, obj):
        job = obj.get_current_job
        if job:
            return AnalysisJobSerializer(job).data
        return None
    
    def get_results_count(self, obj):
        return obj.analysis_results.count()
    
    def get_clusters_count(self, obj):
        return obj.clusters.count()
    
    def get_pathways_count(self, obj):
        return obj.pathway_results.count()

class UpstreamProcessSerializer(serializers.Serializer):
    """
    Serializer for upstream processing configuration
    """
    reference_genome = serializers.CharField(max_length=100, default='hg38')
    processing_threads = serializers.IntegerField(default=4, min_value=1, max_value=16)
    memory_limit = serializers.CharField(max_length=10, default='8G')

class DownstreamAnalysisSerializer(serializers.Serializer):
    """
    Serializer for downstream analysis configuration
    """
    analysis_type = serializers.ChoiceField(choices=[
        ('differential_expression', 'Differential Expression'),
        ('clustering_pca', 'Clustering & PCA'),
        ('pathway_enrichment', 'Pathway Enrichment'),
        ('cell_type_annotation', 'Cell Type Annotation'),  # scRNA-seq only
        ('trajectory_analysis', 'Trajectory Analysis'),    # scRNA-seq only
    ])
    comparison_groups = serializers.JSONField(required=False, default=dict)
    statistical_thresholds = serializers.JSONField(required=False, default=dict)

class RNASeqAnalysisResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = RNASeqAnalysisResult
        fields = [
            'gene_id', 'gene_name', 'log2_fold_change', 'p_value',
            'adjusted_p_value', 'base_mean', 'chromosome', 'gene_type', 'description',
            'cluster', 'cell_type', 'avg_log2fc', 'pct_1', 'pct_2'
        ]

class RNASeqClusterSerializer(serializers.ModelSerializer):
    class Meta:
        model = RNASeqCluster
        fields = [
            'cluster_id', 'cluster_name', 'cell_type', 'cell_count',
            'marker_genes', 'coordinates'
        ]

class RNASeqPathwayResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = RNASeqPathwayResult
        fields = [
            'pathway_id', 'pathway_name', 'database', 'p_value',
            'adjusted_p_value', 'gene_count', 'gene_list', 'enrichment_score'
        ]

class RNASeqAIChatSerializer(serializers.ModelSerializer):
    class Meta:
        model = RNASeqAIChat
        fields = [
            'id', 'user_message', 'ai_response', 'context_data', 'created_at'
        ]
        read_only_fields = ['id', 'ai_response', 'created_at']

class RNASeqPresentationSerializer(serializers.ModelSerializer):
    dataset_name = serializers.CharField(source='dataset.name', read_only=True)
    presentation_title = serializers.CharField(source='presentation.title', read_only=True)
    
    class Meta:
        model = RNASeqPresentation
        fields = ['id', 'dataset', 'presentation', 'dataset_name', 'presentation_title', 'created_at']

class CreateRNASeqPresentationSerializer(serializers.Serializer):
    """
    Serializer for creating a presentation from RNA-seq analysis
    """
    dataset_id = serializers.UUIDField()
    title = serializers.CharField(max_length=255)
    include_methods = serializers.BooleanField(default=True)
    include_results = serializers.BooleanField(default=True)
    include_discussion = serializers.BooleanField(default=True)
    quality = serializers.ChoiceField(choices=['low', 'medium', 'high'], default='medium')

class MultiSampleUploadSerializer(serializers.Serializer):
    """
    Serializer for multi-sample dataset upload
    """
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    dataset_type = serializers.ChoiceField(choices=RNASeqDataset.DATASET_TYPES)
    organism = serializers.CharField(max_length=100, default='human')
    selected_pipeline_stage = serializers.ChoiceField(choices=RNASeqDataset.PIPELINE_STAGES)
    fastq_files = serializers.ListField(
        child=serializers.FileField(),
        required=False,
        help_text="Multiple FASTQ file pairs for upstream processing"
    )
    expression_matrix = serializers.FileField(required=False, help_text="Expression matrix for downstream analysis")
    metadata_file = serializers.FileField(required=False)

class AIChatRequestSerializer(serializers.Serializer):
    """
    Serializer for AI chat requests
    """
    dataset_id = serializers.UUIDField()
    user_message = serializers.CharField()
    context_type = serializers.ChoiceField(choices=[
        ('general', 'General Question'),
        ('results_interpretation', 'Results Interpretation'),
        ('methodology', 'Methodology Question'),
        ('troubleshooting', 'Troubleshooting'),
    ], default='general')