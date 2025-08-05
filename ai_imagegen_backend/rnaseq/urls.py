from django.urls import path
from .views import (
    RNASeqDatasetListCreateView,
    RNASeqDatasetDetailView,
    AnalysisJobListView,
    AnalysisJobDetailView,
    StartUpstreamProcessingView,
    StartDownstreamAnalysisView,
    JobStatusUpdateView,
    MultiSampleUploadView,
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
    PipelineValidationView,
    AnalysisConfigurationView,
    PipelineStatusDetailView,
    PipelineHealthCheckView,
    SupportedOrganismsView,
    PipelineCapabilitiesView,
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
    path('jobs/<uuid:job_id>/status/', JobStatusUpdateView.as_view(), name='rnaseq-job-status-update'),
    
    # Pipeline processing
    path('datasets/<uuid:dataset_id>/upstream/start/', StartUpstreamProcessingView.as_view(), name='rnaseq-upstream-start'),
    path('datasets/<uuid:dataset_id>/downstream/start/', StartDownstreamAnalysisView.as_view(), name='rnaseq-downstream-start'),
    # path('datasets/<uuid:dataset_id>/multi-sample/start/', StartMultiSampleProcessingView.as_view(), name='rnaseq-multi-sample-start'),
    path('datasets/<uuid:dataset_id>/pipeline/validate/', PipelineValidationView.as_view(), name='rnaseq-pipeline-validate'),
    path('datasets/<uuid:dataset_id>/pipeline/status-detail/', PipelineStatusDetailView.as_view(), name='rnaseq-pipeline-status-detail'),
    path('analysis/configuration/', AnalysisConfigurationView.as_view(), name='rnaseq-analysis-config'),
    
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
    path('datasets/<uuid:dataset_id>/visualize/<str:viz_type>/', RNASeqVisualizationView.as_view(), name='rnaseq-visualize-specific'),
    
    # Downloads
    path('datasets/<uuid:dataset_id>/download/', DownloadResultsView.as_view(), name='rnaseq-download'),
    path('datasets/<uuid:dataset_id>/download/<str:file_type>/', DownloadResultsView.as_view(), name='rnaseq-download-specific'),
    
    # Pipeline-specific views
    path('bulk/<uuid:dataset_id>/', BulkRNASeqPipelineView.as_view(), name='bulk-rnaseq-pipeline'),
    path('single-cell/<uuid:dataset_id>/', SingleCellRNASeqPipelineView.as_view(), name='sc-rnaseq-pipeline'),
    path('pipeline/<uuid:dataset_id>/status/', RNASeqAnalysisStatusView.as_view(), name='rnaseq-pipeline-status'),
    
    # Pipeline system endpoints
    path('pipeline/health/', PipelineHealthCheckView.as_view(), name='pipeline-health'),
    path('pipeline/organisms/', SupportedOrganismsView.as_view(), name='supported-organisms'),
    path('pipeline/capabilities/', PipelineCapabilitiesView.as_view(), name='pipeline-capabilities'),
    
    # Presentation creation
    path('presentations/create/', CreatePresentationFromRNASeqView.as_view(), name='create-rnaseq-presentation'),
]