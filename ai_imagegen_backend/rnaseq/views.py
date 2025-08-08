from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.db import transaction
from .models import (
    RNASeqDataset, RNASeqAnalysisResult, RNASeqPresentation, AnalysisJob, PipelineStep, AIInterpretation,
    RNASeqCluster, RNASeqPathwayResult, RNASeqAIInteraction
)
from .serializers import (
    RNASeqDatasetSerializer, RNASeqAnalysisResultSerializer,
    RNASeqPresentationSerializer, CreateRNASeqPresentationSerializer,
    RNASeqClusterSerializer, RNASeqPathwayResultSerializer,
    RNASeqAIInteractionSerializer, UpstreamProcessSerializer, AnalysisJobSerializer,
    DownstreamAnalysisSerializer, AIInteractionRequestSerializer, JobStatusSerializer,
    MultiSampleUploadSerializer, PipelineStepSerializer, AIInterpretationSerializer
)
from .tasks import (
    process_upstream_pipeline, process_downstream_analysis, create_rnaseq_presentation,
    process_ai_interaction, process_multi_sample_upload, generate_rnaseq_visualization
)
from users.views.credit_views import deduct_credit_for_presentation
import uuid
import logging

logger = logging.getLogger(__name__)

class StartMultiSampleProcessingView(APIView):
    """
    Start multi-sample processing for bulk or single-cell RNA-seq
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, dataset_id):
        dataset = get_object_or_404(RNASeqDataset, id=dataset_id, user=request.user)
        
        if not dataset.is_multi_sample:
            return Response(
                {'error': 'This endpoint is for multi-sample datasets only'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not dataset.sample_files_mapping:
            return Response(
                {'error': 'No sample files found for multi-sample processing'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get configuration from request
        config = {
            'skip_qc': request.data.get('skip_qc', False),
            'skip_trimming': request.data.get('skip_trimming', False),
            'reference_genome': request.data.get('reference_genome', 'hg38'),
            'quality_thresholds': request.data.get('quality_thresholds', {}),
            'processing_threads': request.data.get('processing_threads', 4),
            'memory_limit': request.data.get('memory_limit', '8G'),
            'multi_sample': True,
            'batch_processing': True,
        }
        
        # Validate multi-sample pipeline configuration using real classes
        try:
            from .pipeline_core import MultiSampleBulkRNASeqPipeline, MultiSampleSingleCellRNASeqPipeline
            
            if dataset.dataset_type == 'bulk':
                pipeline = MultiSampleBulkRNASeqPipeline(
                    organism=dataset.organism,
                    config=config
                )
            else:  # single_cell
                pipeline = MultiSampleSingleCellRNASeqPipeline(
                    organism=dataset.organism,
                    config=config
                )
                
            # Validate multi-sample configuration
            validation_result = pipeline.validate_multi_sample_config(dataset)
            if not validation_result['valid']:
                return Response(
                    {'error': f'Multi-sample validation failed: {validation_result["errors"]}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            return Response(
                {'error': f'Multi-sample pipeline configuration error: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create new analysis job for multi-sample processing
        job = AnalysisJob.objects.create(
            user=request.user,
            dataset=dataset,
            analysis_type='bulk_rnaseq' if dataset.dataset_type == 'bulk' else 'scrna_seq',
            job_config=config,
            num_samples=len(dataset.sample_files_mapping)
        )
        
        # Update dataset processing config
        dataset.processing_config = config
        dataset.quality_thresholds = config.get('quality_thresholds', {})
        dataset.save()
        
        # Start multi-sample upstream processing
        process_upstream_pipeline.delay(str(dataset.id), config)
        
        return Response({
            'message': 'Multi-sample processing started',
            'dataset_id': str(dataset_id),
            'job_id': str(job.id),
            'num_samples': len(dataset.sample_files_mapping)
        }, status=status.HTTP_202_ACCEPTED)

class PipelineHealthCheckView(APIView):
    """
    Check if pipeline_core and downstream_analysis are properly configured
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        health_status = {
            'bulk_pipeline_available': False,
            'scrna_pipeline_available': False,
            'bulk_downstream_available': False,
            'scrna_downstream_available': False,
            'ai_service_available': False,
            'supported_organisms': [],
            'supported_dataset_types': [],
            'pipeline_tools_status': {},
            'bulk_analysis_types': [],
            'scrna_analysis_types': []
        }
        
        try:
            from .pipeline_core import MultiSampleBulkRNASeqPipeline, MultiSampleSingleCellRNASeqPipeline
            health_status['bulk_pipeline_available'] = True
            health_status['scrna_pipeline_available'] = True
            
            # Test pipeline initialization
            test_bulk_pipeline = MultiSampleBulkRNASeqPipeline(organism='human')
            test_scrna_pipeline = MultiSampleSingleCellRNASeqPipeline(organism='human')
            health_status['supported_organisms'] = test_bulk_pipeline.get_supported_organisms()
            health_status['supported_dataset_types'] = ['bulk', 'single_cell']
            health_status['pipeline_tools_status'] = test_bulk_pipeline.check_tools_availability()
        except Exception as e:
            health_status['pipeline_core_error'] = str(e)
        
        try:
            from .downstream_analysis import BulkRNASeqDownstreamAnalysis, SingleCellRNASeqDownstreamAnalysis
            health_status['bulk_downstream_available'] = True
            health_status['scrna_downstream_available'] = True
            
            # Test analyzer initialization
            test_bulk_analyzer = BulkRNASeqDownstreamAnalysis()
            test_scrna_analyzer = SingleCellRNASeqDownstreamAnalysis()
            health_status['bulk_analysis_types'] = test_bulk_analyzer.get_supported_analysis_types()
            health_status['scrna_analysis_types'] = test_scrna_analyzer.get_supported_analysis_types()
        except Exception as e:
            health_status['downstream_analysis_error'] = str(e)
        
        try:
            from .ai_service import ai_service
            health_status['ai_service_available'] = True
        except Exception as e:
            health_status['ai_service_error'] = str(e)
        
        return Response(health_status)

