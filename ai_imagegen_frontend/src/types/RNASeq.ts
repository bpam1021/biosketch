from rest_framework import serializers
from .models import (
    RNASeqDataset, RNASeqAnalysisResult, RNASeqPresentation, AnalysisJob,
    RNASeqCluster, RNASeqPathwayResult, RNASeqAIChat
)
from users.models import Presentation

class AnalysisJobSerializer(serializers.ModelSerializer):
    duration_minutes = serializers.SerializerMethodField()
    results_count = serializers.SerializerMethodField()
    clusters_count = serializers.SerializerMethodField()
    pathways_count = serializers.SerializerMethodField()
    
    class Meta:
        model = AnalysisJob
        fields = [
            'id', 'name', 'description', 'dataset_type', 'organism', 
            'selected_pipeline_stage', 'status', 'is_multi_sample', 'sample_count',
            'fastq_files', 'metadata_file', 'expression_matrix', 'expression_matrix_output',
            'current_step', 'current_step_name', 'progress_percentage', 'total_steps',
            'job_config', 'processing_config',
            'num_samples', 'total_reads', 'mapped_reads', 'alignment_rate',
            'genes_quantified', 'cells_detected', 'cell_clusters', 
            'significant_genes', 'enriched_pathways',
            'results_file', 'visualization_image', 'qc_report',
            'ai_chat_history', 'user_hypothesis', 'current_user_input', 
            'waiting_for_input', 'enable_ai_interpretation',
            'error_message', 'created_at', 'started_at', 'completed_at', 'updated_at',
            'duration_minutes', 'results_count', 'clusters_count', 'pathways_count'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'status', 'duration_minutes',
            'results_count', 'clusters_count', 'pathways_count'
        ]
    
    def get_duration_minutes(self, obj):
        return obj.duration_minutes
    
    def get_results_count(self, obj):
        return obj.results_count
    
    def get_clusters_count(self, obj):
        return obj.clusters_count
    
    def get_pathways_count(self, obj):
        return obj.pathways_count

class CreateAnalysisJobSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new RNA-seq analysis jobs
    """
    class Meta:
        model = AnalysisJob
        fields = [
            'name', 'description', 'dataset_type', 'organism', 
            'selected_pipeline_stage', 'is_multi_sample', 'sample_count',
            'user_hypothesis', 'enable_ai_interpretation'
        ]

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
    job_name = serializers.CharField(source='job.name', read_only=True)
    presentation_title = serializers.CharField(source='presentation.title', read_only=True)
    
    class Meta:
        model = RNASeqPresentation
        fields = ['id', 'job', 'presentation', 'job_name', 'presentation_title', 'created_at']

class CreateRNASeqPresentationSerializer(serializers.Serializer):
    """
    Serializer for creating a presentation from RNA-seq analysis
    """
    job_id = serializers.UUIDField()
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
    dataset_type = serializers.ChoiceField(choices=AnalysisJob.DATASET_TYPES)
    organism = serializers.CharField(max_length=100, default='human')
    selected_pipeline_stage = serializers.ChoiceField(choices=AnalysisJob.PIPELINE_STAGES)
    is_multi_sample = serializers.BooleanField(default=False)
    fastq_files = serializers.ListField(
        child=serializers.FileField(),
        required=False,
        help_text="Multiple FASTQ file pairs for upstream processing"
    )
    expression_matrix = serializers.FileField(required=False, help_text="Expression matrix for downstream analysis")
    metadata_file = serializers.FileField(required=False)
    user_hypothesis = serializers.CharField(required=False, allow_blank=True)

class AIChatRequestSerializer(serializers.Serializer):
    """
    Serializer for AI chat requests
    """
    job_id = serializers.UUIDField()
    user_message = serializers.CharField()
    context_type = serializers.ChoiceField(choices=[
        ('general', 'General Question'),
        ('results_interpretation', 'Results Interpretation'),
        ('methodology', 'Methodology Question'),
        ('troubleshooting', 'Troubleshooting'),
    ], default='general')