from rest_framework import serializers
from django.core.exceptions import ValidationError
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
    skip_qc = serializers.BooleanField(default=False)
    skip_trimming = serializers.BooleanField(default=False)
    reference_genome = serializers.CharField(max_length=100, default='hg38')
    quality_thresholds = serializers.JSONField(required=False, default=dict)
    processing_threads = serializers.IntegerField(default=4, min_value=1, max_value=16)
    memory_limit = serializers.CharField(max_length=10, default='8G')
    
    def validate(self, data):
        """Validate upstream processing configuration"""
        try:
            from .pipeline_core import MultiSampleBulkRNASeqPipeline, MultiSampleSingleCellRNASeqPipeline
            # Validate reference genome
            # Get supported genomes from pipeline
            test_pipeline = MultiSampleBulkRNASeqPipeline(organism='human')
            supported_genomes = test_pipeline.get_available_references('human')
            if data['reference_genome'] not in supported_genomes:
                raise ValidationError(f"Reference genome {data['reference_genome']} not supported. Available: {supported_genomes}")
            
            # Validate quality thresholds
            quality_thresholds = data.get('quality_thresholds', {})
            if quality_thresholds:
                # Get valid threshold keys from pipeline
                valid_keys = test_pipeline.get_valid_threshold_keys()
                for key in quality_thresholds.keys():
                    if key not in valid_keys:
                        raise ValidationError(f"Quality threshold {key} not supported. Valid keys: {valid_keys}")
                    if key in quality_thresholds and not isinstance(quality_thresholds[key], (int, float)):
                        raise ValidationError(f"Quality threshold {key} must be a number")
                        
        except Exception as e:
            raise ValidationError(f"Configuration validation failed: {str(e)}")
        
        return data
    
class DownstreamAnalysisSerializer(serializers.Serializer):
    """
    Serializer for downstream analysis configuration
    """
    analysis_type = serializers.ChoiceField(choices=RNASeqDataset.ANALYSIS_TYPES)
    user_hypothesis = serializers.CharField(required=False, allow_blank=True)
    gene_signatures = serializers.ListField(child=serializers.CharField(), required=False)
    phenotype_columns = serializers.ListField(child=serializers.CharField(), required=False)
    comparison_groups = serializers.JSONField(required=False)
    clustering_resolution = serializers.FloatField(default=0.5, required=False)
    enable_ai_interpretation = serializers.BooleanField(default=True)
    statistical_thresholds = serializers.JSONField(required=False, default=dict)
    
    def validate(self, data):
        """Validate downstream analysis configuration"""
        try:
            from .downstream_analysis import BulkRNASeqDownstreamAnalysis, SingleCellRNASeqDownstreamAnalysis
            # Validate statistical thresholds
            thresholds = data.get('statistical_thresholds', {})
            if thresholds:
                # Get valid threshold keys from analyzer
                if data['analysis_type'] in ['differential', 'clustering', 'pathway']:
                    test_analyzer = BulkRNASeqDownstreamAnalysis()
                else:
                    test_analyzer = SingleCellRNASeqDownstreamAnalysis()
                valid_keys = test_analyzer.get_valid_threshold_keys()
                for key, value in thresholds.items():
                    if key not in valid_keys:
                        raise ValidationError(f"Unknown threshold parameter: {key}. Valid keys: {valid_keys}")
                    if not isinstance(value, (int, float)):
                        raise ValidationError(f"Threshold {key} must be a number")
                        
        except Exception as e:
            raise ValidationError(f"Configuration validation failed: {str(e)}")
        
        return data
    
class AIInteractionRequestSerializer(serializers.Serializer):
    """
    Serializer for AI interaction requests
    """
    dataset_id = serializers.UUIDField()
    interaction_type = serializers.ChoiceField(choices=RNASeqAIInteraction._meta.get_field('interaction_type').choices)
    user_input = serializers.CharField()
    context_data = serializers.JSONField(required=False, default=dict)
    
    def validate(self, data):
        """Validate AI interaction request"""
        try:
            # Get dataset to validate against
            dataset = RNASeqDataset.objects.get(id=data['dataset_id'])
            
            # Check if dataset has sufficient data for AI interaction
            if dataset.status not in ['upstream_complete', 'completed']:
                raise ValidationError("Dataset must complete processing before AI interactions")
            
            # Validate interaction type for dataset type and analysis type
            valid_interactions = []
            if dataset.dataset_type == 'bulk':
                valid_interactions = ['hypothesis_request', 'result_interpretation', 'signature_analysis', 'pathway_interpretation']
            elif dataset.dataset_type == 'single_cell':
                valid_interactions = ['hypothesis_request', 'result_interpretation', 'cell_type_suggestion']
            
            if data['interaction_type'] not in valid_interactions:
                raise ValidationError(f"Interaction type {data['interaction_type']} not supported for {dataset.dataset_type} datasets")
                
        except RNASeqDataset.DoesNotExist:
            raise ValidationError("Dataset not found")
        except Exception as e:
            raise ValidationError(f"AI interaction validation failed: {str(e)}")
        
        return data

class JobStatusSerializer(serializers.Serializer):
    """
    Serializer for job status updates
    """
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
    start_from_upstream = serializers.BooleanField(default=True)
    processing_config = serializers.JSONField(required=False, default=dict)
    quality_thresholds = serializers.JSONField(required=False, default=dict)
    
    def validate(self, data):
        """Validate multi-sample upload configuration"""
        try:
            from .pipeline_core import MultiSampleBulkRNASeqPipeline, MultiSampleSingleCellRNASeqPipeline
            
            # Validate organism
            if data['dataset_type'] == 'bulk':
                pipeline = MultiSampleBulkRNASeqPipeline(organism=data['organism'])
            else:
                pipeline = MultiSampleSingleCellRNASeqPipeline(organism=data['organism'])
            
            supported_organisms = pipeline.get_supported_organisms()
            if data['organism'] not in supported_organisms:
                raise ValidationError(f"Organism {data['organism']} not supported. Available: {supported_organisms}")
            
            # Validate processing config
            processing_config = data.get('processing_config', {})
            if 'reference_genome' in processing_config:
                available_refs = pipeline.get_available_references(data['organism'])
                if processing_config['reference_genome'] not in available_refs:
                    raise ValidationError(f"Reference genome not available for {data['organism']}")
                    
        except Exception as e:
            raise ValidationError(f"Configuration validation failed: {str(e)}")
        
        return data