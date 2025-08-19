from django.db import models
from django.contrib.auth.models import User
import uuid

class AnalysisJob(models.Model):
    """
    Consolidated model that manages both dataset information and analysis tasks
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
        ('waiting_for_input', 'Waiting for User Input'),
    ]
    
    # Primary identifiers
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='rnaseq_jobs')
    
    # Dataset information (consolidated from RNASeqDataset)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    dataset_type = models.CharField(max_length=20, choices=DATASET_TYPES, default='bulk')
    organism = models.CharField(max_length=100, default='human')
    selected_pipeline_stage = models.CharField(max_length=20, choices=PIPELINE_STAGES, default='upstream')
    
    # Multi-sample support
    is_multi_sample = models.BooleanField(default=False)
    sample_count = models.IntegerField(default=1)
    
    # File management
    fastq_files = models.JSONField(default=list, help_text="List of FASTQ file pairs")
    metadata_file = models.FileField(upload_to='rnaseq/metadata/', null=True, blank=True)
    expression_matrix = models.FileField(upload_to='rnaseq/matrices/', null=True, blank=True)
    expression_matrix_output = models.FileField(upload_to='rnaseq/output_matrices/', null=True, blank=True)
    
    # Analysis status and progress
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending')
    current_step = models.IntegerField(default=0)
    current_step_name = models.CharField(max_length=200, blank=True)
    progress_percentage = models.IntegerField(default=0)
    total_steps = models.IntegerField(default=5)
    
    # Job configuration
    job_config = models.JSONField(default=dict)
    processing_config = models.JSONField(default=dict, help_text="Pipeline processing configuration")
    
    # Analysis metrics
    num_samples = models.IntegerField(default=0)
    total_reads = models.BigIntegerField(default=0)
    mapped_reads = models.BigIntegerField(default=0)
    alignment_rate = models.FloatField(default=0.0)
    genes_quantified = models.IntegerField(default=0)
    cells_detected = models.IntegerField(default=0)
    cell_clusters = models.IntegerField(default=0)
    significant_genes = models.IntegerField(default=0)
    enriched_pathways = models.IntegerField(default=0)
    
    # Results and outputs
    results_file = models.FileField(upload_to='rnaseq/results/', null=True, blank=True)
    visualization_image = models.ImageField(upload_to='rnaseq/visualizations/', null=True, blank=True)
    qc_report = models.FileField(upload_to='rnaseq/qc/', null=True, blank=True)
    
    # AI features
    ai_chat_history = models.JSONField(default=list, help_text="AI chatbot conversation history")
    user_hypothesis = models.TextField(blank=True)
    current_user_input = models.TextField(blank=True)
    waiting_for_input = models.BooleanField(default=False)
    enable_ai_interpretation = models.BooleanField(default=True)
    
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
        return f"{self.name} ({self.dataset_type}) - {self.status}"
    
    @property
    def duration_minutes(self):
        """Calculate duration in minutes"""
        if self.completed_at and self.started_at:
            duration = self.completed_at - self.started_at
            return int(duration.total_seconds() / 60)
        return 0
    
    @property
    def results_count(self):
        return self.analysis_results.count()
    
    @property
    def clusters_count(self):
        return self.clusters.count()
    
    @property
    def pathways_count(self):
        return self.pathway_results.count()

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
        return f"{self.gene_id} - {self.job.name}"

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
        return f"Cluster {self.cluster_id} - {self.job.name}"

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
        return f"{self.pathway_name} - {self.job.name}"

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
        return f"AI Chat - {self.job.name} - {self.created_at}"

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
        return f"{self.job.name} presentation"

# Keep RNASeqDataset as a minimal model for backward compatibility if needed
class RNASeqDataset(models.Model):
    """
    Minimal dataset model - most functionality moved to AnalysisJob
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.OneToOneField(AnalysisJob, on_delete=models.CASCADE, related_name='legacy_dataset')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Dataset for {self.job.name}"