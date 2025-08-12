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
    process_upstream_pipeline, process_downstream_analysis, continue_downstream_step,
    generate_ai_interpretations, create_rnaseq_presentation, process_ai_interaction
)
from users.views.credit_views import deduct_credit_for_presentation

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
            job_config={
                'start_from_upstream': dataset.start_from_upstream,
                'processing_config': dataset.processing_config,
                'quality_thresholds': dataset.quality_thresholds,
            }
        )
        
        # Start processing based on configuration
        if dataset.start_from_upstream and (dataset.fastq_r1_file and dataset.fastq_r2_file):
            # Start upstream pipeline with job tracking
            process_upstream_pipeline.delay(str(job.id))
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
    
    def post(self, request):
        serializer = UpstreamProcessSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        dataset_id = serializer.validated_data['dataset_id']
        dataset = get_object_or_404(RNASeqDataset, id=dataset_id, user=request.user)
        
        if not (dataset.fastq_r1_file and dataset.fastq_r2_file):
            return Response(
                {'error': 'FASTQ files are required for upstream processing'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create new analysis job
        job = AnalysisJob.objects.create(
            user=request.user,
            dataset=dataset,
            analysis_type=f'{dataset.dataset_type}_rnaseq',
            job_config={
                'skip_qc': serializer.validated_data.get('skip_qc', False),
                'skip_trimming': serializer.validated_data.get('skip_trimming', False),
                'reference_genome': serializer.validated_data.get('reference_genome', 'hg38'),
                'quality_thresholds': serializer.validated_data.get('quality_thresholds', {}),
                'processing_threads': serializer.validated_data.get('processing_threads', 4),
                'memory_limit': serializer.validated_data.get('memory_limit', '8G'),
            }
        )
        
        # Update dataset processing config
        dataset.processing_config = {
            'skip_qc': serializer.validated_data.get('skip_qc', False),
            'skip_trimming': serializer.validated_data.get('skip_trimming', False),
            'reference_genome': serializer.validated_data.get('reference_genome', 'hg38'),
            'quality_thresholds': serializer.validated_data.get('quality_thresholds', {}),
        }
        dataset.quality_thresholds = serializer.validated_data.get('quality_thresholds', {})
        dataset.save()
        
        # Start upstream processing
        process_upstream_pipeline.delay(str(job.id))
        
        return Response({
            'message': 'Upstream processing started',
            'dataset_id': str(dataset_id),
            'job_id': str(job.id)
        }, status=status.HTTP_202_ACCEPTED)

class StartDownstreamAnalysisView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = DownstreamAnalysisSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        dataset_id = serializer.validated_data['dataset_id']
        dataset = get_object_or_404(RNASeqDataset, id=dataset_id, user=request.user)
        
        if dataset.status not in ['upstream_complete', 'completed']:
            return Response(
                {'error': 'Upstream processing must be completed before downstream analysis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create new downstream analysis job
        job = AnalysisJob.objects.create(
            user=request.user,
            dataset=dataset,
            analysis_type=f'{dataset.dataset_type}_{serializer.validated_data["analysis_type"]}',
            user_hypothesis=serializer.validated_data.get('user_hypothesis', ''),
            enable_ai_interpretation=serializer.validated_data.get('enable_ai_interpretation', True),
            job_config={
                'analysis_type': serializer.validated_data['analysis_type'],
                'gene_signatures': serializer.validated_data.get('gene_signatures', []),
                'phenotype_columns': serializer.validated_data.get('phenotype_columns', []),
                'comparison_groups': serializer.validated_data.get('comparison_groups', {}),
                'clustering_resolution': serializer.validated_data.get('clustering_resolution', 0.5),
                'statistical_thresholds': serializer.validated_data.get('statistical_thresholds', {}),
            }
        )
        
        # Update dataset with user inputs
        if serializer.validated_data.get('user_hypothesis'):
            dataset.user_hypothesis = serializer.validated_data['user_hypothesis']
        
        if serializer.validated_data.get('gene_signatures'):
            dataset.gene_signatures = serializer.validated_data['gene_signatures']
        
        if serializer.validated_data.get('phenotype_columns'):
            dataset.phenotype_data = {
                'columns': serializer.validated_data['phenotype_columns']
            }
        
        dataset.analysis_type = serializer.validated_data['analysis_type']
        dataset.save()
        
        # Start downstream analysis
        process_downstream_analysis.delay(str(job.id))
        
        return Response({
            'message': 'Downstream analysis started',
            'dataset_id': str(dataset_id),
            'job_id': str(job.id)
        }, status=status.HTTP_202_ACCEPTED)

class JobStatusUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = JobStatusSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        job_id = serializer.validated_data['job_id']
        job = get_object_or_404(AnalysisJob, id=job_id, user=request.user)
        
        if job.status != 'waiting_for_input':
            return Response(
                {'error': 'Job is not waiting for user input'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user_input = serializer.validated_data.get('user_input', '')
        continue_analysis = serializer.validated_data.get('continue_analysis', True)
        
        if continue_analysis:
            # Continue with downstream analysis
            continue_downstream_step.delay(str(job_id), job.current_step, user_input)
            
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
        generate_ai_interpretations.delay(str(current_job.id))
        
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
        
        # Trigger visualization generation
        from .tasks import generate_rnaseq_visualization
        task = generate_rnaseq_visualization.delay(str(dataset_id), visualization_type)
        
        return Response({
            'message': 'Visualization generation started',
            'task_id': task.id
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
        
        # Return comprehensive pipeline status
        return Response({
            'dataset': RNASeqDatasetSerializer(dataset, context={'request': request}).data,
            'upstream_status': {
                'qc_complete': bool(dataset.qc_report),
                'trimming_complete': bool(dataset.trimmed_fastq_r1),
                'alignment_complete': bool(dataset.alignment_bam),
                'quantification_complete': bool(dataset.expression_matrix_tpm),
            },
            'downstream_options': [
                'comprehensive'
            ],
            'pipeline_steps': {
                'upstream': [
                    'Quality Control (FastQC)',
                    'Read Trimming (Trimmomatic)', 
                    'Genome Alignment (STAR)',
                    'Gene Quantification (RSEM)',
                    'Generate Metadata'
                ],
                'downstream': [
                    'Sample Clustering & PCA',
                    'Differential Expression Analysis',
                    'Pathway Enrichment Analysis',
                    'Gene Signature Analysis',
                    'Generate Visualizations'
                ]
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
        
        # Return comprehensive pipeline status
        return Response({
            'dataset': RNASeqDatasetSerializer(dataset, context={'request': request}).data,
            'upstream_status': {
                'barcode_processing_complete': bool(dataset.qc_report),
                'alignment_complete': bool(dataset.alignment_bam),
                'filtering_complete': bool(dataset.expression_matrix_counts),
                'umi_matrix_complete': bool(dataset.expression_matrix_tpm),
            },
            'downstream_options': [
                'comprehensive'
            ],
            'pipeline_steps': {
                'upstream': [
                    'Barcode Processing',
                    'Quality Control',
                    'Cell Filtering',
                    'UMI Matrix Generation',
                    'Generate Metadata'
                ],
                'downstream': [
                    'Cell Clustering & UMAP',
                    'Cell Type Annotation',
                    'Differential Expression (by cluster)',
                    'Pseudotime Analysis',
                    'Cell Communication Analysis'
                ]
            },
            'clusters': RNASeqClusterSerializer(dataset.clusters.all(), many=True).data,
            'ai_interactions': RNASeqAIInteractionSerializer(
                dataset.ai_interactions.all()[:5], many=True
            ).data
        })