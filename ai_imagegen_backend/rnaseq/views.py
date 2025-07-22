from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.db import transaction
from .models import RNASeqDataset, RNASeqAnalysisResult, RNASeqPresentation
from .serializers import (
    RNASeqDatasetSerializer, RNASeqAnalysisResultSerializer,
    RNASeqPresentationSerializer, CreateRNASeqPresentationSerializer
)
from .tasks import process_rnaseq_analysis, create_rnaseq_presentation
from users.views.credit_views import deduct_credit_for_presentation

class RNASeqDatasetListCreateView(generics.ListCreateAPIView):
    serializer_class = RNASeqDatasetSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        return RNASeqDataset.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        dataset = serializer.save(user=self.request.user)
        # Trigger async analysis
        process_rnaseq_analysis.delay(dataset.id)

class RNASeqDatasetDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RNASeqDatasetSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return RNASeqDataset.objects.filter(user=self.request.user)

class RNASeqAnalysisResultsView(generics.ListAPIView):
    serializer_class = RNASeqAnalysisResultSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        dataset_id = self.kwargs['dataset_id']
        dataset = get_object_or_404(RNASeqDataset, id=dataset_id, user=self.request.user)
        return RNASeqAnalysisResult.objects.filter(dataset=dataset)

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
        
        return Response({
            'status': dataset.status,
            'results_count': dataset.analysis_results.count(),
            'has_visualization': bool(dataset.visualization_image),
            'created_at': dataset.created_at,
            'updated_at': dataset.updated_at
        })

class RNASeqVisualizationView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, dataset_id):
        dataset = get_object_or_404(RNASeqDataset, id=dataset_id, user=request.user)
        
        if dataset.status != 'completed':
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