from django.db import models
from django.contrib.auth.models import User
import uuid
import json
from django.conf import settings

class RNASeqDataset(models.Model):
    """
    Model to store RNA-seq dataset information
    """
    DATASET_TYPES = [
        ('bulk_rnaseq', 'Bulk RNA-seq'),
        ('scrna_seq', 'Single-cell RNA-seq'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='rnaseq_datasets')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    dataset_type = models.CharField(max_length=20, choices=DATASET_TYPES, default='bulk_rnaseq')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.dataset_type}) - {self.user.username}"

class AnalysisJob(models.Model):
    """
    Model to track RNA-seq analysis jobs and their progress
    """
    ANALYSIS_TYPES = [
        ('bulk_rnaseq', 'Bulk RNA-seq Analysis'),
        ('scrna_seq', 'Single-cell RNA-seq Analysis'),
        ('bulk_comprehensive', 'Bulk Comprehensive Analysis'),
        ('scrna_comprehensive', 'Single-cell Comprehensive Analysis'),
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
    dataset = models.OneToOneField(RNASeqDataset, on_delete=models.CASCADE, related_name='analysis_job')
    analysis_type = models.CharField(max_length=30, choices=ANALYSIS_TYPES)
    
    # Dataset information (moved from RNASeqDataset)
    organism = models.CharField(max_length=100, default='human')
    is_multi_sample = models.BooleanField(default=False)
    sample_count = models.IntegerField(default=1)
    
    # File management
    fastq_files = models.JSONField(default=list, help_text="List of FASTQ file pairs")
    metadata_file = models.FileField(upload_to='rnaseq/metadata/', null=True, blank=True)
    expression_matrix = models.FileField(upload_to='rnaseq/matrices/', null=True, blank=True)
    
    # Results and outputs
    results_file = models.FileField(upload_to='rnaseq/results/', null=True, blank=True)
    visualization_plots = models.JSONField(default=list, help_text="Generated visualization plots")
    qc_report = models.FileField(upload_to='rnaseq/qc/', null=True, blank=True)
    
    # AI interactions
    ai_chat_history = models.JSONField(default=list, help_text="AI chatbot conversation history")
    user_hypothesis = models.TextField(blank=True)
    
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending')
    
    # Progress tracking
    current_step = models.IntegerField(default=0)
    current_step_name = models.CharField(max_length=200, blank=True)
    progress_percentage = models.IntegerField(default=0)
    total_steps = models.IntegerField(default=5)
    
    # Job configuration
    job_config = models.JSONField(default=dict)
    processing_config = models.JSONField(default=dict, help_text="Pipeline processing configuration")
    
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
    
    # Error handling
    error_message = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.analysis_type} job for {self.dataset.name} - {self.status}"

    @property
    def duration_minutes(self):
        """Calculate duration in minutes"""
        if self.completed_at and self.started_at:
            duration = self.completed_at - self.started_at
            return int(duration.total_seconds() / 60)
        return 0

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
    
    def __str__(self):
        return f"Step {self.step_number}: {self.step_name} ({self.status})"

class RNASeqAnalysisResult(models.Model):
    """
    Model to store detailed analysis results
    """
    job = models.ForeignKey(AnalysisJob, on_delete=models.CASCADE, related_name='analysis_results')
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
        unique_together = ('job', 'gene_id', 'cluster')
        indexes = [
            models.Index(fields=['gene_id']),
            models.Index(fields=['p_value']),
            models.Index(fields=['log2_fold_change']),
            models.Index(fields=['cluster']),
        ]
    
    def __str__(self):
        return f"{self.gene_id} - {self.job.dataset.name}"

class RNASeqCluster(models.Model):
    """
    Model to store clustering results for single-cell data
    """
    job = models.ForeignKey(AnalysisJob, on_delete=models.CASCADE, related_name='clusters')
    cluster_id = models.CharField(max_length=50)
    cluster_name = models.CharField(max_length=100, blank=True)
    cell_type = models.CharField(max_length=100, blank=True)
    cell_count = models.IntegerField(default=0)
    marker_genes = models.JSONField(default=list)
    coordinates = models.JSONField(default=dict, help_text="UMAP/tSNE coordinates")
    
    class Meta:
        unique_together = ('job', 'cluster_id')
    
    def __str__(self):
        return f"Cluster {self.cluster_id} - {self.job.dataset.name}"

class RNASeqPathwayResult(models.Model):
    """
    Model to store pathway enrichment results
    """
    job = models.ForeignKey(AnalysisJob, on_delete=models.CASCADE, related_name='pathway_results')
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
        unique_together = ('job', 'pathway_id', 'database')
    
    def __str__(self):
        return f"{self.pathway_name} - {self.job.dataset.name}"

class RNASeqAIChat(models.Model):
    """
    Model to store AI chatbot interactions
    """
    job = models.ForeignKey(AnalysisJob, on_delete=models.CASCADE, related_name='ai_chats')
    user_message = models.TextField()
    ai_response = models.TextField()
    context_data = models.JSONField(default=dict, help_text="Analysis context for AI response")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"AI Chat - {self.job.dataset.name} - {self.created_at}"

class RNASeqAIInteraction(models.Model):
    """
    Model to store AI interactions and interpretations
    """
    job = models.ForeignKey(AnalysisJob, on_delete=models.CASCADE, related_name='ai_interactions')
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
        return f"{self.interaction_type} - {self.job.dataset.name}"

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
    job = models.ForeignKey(AnalysisJob, on_delete=models.CASCADE)
    presentation = models.ForeignKey('users.Presentation', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('job', 'presentation')
    
    def __str__(self):
        return f"{self.job.dataset.name} presentation"