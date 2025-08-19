from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.conf import settings
from django.http import HttpResponse, FileResponse
from .models import (
    AnalysisJob, RNASeqAnalysisResult, RNASeqPresentation,
    RNASeqCluster, RNASeqPathwayResult, RNASeqAIChat
)
from .serializers import (
    AnalysisJobSerializer, CreateAnalysisJobSerializer, RNASeqAnalysisResultSerializer,
    RNASeqPresentationSerializer, CreateRNASeqPresentationSerializer,
    RNASeqClusterSerializer, RNASeqPathwayResultSerializer,
    RNASeqAIChatSerializer, UpstreamProcessSerializer,
    DownstreamAnalysisSerializer, AIChatRequestSerializer, MultiSampleUploadSerializer
)
from .tasks import (
    process_upstream_pipeline, process_downstream_analysis,
    create_rnaseq_presentation
)
from users.views.credit_views import deduct_credit_for_presentation
import os

class AnalysisJobListCreateView(generics.ListCreateAPIView):
    serializer_class = AnalysisJobSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        return AnalysisJob.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CreateAnalysisJobSerializer
        return AnalysisJobSerializer
    
    def perform_create(self, serializer):
        job = serializer.save(user=self.request.user)
        
        # Start appropriate pipeline based on selected stage
        if job.selected_pipeline_stage == 'upstream':
            process_upstream_pipeline.delay(str(job.id))
        else:
            process_downstream_analysis.delay(str(job.id))

class AnalysisJobDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AnalysisJobSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return AnalysisJob.objects.filter(user=self.request.user)

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
        
        # Create analysis job with all dataset information
        job = AnalysisJob.objects.create(
            user=request.user,
            name=serializer.validated_data['name'],
            description=serializer.validated_data.get('description', ''),
            dataset_type=serializer.validated_data['dataset_type'],
            organism=serializer.validated_data['organism'],
            selected_pipeline_stage=pipeline_stage,
            is_multi_sample=serializer.validated_data.get('is_multi_sample', False),
            sample_count=len(fastq_files) // 2 if pipeline_stage == 'upstream' else 1,
            metadata_file=request.FILES.get('metadata_file'),
            user_hypothesis=serializer.validated_data.get('user_hypothesis', ''),
            job_config=serializer.validated_data.get('processing_config', {}),
        )
        
        # Handle file uploads
        job_dir = os.path.join(settings.MEDIA_ROOT, 'rnaseq', 'jobs', str(job.id))
        os.makedirs(job_dir, exist_ok=True)
        
        if pipeline_stage == 'upstream':
            fastq_files = request.FILES.getlist('fastq_files')
            fastq_pairs = []
            for i in range(0, len(fastq_files), 2):
                if i + 1 < len(fastq_files):
                    r1_file = fastq_files[i]
                    r1_path = os.path.join(job_dir, f'sample_{i//2+1}_R1.fastq.gz')
                    with open(r1_path, 'wb+') as destination:
                        for chunk in r1_file.chunks():
                            destination.write(chunk)
                    
                    r2_file = fastq_files[i+1]
                    r2_path = os.path.join(job_dir, f'sample_{i//2+1}_R2.fastq.gz')
                    with open(r2_path, 'wb+') as destination:
                        for chunk in r2_file.chunks():
                            destination.write(chunk)
                    
                    fastq_pairs.append({
                        'sample_id': f'sample_{i//2+1}',
                        'r1_file': r1_path,
                        'r2_file': r2_path,
                        'r1_size': fastq_files[i].size,
                        'r2_size': fastq_files[i+1].size
                    })
            
            job.fastq_files = fastq_pairs
        else:
            expr_file = request.FILES['expression_matrix']
            job.expression_matrix = expr_file
        
        job.save()

        # Start processing
        if pipeline_stage == 'upstream':
            process_upstream_pipeline.delay(str(job.id))
        else:
            process_downstream_analysis.delay(str(job.id))
        
        return Response({
            'message': 'Analysis job created and processing started',
            'job_id': str(job.id)
        }, status=status.HTTP_201_CREATED)

