from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.conf import settings
from django.http import HttpResponse, FileResponse
from django.core.files.storage import default_storage
from .models import (
    AnalysisJob, RNASeqAnalysisResult, RNASeqPresentation,
    RNASeqCluster, RNASeqPathwayResult, RNASeqAIChat, PipelineStep
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
    create_rnaseq_presentation, process_ai_chat_request
)
from users.views.credit_views import deduct_credit_for_presentation
import os
import json
import tempfile
import zipfile
import logging

logger = logging.getLogger(__name__)

class AnalysisJobListCreateView(generics.ListCreateAPIView):
    serializer_class = AnalysisJobSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        return AnalysisJob.objects.filter(user=self.request.user).order_by('-created_at')
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CreateAnalysisJobSerializer
        return AnalysisJobSerializer
    
    def perform_create(self, serializer):
        job = serializer.save(user=self.request.user)
        
        # Auto-start pipeline if files are provided
        if job.selected_pipeline_stage == 'upstream' and job.fastq_files:
            process_upstream_pipeline.delay(str(job.id))
        elif job.selected_pipeline_stage == 'downstream' and job.expression_matrix:
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
        try:
            serializer = MultiSampleUploadSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            pipeline_stage = serializer.validated_data['selected_pipeline_stage']
            
            # Validate file requirements
            if pipeline_stage == 'upstream':
                fastq_files = request.FILES.getlist('fastq_files')
                if len(fastq_files) < 2:
                    return Response(
                        {'error': 'At least 2 FASTQ files required for upstream processing (R1 and R2)'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                if len(fastq_files) % 2 != 0:
                    return Response(
                        {'error': 'FASTQ files must be in pairs (R1 and R2 for each sample)'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                if 'expression_matrix' not in request.FILES:
                    return Response(
                        {'error': 'Expression matrix file required for downstream analysis'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Create analysis job
            with transaction.atomic():
                job = AnalysisJob.objects.create(
                    user=request.user,
                    name=serializer.validated_data['name'],
                    description=serializer.validated_data.get('description', ''),
                    dataset_type=serializer.validated_data['dataset_type'],
                    organism=serializer.validated_data['organism'],
                    selected_pipeline_stage=pipeline_stage,
                    is_multi_sample=serializer.validated_data.get('is_multi_sample', False),
                    user_hypothesis=serializer.validated_data.get('user_hypothesis', ''),
                    enable_ai_interpretation=True,
                )
                
                # Handle file uploads
                job_dir = job.get_job_directory()
                os.makedirs(job_dir, exist_ok=True)
                
                if pipeline_stage == 'upstream':
                    fastq_files = request.FILES.getlist('fastq_files')
                    fastq_pairs = []
                    
                    # Process FASTQ files in pairs
                    for i in range(0, len(fastq_files), 2):
                        if i + 1 < len(fastq_files):
                            sample_num = (i // 2) + 1
                            
                            # Save R1 file
                            r1_file = fastq_files[i]
                            r1_filename = f'sample_{sample_num}_R1.fastq.gz'
                            r1_path = os.path.join(job_dir, r1_filename)
                            with open(r1_path, 'wb+') as destination:
                                for chunk in r1_file.chunks():
                                    destination.write(chunk)
                            
                            # Save R2 file
                            r2_file = fastq_files[i+1]
                            r2_filename = f'sample_{sample_num}_R2.fastq.gz'
                            r2_path = os.path.join(job_dir, r2_filename)
                            with open(r2_path, 'wb+') as destination:
                                for chunk in r2_file.chunks():
                                    destination.write(chunk)
                            
                            fastq_pairs.append({
                                'sample_id': f'sample_{sample_num}',
                                'r1_file': r1_path,
                                'r2_file': r2_path,
                                'r1_size': r1_file.size,
                                'r2_size': r2_file.size,
                                'condition': f'condition_{(sample_num - 1) % 2 + 1}',  # Alternate conditions
                                'batch': '1'
                            })
                    
                    job.fastq_files = fastq_pairs
                    job.sample_count = len(fastq_pairs)
                    job.num_samples = len(fastq_pairs)
                else:
                    # Save expression matrix
                    expr_file = request.FILES['expression_matrix']
                    job.expression_matrix = expr_file
                    job.sample_count = 1
                
                # Save metadata file if provided
                if 'metadata_file' in request.FILES:
                    job.metadata_file = request.FILES['metadata_file']
                
                job.save()
            
            # Start processing
            if pipeline_stage == 'upstream':
                process_upstream_pipeline.delay(str(job.id))
            else:
                process_downstream_analysis.delay(str(job.id))
            
            return Response({
                'message': 'Analysis job created and processing started',
                'job_id': str(job.id),
                'job': AnalysisJobSerializer(job, context={'request': request}).data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error creating multi-sample job: {str(e)}")
            return Response(
                {'error': f'Failed to create analysis job: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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
        
        if job.status in ['processing_upstream', 'processing_downstream']:
            return Response(
                {'error': 'Analysis is already in progress'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update job config
        job.processing_config.update({
            'reference_genome': serializer.validated_data.get('reference_genome', 'hg38'),
            'processing_threads': serializer.validated_data.get('processing_threads', 8),
            'memory_limit': serializer.validated_data.get('memory_limit', '32G'),
        })
        job.status = 'pending'
        job.save()
        
        # Start upstream processing
        task = process_upstream_pipeline.delay(str(job.id))
        
        return Response({
            'message': 'Upstream processing started',
            'job_id': str(job.id),
            'task_id': task.id
        }, status=status.HTTP_202_ACCEPTED)

class StartDownstreamAnalysisView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, job_id):
        serializer = DownstreamAnalysisSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        job = get_object_or_404(AnalysisJob, id=job_id, user=request.user)
        
        # Check prerequisites
        if not job.expression_matrix and not job.expression_matrix_output:
            return Response(
                {'error': 'Expression matrix is required for downstream analysis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if job.status in ['processing_upstream', 'processing_downstream']:
            return Response(
                {'error': 'Analysis is already in progress'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update job config
        job.processing_config.update({
            'comparison_groups': serializer.validated_data.get('comparison_groups', {}),
            'statistical_thresholds': serializer.validated_data.get('statistical_thresholds', {}),
        })
        job.status = 'pending'
        job.save()
        
        # Start downstream analysis
        task = process_downstream_analysis.delay(str(job.id))
        
        return Response({
            'message': 'Downstream analysis started',
            'job_id': str(job.id),
            'task_id': task.id
        }, status=status.HTTP_202_ACCEPTED)

class RNASeqAnalysisResultsView(generics.ListAPIView):
    serializer_class = RNASeqAnalysisResultSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        job_id = self.kwargs['job_id']
        job = get_object_or_404(AnalysisJob, id=job_id, user=self.request.user)
        
        queryset = RNASeqAnalysisResult.objects.filter(job=job)
        
        # Apply filters
        significant_only = self.request.query_params.get('significant_only')
        if significant_only == 'true':
            queryset = queryset.filter(adjusted_p_value__lt=0.05)
        
        cluster = self.request.query_params.get('cluster')
        if cluster:
            queryset = queryset.filter(cluster=cluster)
        
        return queryset.order_by('adjusted_p_value')

class RNASeqClustersView(generics.ListAPIView):
    serializer_class = RNASeqClusterSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        job_id = self.kwargs['job_id']
        job = get_object_or_404(AnalysisJob, id=job_id, user=self.request.user)
        return RNASeqCluster.objects.filter(job=job).order_by('cluster_id')

class RNASeqPathwayResultsView(generics.ListAPIView):
    serializer_class = RNASeqPathwayResultSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        job_id = self.kwargs['job_id']
        job = get_object_or_404(AnalysisJob, id=job_id, user=self.request.user)
        
        queryset = RNASeqPathwayResult.objects.filter(job=job)
        
        # Apply filters
        database = self.request.query_params.get('database')
        if database:
            queryset = queryset.filter(database=database)
        
        significant_only = self.request.query_params.get('significant_only')
        if significant_only == 'true':
            queryset = queryset.filter(adjusted_p_value__lt=0.05)
        
        return queryset.order_by('adjusted_p_value')

class AIChatView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        job_id = request.data.get('job_id')
        user_message = request.data.get('user_message')
        context_type = request.data.get('context_type', 'general')
        
        if not job_id or not user_message:
            return Response(
                {'error': 'job_id and user_message are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        job = get_object_or_404(AnalysisJob, id=job_id, user=request.user)
        
        # Create AI chat record
        chat = RNASeqAIChat.objects.create(
            job=job,
            user_message=user_message,
            ai_response="Processing your request...",
            context_data={'context_type': context_type},
            context_type=context_type
        )
        
        # Process AI request asynchronously
        process_ai_chat_request.delay(chat.id, str(job_id), user_message, context_type)
        
        return Response({
            'message': 'AI chat processing started',
            'chat_id': chat.id,
            'chat': RNASeqAIChatSerializer(chat).data
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
        
        if job.status not in ['upstream_complete', 'completed']:
            return Response(
                {'error': 'Upstream processing not completed yet'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create a zip file with all upstream results
        temp_dir = tempfile.mkdtemp()
        zip_path = os.path.join(temp_dir, f"{job.name}_upstream_results.zip")
        
        try:
            with zipfile.ZipFile(zip_path, 'w') as zip_file:
                # Add expression matrix
                if job.expression_matrix_output and os.path.exists(job.expression_matrix_output.path):
                    zip_file.write(job.expression_matrix_output.path, 'expression_matrix.csv')
                
                # Add QC report
                if job.qc_report and os.path.exists(job.qc_report.path):
                    zip_file.write(job.qc_report.path, 'qc_report.html')
                
                # Add metadata
                if job.metadata_file and os.path.exists(job.metadata_file.path):
                    zip_file.write(job.metadata_file.path, 'metadata.csv')
                
                # Add job summary
                summary = {
                    'job_name': job.name,
                    'dataset_type': job.dataset_type,
                    'organism': job.organism,
                    'sample_count': job.sample_count,
                    'genes_quantified': job.genes_quantified,
                    'total_reads': job.total_reads,
                    'mapped_reads': job.mapped_reads,
                    'alignment_rate': job.alignment_rate,
                    'created_at': job.created_at.isoformat(),
                    'completed_at': job.completed_at.isoformat() if job.completed_at else None
                }
                
                summary_path = os.path.join(temp_dir, 'summary.json')
                with open(summary_path, 'w') as f:
                    json.dump(summary, f, indent=2)
                zip_file.write(summary_path, 'summary.json')
            
            # Return the zip file
            response = FileResponse(
                open(zip_path, 'rb'),
                as_attachment=True,
                filename=f"{job.name}_upstream_results.zip"
            )
            return response
            
        except Exception as e:
            logger.error(f"Error creating upstream results zip: {str(e)}")
            return Response(
                {'error': 'Failed to create results archive'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ContinueToDownstreamView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, job_id):
        job = get_object_or_404(AnalysisJob, id=job_id, user=request.user)
        
        if job.status != 'upstream_complete':
            return Response(
                {'error': 'Upstream processing must be completed first'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not job.expression_matrix_output:
            return Response(
                {'error': 'No expression matrix available from upstream processing'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update job to downstream stage
        job.selected_pipeline_stage = 'downstream'
        job.current_step = 0
        job.progress_percentage = 0
        job.save()
        
        # Start downstream analysis
        task = process_downstream_analysis.delay(str(job.id))
        
        return Response({
            'message': 'Downstream analysis started',
            'job_id': str(job.id),
            'task_id': task.id
        }, status=status.HTTP_202_ACCEPTED)

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
        
        # Get pipeline steps
        pipeline_steps = PipelineStep.objects.filter(job=job).order_by('step_number')
        
        # Get available actions based on current status
        available_actions = []
        if job.status == 'upstream_complete':
            available_actions.extend(['download_matrix', 'continue_downstream'])
        elif job.status == 'completed':
            available_actions.extend(['create_presentation', 'download_results', 'view_results'])
        
        # Check available files
        available_files = job.get_available_files()
        
        return Response({
            'job_id': str(job.id),
            'name': job.name,
            'status': job.status,
            'dataset_type': job.dataset_type,
            'selected_pipeline_stage': job.selected_pipeline_stage,
            'is_multi_sample': job.is_multi_sample,
            'sample_count': job.sample_count,
            'organism': job.organism,
            
            # Progress information
            'current_step': job.current_step,
            'current_step_name': job.current_step_name,
            'progress_percentage': job.progress_percentage,
            'total_steps': job.total_steps,
            
            # Results metrics
            'results_count': job.results_count,
            'clusters_count': job.clusters_count if job.dataset_type == 'single_cell' else 0,
            'pathways_count': job.pathways_count,
            'genes_quantified': job.genes_quantified,
            'significant_genes': job.significant_genes,
            'enriched_pathways': job.enriched_pathways,
            
            # Single-cell specific metrics
            'cells_detected': job.cells_detected if job.dataset_type == 'single_cell' else 0,
            'cell_clusters': job.cell_clusters if job.dataset_type == 'single_cell' else 0,
            
            # Processing metrics
            'total_reads': job.total_reads,
            'mapped_reads': job.mapped_reads,
            'alignment_rate': job.alignment_rate,
            
            # Pipeline steps
            'pipeline_steps': [
                {
                    'step_number': step.step_number,
                    'step_name': step.step_name,
                    'status': step.status,
                    'duration_seconds': step.duration_seconds,
                    'started_at': step.started_at,
                    'completed_at': step.completed_at,
                    'error_message': step.error_message if step.status == 'failed' else None
                }
                for step in pipeline_steps
            ],
            
            # Available actions and files
            'available_actions': available_actions,
            'available_files': available_files,
            
            # Error information
            'error_message': job.error_message if job.status == 'failed' else None,
            
            # Timestamps
            'created_at': job.created_at,
            'started_at': job.started_at,
            'completed_at': job.completed_at,
            'updated_at': job.updated_at,
            'duration_minutes': job.duration_minutes
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
        
        downstream_steps = [
            'Sample Clustering & PCA',
            'Differential Expression Analysis',
            'Pathway Enrichment Analysis',
            'Gene Signature Analysis'
        ]
        
        # Get recent AI chats
        recent_chats = RNASeqAIChat.objects.filter(job=job).order_by('-created_at')[:10]
        
        # Get pipeline configuration
        pipeline_config = settings.PIPELINE_CONFIG.get('BULK_RNASEQ', {})
        
        return Response({
            'job': AnalysisJobSerializer(job, context={'request': request}).data,
            'pipeline_info': {
                'upstream_steps': upstream_steps,
                'downstream_steps': downstream_steps,
                'typical_runtime': {
                    'upstream': '30-120 minutes',
                    'downstream': '10-30 minutes'
                },
                'supported_organisms': ['human', 'mouse', 'rat'],
                'reference_genomes': ['hg38', 'hg19', 'mm10', 'rn6'],
                'pipeline_tools': {
                    'quality_control': 'FastQC',
                    'trimming': 'Trimmomatic',
                    'alignment': 'STAR',
                    'quantification': 'RSEM',
                    'analysis': 'DESeq2, edgeR'
                }
            },
            'configuration': {
                'available_databases': pipeline_config.get('PATHWAY_DATABASES', []),
                'default_thresholds': settings.ANALYSIS_CONFIG.get('BULK_RNASEQ', {}).get('DEFAULT_THRESHOLDS', {})
            },
            'ai_chats': RNASeqAIChatSerializer(recent_chats, many=True).data
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
            'Quality Control',
            'Barcode Processing (UMI-tools)',
            'Read Alignment (STAR Solo)',
            'Cell Filtering & Quality Control',
            'Cell-Gene Matrix Generation'
        ]
        
        downstream_steps = [
            'Quality Control & Normalization',
            'Dimensionality Reduction (PCA, UMAP)',
            'Cell Clustering (Leiden)',
            'Cell Type Annotation',
            'Differential Expression Analysis'
        ]
        
        # Get clusters information
        clusters = RNASeqCluster.objects.filter(job=job).order_by('cluster_id')
        
        # Get recent AI chats
        recent_chats = RNASeqAIChat.objects.filter(job=job).order_by('-created_at')[:10]
        
        # Get pipeline configuration
        pipeline_config = settings.PIPELINE_CONFIG.get('SCRNA_SEQ', {})
        analysis_config = settings.ANALYSIS_CONFIG.get('SCRNA_SEQ', {})
        
        return Response({
            'job': AnalysisJobSerializer(job, context={'request': request}).data,
            'pipeline_info': {
                'upstream_steps': upstream_steps,
                'downstream_steps': downstream_steps,
                'typical_runtime': {
                    'upstream': '45-180 minutes',
                    'downstream': '15-45 minutes'
                },
                'supported_chemistry': ['10X Genomics v2', '10X Genomics v3', 'Drop-seq'],
                'supported_organisms': ['human', 'mouse'],
                'pipeline_tools': {
                    'alignment': 'STAR Solo',
                    'barcode_processing': 'UMI-tools',
                    'analysis': 'Scanpy, Seurat',
                    'cell_typing': 'CellTypist, SingleR'
                }
            },
            'configuration': {
                'qc_thresholds': analysis_config.get('QC_THRESHOLDS', {}),
                'clustering_resolutions': analysis_config.get('CLUSTERING_RESOLUTION', []),
                'annotation_databases': analysis_config.get('ANNOTATION_DATABASES', [])
            },
            'clusters': RNASeqClusterSerializer(clusters, many=True).data,
            'ai_chats': RNASeqAIChatSerializer(recent_chats, many=True).data
        })

class PipelineStepsView(APIView):
    """
    View to get detailed pipeline step information
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, job_id):
        job = get_object_or_404(AnalysisJob, id=job_id, user=request.user)
        steps = PipelineStep.objects.filter(job=job).order_by('step_number')
        
        steps_data = []
        for step in steps:
            step_data = {
                'step_number': step.step_number,
                'step_name': step.step_name,
                'status': step.status,
                'started_at': step.started_at,
                'completed_at': step.completed_at,
                'duration_seconds': step.duration_seconds,
                'metrics': step.metrics,
                'input_files': step.input_files,
                'output_files': step.output_files,
                'parameters': step.parameters,
                'error_message': step.error_message
            }
            steps_data.append(step_data)
        
        return Response({
            'job_id': str(job.id),
            'total_steps': len(steps_data),
            'completed_steps': len([s for s in steps if s.status == 'completed']),
            'failed_steps': len([s for s in steps if s.status == 'failed']),
            'steps': steps_data
        })

class DownloadResultsView(APIView):
    """
    Download all analysis results
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, job_id):
        job = get_object_or_404(AnalysisJob, id=job_id, user=request.user)
        
        if job.status != 'completed':
            return Response(
                {'error': 'Analysis must be completed before downloading results'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create a comprehensive results zip
        temp_dir = tempfile.mkdtemp()
        zip_path = os.path.join(temp_dir, f"{job.name}_complete_results.zip")
        
        try:
            with zipfile.ZipFile(zip_path, 'w') as zip_file:
                # Add all available files
                available_files = job.get_available_files()
                
                for file_key, file_info in available_files.items():
                    if file_info['path'] and os.path.exists(file_info['path'].lstrip('/')):
                        file_path = file_info['path'].lstrip('/')
                        if file_path.startswith('media/'):
                            file_path = file_path[6:]  # Remove 'media/' prefix
                        
                        full_path = os.path.join(settings.MEDIA_ROOT, file_path)
                        if os.path.exists(full_path):
                            zip_file.write(full_path, f"{file_info['type']}/{file_info['name']}")
                
                # Add comprehensive summary
                summary = {
                    'analysis_summary': {
                        'job_name': job.name,
                        'dataset_type': job.dataset_type,
                        'organism': job.organism,
                        'sample_count': job.sample_count,
                        'analysis_completed': job.completed_at.isoformat() if job.completed_at else None
                    },
                    'processing_metrics': {
                        'genes_quantified': job.genes_quantified,
                        'total_reads': job.total_reads,
                        'mapped_reads': job.mapped_reads,
                        'alignment_rate': job.alignment_rate
                    },
                    'analysis_results': {
                        'significant_genes': job.significant_genes,
                        'enriched_pathways': job.enriched_pathways,
                        'total_results': job.results_count
                    }
                }
                
                if job.dataset_type == 'single_cell':
                    summary['single_cell_metrics'] = {
                        'cells_detected': job.cells_detected,
                        'cell_clusters': job.cell_clusters,
                        'clusters_count': job.clusters_count
                    }
                
                summary_path = os.path.join(temp_dir, 'analysis_summary.json')
                with open(summary_path, 'w') as f:
                    json.dump(summary, f, indent=2)
                zip_file.write(summary_path, 'analysis_summary.json')
            
            # Return the zip file
            response = FileResponse(
                open(zip_path, 'rb'),
                as_attachment=True,
                filename=f"{job.name}_complete_results.zip"
            )
            return response
            
        except Exception as e:
            logger.error(f"Error creating complete results zip: {str(e)}")
            return Response(
                {'error': 'Failed to create results archive'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )