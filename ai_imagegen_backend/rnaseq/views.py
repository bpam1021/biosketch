from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.http import HttpResponse, FileResponse
from .models import (
    RNASeqDataset, RNASeqAnalysisResult, RNASeqPresentation, AnalysisJob, PipelineStep,
    RNASeqCluster, RNASeqPathwayResult, RNASeqAIChat
)
from .serializers import (
    RNASeqDatasetSerializer, RNASeqAnalysisResultSerializer,
    RNASeqPresentationSerializer, CreateRNASeqPresentationSerializer,
    RNASeqClusterSerializer, RNASeqPathwayResultSerializer,
    RNASeqAIChatSerializer, UpstreamProcessSerializer, AnalysisJobSerializer,
    DownstreamAnalysisSerializer, AIChatRequestSerializer, MultiSampleUploadSerializer,
    PipelineStepSerializer
)
from .tasks import (
    process_upstream_pipeline, process_downstream_analysis,
    create_rnaseq_presentation, generate_ai_interpretations
)
from users.views.credit_views import deduct_credit_for_presentation
import os

class RNASeqDatasetListCreateView(generics.ListCreateAPIView):
    serializer_class = RNASeqDatasetSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        return RNASeqDataset.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        dataset = serializer.save(user=self.request.user)
        
        # Determine analysis type based on dataset type and pipeline stage
        if dataset.dataset_type == 'bulk':
            analysis_type = 'bulk_upstream' if dataset.selected_pipeline_stage == 'upstream' else 'bulk_downstream'
        else:
            analysis_type = 'scrna_upstream' if dataset.selected_pipeline_stage == 'upstream' else 'scrna_downstream'
        
        # Create analysis job
        job = AnalysisJob.objects.create(
            user=self.request.user,
            dataset=dataset,
            analysis_type=analysis_type,
            job_config={
                'pipeline_stage': dataset.selected_pipeline_stage,
                'dataset_type': dataset.dataset_type,
                'organism': dataset.organism,
                'is_multi_sample': dataset.is_multi_sample,
            }
        )
        
        # Start appropriate pipeline
        if dataset.selected_pipeline_stage == 'upstream':
            process_upstream_pipeline.delay(str(job.id))
        else:
            process_downstream_analysis.delay(str(job.id))

class RNASeqDatasetDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RNASeqDatasetSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return RNASeqDataset.objects.filter(user=self.request.user)

