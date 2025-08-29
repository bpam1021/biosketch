from rest_framework import serializers
from .models import (
    AnalysisJob, RNASeqAnalysisResult, RNASeqPresentation,
    RNASeqCluster, RNASeqPathwayResult, RNASeqAIChat, PipelineStep
)

class PipelineStepSerializer(serializers.ModelSerializer):
    """Serializer for pipeline steps"""
    class Meta:
        model = PipelineStep
        fields = [
            'step_number', 'step_name', 'status', 'started_at', 
            'completed_at', 'duration_seconds', 'metrics',
            'input_files', 'output_files', 'parameters', 'error_message'
        ]

class AnalysisJobSerializer(serializers.ModelSerializer):
    duration_minutes = serializers.SerializerMethodField()
    results_count = serializers.SerializerMethodField()
    clusters_count = serializers.SerializerMethodField()
    pathways_count = serializers.SerializerMethodField()
    available_files = serializers.SerializerMethodField()
    pipeline_steps = PipelineStepSerializer(many=True, read_only=True)
    
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
            'upstream_results', 'downstream_results', 'analysis_plots', 'alignment_stats',
            'ai_chat_history', 'user_hypothesis', 'current_user_input', 
            'waiting_for_input', 'enable_ai_interpretation',
            'error_message', 'created_at', 'started_at', 'completed_at', 'updated_at',
            'duration_minutes', 'results_count', 'clusters_count', 'pathways_count',
            'available_files', 'pipeline_steps'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'duration_minutes',
            'results_count', 'clusters_count', 'pathways_count', 'available_files',
            'pipeline_steps'
        ]
    
    def get_duration_minutes(self, obj):
        return obj.duration_minutes
    
    def get_results_count(self, obj):
        return obj.results_count
    
    def get_clusters_count(self, obj):
        return obj.clusters_count
    
    def get_pathways_count(self, obj):
        return obj.pathways_count
    
    def get_available_files(self, obj):
        return obj.get_available_files()

class CreateAnalysisJobSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new RNA-seq analysis jobs
    """
    class Meta:
        model = AnalysisJob
        fields = [
            'name', 'description', 'dataset_type', 'organism', 
            'selected_pipeline_stage', 'is_multi_sample', 'sample_count',
            'user_hypothesis', 'enable_ai_interpretation', 'processing_config'
        ]
    
    def validate(self, data):
        """Validate job creation data"""
        if data.get('is_multi_sample') and data.get('sample_count', 0) < 2:
            raise serializers.ValidationError("Multi-sample analysis requires at least 2 samples")
        
        return data

class UpstreamProcessSerializer(serializers.Serializer):
    """
    Serializer for upstream processing configuration
    """
    reference_genome = serializers.ChoiceField(
        choices=[('hg38', 'Human GRCh38'), ('hg19', 'Human GRCh37'), 
                ('mm10', 'Mouse GRCm38'), ('rn6', 'Rat Rnor6.0')],
        default='hg38'
    )
    processing_threads = serializers.IntegerField(default=8, min_value=1, max_value=32)
    memory_limit = serializers.CharField(max_length=10, default='32G')
    quality_threshold = serializers.IntegerField(default=20, min_value=15, max_value=40)
    min_read_length = serializers.IntegerField(default=30, min_value=20, max_value=100)
    
    def validate_memory_limit(self, value):
        """Validate memory limit format"""
        if not value.endswith('G') and not value.endswith('M'):
            raise serializers.ValidationError("Memory limit must end with 'G' or 'M'")
        try:
            int(value[:-1])
        except ValueError:
            raise serializers.ValidationError("Invalid memory limit format")
        return value

class DownstreamAnalysisSerializer(serializers.Serializer):
    """
    Serializer for downstream analysis configuration
    """
    comparison_groups = serializers.JSONField(
        required=False, 
        default=dict,
        help_text="Define sample groups for comparison (e.g., {'control': ['sample1', 'sample2'], 'treatment': ['sample3', 'sample4']})"
    )
    statistical_thresholds = serializers.JSONField(
        required=False, 
        default=dict,
        help_text="Statistical thresholds for analysis"
    )
    fdr_threshold = serializers.FloatField(default=0.05, min_value=0.001, max_value=0.1)
    log2fc_threshold = serializers.FloatField(default=1.0, min_value=0.1, max_value=5.0)
    min_expression = serializers.FloatField(default=1.0, min_value=0.1, max_value=10.0)
    pathway_databases = serializers.MultipleChoiceField(
        choices=[
            ('GO_Biological_Process_2023', 'Gene Ontology Biological Process'),
            ('KEGG_2021_Human', 'KEGG Pathways'),
            ('Reactome_2022', 'Reactome Pathways'),
            ('MSigDB_Hallmark_2020', 'MSigDB Hallmark'),
            ('WikiPathways_2023_Human', 'WikiPathways')
        ],
        default=['GO_Biological_Process_2023', 'KEGG_2021_Human'],
        required=False
    )
    
    def validate_comparison_groups(self, value):
        """Validate comparison groups format"""
        if value and not isinstance(value, dict):
            raise serializers.ValidationError("Comparison groups must be a dictionary")
        
        if value and len(value) < 2:
            raise serializers.ValidationError("At least 2 comparison groups are required")
        
        return value

class RNASeqAnalysisResultSerializer(serializers.ModelSerializer):
    """Serializer for analysis results with enhanced filtering"""
    
    class Meta:
        model = RNASeqAnalysisResult
        fields = [
            'gene_id', 'gene_name', 'log2_fold_change', 'p_value',
            'adjusted_p_value', 'base_mean', 'chromosome', 'gene_type', 'description',
            'cluster', 'cell_type', 'avg_log2fc', 'pct_1', 'pct_2'
        ]

class RNASeqClusterSerializer(serializers.ModelSerializer):
    """Serializer for single-cell clusters"""
    
    class Meta:
        model = RNASeqCluster
        fields = [
            'cluster_id', 'cluster_name', 'cell_type', 'cell_count',
            'marker_genes', 'coordinates', 'cluster_metadata', 'quality_metrics'
        ]

class RNASeqPathwayResultSerializer(serializers.ModelSerializer):
    """Serializer for pathway enrichment results"""
    
    class Meta:
        model = RNASeqPathwayResult
        fields = [
            'pathway_id', 'pathway_name', 'database', 'p_value',
            'adjusted_p_value', 'gene_count', 'gene_list', 'enrichment_score',
            'pathway_description', 'pathway_category'
        ]

class RNASeqAIChatSerializer(serializers.ModelSerializer):
    """Serializer for AI chat interactions"""
    
    class Meta:
        model = RNASeqAIChat
        fields = [
            'id', 'user_message', 'ai_response', 'context_data', 
            'context_type', 'confidence_score', 'is_auto_generated', 'created_at'
        ]
        read_only_fields = ['id', 'ai_response', 'confidence_score', 'created_at']

class RNASeqPresentationSerializer(serializers.ModelSerializer):
    """Serializer for RNA-seq presentations"""
    job_name = serializers.CharField(source='job.name', read_only=True)
    document_title = serializers.CharField(source='document.title', read_only=True)
    document_id = serializers.UUIDField(source='document.id', read_only=True)
    
    class Meta:
        model = RNASeqPresentation
        fields = [
            'id', 'job', 'document', 'job_name', 'document_title', 
            'document_id', 'included_sections', 'quality_level', 'created_at'
        ]

class CreateRNASeqPresentationSerializer(serializers.Serializer):
    """
    Serializer for creating a presentation from RNA-seq analysis
    """
    job_id = serializers.UUIDField()
    title = serializers.CharField(max_length=255)
    include_methods = serializers.BooleanField(default=True)
    include_results = serializers.BooleanField(default=True)
    include_discussion = serializers.BooleanField(default=True)
    include_quality_metrics = serializers.BooleanField(default=True)
    quality = serializers.ChoiceField(choices=['low', 'medium', 'high'], default='medium')
    
    def validate_title(self, value):
        """Validate presentation title"""
        if len(value.strip()) < 3:
            raise serializers.ValidationError("Title must be at least 3 characters long")
        return value.strip()

class MultiSampleUploadSerializer(serializers.Serializer):
    """
    Serializer for multi-sample dataset upload with enhanced validation
    """
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    dataset_type = serializers.ChoiceField(choices=AnalysisJob.DATASET_TYPES)
    organism = serializers.ChoiceField(
        choices=[('human', 'Human'), ('mouse', 'Mouse'), ('rat', 'Rat')],
        default='human'
    )
    selected_pipeline_stage = serializers.ChoiceField(choices=AnalysisJob.PIPELINE_STAGES)
    is_multi_sample = serializers.BooleanField(default=False)
    user_hypothesis = serializers.CharField(required=False, allow_blank=True)
    enable_ai_interpretation = serializers.BooleanField(default=True)
    
    # Processing configuration
    processing_config = serializers.JSONField(required=False, default=dict)
    
    def validate_name(self, value):
        """Validate job name"""
        if len(value.strip()) < 3:
            raise serializers.ValidationError("Name must be at least 3 characters long")
        return value.strip()
    
    def validate(self, data):
        """Cross-field validation"""
        if data.get('is_multi_sample') and data.get('selected_pipeline_stage') == 'upstream':
            # Will be validated in the view for file requirements
            pass
        
        return data

class AIChatRequestSerializer(serializers.Serializer):
    """
    Serializer for AI chat requests with enhanced context handling
    """
    job_id = serializers.UUIDField()
    user_message = serializers.CharField(max_length=2000)
    context_type = serializers.ChoiceField(
        choices=[
            ('general', 'General Question'),
            ('results_interpretation', 'Results Interpretation'),
            ('methodology', 'Methodology Question'),
            ('troubleshooting', 'Troubleshooting'),
            ('hypothesis_generation', 'Hypothesis Generation'),
            ('statistical_help', 'Statistical Analysis Help'),
            ('visualization_help', 'Visualization Help'),
            ('pathway_interpretation', 'Pathway Analysis Help'),
        ], 
        default='general'
    )
    include_job_context = serializers.BooleanField(default=True)
    
    def validate_user_message(self, value):
        """Validate user message"""
        if len(value.strip()) < 5:
            raise serializers.ValidationError("Message must be at least 5 characters long")
        return value.strip()

class JobStatusSerializer(serializers.Serializer):
    """
    Serializer for job status responses
    """
    job_id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    dataset_type = serializers.CharField(read_only=True)
    selected_pipeline_stage = serializers.CharField(read_only=True)
    
    # Progress information
    current_step = serializers.IntegerField(read_only=True)
    current_step_name = serializers.CharField(read_only=True)
    progress_percentage = serializers.IntegerField(read_only=True)
    total_steps = serializers.IntegerField(read_only=True)
    
    # Results metrics
    results_count = serializers.IntegerField(read_only=True)
    clusters_count = serializers.IntegerField(read_only=True)
    pathways_count = serializers.IntegerField(read_only=True)
    
    # Available actions
    available_actions = serializers.ListField(read_only=True)
    available_files = serializers.DictField(read_only=True)
    
    # Error information
    error_message = serializers.CharField(read_only=True, allow_null=True)
    
    # Timestamps
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    duration_minutes = serializers.IntegerField(read_only=True)

class BulkRNASeqPipelineInfoSerializer(serializers.Serializer):
    """
    Serializer for bulk RNA-seq pipeline information
    """
    job = AnalysisJobSerializer(read_only=True)
    pipeline_info = serializers.DictField(read_only=True)
    configuration = serializers.DictField(read_only=True)
    ai_chats = RNASeqAIChatSerializer(many=True, read_only=True)

class SingleCellRNASeqPipelineInfoSerializer(serializers.Serializer):
    """
    Serializer for single-cell RNA-seq pipeline information
    """
    job = AnalysisJobSerializer(read_only=True)
    pipeline_info = serializers.DictField(read_only=True)
    configuration = serializers.DictField(read_only=True)
    clusters = RNASeqClusterSerializer(many=True, read_only=True)
    ai_chats = RNASeqAIChatSerializer(many=True, read_only=True)

class AnalysisResultsFilterSerializer(serializers.Serializer):
    """
    Serializer for filtering analysis results
    """
    significant_only = serializers.BooleanField(default=False)
    cluster = serializers.CharField(required=False, allow_blank=True)
    min_log2fc = serializers.FloatField(required=False, min_value=0)
    max_pvalue = serializers.FloatField(required=False, min_value=0, max_value=1)
    gene_name_filter = serializers.CharField(required=False, allow_blank=True)
    
class PathwayResultsFilterSerializer(serializers.Serializer):
    """
    Serializer for filtering pathway results
    """
    database = serializers.ChoiceField(
        choices=[
            ('GO', 'Gene Ontology'),
            ('KEGG', 'KEGG'),
            ('REACTOME', 'Reactome'),
            ('HALLMARK', 'MSigDB Hallmark'),
            ('WIKIPATHWAYS', 'WikiPathways'),
        ],
        required=False
    )
    significant_only = serializers.BooleanField(default=False)
    min_gene_count = serializers.IntegerField(required=False, min_value=1)
    pathway_category = serializers.CharField(required=False, allow_blank=True)

# Error response serializers
class ErrorResponseSerializer(serializers.Serializer):
    """
    Serializer for error responses
    """
    error = serializers.CharField()
    details = serializers.DictField(required=False)
    timestamp = serializers.DateTimeField(read_only=True)

class SuccessResponseSerializer(serializers.Serializer):
    """
    Serializer for success responses
    """
    message = serializers.CharField()
    data = serializers.DictField(required=False)
    job_id = serializers.UUIDField(required=False)
    task_id = serializers.CharField(required=False)