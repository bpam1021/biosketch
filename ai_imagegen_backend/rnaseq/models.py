from django.db import models
from django.contrib.auth.models import User
import uuid

class RNASeqDataset(models.Model):
    """
    Model to store RNA-seq dataset information
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='rnaseq_datasets')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # File uploads
    counts_file = models.FileField(upload_to='rnaseq/counts/', null=True, blank=True)
    metadata_file = models.FileField(upload_to='rnaseq/metadata/', null=True, blank=True)
    
    # Analysis parameters
    organism = models.CharField(max_length=100, default='human')
    analysis_type = models.CharField(
        max_length=50,
        choices=[
            ('differential', 'Differential Expression'),
            ('pathway', 'Pathway Analysis'),
            ('clustering', 'Clustering Analysis'),
            ('volcano', 'Volcano Plot'),
            ('heatmap', 'Heatmap'),
        ],
        default='differential'
    )
    
    # Analysis status
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('processing', 'Processing'),
            ('completed', 'Completed'),
            ('failed', 'Failed'),
        ],
        default='pending'
    )
    
    # Results
    results_file = models.FileField(upload_to='rnaseq/results/', null=True, blank=True)
    visualization_image = models.ImageField(upload_to='rnaseq/visualizations/', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} - {self.user.username}"

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
    
    class Meta:
        unique_together = ('dataset', 'gene_id')
        indexes = [
            models.Index(fields=['gene_id']),
            models.Index(fields=['p_value']),
            models.Index(fields=['log2_fold_change']),
        ]
    
    def __str__(self):
        return f"{self.gene_id} - {self.dataset.name}"

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