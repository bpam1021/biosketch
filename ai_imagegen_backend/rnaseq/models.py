from django.db import models
from django.contrib.auth.models import User
import uuid
import json

class AnalysisJob(models.Model):
    """
    Model to track RNA-seq analysis jobs and their progress
    """
    ANALYSIS_TYPES = [
        ('bulk_rnaseq', 'Bulk RNA-seq'),
        ('scrna_seq', 'Single-cell RNA-seq'),
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
    dataset = models.ForeignKey('RNASeqDataset', on_delete=models.CASCADE, related_name='analysis_jobs')
    analysis_type = models.CharField(max_length=20, choices=ANALYSIS_TYPES)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending')
    
    # Progress tracking
    current_step = models.IntegerField(default=0)
    current_step_name = models.CharField(max_length=200, blank=True)
    progress_percentage = models.IntegerField(default=0)
    
    # Job configuration
    job_config = models.JSONField(default=dict)
    sample_files = models.JSONField(default=dict, help_text="Sample file paths and metadata")
    sample_metadata = models.JSONField(default=dict, help_text="Sample metadata for analysis")
    
    # Results tracking
    num_samples = models.IntegerField(default=0)
    total_reads = models.BigIntegerField(default=0)
    mapped_reads = models.BigIntegerField(default=0)
    alignment_rate = models.FloatField(default=0.0)
    genes_quantified = models.IntegerField(default=0)
    cells_detected = models.IntegerField(default=0)  # For scRNA-seq
    cell_clusters = models.IntegerField(default=0)   # For scRNA-seq
    significant_genes = models.IntegerField(default=0)
    enriched_pathways = models.IntegerField(default=0)
    
    # User interaction
    user_hypothesis = models.TextField(blank=True)
    current_user_input = models.TextField(blank=True)
    waiting_for_input = models.BooleanField(default=False)
    enable_ai_interpretation = models.BooleanField(default=True)
    
    # File outputs
    result_files = models.JSONField(default=list, help_text="List of generated result files")
    error_message = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
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
    retry_count = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['step_number']
        unique_together = ('job', 'step_number')
    
    def __str__(self):
        return f"Step {self.step_number}: {self.step_name} ({self.status})"

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

class RNASeqDataset(models.Model):
    """
    Model to store RNA-seq dataset information
    """
    DATASET_TYPES = [
        ('bulk', 'Bulk RNA-seq'),
        ('single_cell', 'Single-cell RNA-seq'),
    ]
    
    ANALYSIS_TYPES = [
        ('differential', 'Differential Expression'),
        ('pathway', 'Pathway Analysis'),
        ('clustering', 'Clustering Analysis'),
        ('pca', 'PCA Analysis'),
        ('signature_correlation', 'Signature Correlation'),
        ('phenotype_correlation', 'Phenotype Correlation'),
        ('cell_type_annotation', 'Cell Type Annotation'),
        ('pseudotime', 'Pseudotime Analysis'),
        ('cell_communication', 'Cell-Cell Communication'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing_upstream', 'Processing Upstream'),
        ('upstream_complete', 'Upstream Complete'),
        ('processing_downstream', 'Processing Downstream'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='rnaseq_datasets')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    dataset_type = models.CharField(max_length=20, choices=DATASET_TYPES, default='bulk')
    
    # File uploads for upstream processing
    fastq_r1_file = models.FileField(upload_to='rnaseq/fastq/', null=True, blank=True)
    fastq_r2_file = models.FileField(upload_to='rnaseq/fastq/', null=True, blank=True)
    fastq_files = models.JSONField(default=list, help_text="Multiple FASTQ file paths for multi-sample analysis")
    counts_file = models.FileField(upload_to='rnaseq/counts/', null=True, blank=True)
    metadata_file = models.FileField(upload_to='rnaseq/metadata/', null=True, blank=True)
    
    # Analysis parameters
    organism = models.CharField(max_length=100, default='human')
    analysis_type = models.CharField(max_length=50, choices=ANALYSIS_TYPES, default='differential')
    
    # Analysis status and configuration
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending')
    start_from_upstream = models.BooleanField(default=True, help_text="Start from FASTQ files or use existing counts")
    
    # Multi-sample support
    is_multi_sample = models.BooleanField(default=False)
    sample_sheet = models.FileField(upload_to='rnaseq/sample_sheets/', null=True, blank=True)
    sample_files_mapping = models.JSONField(default=dict, help_text="Mapping of sample IDs to FASTQ file paths")
    fastq_files = models.JSONField(default=list, help_text="Multiple FASTQ file paths for multi-sample analysis")
    batch_id = models.CharField(max_length=100, blank=True, help_text="Batch identifier for multi-sample runs")
    
    # Upstream results
    qc_report = models.FileField(upload_to='rnaseq/qc/', null=True, blank=True)
    trimmed_fastq_r1 = models.FileField(upload_to='rnaseq/trimmed/', null=True, blank=True)
    trimmed_fastq_r2 = models.FileField(upload_to='rnaseq/trimmed/', null=True, blank=True)
    alignment_bam = models.FileField(upload_to='rnaseq/alignment/', null=True, blank=True)
    expression_matrix_tpm = models.FileField(upload_to='rnaseq/expression/', null=True, blank=True)
    expression_matrix_counts = models.FileField(upload_to='rnaseq/expression/', null=True, blank=True)
    generated_metadata = models.JSONField(default=dict, help_text="Metadata generated during upstream processing")
    
    # Downstream results
    results_file = models.FileField(upload_to='rnaseq/results/', null=True, blank=True)
    visualization_image = models.ImageField(upload_to='rnaseq/visualizations/', null=True, blank=True)
    ai_interpretation = models.TextField(blank=True, help_text="AI-generated interpretation of results")
    
    # User inputs for AI-assisted analysis
    user_hypothesis = models.TextField(blank=True, help_text="User's hypothesis for analysis")
    gene_signatures = models.JSONField(default=list, help_text="User-provided gene signatures")
    phenotype_data = models.JSONField(default=dict, help_text="Phenotype data for correlation analysis")
    
    # Processing configuration
    processing_config = models.JSONField(default=dict, help_text="Pipeline processing configuration")
    quality_thresholds = models.JSONField(default=dict, help_text="Quality control thresholds")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.dataset_type}) - {self.user.username}"
    
    def get_current_job(self):
        """Get the most recent analysis job for this dataset"""
        return self.analysis_jobs.order_by('-created_at').first()
    
    def get_job_progress(self):
        """Get current job progress information"""
        job = self.get_current_job()
        if not job:
            return {'status': 'no_job', 'progress': 0}
        
        return {
            'status': job.status,
            'progress': job.progress_percentage,
            'current_step': job.current_step_name,
            'step_number': job.current_step,
        }
    
    def update_job_progress(self, step_name, progress_percentage, step_number=None):
        """Update the current job progress"""
        job = self.get_current_job()
        if job:
            job.current_step_name = step_name
            job.progress_percentage = progress_percentage
            if step_number is not None:
                job.current_step = step_number
            job.save()
    
    def get_fastq_pairs(self):
        """Get FASTQ pairs for processing"""
        pairs = []
        
        if self.is_multi_sample:
            # Multi-sample: use sample_files_mapping
            for sample_id, file_info in self.sample_files_mapping.items():
                if isinstance(file_info, dict) and 'r1_file' in file_info and 'r2_file' in file_info:
                    pairs.append({
                        'sample_id': sample_id,
                        'r1_path': file_info['r1_file'].path if hasattr(file_info['r1_file'], 'path') else str(file_info['r1_file']),
                        'r2_path': file_info['r2_file'].path if hasattr(file_info['r2_file'], 'path') else str(file_info['r2_file']),
                        'metadata': file_info.get('metadata', {})
                    })
                elif isinstance(file_info, dict) and 'r1_path' in file_info and 'r2_path' in file_info:
                    pairs.append({
                        'sample_id': sample_id,
                        'r1_path': file_info['r1_path'],
                        'r2_path': file_info['r2_path'],
                        'metadata': file_info.get('metadata', {})
                    })
        else:
            # Single sample
            if self.fastq_r1_file and self.fastq_r2_file:
                pairs.append({
                    'sample_id': 'sample_1',
                    'r1_path': self.fastq_r1_file.path,
                    'r2_path': self.fastq_r2_file.path,
                    'metadata': {}
                })
        
        return pairs
    
    def get_sample_count(self):
        """Get total number of samples in dataset"""
        if self.is_multi_sample:
            return len(self.sample_files_mapping) if self.sample_files_mapping else 0
        else:
            return 1 if (self.fastq_r1_file and self.fastq_r2_file) or self.counts_file else 0
    
    def validate_multi_sample_data(self):
        """Validate multi-sample data integrity"""
        if not self.is_multi_sample:
            return {'valid': True, 'errors': []}
        
        errors = []
        
        if not self.sample_sheet:
            errors.append("Sample sheet is required for multi-sample analysis")
        
        if not self.sample_files_mapping:
            errors.append("No sample files mapping found")
        
        if self.start_from_upstream:
            for sample_id, file_info in self.sample_files_mapping.items():
                if not isinstance(file_info, dict):
                    errors.append(f"Invalid file info for sample {sample_id}")
                    continue
                    
                if 'r1_file' not in file_info or 'r2_file' not in file_info:
                    if 'r1_path' not in file_info or 'r2_path' not in file_info:
                        errors.append(f"Missing FASTQ files for sample {sample_id}")
        
        return {'valid': len(errors) == 0, 'errors': errors}
    
    def get_expression_file_path(self):
        """Get path to expression matrix file for downstream analysis"""
        if self.expression_matrix_counts:
            return self.expression_matrix_counts.path
        elif self.expression_matrix_tpm:
            return self.expression_matrix_tpm.path
        elif self.counts_file:
            return self.counts_file.path
        return None
    
    def get_metadata_file_path(self):
        """Get path to metadata file if available"""
        if self.metadata_file:
            return self.metadata_file.path
        return None
    
    def has_required_upstream_files(self):
        """Check if dataset has required files for downstream analysis"""
        return bool(self.get_expression_file_path())
    
    def get_pipeline_config(self):
        """Get pipeline configuration for real pipeline processing"""
        config = self.processing_config.copy() if self.processing_config else {}
        config.update({
            'organism': self.organism,
            'dataset_type': self.dataset_type,
            'analysis_type': self.analysis_type,
            'quality_thresholds': self.quality_thresholds,
            'is_multi_sample': self.is_multi_sample,
            'user_hypothesis': self.user_hypothesis,
            'gene_signatures': self.gene_signatures,
            'phenotype_data': self.phenotype_data,
            'sample_files_mapping': self.sample_files_mapping,
            'batch_id': self.batch_id
        })
        return config

class RNASeqAnalysisResult(models.Model):
    """
    Model to store detailed analysis results
    """
    dataset = models.ForeignKey(RNASeqDataset, on_delete=models.CASCADE, related_name='analysis_results')
    gene_id = models.CharField(max_length=100)
    gene_name = models.CharField(max_length=100, blank=True)
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
    database = models.CharField(max_length=50, choices=[('GO', 'Gene Ontology'), ('KEGG', 'KEGG'), ('REACTOME', 'Reactome')])
    p_value = models.FloatField()
    adjusted_p_value = models.FloatField()
    gene_count = models.IntegerField()
    gene_list = models.JSONField(default=list)
    enrichment_score = models.FloatField(null=True, blank=True)
    
    class Meta:
        unique_together = ('dataset', 'pathway_id', 'database')
    
    def __str__(self):
        return f"{self.pathway_name} - {self.dataset.name}"

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

class RNASeqPresentation(models.Model):
    """
    Model to link RNA-seq analysis with presentations
    """
    dataset = models.ForeignKey(RNASeqDataset, on_delete=models.CASCADE)
    presentation = models.ForeignKey('users.Presentation', on_delete=models.CASCADE)
    slide_order = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('dataset', 'presentation')
        ordering = ['slide_order']
    
    def __str__(self):
        return f"{self.dataset.name} in {self.presentation.title}"