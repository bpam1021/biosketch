from rest_framework import serializers
from .models import (
    RNASeqDataset, RNASeqAnalysisResult, RNASeqPresentation, AnalysisJob, PipelineStep, AIInterpretation,
    RNASeqCluster, RNASeqPathwayResult, RNASeqAIInteraction
)
from users.models import Presentation

class PipelineStepSerializer(serializers.ModelSerializer):
    duration_minutes = serializers.SerializerMethodField()
    
    class Meta:
        model = PipelineStep
        fields = [
            'step_number', 'step_name', 'status', 'input_files', 'output_files',
            'parameters', 'metrics', 'started_at', 'completed_at', 'duration_minutes',
            'error_message', 'retry_count'
        ]
    
    def get_duration_minutes(self, obj):
        if obj.duration_seconds:
            return round(obj.duration_seconds / 60, 2)
        return 0

class AIInterpretationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIInterpretation
        fields = [
            'id', 'analysis_type', 'user_input', 'ai_response', 'context_data',
            'confidence_score', 'created_at'
        ]

class AnalysisJobSerializer(serializers.ModelSerializer):
    pipeline_steps = PipelineStepSerializer(many=True, read_only=True)
    ai_interpretations = AIInterpretationSerializer(many=True, read_only=True)
    duration_minutes = serializers.SerializerMethodField()
    
    class Meta:
        model = AnalysisJob
        fields = [
            'id', 'analysis_type', 'status', 'current_step', 'current_step_name',
            'progress_percentage', 'num_samples', 'total_reads', 'mapped_reads',
            'alignment_rate', 'genes_quantified', 'cells_detected', 'cell_clusters',
            'significant_genes', 'enriched_pathways', 'user_hypothesis',
            'waiting_for_input', 'enable_ai_interpretation', 'result_files',
            'error_message', 'created_at', 'started_at', 'completed_at',
            'duration_minutes', 'pipeline_steps', 'ai_interpretations'
        ]
    
    def get_duration_minutes(self, obj):
        if obj.started_at and obj.completed_at:
            duration = obj.completed_at - obj.started_at
            return round(duration.total_seconds() / 60, 2)
        return 0

class RNASeqDatasetSerializer(serializers.ModelSerializer):
    results_count = serializers.SerializerMethodField()
    clusters_count = serializers.SerializerMethodField()
    pathways_count = serializers.SerializerMethodField()
    current_job = AnalysisJobSerializer(source='get_current_job', read_only=True)
    job_progress = serializers.SerializerMethodField()
    
    class Meta:
        model = RNASeqDataset
        fields = [
            'id', 'name', 'description', 'dataset_type', 'organism', 'analysis_type',
            'status', 'start_from_upstream', 'fastq_r1_file', 'fastq_r2_file',
            'counts_file', 'metadata_file', 'expression_matrix_tpm', 'expression_matrix_counts',
            'results_file', 'visualization_image', 'ai_interpretation',
            'user_hypothesis', 'gene_signatures', 'phenotype_data',
            'is_multi_sample', 'sample_sheet', 'batch_id', 'processing_config', 'quality_thresholds',
            'created_at', 'updated_at', 'results_count', 'clusters_count', 'pathways_count',
            'current_job', 'job_progress'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'status', 'expression_matrix_tpm',
            'expression_matrix_counts', 'results_file', 'visualization_image', 'ai_interpretation',
            'current_job', 'job_progress'
        ]
    
    def get_results_count(self, obj):
        return obj.analysis_results.count()
    
    def get_clusters_count(self, obj):
        return obj.clusters.count()
    
    def get_pathways_count(self, obj):
        return obj.pathway_results.count()
    
    def get_job_progress(self, obj):
        return obj.get_job_progress()

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

class RNASeqAIInteractionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RNASeqAIInteraction
        fields = [
            'id', 'interaction_type', 'user_input', 'ai_response',
            'context_data', 'created_at'
        ]
        read_only_fields = ['id', 'ai_response', 'created_at']

class RNASeqPresentationSerializer(serializers.ModelSerializer):
    dataset_name = serializers.CharField(source='dataset.name', read_only=True)
    presentation_title = serializers.CharField(source='presentation.title', read_only=True)
    
    class Meta:
        model = RNASeqPresentation
        fields = ['id', 'dataset', 'presentation', 'slide_order', 'dataset_name', 'presentation_title', 'created_at']

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

class UpstreamProcessSerializer(serializers.Serializer):
    """
    Serializer for starting upstream processing
    """
    dataset_id = serializers.UUIDField()
    skip_qc = serializers.BooleanField(default=False)
    skip_trimming = serializers.BooleanField(default=False)
    reference_genome = serializers.CharField(max_length=100, default='hg38')
    quality_thresholds = serializers.JSONField(required=False, default=dict)
    processing_threads = serializers.IntegerField(default=4, min_value=1, max_value=16)
    memory_limit = serializers.CharField(max_length=10, default='8G')
    
class DownstreamAnalysisSerializer(serializers.Serializer):
    """
    Serializer for downstream analysis configuration
    """
    dataset_id = serializers.UUIDField()
    analysis_type = serializers.ChoiceField(choices=RNASeqDataset.ANALYSIS_TYPES)
    user_hypothesis = serializers.CharField(required=False, allow_blank=True)
    gene_signatures = serializers.ListField(child=serializers.CharField(), required=False)
    phenotype_columns = serializers.ListField(child=serializers.CharField(), required=False)
    comparison_groups = serializers.JSONField(required=False)
    clustering_resolution = serializers.FloatField(default=0.5, required=False)
    enable_ai_interpretation = serializers.BooleanField(default=True)
    statistical_thresholds = serializers.JSONField(required=False, default=dict)
    
class AIInteractionRequestSerializer(serializers.Serializer):
    """
    Serializer for AI interaction requests
    """
    dataset_id = serializers.UUIDField()
    interaction_type = serializers.ChoiceField(choices=RNASeqAIInteraction._meta.get_field('interaction_type').choices)
    user_input = serializers.CharField()
    context_data = serializers.JSONField(required=False, default=dict)

class JobStatusSerializer(serializers.Serializer):
    """
    Serializer for job status updates
    """
    job_id = serializers.UUIDField()
    user_input = serializers.CharField(required=False, allow_blank=True)
    continue_analysis = serializers.BooleanField(default=True)

class MultiSampleUploadSerializer(serializers.Serializer):
    """
    Serializer for multi-sample dataset upload
    """
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    dataset_type = serializers.ChoiceField(choices=RNASeqDataset.DATASET_TYPES)
    organism = serializers.CharField(max_length=100, default='human')
    sample_sheet = serializers.FileField()
    fastq_files = serializers.ListField(
        child=serializers.FileField(),
        required=False,
        help_text="Multiple FASTQ files for multi-sample analysis"
    )
    start_from_upstream = serializers.BooleanField(default=True)
    processing_config = serializers.JSONField(required=False, default=dict)