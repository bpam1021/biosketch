from rest_framework import serializers
from .models import RNASeqDataset, RNASeqAnalysisResult, RNASeqPresentation
from users.models import Presentation

class RNASeqDatasetSerializer(serializers.ModelSerializer):
    results_count = serializers.SerializerMethodField()
    
    class Meta:
        model = RNASeqDataset
        fields = [
            'id', 'name', 'description', 'organism', 'analysis_type',
            'status', 'counts_file', 'metadata_file', 'results_file',
            'visualization_image', 'created_at', 'updated_at', 'results_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'status', 'results_file', 'visualization_image']
    
    def get_results_count(self, obj):
        return obj.analysis_results.count()

class RNASeqAnalysisResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = RNASeqAnalysisResult
        fields = [
            'gene_id', 'gene_name', 'log2_fold_change', 'p_value',
            'adjusted_p_value', 'base_mean', 'chromosome', 'gene_type', 'description'
        ]

class RNASeqPresentationSerializer(serializers.ModelSerializer):
    dataset_name = serializers.CharField(source='dataset.name', read_only=True)
    presentation_title = serializers.CharField(source='presentation.title', read_only=True)
    
    class Meta:
        model = RNASeqPresentation
        fields = ['id', 'dataset', 'presentation', 'slide_order', 'dataset_name', 'presentation_title', 'created_at']

class CreateRNASeqPresentationSerializer(serializers.Serializer):
    """
    Serializer for creating a presentation from RNA-seq analysis
    """
    dataset_id = serializers.UUIDField()
    title = serializers.CharField(max_length=255)
    include_methods = serializers.BooleanField(default=True)
    include_results = serializers.BooleanField(default=True)
    include_discussion = serializers.BooleanField(default=True)
    quality = serializers.ChoiceField(choices=['low', 'medium', 'high'], default='medium')