class StartUpstreamProcessingView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, job_id):
        serializer = UpstreamProcessSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        job = get_object_or_404(AnalysisJob, id=job_id, user=request.user)
        
        if not job.fastq_files:
            return Response(
                {'error': 'FASTQ files are required for upstream processing'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update job config and start processing
        job.job_config.update({
            'reference_genome': request.data.get('reference_genome', 'hg38'),
            'processing_threads': request.data.get('processing_threads', 12),
            'memory_limit': request.data.get('memory_limit', '60G'),
        })
        job.save()
        
        # Start upstream processing
        process_upstream_pipeline.delay(str(job.id))
        
        return Response({
            'message': 'Upstream processing started',
            'job_id': str(job.id)
        }, status=status.HTTP_202_ACCEPTED)

class StartDownstreamAnalysisView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, job_id):
        serializer = DownstreamAnalysisSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        job = get_object_or_404(AnalysisJob, id=job_id, user=request.user)
        
        # Check if we have expression matrix
        if not job.expression_matrix and not job.expression_matrix_output:
            return Response(
                {'error': 'Expression matrix is required for downstream analysis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update job config
        job.job_config.update({
            'comparison_groups': serializer.validated_data.get('comparison_groups', {}),
            'statistical_thresholds': serializer.validated_data.get('statistical_thresholds', {}),
        })
        job.save()
        
        # Start downstream analysis
        process_downstream_analysis.delay(str(job.id))
        
        return Response({
            'message': 'Downstream analysis started',
            'job_id': str(job.id)
        }, status=status.HTTP_202_ACCEPTED)

class RNASeqAnalysisResultsView(generics.ListAPIView):
    serializer_class = RNASeqAnalysisResultSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        job_id = self.kwargs['job_id']
        job = get_object_or_404(AnalysisJob, id=job_id, user=self.request.user)
        
        queryset = RNASeqAnalysisResult.objects.filter(job=job)
        
        # Filter by significance
        significant_only = self.request.query_params.get('significant_only')
        if significant_only == 'true':
            queryset = queryset.filter(adjusted_p_value__lt=0.05)
        
        return queryset.order_by('adjusted_p_value')

class RNASeqClustersView(generics.ListAPIView):
    serializer_class = RNASeqClusterSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        job_id = self.kwargs['job_id']
        job = get_object_or_404(AnalysisJob, id=job_id, user=self.request.user)
        return RNASeqCluster.objects.filter(job=job)

class RNASeqPathwayResultsView(generics.ListAPIView):
    serializer_class = RNASeqPathwayResultSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        job_id = self.kwargs['job_id']
        job = get_object_or_404(AnalysisJob, id=job_id, user=self.request.user)
        
        queryset = RNASeqPathwayResult.objects.filter(job=job)
        
        # Filter by database
        database = self.request.query_params.get('database')
        if database:
            queryset = queryset.filter(database=database)
        
        return queryset.order_by('adjusted_p_value')

class AIChatView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        job_id = request.data.get('job_id')
        user_message = request.data.get('user_message')
        context_type = request.data.get('context_type', 'general')
        
        if not job_id or not user_message:
            return Response({'error': 'job_id and user_message are required'}, status=status.HTTP_400_BAD_REQUEST)
            
        job = get_object_or_404(AnalysisJob, id=job_id, user=request.user)
        
        # Create AI chat record
        chat = RNASeqAIChat.objects.create(
            job=job,
            user_message=user_message,
            ai_response="Processing your request...",
            context_data={'context_type': context_type}
        )
        
        return Response({
            'message': 'AI chat processing started',
            'chat_id': chat.id
        }, status=status.HTTP_202_ACCEPTED)
    
    def get(self, request, job_id):
        job = get_object_or_404(AnalysisJob, id=job_id, user=request.user)
        chats = RNASeqAIChat.objects.filter(job=job).order_by('-created_at')[:20]
        serializer = RNASeqAIChatSerializer(chats, many=True)
        return Response(serializer.data)

class DownloadUpstreamResultsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, job_id):
        job = get_object_or_404(AnalysisJob, id=job_id, user=request.user)
        
        if not job.expression_matrix_output:
            return Response(
                {'error': 'No upstream results available for download'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        file_path = job.expression_matrix_output.path
        if not os.path.exists(file_path):
            return Response(
                {'error': 'File not found on server'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        response = FileResponse(
            open(file_path, 'rb'),
            as_attachment=True,
            filename=f"{job.name}_expression_matrix.csv"
        )
        return response

class ContinueToDownstreamView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, job_id):
        job = get_object_or_404(AnalysisJob, id=job_id, user=request.user)
        
        if job.status != 'upstream_complete':
            return Response(
                {'error': 'Upstream processing must be completed first'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update job to downstream stage
        job.selected_pipeline_stage = 'downstream'
        job.save()
        
        return Response({
            'message': 'Ready for downstream analysis',
            'job_id': str(job.id)
        }, status=status.HTTP_200_OK)

class CreatePresentationFromRNASeqView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = CreateRNASeqPresentationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        job_id = serializer.validated_data['job_id']
        title = serializer.validated_data['title']
        quality = serializer.validated_data['quality']
        
        # Check if job exists and belongs to user
        job = get_object_or_404(AnalysisJob, id=job_id, user=request.user)
        
        if job.status != 'completed':
            return Response(
                {'error': 'RNA-seq analysis must be completed before creating presentation'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Deduct credits for presentation creation
            deduct_credit_for_presentation(request.user, quality)
            
            # Create presentation asynchronously
            task = create_rnaseq_presentation.delay(
                job_id=str(job_id),
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
    
    def get(self, request, job_id):
        job = get_object_or_404(AnalysisJob, id=job_id, user=request.user)
        
        # Get available actions based on current status
        available_actions = []
        if job.status == 'upstream_complete':
            available_actions.append('download_matrix')
            available_actions.append('continue_downstream')
        elif job.status == 'completed':
            available_actions.append('create_presentation')
            available_actions.append('download_results')
        
        return Response({
            'status': job.status,
            'dataset_type': job.dataset_type,
            'selected_pipeline_stage': job.selected_pipeline_stage,
            'is_multi_sample': job.is_multi_sample,
            'sample_count': job.sample_count,
            'results_count': job.results_count,
            'clusters_count': job.clusters_count if job.dataset_type == 'single_cell' else 0,
            'pathways_count': job.pathways_count,
            'current_step': job.current_step,
            'current_step_name': job.current_step_name,
            'progress_percentage': job.progress_percentage,
            'total_steps': job.total_steps,
            'available_actions': available_actions,
            'upstream_files': {
                'qc_report': bool(job.qc_report),
                'expression_matrix_output': bool(job.expression_matrix_output),
            },
            'downstream_files': {
                'results_file': bool(job.results_file),
                'visualization_image': bool(job.visualization_image),
            },
            'created_at': job.created_at,
            'updated_at': job.updated_at
        })

class BulkRNASeqPipelineView(APIView):
    """
    Comprehensive view for bulk RNA-seq pipeline management
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, job_id):
        job = get_object_or_404(AnalysisJob, id=job_id, user=request.user)
        
        if job.dataset_type != 'bulk':
            return Response(
                {'error': 'This endpoint is for bulk RNA-seq jobs only'},
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
            'job': AnalysisJobSerializer(job, context={'request': request}).data,
            'pipeline_info': {
                'upstream_steps': upstream_steps,
                'downstream_options': downstream_options,
                'typical_runtime': '30-120 minutes for upstream, 10-30 minutes for downstream'
            },
            'ai_chats': RNASeqAIChatSerializer(
                job.ai_chats.all()[:10], many=True
            ).data
        })

class SingleCellRNASeqPipelineView(APIView):
    """
    Comprehensive view for single-cell RNA-seq pipeline management
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, job_id):
        job = get_object_or_404(AnalysisJob, id=job_id, user=request.user)
        
        if job.dataset_type != 'single_cell':
            return Response(
                {'error': 'This endpoint is for single-cell RNA-seq jobs only'},
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
            'job': AnalysisJobSerializer(job, context={'request': request}).data,
            'pipeline_info': {
                'upstream_steps': upstream_steps,
                'downstream_options': downstream_options,
                'typical_runtime': '45-180 minutes for upstream, 15-45 minutes for downstream'
            },
            'clusters': RNASeqClusterSerializer(job.clusters.all(), many=True).data,
            'ai_chats': RNASeqAIChatSerializer(
                job.ai_chats.all()[:10], many=True
            ).data
        })