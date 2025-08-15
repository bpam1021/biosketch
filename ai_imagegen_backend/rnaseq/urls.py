from django.urls import path
from .views import (
    RNASeqDatasetListCreateView,
    RNASeqDatasetDetailView,
    AnalysisJobListView,
    AnalysisJobDetailView,
    StartUpstreamProcessingView,
    StartDownstreamAnalysisView,
    RNASeqAnalysisResultsView,
    RNASeqClustersView,
    RNASeqPathwayResultsView,
    AIChatView,
    DownloadUpstreamResultsView,
    ContinueToDownstreamView,
    CreatePresentationFromRNASeqView,
    RNASeqAnalysisStatusView,
    BulkRNASeqPipelineView,
    SingleCellRNASeqPipelineView,
    MultiSampleUploadView,
)

urlpatterns = [
    # Dataset management
    path('datasets/', RNASeqDatasetListCreateView.as_view(), name='rnaseq-dataset-list'),
    path('datasets/<uuid:pk>/', RNASeqDatasetDetailView.as_view(), name='rnaseq-dataset-detail'),
    path('datasets/multi-sample/', MultiSampleUploadView.as_view(), name='rnaseq-multi-sample-upload'),
    
    # Job management
    path('jobs/', AnalysisJobListView.as_view(), name='rnaseq-job-list'),
    path('jobs/<uuid:pk>/', AnalysisJobDetailView.as_view(), name='rnaseq-job-detail'),
    path('datasets/<uuid:dataset_id>/jobs/', AnalysisJobListView.as_view(), name='rnaseq-dataset-jobs'),
    
    # Pipeline processing
    path('datasets/<uuid:dataset_id>/upstream/start/', StartUpstreamProcessingView.as_view(), name='rnaseq-upstream-start'),
    path('datasets/<uuid:dataset_id>/downstream/start/', StartDownstreamAnalysisView.as_view(), name='rnaseq-downstream-start'),
    path('datasets/<uuid:dataset_id>/continue-downstream/', ContinueToDownstreamView.as_view(), name='rnaseq-continue-downstream'),
    
    # Downloads
    path('datasets/<uuid:dataset_id>/download-upstream/', DownloadUpstreamResultsView.as_view(), name='rnaseq-download-upstream'),
    
    # Analysis results
    path('datasets/<uuid:dataset_id>/results/', RNASeqAnalysisResultsView.as_view(), name='rnaseq-results'),
    path('datasets/<uuid:dataset_id>/clusters/', RNASeqClustersView.as_view(), name='rnaseq-clusters'),
    path('datasets/<uuid:dataset_id>/pathways/', RNASeqPathwayResultsView.as_view(), name='rnaseq-pathways'),
    path('datasets/<uuid:dataset_id>/status/', RNASeqAnalysisStatusView.as_view(), name='rnaseq-status'),
    
    # AI Chat
    path('datasets/<uuid:dataset_id>/ai-chat/', AIChatView.as_view(), name='rnaseq-ai-chat'),
    path('datasets/<uuid:dataset_id>/ai-chat/', AIChatView.as_view(), name='rnaseq-dataset-ai-chat'),
    
    # Pipeline-specific views
    path('bulk/<uuid:dataset_id>/', BulkRNASeqPipelineView.as_view(), name='bulk-rnaseq-pipeline'),
    path('single-cell/<uuid:dataset_id>/', SingleCellRNASeqPipelineView.as_view(), name='sc-rnaseq-pipeline'),
    
    # Presentations
    path('presentations/create/', CreatePresentationFromRNASeqView.as_view(), name='rnaseq-create-presentation'),
]