class SupportedOrganismsView(APIView):
    """
    Get list of supported organisms from pipeline_core
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        try:
            from .pipeline_core import MultiSampleBulkRNASeqPipeline
            pipeline = MultiSampleBulkRNASeqPipeline(organism='human')
            organisms = pipeline.get_supported_organisms()
            return Response({'organisms': organisms})
        except Exception as e:
            return Response({
                'error': f'Failed to get supported organisms: {str(e)}',
                'organisms': ['human', 'mouse', 'rat', 'drosophila', 'zebrafish']  # fallback
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PipelineCapabilitiesView(APIView):
    """
    Get pipeline capabilities and configuration options
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        dataset_type = request.query_params.get('dataset_type', 'bulk')
        organism = request.query_params.get('organism', 'human')
        
        try:
            from .pipeline_core import MultiSampleBulkRNASeqPipeline, MultiSampleSingleCellRNASeqPipeline
            from .downstream_analysis import BulkRNASeqDownstreamAnalysis, SingleCellRNASeqDownstreamAnalysis
            
            # Use appropriate classes based on dataset type
            if dataset_type == 'bulk':
                pipeline = MultiSampleBulkRNASeqPipeline(organism=organism)
                analyzer = BulkRNASeqDownstreamAnalysis()
            else:  # single_cell
                pipeline = MultiSampleSingleCellRNASeqPipeline(organism=organism)
                analyzer = SingleCellRNASeqDownstreamAnalysis()
            
            capabilities = {
                'upstream_capabilities': {
                    'supported_file_formats': pipeline.get_supported_file_formats(),
                    'quality_control_tools': pipeline.get_qc_tools(),
                    'alignment_tools': pipeline.get_alignment_tools(),
                    'quantification_methods': pipeline.get_quantification_methods(),
                    'reference_genomes': pipeline.get_available_references(organism),
                },
                'downstream_capabilities': {
                    'analysis_types': analyzer.get_supported_analysis_types(),
                    'visualization_types': analyzer.get_supported_visualizations(),
                    'statistical_methods': analyzer.get_statistical_methods(),
                    'pathway_databases': analyzer.get_pathway_databases() if hasattr(analyzer, 'get_pathway_databases') else [],
                    'clustering_methods': analyzer.get_clustering_methods() if hasattr(analyzer, 'get_clustering_methods') else [],
                },
                'ai_capabilities': {
                    'interpretation_types': ['hypothesis_request', 'result_interpretation', 'signature_analysis', 'pathway_interpretation'],
                    'supported_interactions': analyzer.get_ai_interaction_types() if hasattr(analyzer, 'get_ai_interaction_types') else []
                }
            }
            
            return Response(capabilities)
            
        except Exception as e:
            return Response({
                'error': f'Failed to get pipeline capabilities: {str(e)}',
                'capabilities': {}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PipelineValidationView(APIView):
    """
    Validate pipeline configuration before starting analysis
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, dataset_id):
        dataset = get_object_or_404(RNASeqDataset, id=dataset_id, user=request.user)
        config = request.data.get('config', {})
        
        try:
            from .pipeline_core import MultiSampleBulkRNASeqPipeline, MultiSampleSingleCellRNASeqPipeline
            # Use real pipeline to validate configuration
            if dataset.dataset_type == 'bulk':
                pipeline = MultiSampleBulkRNASeqPipeline(
                    organism=dataset.organism,
                    config=config
                )
            else:  # single_cell
                pipeline = MultiSampleSingleCellRNASeqPipeline(
                    organism=dataset.organism,
                    config=config
                )
            
            validation_result = pipeline.validate_configuration(dataset, config)
            
            return Response({
                'valid': validation_result['valid'],
                'errors': validation_result.get('errors', []),
                'warnings': validation_result.get('warnings', []),
                'estimated_runtime': validation_result.get('estimated_runtime', 'Unknown'),
                'resource_requirements': validation_result.get('resource_requirements', {})
            })
            
        except Exception as e:
            return Response({
                'valid': False,
                'errors': [str(e)],
                'warnings': [],
                'estimated_runtime': 'Unknown',
                'resource_requirements': {}
            }, status=status.HTTP_400_BAD_REQUEST)

class AnalysisConfigurationView(APIView):
    """
    Get available analysis configurations and options
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        dataset_type = request.query_params.get('dataset_type', 'bulk')
        organism = request.query_params.get('organism', 'human')
        
        try:
            from .downstream_analysis import BulkRNASeqDownstreamAnalysis, SingleCellRNASeqDownstreamAnalysis
            # Use real analyzer to get configuration options
            if dataset_type == 'bulk':
                analyzer = BulkRNASeqDownstreamAnalysis()
            else:  # single_cell
                analyzer = SingleCellRNASeqDownstreamAnalysis()
            
            config_options = {
                'supported_analysis_types': analyzer.get_supported_analysis_types(),
                'supported_organisms': analyzer.get_supported_organisms() if hasattr(analyzer, 'get_supported_organisms') else ['human', 'mouse', 'rat'],
                'default_thresholds': analyzer.get_default_thresholds(organism) if hasattr(analyzer, 'get_default_thresholds') else {},
                'supported_visualizations': analyzer.get_supported_visualizations(),
                'parameter_ranges': analyzer.get_parameter_ranges() if hasattr(analyzer, 'get_parameter_ranges') else {},
                'recommended_settings': analyzer.get_recommended_settings(dataset_type, organism) if hasattr(analyzer, 'get_recommended_settings') else {}
            }
            
            return Response(config_options)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to get configuration options: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class PipelineStatusDetailView(APIView):
    """
    Get detailed pipeline status using real pipeline methods
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, dataset_id):
        dataset = get_object_or_404(RNASeqDataset, id=dataset_id, user=request.user)
        
        try:
            from .pipeline_core import MultiSampleBulkRNASeqPipeline, MultiSampleSingleCellRNASeqPipeline
            # Use real pipeline to get detailed status
            if dataset.dataset_type == 'bulk':
                pipeline = MultiSampleBulkRNASeqPipeline(organism=dataset.organism)
            else:  # single_cell
                pipeline = MultiSampleSingleCellRNASeqPipeline(organism=dataset.organism)
            
            detailed_status = pipeline.get_detailed_status(dataset)
            
            # Add job information
            current_job = dataset.get_current_job()
            if current_job:
                detailed_status['current_job'] = AnalysisJobSerializer(current_job).data
            
            return Response(detailed_status)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to get pipeline status: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class RNASeqDatasetListCreateView(generics.ListCreateAPIView):
    serializer_class = RNASeqDatasetSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        return RNASeqDataset.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        dataset = serializer.save(user=self.request.user)
        
        # Create initial analysis job
        job = AnalysisJob.objects.create(
            user=self.request.user,
            dataset=dataset,
            analysis_type='bulk_rnaseq' if dataset.dataset_type == 'bulk' else 'scrna_seq',
            job_config=dataset.get_pipeline_config()
        )
        
        # Validate using real pipeline before starting
        try:
            from .pipeline_core import MultiSampleBulkRNASeqPipeline, MultiSampleSingleCellRNASeqPipeline
            
            if dataset.dataset_type == 'bulk':
                pipeline = MultiSampleBulkRNASeqPipeline(
                    organism=dataset.organism,
                    config=dataset.get_pipeline_config()
                )
            else:  # single_cell
                pipeline = MultiSampleSingleCellRNASeqPipeline(
                    organism=dataset.organism,
                    config=dataset.get_pipeline_config()
                )
            
            validation_result = pipeline.validate_dataset(dataset)
            if not validation_result['valid']:
                job.status = 'failed'
                job.error_message = f"Validation failed: {validation_result['errors']}"
                job.save()
                return
        except Exception as e:
            job.status = 'failed'
            job.error_message = f"Pipeline initialization failed: {str(e)}"
            job.save()
            return
        
        # Handle multi-sample vs single-sample processing
        if dataset.is_multi_sample:
            # Multi-sample processing will be handled by MultiSampleUploadView
            pass
        elif dataset.start_from_upstream and dataset.fastq_r1_file and dataset.fastq_r2_file:
            # Single sample upstream processing
            process_upstream_pipeline.delay(str(dataset.id), job.job_config)
        elif dataset.counts_file:
            # Skip to downstream-ready status
            dataset.status = 'upstream_complete'
            job.status = 'completed'
            job.progress_percentage = 100
            job.current_step_name = 'Ready for downstream analysis'
            job.save()
            dataset.save()

class RNASeqDatasetDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RNASeqDatasetSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return RNASeqDataset.objects.filter(user=self.request.user)

class AnalysisJobListView(generics.ListAPIView):
    serializer_class = AnalysisJobSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        dataset_id = self.kwargs.get('dataset_id')
        if dataset_id:
            dataset = get_object_or_404(RNASeqDataset, id=dataset_id, user=self.request.user)
            return AnalysisJob.objects.filter(dataset=dataset)
        return AnalysisJob.objects.filter(user=self.request.user)

class AnalysisJobDetailView(generics.RetrieveAPIView):
    serializer_class = AnalysisJobSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return AnalysisJob.objects.filter(user=self.request.user)

class StartUpstreamProcessingView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, dataset_id):
        dataset = get_object_or_404(RNASeqDataset, id=dataset_id, user=request.user)
        
        if not (dataset.fastq_r1_file and dataset.fastq_r2_file):
            return Response(
                {'error': 'FASTQ files are required for upstream processing'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get configuration from request
        config = {
            'skip_qc': request.data.get('skip_qc', False),
            'skip_trimming': request.data.get('skip_trimming', False),
            'reference_genome': request.data.get('reference_genome', 'hg38'),
            'quality_thresholds': request.data.get('quality_thresholds', {}),
            'processing_threads': request.data.get('processing_threads', 4),
            'memory_limit': request.data.get('memory_limit', '8G'),
        }
        
        # Validate pipeline configuration using real pipeline
        try:
            from .pipeline_core import MultiSampleBulkRNASeqPipeline, MultiSampleSingleCellRNASeqPipeline
            
            if dataset.dataset_type == 'bulk':
                pipeline = MultiSampleBulkRNASeqPipeline(
                    organism=dataset.organism,
                    config=config
                )
            else:  # single_cell
                pipeline = MultiSampleSingleCellRNASeqPipeline(
                    organism=dataset.organism,
                    config=config
                )
                
            # Validate FASTQ files and configuration
            validation_result = pipeline.validate_input_files(dataset)
            if not validation_result['valid']:
                return Response(
                    {'error': f'Input validation failed: {validation_result["errors"]}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            return Response(
                {'error': f'Pipeline configuration error: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create new analysis job
        job = AnalysisJob.objects.create(
            user=request.user,
            dataset=dataset,
            analysis_type='bulk_rnaseq' if dataset.dataset_type == 'bulk' else 'scrna_seq',
            job_config=config
        )
        
        # Update dataset processing config
        dataset.processing_config = config
        dataset.quality_thresholds = config.get('quality_thresholds', {})
        dataset.save()
        
        # Start upstream processing
        process_upstream_pipeline.delay(str(dataset.id), config)
        
        return Response({
            'message': 'Upstream processing started',
            'dataset_id': str(dataset_id),
            'job_id': str(job.id)
        }, status=status.HTTP_202_ACCEPTED)

class StartDownstreamAnalysisView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, dataset_id):
        dataset = get_object_or_404(RNASeqDataset, id=dataset_id, user=request.user)
        
        if dataset.status not in ['upstream_complete', 'completed']:
            return Response(
                {'error': 'Upstream processing must be completed before downstream analysis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get analysis configuration
        analysis_config = {
            'analysis_type': request.data.get('analysis_type', 'differential'),
            'user_hypothesis': request.data.get('user_hypothesis', ''),
            'gene_signatures': request.data.get('gene_signatures', []),
            'phenotype_columns': request.data.get('phenotype_columns', []),
            'comparison_groups': request.data.get('comparison_groups', {}),
            'clustering_resolution': request.data.get('clustering_resolution', 0.5),
            'statistical_thresholds': request.data.get('statistical_thresholds', {}),
            'enable_ai_interpretation': request.data.get('enable_ai_interpretation', True)
        }
        
        # Validate downstream analysis configuration using real analyzer
        try:
            from .downstream_analysis import BulkRNASeqDownstreamAnalysis, SingleCellRNASeqDownstreamAnalysis
            
            if dataset.dataset_type == 'bulk':
                analyzer = BulkRNASeqDownstreamAnalysis(
                    analysis_type=analysis_config['analysis_type'],
                    config=analysis_config
                )
            else:  # single_cell
                analyzer = SingleCellRNASeqDownstreamAnalysis(
                    analysis_type=analysis_config['analysis_type'],
                    config=analysis_config
                )
                
            # Validate expression data availability
            validation_result = analyzer.validate_expression_data(dataset)
            if not validation_result['valid']:
                return Response(
                    {'error': f'Expression data validation failed: {validation_result["errors"]}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            return Response(
                {'error': f'Downstream analysis configuration error: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create new downstream analysis job
        job = AnalysisJob.objects.create(
            user=request.user,
            dataset=dataset,
            analysis_type=analysis_config['analysis_type'],
            user_hypothesis=analysis_config.get('user_hypothesis', ''),
            enable_ai_interpretation=analysis_config.get('enable_ai_interpretation', True),
            job_config=analysis_config
        )
        
        # Update dataset with user inputs
        if analysis_config.get('user_hypothesis'):
            dataset.user_hypothesis = analysis_config['user_hypothesis']
        
        if analysis_config.get('gene_signatures'):
            dataset.gene_signatures = analysis_config['gene_signatures']
        
        if analysis_config.get('phenotype_columns'):
            dataset.phenotype_data = {
                'columns': analysis_config['phenotype_columns']
            }
        
        dataset.analysis_type = analysis_config['analysis_type']
        dataset.save()
        
        # Start downstream analysis
        process_downstream_analysis.delay(str(dataset.id), analysis_config)
        
        return Response({
            'message': 'Downstream analysis started',
            'dataset_id': str(dataset_id),
            'job_id': str(job.id)
        }, status=status.HTTP_202_ACCEPTED)

class JobStatusUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, job_id):
        job = get_object_or_404(AnalysisJob, id=job_id, user=request.user)
        
        if job.status != 'waiting_for_input':
            return Response(
                {'error': 'Job is not waiting for user input'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user_input = request.data.get('user_input', '')
        continue_analysis = request.data.get('continue_analysis', True)
        
        if continue_analysis:
            # Continue with downstream analysis
            job.current_user_input = user_input
            job.waiting_for_input = False
            job.status = 'processing'
            job.save()
            
            # Continue with updated user input
            updated_config = {
                **job.job_config,
                'user_input': user_input,
                'continue_from_step': job.current_step
            }
            process_downstream_analysis.delay(str(job.dataset.id), updated_config)
            
            return Response({
                'message': 'Analysis continued with user input',
                'job_id': str(job_id)
            }, status=status.HTTP_202_ACCEPTED)
        else:
            # Stop analysis
            job.status = 'completed'
            job.current_step_name = 'Analysis stopped by user'
            job.save()
            
            return Response({
                'message': 'Analysis stopped by user',
                'job_id': str(job_id)
            }, status=status.HTTP_200_OK)

class MultiSampleUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        serializer = MultiSampleUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Get uploaded files
        r1_files = request.FILES.getlist('fastq_r1_files')
        r2_files = request.FILES.getlist('fastq_r2_files')
        
        if serializer.validated_data['start_from_upstream']:
            if len(r1_files) == 0 or len(r2_files) == 0:
                return Response({'error': 'FASTQ files are required for upstream processing'}, status=status.HTTP_400_BAD_REQUEST)
            
            if len(r1_files) != len(r2_files):
                return Response({'error': 'Number of R1 and R2 files must match'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate multi-sample configuration using real pipeline
        try:
            from .pipeline_core import MultiSampleBulkRNASeqPipeline, MultiSampleSingleCellRNASeqPipeline
            
            if serializer.validated_data['dataset_type'] == 'bulk':
                pipeline = MultiSampleBulkRNASeqPipeline(
                    organism=serializer.validated_data['organism'],
                    config=serializer.validated_data.get('processing_config', {})
                )
            else:  # single_cell
                pipeline = MultiSampleSingleCellRNASeqPipeline(
                    organism=serializer.validated_data['organism'],
                    config=serializer.validated_data.get('processing_config', {})
                )
            
        except Exception as e:
            return Response(
                {'error': f'Multi-sample configuration error: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create dataset for multi-sample analysis
        dataset = RNASeqDataset.objects.create(
            user=request.user,
            name=serializer.validated_data['name'],
            description=serializer.validated_data.get('description', ''),
            dataset_type=serializer.validated_data['dataset_type'],
            organism=serializer.validated_data['organism'],
            is_multi_sample=True,
            start_from_upstream=serializer.validated_data['start_from_upstream'],
            processing_config=serializer.validated_data.get('processing_config', {}),
            quality_thresholds=serializer.validated_data.get('quality_thresholds', {}),
            batch_id=f"batch_{uuid.uuid4().hex[:8]}"
        )
        
        # Process and store FASTQ files
        sample_files_mapping = {}
        fastq_files_data = []
        
        if serializer.validated_data['start_from_upstream']:
            # Save FASTQ files and create mapping
            for i, (r1_file, r2_file) in enumerate(zip(r1_files, r2_files)):
                sample_id = f"sample_{i+1}"
                
                # Store file info
                sample_files_mapping[sample_id] = {
                    'r1_file': r1_file,
                    'r2_file': r2_file,
                    'r1_original_name': r1_file.name,
                    'r2_original_name': r2_file.name,
                    'metadata': {}
                }
                
                fastq_files_data.append({
                    'sample_id': sample_id,
                    'r1_file': r1_file,
                    'r2_file': r2_file
                })
        else:
            # For downstream-only analysis, create minimal mapping
            sample_files_mapping = {
                'sample_1': {
                    'metadata': {'analysis_ready': True}
                }
            }
        
        # Update dataset with file mapping
        dataset.sample_files_mapping = sample_files_mapping
        dataset.save()
        
        # Create analysis job for multi-sample processing
        job = AnalysisJob.objects.create(
            user=request.user,
            dataset=dataset,
            analysis_type='bulk_rnaseq' if dataset.dataset_type == 'bulk' else 'scrna_seq',
            job_config={
                **serializer.validated_data.get('processing_config', {}),
                'is_multi_sample': True,
                'sample_files_mapping': sample_files_mapping,
                'quality_thresholds': serializer.validated_data.get('quality_thresholds', {})
            },
            num_samples=len(fastq_files_data) if fastq_files_data else 0
        )
        
        # Start multi-sample processing task
        if dataset.start_from_upstream:
            process_multi_sample_upload.delay(str(dataset.id), fastq_files_data)
        
        return Response({
            'message': 'Multi-sample dataset created and processing started',
            'dataset_id': str(dataset.id),
            'job_id': str(job.id),
            'num_samples': len(fastq_files_data) if fastq_files_data else 0
        }, status=status.HTTP_201_CREATED)

class RNASeqAnalysisResultsView(generics.ListAPIView):
    serializer_class = RNASeqAnalysisResultSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        dataset_id = self.kwargs['dataset_id']
        dataset = get_object_or_404(RNASeqDataset, id=dataset_id, user=self.request.user)
        
        queryset = RNASeqAnalysisResult.objects.filter(dataset=dataset)
        
        # Filter by cluster for single-cell data
        cluster = self.request.query_params.get('cluster')
        if cluster:
            queryset = queryset.filter(cluster=cluster)
        
        # Filter by significance
        significant_only = self.request.query_params.get('significant_only')
        if significant_only == 'true':
            queryset = queryset.filter(adjusted_p_value__lt=0.05)
        
        return queryset

class RNASeqClustersView(generics.ListAPIView):
    serializer_class = RNASeqClusterSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        dataset_id = self.kwargs['dataset_id']
        dataset = get_object_or_404(RNASeqDataset, id=dataset_id, user=self.request.user)
        return RNASeqCluster.objects.filter(dataset=dataset)

class RNASeqPathwayResultsView(generics.ListAPIView):
    serializer_class = RNASeqPathwayResultSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        dataset_id = self.kwargs['dataset_id']
        dataset = get_object_or_404(RNASeqDataset, id=dataset_id, user=self.request.user)
        
        queryset = RNASeqPathwayResult.objects.filter(dataset=dataset)
        
        # Filter by database
        database = self.request.query_params.get('database')
        if database:
            queryset = queryset.filter(database=database)
        
        return queryset.order_by('adjusted_p_value')

class AIInteractionView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = AIInteractionRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        dataset_id = serializer.validated_data['dataset_id']
        dataset = get_object_or_404(RNASeqDataset, id=dataset_id, user=request.user)
        
        # Validate AI interaction using real AI service
        try:
            # Check if dataset has sufficient data for AI interaction
            if dataset.status not in ['upstream_complete', 'completed']:
                return Response(
                    {'error': 'Dataset must complete upstream processing before AI interactions'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            return Response(
                {'error': f'AI interaction validation failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Process AI interaction asynchronously
        task = process_ai_interaction.delay(
            str(dataset_id),
            serializer.validated_data['interaction_type'],
            serializer.validated_data['user_input'],
            serializer.validated_data.get('context_data', {})
        )
        
        return Response({
            'message': 'AI interaction processing started',
            'task_id': task.id
        }, status=status.HTTP_202_ACCEPTED)
    
    def get(self, request, dataset_id):
        dataset = get_object_or_404(RNASeqDataset, id=dataset_id, user=request.user)
        interactions = RNASeqAIInteraction.objects.filter(dataset=dataset)
        serializer = RNASeqAIInteractionSerializer(interactions, many=True)
        return Response(serializer.data)

class CreatePresentationFromRNASeqView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = CreateRNASeqPresentationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        dataset_id = serializer.validated_data['dataset_id']
        title = serializer.validated_data['title']
        quality = serializer.validated_data['quality']
        
        # Check if dataset exists and belongs to user
        dataset = get_object_or_404(RNASeqDataset, id=dataset_id, user=request.user)
        
        if dataset.status != 'completed':
            return Response(
                {'error': 'RNA-seq analysis must be completed before creating presentation'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Deduct credits for presentation creation
            deduct_credit_for_presentation(request.user, quality)
            
            # Create presentation asynchronously
            task = create_rnaseq_presentation.delay(
                dataset_id=str(dataset_id),
                user_id=request.user.id,
                title=title,
                include_methods=serializer.validated_data['include_methods'],
                include_results=serializer.validated_data['include_results'],
                include_discussion=serializer.validated_data['include_discussion'],
                quality=quality
            )
            
            return Response({
                'message': 'Presentation creation started',
                'task_id': task.id
            }, status=status.HTTP_202_ACCEPTED)
            
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class RNASeqPresentationListView(generics.ListAPIView):
    serializer_class = RNASeqPresentationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return RNASeqPresentation.objects.filter(dataset__user=self.request.user)

class RNASeqAnalysisStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, dataset_id):
        dataset = get_object_or_404(RNASeqDataset, id=dataset_id, user=request.user)
        
        # Get current job information
        current_job = dataset.get_current_job()
        job_data = None
        if current_job:
            job_data = AnalysisJobSerializer(current_job).data
        
        return Response({
            'status': dataset.status,
            'dataset_type': dataset.dataset_type,
            'analysis_type': dataset.analysis_type,
            'is_multi_sample': dataset.is_multi_sample,
            'batch_id': dataset.batch_id,
            'results_count': dataset.analysis_results.count(),
            'clusters_count': dataset.clusters.count() if dataset.dataset_type == 'single_cell' else 0,
            'pathways_count': dataset.pathway_results.count(),
            'has_visualization': bool(dataset.visualization_image),
            'has_ai_interpretation': bool(dataset.ai_interpretation),
            'current_job': job_data,
            'job_progress': dataset.get_job_progress(),
            'upstream_files': {
                'qc_report': bool(dataset.qc_report),
                'expression_matrix_tpm': bool(dataset.expression_matrix_tpm),
                'expression_matrix_counts': bool(dataset.expression_matrix_counts),
            },
            'created_at': dataset.created_at,
            'updated_at': dataset.updated_at
        })

class AIInterpretationListView(generics.ListAPIView):
    serializer_class = AIInterpretationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        dataset_id = self.kwargs['dataset_id']
        dataset = get_object_or_404(RNASeqDataset, id=dataset_id, user=self.request.user)
        
        # Get interpretations from all jobs for this dataset
        return AIInterpretation.objects.filter(
            job__dataset=dataset
        ).order_by('-created_at')

class GenerateAIInterpretationView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, dataset_id):
        dataset = get_object_or_404(RNASeqDataset, id=dataset_id, user=request.user)
        current_job = dataset.get_current_job()
        
        if not current_job or current_job.status != 'completed':
            return Response(
                {'error': 'Analysis must be completed before generating AI interpretations'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Trigger AI interpretation generation
        process_ai_interaction.delay(
            str(dataset_id),
            'result_interpretation',
            'Generate comprehensive interpretation of analysis results',
            {}
        )
        
        return Response({
            'message': 'AI interpretation generation started',
            'job_id': str(current_job.id)
        }, status=status.HTTP_202_ACCEPTED)

class RNASeqVisualizationView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, dataset_id):
        dataset = get_object_or_404(RNASeqDataset, id=dataset_id, user=request.user)
        
        if dataset.status not in ['completed', 'upstream_complete']:
            return Response(
                {'error': 'Analysis must be completed before generating visualizations'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        visualization_type = request.data.get('type', 'volcano')
        
        # Validate visualization type using real analyzer
        try:
            from .downstream_analysis import BulkRNASeqDownstreamAnalysis, SingleCellRNASeqDownstreamAnalysis
            
            if dataset.dataset_type == 'bulk':
                analyzer = BulkRNASeqDownstreamAnalysis(
                    analysis_type=dataset.analysis_type
                )
            else:  # single_cell
                analyzer = SingleCellRNASeqDownstreamAnalysis(
                    analysis_type=dataset.analysis_type
                )
            
            # Check if visualization type is supported for this dataset type
            supported_viz = analyzer.get_supported_visualizations()
            if visualization_type not in supported_viz:
                return Response(
                    {'error': f'Visualization type {visualization_type} not supported for {dataset.dataset_type} datasets'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            return Response(
                {'error': f'Visualization validation failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Trigger visualization generation
        generate_rnaseq_visualization.delay(str(dataset_id), visualization_type)
        
        return Response({
            'message': 'Visualization generation started',
            'visualization_type': visualization_type
        }, status=status.HTTP_202_ACCEPTED)

class DownloadResultsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, dataset_id):
        dataset = get_object_or_404(RNASeqDataset, id=dataset_id, user=request.user)
        
        file_type = request.query_params.get('type', 'expression_matrix')
        
        file_mapping = {
            'expression_matrix_tpm': dataset.expression_matrix_tpm,
            'expression_matrix_counts': dataset.expression_matrix_counts,
            'results': dataset.results_file,
            'qc_report': dataset.qc_report,
        }
        
        file_obj = file_mapping.get(file_type)
        if not file_obj:
            return Response(
                {'error': f'File type {file_type} not available'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response({
            'download_url': request.build_absolute_uri(file_obj.url),
            'filename': file_obj.name,
            'size': file_obj.size
        })

class BulkRNASeqPipelineView(APIView):
    """
    Comprehensive view for bulk RNA-seq pipeline management
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, dataset_id):
        dataset = get_object_or_404(RNASeqDataset, id=dataset_id, user=request.user)
        
        if dataset.dataset_type != 'bulk':
            return Response(
                {'error': 'This endpoint is for bulk RNA-seq datasets only'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get real pipeline status using pipeline_core
        try:
            from .pipeline_core import MultiSampleBulkRNASeqPipeline
            
            pipeline = MultiSampleBulkRNASeqPipeline(organism=dataset.organism)
            pipeline_status = pipeline.get_pipeline_status(dataset)
        except Exception as e:
            pipeline_status = {
                'qc_complete': bool(dataset.qc_report),
                'trimming_complete': bool(dataset.trimmed_fastq_r1) or dataset.is_multi_sample,
                'alignment_complete': bool(dataset.alignment_bam),
                'quantification_complete': bool(dataset.expression_matrix_tpm) or bool(dataset.expression_matrix_counts),
            }
        
        # Return comprehensive pipeline status
        return Response({
            'dataset': RNASeqDatasetSerializer(dataset, context={'request': request}).data,
            'upstream_status': pipeline_status,
            'downstream_options': [
                'clustering', 'differential', 'pathway', 
                'signature_correlation', 'phenotype_correlation'
            ],
            'sample_info': {
                'is_multi_sample': dataset.is_multi_sample,
                'num_samples': len(dataset.sample_files_mapping) if dataset.is_multi_sample else 1,
                'batch_id': dataset.batch_id
            },
            'ai_interactions': RNASeqAIInteractionSerializer(
                dataset.ai_interactions.all()[:5], many=True
            ).data
        })

class SingleCellRNASeqPipelineView(APIView):
    """
    Comprehensive view for single-cell RNA-seq pipeline management
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, dataset_id):
        dataset = get_object_or_404(RNASeqDataset, id=dataset_id, user=request.user)
        
        if dataset.dataset_type != 'single_cell':
            return Response(
                {'error': 'This endpoint is for single-cell RNA-seq datasets only'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get real pipeline status for single-cell using pipeline_core
        try:
            from .pipeline_core import MultiSampleSingleCellRNASeqPipeline
            pipeline = MultiSampleSingleCellRNASeqPipeline(organism=dataset.organism)
            pipeline_status = pipeline.get_pipeline_status(dataset)
        except Exception as e:
            pipeline_status = {
                'barcode_processing_complete': bool(dataset.qc_report),
                'alignment_complete': bool(dataset.alignment_bam),
                'filtering_complete': bool(dataset.expression_matrix_counts) or dataset.is_multi_sample,
                'umi_matrix_complete': bool(dataset.expression_matrix_tpm),
            }
        
        # Return comprehensive pipeline status
        return Response({
            'dataset': RNASeqDatasetSerializer(dataset, context={'request': request}).data,
            'upstream_status': pipeline_status,
            'downstream_options': [
                'clustering', 'cell_type_annotation', 'differential',
                'pseudotime', 'cell_communication'
            ],
            'sample_info': {
                'is_multi_sample': dataset.is_multi_sample,
                'num_samples': len(dataset.sample_files_mapping) if dataset.is_multi_sample else 1,
                'batch_id': dataset.batch_id
            },
            'clusters': RNASeqClusterSerializer(dataset.clusters.all(), many=True).data,
            'ai_interactions': RNASeqAIInteractionSerializer(
                dataset.ai_interactions.all()[:5], many=True
            ).data
        })