class StartUpstreamProcessingView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, dataset_id):
        serializer = UpstreamProcessSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        dataset = get_object_or_404(RNASeqDataset, id=dataset_id, user=request.user)
        
        if not dataset.fastq_files:
            return Response(
                {'error': 'FASTQ files are required for upstream processing'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create new upstream analysis job
        analysis_type = 'bulk_upstream' if dataset.dataset_type == 'bulk' else 'scrna_upstream'
        job = AnalysisJob.objects.create(
            user=request.user,
            dataset=dataset,
            analysis_type=analysis_type,
            job_config={
                'reference_genome': request.data.get('reference_genome', 'hg38'),
                'processing_threads': request.data.get('processing_threads', 4),
                'memory_limit': request.data.get('memory_limit', '8G'),
            }
        )
        
        # Start upstream processing
        process_upstream_pipeline.delay(str(job.id))
        
        return Response({
            'message': 'Upstream processing started',
            'dataset_id': str(dataset_id),
            'job_id': str(job.id)
        }, status=status.HTTP_202_ACCEPTED)

class StartDownstreamAnalysisView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, dataset_id):
        serializer = DownstreamAnalysisSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        dataset = get_object_or_404(RNASeqDataset, id=dataset_id, user=request.user)
        
        # Check if we have expression matrix (either from upstream or uploaded)
        if not dataset.expression_matrix and not dataset.expression_matrix_output:
            return Response(
                {'error': 'Expression matrix is required for downstream analysis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create downstream analysis job
        analysis_type = 'bulk_downstream' if dataset.dataset_type == 'bulk' else 'scrna_downstream'
        job = AnalysisJob.objects.create(
            user=request.user,
            dataset=dataset,
            analysis_type=analysis_type,
            job_config={
                'analysis_type': serializer.validated_data['analysis_type'],
                'comparison_groups': serializer.validated_data.get('comparison_groups', {}),
                'statistical_thresholds': serializer.validated_data.get('statistical_thresholds', {}),
            }
        )
        
        # Start downstream analysis
        process_downstream_analysis.delay(str(job.id))
        
        return Response({
            'message': 'Downstream analysis started',
            'dataset_id': str(dataset_id),
            'job_id': str(job.id)
        }, status=status.HTTP_202_ACCEPTED)

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

class RNASeqAnalysisResultsView(generics.ListAPIView):
    serializer_class = RNASeqAnalysisResultSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        dataset_id = self.kwargs['dataset_id']
        dataset = get_object_or_404(RNASeqDataset, id=dataset_id, user=self.request.user)
        
        queryset = RNASeqAnalysisResult.objects.filter(dataset=dataset)
        
        # Filter by significance
        significant_only = self.request.query_params.get('significant_only')
        if significant_only == 'true':
            queryset = queryset.filter(adjusted_p_value__lt=0.05)
        
        return queryset.order_by('adjusted_p_value')

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

class AIChatView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        dataset_id = request.data.get('dataset_id')
        user_message = request.data.get('user_message')
        context_type = request.data.get('context_type', 'general')
        
        if not dataset_id or not user_message:
            return Response({'error': 'dataset_id and user_message are required'}, status=status.HTTP_400_BAD_REQUEST)
            
        dataset = get_object_or_404(RNASeqDataset, id=dataset_id, user=request.user)
        
        # Create AI chat record
        chat = RNASeqAIChat.objects.create(
            dataset=dataset,
            user_message=user_message,
            ai_response="Processing your request...",
            context_data={'context_type': context_type}
        )
        
        # Process AI interaction asynchronously
        from .tasks import process_ai_interaction
        process_ai_interaction.delay(str(dataset_id), 'general', user_message, {'context_type': context_type})
        
        return Response({
            'message': 'AI chat processing started',
            'chat_id': chat.id
        }, status=status.HTTP_202_ACCEPTED)
    
    def get(self, request, dataset_id):
        dataset = get_object_or_404(RNASeqDataset, id=dataset_id, user=request.user)
        chats = RNASeqAIChat.objects.filter(dataset=dataset).order_by('-created_at')[:20]
        serializer = RNASeqAIChatSerializer(chats, many=True)
        return Response(serializer.data)

class DownloadUpstreamResultsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, dataset_id):
        dataset = get_object_or_404(RNASeqDataset, id=dataset_id, user=request.user)
        
        if not dataset.expression_matrix_output:
            return Response(
                {'error': 'No upstream results available for download'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        file_path = dataset.expression_matrix_output.path
        if not os.path.exists(file_path):
            return Response(
                {'error': 'File not found on server'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        response = FileResponse(
            open(file_path, 'rb'),
            as_attachment=True,
            filename=f"{dataset.name}_expression_matrix.csv"
        )
        return response

class ContinueToDownstreamView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, dataset_id):
        dataset = get_object_or_404(RNASeqDataset, id=dataset_id, user=request.user)
        
        if dataset.status != 'upstream_complete':
            return Response(
                {'error': 'Upstream processing must be completed first'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update dataset to downstream stage
        dataset.selected_pipeline_stage = 'downstream'
        dataset.save()
        
        return Response({
            'message': 'Ready for downstream analysis',
            'dataset_id': str(dataset_id)
        }, status=status.HTTP_200_OK)

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

class RNASeqAnalysisStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, dataset_id):
        dataset = get_object_or_404(RNASeqDataset, id=dataset_id, user=request.user)
        
        # Get current job information
        current_job = dataset.get_current_job()
        job_data = None
        if current_job:
            job_data = AnalysisJobSerializer(current_job).data
        
        # Get available actions based on current status
        available_actions = []
        if dataset.status == 'upstream_complete':
            available_actions.append('download_matrix')
            available_actions.append('continue_downstream')
        elif dataset.status == 'completed':
            available_actions.append('create_presentation')
            available_actions.append('download_results')
        
        return Response({
            'status': dataset.status,
            'dataset_type': dataset.dataset_type,
            'selected_pipeline_stage': dataset.selected_pipeline_stage,
            'is_multi_sample': dataset.is_multi_sample,
            'sample_count': dataset.sample_count,
            'results_count': dataset.analysis_results.count(),
            'clusters_count': dataset.clusters.count() if dataset.dataset_type == 'single_cell' else 0,
            'pathways_count': dataset.pathway_results.count(),
            'current_job': job_data,
            'available_actions': available_actions,
            'upstream_files': {
                'qc_report': bool(dataset.qc_report),
                'expression_matrix_output': bool(dataset.expression_matrix_output),
            },
            'downstream_files': {
                'analysis_plots': len(dataset.analysis_plots),
                'results_available': bool(dataset.downstream_results),
            },
            'created_at': dataset.created_at,
            'updated_at': dataset.updated_at
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
        
        # Define bulk RNA-seq specific pipeline steps
        upstream_steps = [
            'Quality Control (FastQC)',
            'Read Trimming (Trimmomatic)',
            'Genome Alignment (STAR)',
            'Gene Quantification (RSEM/featureCounts)',
            'Expression Matrix Generation'
        ]
        
        downstream_options = [
            'differential_expression',
            'clustering_pca', 
            'pathway_enrichment'
        ]
        
        return Response({
            'dataset': RNASeqDatasetSerializer(dataset, context={'request': request}).data,
            'pipeline_info': {
                'upstream_steps': upstream_steps,
                'downstream_options': downstream_options,
                'typical_runtime': '30-120 minutes for upstream, 10-30 minutes for downstream'
            },
            'ai_chats': RNASeqAIChatSerializer(
                dataset.ai_chats.all()[:10], many=True
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
        
        # Define scRNA-seq specific pipeline steps
        upstream_steps = [
            'Barcode Processing (Cell Ranger)',
            'Quality Control & Filtering',
            'UMI Counting & Deduplication',
            'Cell-Gene Matrix Generation',
            'Initial Quality Metrics'
        ]
        
        downstream_options = [
            'clustering_pca',
            'cell_type_annotation',
            'differential_expression',
            'trajectory_analysis'
        ]
        
        return Response({
            'dataset': RNASeqDatasetSerializer(dataset, context={'request': request}).data,
            'pipeline_info': {
                'upstream_steps': upstream_steps,
                'downstream_options': downstream_options,
                'typical_runtime': '45-180 minutes for upstream, 15-45 minutes for downstream'
            },
            'clusters': RNASeqClusterSerializer(dataset.clusters.all(), many=True).data,
            'ai_chats': RNASeqAIChatSerializer(
                dataset.ai_chats.all()[:10], many=True
            ).data
        })

class MultiSampleUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        serializer = MultiSampleUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate file requirements based on pipeline stage
        pipeline_stage = serializer.validated_data['selected_pipeline_stage']
        
        if pipeline_stage == 'upstream':
            fastq_files = request.FILES.getlist('fastq_files')
            if len(fastq_files) < 2:
                return Response(
                    {'error': 'At least 2 FASTQ files required for upstream processing'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            if 'expression_matrix' not in request.FILES:
                return Response(
                    {'error': 'Expression matrix file required for downstream analysis'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Create multi-sample dataset
        dataset = RNASeqDataset.objects.create(
            user=request.user,
            name=serializer.validated_data['name'],
            description=serializer.validated_data.get('description', ''),
            dataset_type=serializer.validated_data['dataset_type'],
            organism=serializer.validated_data['organism'],
            selected_pipeline_stage=pipeline_stage,
            is_multi_sample=True,
            sample_count=len(fastq_files) // 2 if pipeline_stage == 'upstream' else 1,
            metadata_file=request.FILES.get('metadata_file')
        )
        
        # Handle file uploads
        if pipeline_stage == 'upstream':
            fastq_files = request.FILES.getlist('fastq_files')
            fastq_pairs = []
            for i in range(0, len(fastq_files), 2):
                if i + 1 < len(fastq_files):
                    # Save files and store paths
                    r1_path = f'rnaseq/fastq/sample_{i//2+1}_R1.fastq.gz'
                    r2_path = f'rnaseq/fastq/sample_{i//2+1}_R2.fastq.gz'
                    
                    # In production, save actual files
                    fastq_pairs.append({
                        'sample_id': f'sample_{i//2+1}',
                        'r1_file': r1_path,
                        'r2_file': r2_path,
                        'r1_size': fastq_files[i].size,
                        'r2_size': fastq_files[i+1].size
                    })
            
            dataset.fastq_files = fastq_pairs
        else:
            dataset.expression_matrix = request.FILES['expression_matrix']
        
        dataset.save()
        
        # Create analysis job
        analysis_type = f"{dataset.dataset_type}_upstream" if pipeline_stage == 'upstream' else f"{dataset.dataset_type}_downstream"
        job = AnalysisJob.objects.create(
            user=request.user,
            dataset=dataset,
            analysis_type=analysis_type,
            job_config=serializer.validated_data.get('processing_config', {}),
        )
        
        # Start processing
        if pipeline_stage == 'upstream':
            process_upstream_pipeline.delay(str(job.id))
        else:
            process_downstream_analysis.delay(str(job.id))
        
        return Response({
            'message': 'Multi-sample dataset created and processing started',
            'dataset_id': str(dataset.id),
            'job_id': str(job.id)
        }, status=status.HTTP_201_CREATED)