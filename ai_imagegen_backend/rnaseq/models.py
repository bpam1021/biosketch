from django.db import models
from django.contrib.auth.models import User
import uuid
import json

class RNASeqDataset(models.Model):
    """
    Model to store RNA-seq dataset information
    """
    DATASET_TYPES = [
        ('bulk', 'Bulk RNA-seq'),
        ('single_cell', 'Single-cell RNA-seq'),
    ]
    
    PIPELINE_STAGES = [
        ('upstream', 'Upstream Processing'),
        ('downstream', 'Downstream Analysis'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing_upstream', 'Processing Upstream'),
        ('upstream_complete', 'Upstream Complete'),
        ('processing_downstream', 'Processing Downstream'),
        ('completed', 'Analysis Complete'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='rnaseq_datasets')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    dataset_type = models.CharField(max_length=20, choices=DATASET_TYPES, default='bulk')
    
    # Pipeline selection
    selected_pipeline_stage = models.CharField(max_length=20, choices=PIPELINE_STAGES, default='upstream')
    
    # Analysis status
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending')
    
    # Organism information
    organism = models.CharField(max_length=100, default='human')
    
    # Multi-sample support
    is_multi_sample = models.BooleanField(default=False)
    sample_count = models.IntegerField(default=1)
    
    # Upstream files (FASTQ pairs)
    fastq_files = models.JSONField(default=list, help_text="List of FASTQ file pairs")
    metadata_file = models.FileField(upload_to='rnaseq/metadata/', null=True, blank=True)
    
    # Downstream files (Expression matrix)
    expression_matrix = models.FileField(upload_to='rnaseq/matrices/', null=True, blank=True)
    
    # Upstream results
    upstream_results = models.JSONField(default=dict, help_text="Upstream processing results")
    qc_report = models.FileField(upload_to='rnaseq/qc/', null=True, blank=True)
    alignment_stats = models.JSONField(default=dict, help_text="Alignment statistics")
    expression_matrix_output = models.FileField(upload_to='rnaseq/output_matrices/', null=True, blank=True)
    
    # Downstream results
    downstream_results = models.JSONField(default=dict, help_text="Downstream analysis results")
    analysis_plots = models.JSONField(default=list, help_text="Generated visualization plots")
    
    # AI interactions
    ai_chat_history = models.JSONField(default=list, help_text="AI chatbot conversation history")
    
    # Processing configuration
    processing_config = models.JSONField(default=dict, help_text="Pipeline processing configuration")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.dataset_type}) - {self.user.username}"
    
    @property
    def get_current_job(self):
        """Get the most recent analysis job for this dataset"""
        return self.analysis_jobs.order_by('-created_at').first()
    
    def get_progress_info(self):
        """Get current progress information"""
        current_job = self.get_current_job()
        if not current_job:
            return {'status': self.status, 'progress': 0, 'step': 'No active job'}
        
        return {
            'status': current_job.status,
            'progress': current_job.progress_percentage,
            'step': current_job.current_step_name,
            'current_step': current_job.current_step,
            'total_steps': current_job.total_steps
        }

class AnalysisJob(models.Model):
    """
    Model to track RNA-seq analysis jobs and their progress
    """
    ANALYSIS_TYPES = [
        ('bulk_upstream', 'Bulk RNA-seq Upstream'),
        ('bulk_downstream', 'Bulk RNA-seq Downstream'),
        ('scrna_upstream', 'Single-cell RNA-seq Upstream'),
        ('scrna_downstream', 'Single-cell RNA-seq Downstream'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('waiting_for_input', 'Waiting for User Input'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='rnaseq_jobs')
    dataset = models.ForeignKey(RNASeqDataset, on_delete=models.CASCADE, related_name='analysis_jobs')
    analysis_type = models.CharField(max_length=30, choices=ANALYSIS_TYPES)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending')
    
    # Progress tracking
    current_step = models.IntegerField(default=0)
    current_step_name = models.CharField(max_length=200, blank=True)
    progress_percentage = models.IntegerField(default=0)
    total_steps = models.IntegerField(default=5)
    
    # Job configuration
    job_config = models.JSONField(default=dict)
    user_hypothesis = models.TextField(blank=True)
    # Results tracking
    processing_metrics = models.JSONField(default=dict, help_text="Processing metrics and statistics")
    
    # Analysis-specific metrics
    num_samples = models.IntegerField(default=0)
    total_reads = models.BigIntegerField(default=0)
    mapped_reads = models.BigIntegerField(default=0)
    alignment_rate = models.FloatField(default=0.0)
    genes_quantified = models.IntegerField(default=0)
    cells_detected = models.IntegerField(default=0)
    cell_clusters = models.IntegerField(default=0)
    significant_genes = models.IntegerField(default=0)
    enriched_pathways = models.IntegerField(default=0)
    duration_minutes = models.IntegerField(default=0)
    
    # Error handling
    error_message = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.analysis_type} job for {self.dataset.name} - {self.status}"

class PipelineStep(models.Model):
    """
    Model to track individual pipeline steps
    """
    job = models.ForeignKey(AnalysisJob, on_delete=models.CASCADE, related_name='pipeline_steps')
    step_number = models.IntegerField()
    step_name = models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ], default='pending')
    
    # Step-specific data
    input_files = models.JSONField(default=list)
    output_files = models.JSONField(default=list)
    parameters = models.JSONField(default=dict)
    metrics = models.JSONField(default=dict)
    
    # Timing
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.IntegerField(default=0)
    
    # Error handling
    error_message = models.TextField(blank=True)
    
    class Meta:
        ordering = ['step_number']
        unique_together = ('job', 'step_number')
    
    def __str__(self):
        return f"Step {self.step_number}: {self.step_name} ({self.status})"

