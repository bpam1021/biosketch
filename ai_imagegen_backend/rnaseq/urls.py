from django.urls import path
from .views import (
    AnalysisJobListCreateView,
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
    PipelineStepsView,
    DownloadResultsView,
)

urlpatterns = [
    # Analysis Job management (primary endpoints)
    path('jobs/', AnalysisJobListCreateView.as_view(), name='rnaseq-job-list'),
    path('jobs/<uuid:pk>/', AnalysisJobDetailView.as_view(), name='rnaseq-job-detail'),
    path('jobs/multi-sample/', MultiSampleUploadView.as_view(), name='rnaseq-multi-sample-upload'),
    
    # Pipeline processing
    path('jobs/<uuid:job_id>/upstream/start/', StartUpstreamProcessingView.as_view(), name='rnaseq-upstream-start'),
    path('jobs/<uuid:job_id>/downstream/start/', StartDownstreamAnalysisView.as_view(), name='rnaseq-downstream-start'),
    path('jobs/<uuid:job_id>/continue-downstream/', ContinueToDownstreamView.as_view(), name='rnaseq-continue-downstream'),
    
    # Downloads
    path('jobs/<uuid:job_id>/download-upstream/', DownloadUpstreamResultsView.as_view(), name='rnaseq-download-upstream'),
    path('jobs/<uuid:job_id>/download-results/', DownloadResultsView.as_view(), name='rnaseq-download-results'),
    
    # Analysis results
    path('jobs/<uuid:job_id>/results/', RNASeqAnalysisResultsView.as_view(), name='rnaseq-results'),
    path('jobs/<uuid:job_id>/clusters/', RNASeqClustersView.as_view(), name='rnaseq-clusters'),
    path('jobs/<uuid:job_id>/pathways/', RNASeqPathwayResultsView.as_view(), name='rnaseq-pathways'),
    path('jobs/<uuid:job_id>/status/', RNASeqAnalysisStatusView.as_view(), name='rnaseq-status'),
    path('jobs/<uuid:job_id>/steps/', PipelineStepsView.as_view(), name='rnaseq-pipeline-steps'),
    
    # AI Chat - Updated to match frontend expectations
    path('ai-chat/', AIChatView.as_view(), name='rnaseq-ai-chat-create'),
    path('jobs/<uuid:job_id>/ai-chat/', AIChatView.as_view(), name='rnaseq-ai-chat'),
    
    # Pipeline-specific views
    path('bulk/<uuid:job_id>/', BulkRNASeqPipelineView.as_view(), name='bulk-rnaseq-pipeline'),
    path('single-cell/<uuid:job_id>/', SingleCellRNASeqPipelineView.as_view(), name='sc-rnaseq-pipeline'),
    
    # Presentations
    path('presentations/create/', CreatePresentationFromRNASeqView.as_view(), name='rnaseq-create-presentation'),
]