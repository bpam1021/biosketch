from django.contrib import admin
from .models import RNASeqDataset, RNASeqAnalysisResult, RNASeqPresentation

@admin.register(RNASeqDataset)
class RNASeqDatasetAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'organism', 'analysis_type', 'status', 'created_at']
    list_filter = ['organism', 'analysis_type', 'status', 'created_at']
    search_fields = ['name', 'user__username', 'description']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(RNASeqAnalysisResult)
class RNASeqAnalysisResultAdmin(admin.ModelAdmin):
    list_display = ['gene_id', 'gene_name', 'dataset', 'log2_fold_change', 'p_value']
    list_filter = ['dataset', 'chromosome', 'gene_type']
    search_fields = ['gene_id', 'gene_name', 'description']

@admin.register(RNASeqPresentation)
class RNASeqPresentationAdmin(admin.ModelAdmin):
    list_display = ['dataset', 'presentation', 'slide_order', 'created_at']
    list_filter = ['created_at']