class RNASeqAnalysisResult(models.Model):
    """
    Model to store detailed analysis results
    """
    dataset = models.ForeignKey(RNASeqDataset, on_delete=models.CASCADE, related_name='analysis_results')
    gene_id = models.CharField(max_length=100)
    gene_name = models.CharField(max_length=100, blank=True)
    
    # Differential expression results
    log2_fold_change = models.FloatField(null=True, blank=True)
    p_value = models.FloatField(null=True, blank=True)
    adjusted_p_value = models.FloatField(null=True, blank=True)
    base_mean = models.FloatField(null=True, blank=True)
    
    # Additional metadata
    chromosome = models.CharField(max_length=10, blank=True)
    gene_type = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    
    # Single-cell specific fields
    cluster = models.CharField(max_length=50, blank=True)
    cell_type = models.CharField(max_length=100, blank=True)
    avg_log2fc = models.FloatField(null=True, blank=True)
    pct_1 = models.FloatField(null=True, blank=True)
    pct_2 = models.FloatField(null=True, blank=True)
    
    class Meta:
        unique_together = ('dataset', 'gene_id', 'cluster')
        indexes = [
            models.Index(fields=['gene_id']),
            models.Index(fields=['p_value']),
            models.Index(fields=['log2_fold_change']),
            models.Index(fields=['cluster']),
        ]
    
    def __str__(self):
        return f"{self.gene_id} - {self.dataset.name}"

class RNASeqCluster(models.Model):
    """
    Model to store clustering results for single-cell data
    """
    dataset = models.ForeignKey(RNASeqDataset, on_delete=models.CASCADE, related_name='clusters')
    cluster_id = models.CharField(max_length=50)
    cluster_name = models.CharField(max_length=100, blank=True)
    cell_type = models.CharField(max_length=100, blank=True)
    cell_count = models.IntegerField(default=0)
    marker_genes = models.JSONField(default=list)
    coordinates = models.JSONField(default=dict, help_text="UMAP/tSNE coordinates")
    
    class Meta:
        unique_together = ('dataset', 'cluster_id')
    
    def __str__(self):
        return f"Cluster {self.cluster_id} - {self.dataset.name}"

class RNASeqPathwayResult(models.Model):
    """
    Model to store pathway enrichment results
    """
    dataset = models.ForeignKey(RNASeqDataset, on_delete=models.CASCADE, related_name='pathway_results')
    pathway_id = models.CharField(max_length=100)
    pathway_name = models.CharField(max_length=255)
    database = models.CharField(max_length=50, choices=[
        ('GO', 'Gene Ontology'), 
        ('KEGG', 'KEGG'), 
        ('REACTOME', 'Reactome'),
        ('HALLMARK', 'MSigDB Hallmark'),
    ])
    p_value = models.FloatField()
    adjusted_p_value = models.FloatField()
    gene_count = models.IntegerField()
    gene_list = models.JSONField(default=list)
    enrichment_score = models.FloatField(null=True, blank=True)
    
    class Meta:
        unique_together = ('dataset', 'pathway_id', 'database')
    
    def __str__(self):
        return f"{self.pathway_name} - {self.dataset.name}"

class RNASeqAIChat(models.Model):
    """
    Model to store AI chatbot interactions
    """
    dataset = models.ForeignKey(RNASeqDataset, on_delete=models.CASCADE, related_name='ai_chats')
    user_message = models.TextField()
    ai_response = models.TextField()
    context_data = models.JSONField(default=dict, help_text="Analysis context for AI response")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"AI Chat - {self.dataset.name} - {self.created_at}"

class RNASeqAIInteraction(models.Model):
    """
    Model to store AI interactions and interpretations
    """
    dataset = models.ForeignKey(RNASeqDataset, on_delete=models.CASCADE, related_name='ai_interactions')
    interaction_type = models.CharField(max_length=50, choices=[
        ('hypothesis_request', 'Hypothesis Request'),
        ('result_interpretation', 'Result Interpretation'),
        ('signature_analysis', 'Signature Analysis'),
        ('pathway_interpretation', 'Pathway Interpretation'),
        ('cell_type_suggestion', 'Cell Type Suggestion'),
    ])
    user_input = models.TextField()
    ai_response = models.TextField()
    context_data = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.interaction_type} - {self.dataset.name}"

class AIInterpretation(models.Model):
    """
    Model to store AI-generated interpretations
    """
    job = models.ForeignKey(AnalysisJob, on_delete=models.CASCADE, related_name='ai_interpretations')
    analysis_type = models.CharField(max_length=50, choices=[
        ('pca_clustering', 'PCA and Clustering'),
        ('differential_expression', 'Differential Expression'),
        ('pathway_enrichment', 'Pathway Enrichment'),
        ('cell_clustering', 'Cell Clustering'),
        ('cell_type_annotation', 'Cell Type Annotation'),
        ('quality_control', 'Quality Control'),
    ])
    
    user_input = models.TextField(blank=True, help_text="User's question or hypothesis")
    ai_response = models.TextField(help_text="AI-generated interpretation")
    context_data = models.JSONField(default=dict, help_text="Analysis data used for interpretation")
    
    confidence_score = models.FloatField(default=0.0, help_text="AI confidence in interpretation")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.analysis_type} interpretation for {self.job.dataset.name}"

class RNASeqPresentation(models.Model):
    """
    Model to link RNA-seq analysis with presentations
    """
    dataset = models.ForeignKey(RNASeqDataset, on_delete=models.CASCADE)
    presentation = models.ForeignKey('users.Presentation', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('dataset', 'presentation')
    
    def __str__(self):
        return f"{self.dataset.name} presentation"