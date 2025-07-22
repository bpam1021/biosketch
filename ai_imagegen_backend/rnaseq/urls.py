from django.urls import path
from .views import (
    RNASeqDatasetListCreateView,
    RNASeqDatasetDetailView,
    RNASeqAnalysisResultsView,
    CreatePresentationFromRNASeqView,
    RNASeqPresentationListView,
    RNASeqAnalysisStatusView,
    RNASeqVisualizationView,
)

urlpatterns = [
    # Dataset management
    path('datasets/', RNASeqDatasetListCreateView.as_view(), name='rnaseq-dataset-list'),
    path('datasets/<uuid:pk>/', RNASeqDatasetDetailView.as_view(), name='rnaseq-dataset-detail'),
    
    # Analysis results
    path('datasets/<uuid:dataset_id>/results/', RNASeqAnalysisResultsView.as_view(), name='rnaseq-results'),
    path('datasets/<uuid:dataset_id>/status/', RNASeqAnalysisStatusView.as_view(), name='rnaseq-status'),
    
    # Visualizations
    path('datasets/<uuid:dataset_id>/visualize/', RNASeqVisualizationView.as_view(), name='rnaseq-visualize'),
    
    # Presentations
    path('presentations/create/', CreatePresentationFromRNASeqView.as_view(), name='rnaseq-create-presentation'),
    path('presentations/', RNASeqPresentationListView.as_view(), name='rnaseq-presentation-list'),
]