from django.urls import path
from .views import (
    RNASeqDatasetListCreateView,
    RNASeqDatasetDetailView,
    AnalysisJobListView,
    AnalysisJobDetailView,
    StartUpstreamProcessingView,
    StartDownstreamAnalysisView,
    JobStatusUpdateView,
    RNASeqAnalysisResultsView,
    RNASeqClustersView,
    RNASeqPathwayResultsView,
    AIInterpretationListView,
    GenerateAIInterpretationView,
    AIInteractionView,
    RNASeqAnalysisStatusView,
    RNASeqVisualizationView,
    DownloadResultsView,
    BulkRNASeqPipelineView,
    SingleCellRNASeqPipelineView,
    CreatePresentationFromRNASeqView,
)

urlpatterns = [
    # Dataset management
    path('datasets/', RNASeqDatasetListCreateView.as_view(), name='rnaseq-dataset-list'),
    path('datasets/<uuid:pk>/', RNASeqDatasetDetailView.as_view(), name='rnaseq-dataset-detail'),
    
    # Job management
    path('jobs/', AnalysisJobListView.as_view(), name='rnaseq-job-list'),
    path('jobs/<uuid:pk>/', AnalysisJobDetailView.as_view(), name='rnaseq-job-detail'),
    path('datasets/<uuid:dataset_id>/jobs/', AnalysisJobListView.as_view(), name='rnaseq-dataset-jobs'),
    path('jobs/<uuid:job_id>/status/', JobStatusUpdateView.as_view(), name='rnaseq-job-status-update'),
    
    # Pipeline processing
    path('datasets/<uuid:dataset_id>/upstream/start/', StartUpstreamProcessingView.as_view(), name='rnaseq-upstream-start'),
    path('datasets/<uuid:dataset_id>/downstream/start/', StartDownstreamAnalysisView.as_view(), name='rnaseq-downstream-start'),
    
    # Analysis results
    path('datasets/<uuid:dataset_id>/results/', RNASeqAnalysisResultsView.as_view(), name='rnaseq-results'),
    path('datasets/<uuid:dataset_id>/clusters/', RNASeqClustersView.as_view(), name='rnaseq-clusters'),
    path('datasets/<uuid:dataset_id>/pathways/', RNASeqPathwayResultsView.as_view(), name='rnaseq-pathways'),
    path('datasets/<uuid:dataset_id>/status/', RNASeqAnalysisStatusView.as_view(), name='rnaseq-status'),
    
    # AI interactions and interpretations
    path('datasets/<uuid:dataset_id>/ai-interpretations/', AIInterpretationListView.as_view(), name='rnaseq-ai-interpretations'),
    path('datasets/<uuid:dataset_id>/ai-interpretations/generate/', GenerateAIInterpretationView.as_view(), name='rnaseq-generate-ai-interpretation'),
    path('datasets/<uuid:dataset_id>/ai/', AIInteractionView.as_view(), name='rnaseq-ai-interaction'),
    path('ai/interact/', AIInteractionView.as_view(), name='rnaseq-ai-interact'),
    
    # Visualizations
    path('datasets/<uuid:dataset_id>/visualize/', RNASeqVisualizationView.as_view(), name='rnaseq-visualize'),
    
    # Downloads
    path('datasets/<uuid:dataset_id>/download/', DownloadResultsView.as_view(), name='rnaseq-download'),
    
    # Pipeline-specific views
    path('bulk/<uuid:dataset_id>/', BulkRNASeqPipelineView.as_view(), name='bulk-rnaseq-pipeline'),
    path('single-cell/<uuid:dataset_id>/', SingleCellRNASeqPipelineView.as_view(), name='sc-rnaseq-pipeline'),
    
    # Presentations
    path('presentations/create/', CreatePresentationFromRNASeqView.as_view(), name='create-rnaseq-presentation'),
]