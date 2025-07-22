import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from celery import shared_task
from django.core.files.base import ContentFile
from django.core.files import File
from io import BytesIO
import tempfile
from .models import RNASeqDataset, RNASeqAnalysisResult
from users.models import Presentation, Slide
from users.utils.ai_generation import decompose_prompt, generate_image
import logging

logger = logging.getLogger(__name__)

@shared_task
def process_rnaseq_analysis(dataset_id):
    """
    Process RNA-seq analysis for a given dataset
    """
    try:
        dataset = RNASeqDataset.objects.get(id=dataset_id)
        dataset.status = 'processing'
        dataset.save()
        
        # Read counts file
        if not dataset.counts_file:
            raise ValueError("No counts file provided")
        
        # Simple mock analysis - in production, you'd use DESeq2, edgeR, etc.
        counts_df = pd.read_csv(dataset.counts_file.path, index_col=0)
        
        # Generate mock differential expression results
        genes = counts_df.index.tolist()
        n_genes = len(genes)
        
        # Create mock results
        results = []
        for i, gene_id in enumerate(genes[:min(1000, n_genes)]):  # Limit for demo
            log2fc = np.random.normal(0, 2)
            base_mean = np.random.lognormal(5, 2)
            p_value = np.random.beta(0.1, 1)
            adj_p_value = min(p_value * 1.1, 1.0)
            
            result = RNASeqAnalysisResult(
                dataset=dataset,
                gene_id=gene_id,
                gene_name=f"Gene_{gene_id}",
                log2_fold_change=log2fc,
                p_value=p_value,
                adjusted_p_value=adj_p_value,
                base_mean=base_mean,
                chromosome=f"chr{np.random.randint(1, 23)}",
                gene_type="protein_coding"
            )
            results.append(result)
        
        # Bulk create results
        RNASeqAnalysisResult.objects.bulk_create(results, batch_size=100)
        
        # Generate basic visualization
        generate_volcano_plot(dataset)
        
        dataset.status = 'completed'
        dataset.save()
        
        logger.info(f"RNA-seq analysis completed for dataset {dataset_id}")
        
    except Exception as e:
        logger.error(f"RNA-seq analysis failed for dataset {dataset_id}: {str(e)}")
        dataset = RNASeqDataset.objects.get(id=dataset_id)
        dataset.status = 'failed'
        dataset.save()

def generate_volcano_plot(dataset):
    """
    Generate a volcano plot for the RNA-seq results
    """
    results = dataset.analysis_results.all()
    
    if not results.exists():
        return
    
    # Extract data
    log2fc = [r.log2_fold_change for r in results if r.log2_fold_change is not None]
    neg_log10_p = [-np.log10(r.p_value) for r in results if r.p_value is not None and r.p_value > 0]
    
    # Create volcano plot
    plt.figure(figsize=(10, 8))
    plt.scatter(log2fc, neg_log10_p, alpha=0.6, s=20)
    
    # Add significance lines
    plt.axhline(y=-np.log10(0.05), color='red', linestyle='--', alpha=0.7, label='p=0.05')
    plt.axvline(x=1, color='red', linestyle='--', alpha=0.7)
    plt.axvline(x=-1, color='red', linestyle='--', alpha=0.7)
    
    plt.xlabel('Log2 Fold Change')
    plt.ylabel('-Log10 P-value')
    plt.title(f'Volcano Plot - {dataset.name}')
    plt.legend()
    plt.grid(True, alpha=0.3)
    
    # Save plot
    buffer = BytesIO()
    plt.savefig(buffer, format='png', dpi=300, bbox_inches='tight')
    buffer.seek(0)
    
    dataset.visualization_image.save(
        f'volcano_{dataset.id}.png',
        ContentFile(buffer.getvalue()),
        save=True
    )
    
    plt.close()

@shared_task
def generate_rnaseq_visualization(dataset_id, visualization_type='volcano'):
    """
    Generate specific visualizations for RNA-seq data
    """
    try:
        dataset = RNASeqDataset.objects.get(id=dataset_id)
        
        if visualization_type == 'volcano':
            generate_volcano_plot(dataset)
        elif visualization_type == 'heatmap':
            generate_heatmap(dataset)
        elif visualization_type == 'ma_plot':
            generate_ma_plot(dataset)
        
        logger.info(f"Generated {visualization_type} for dataset {dataset_id}")
        
    except Exception as e:
        logger.error(f"Visualization generation failed: {str(e)}")

def generate_heatmap(dataset):
    """
    Generate a heatmap of top differentially expressed genes
    """
    results = dataset.analysis_results.filter(
        adjusted_p_value__lt=0.05
    ).order_by('adjusted_p_value')[:50]
    
    if not results.exists():
        return
    
    # Create mock expression data for heatmap
    genes = [r.gene_name or r.gene_id for r in results]
    samples = ['Sample_1', 'Sample_2', 'Sample_3', 'Sample_4', 'Sample_5', 'Sample_6']
    
    # Generate mock normalized counts
    data = np.random.randn(len(genes), len(samples))
    
    plt.figure(figsize=(12, 8))
    sns.heatmap(data, 
                xticklabels=samples,
                yticklabels=genes,
                cmap='RdBu_r',
                center=0,
                cbar_kws={'label': 'Normalized Expression'})
    
    plt.title(f'Top Differentially Expressed Genes - {dataset.name}')
    plt.tight_layout()
    
    # Save plot
    buffer = BytesIO()
    plt.savefig(buffer, format='png', dpi=300, bbox_inches='tight')
    buffer.seek(0)
    
    # Save with different name to avoid overwriting
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp_file:
        tmp_file.write(buffer.getvalue())
        tmp_file.flush()
        
        with open(tmp_file.name, 'rb') as f:
            dataset.visualization_image.save(
                f'heatmap_{dataset.id}.png',
                File(f),
                save=True
            )
        
        os.unlink(tmp_file.name)
    
    plt.close()

def generate_ma_plot(dataset):
    """
    Generate an MA plot
    """
    results = dataset.analysis_results.all()
    
    if not results.exists():
        return
    
    # Extract data
    base_mean = [np.log10(r.base_mean) for r in results if r.base_mean and r.base_mean > 0]
    log2fc = [r.log2_fold_change for r in results if r.log2_fold_change is not None]
    
    plt.figure(figsize=(10, 8))
    plt.scatter(base_mean, log2fc, alpha=0.6, s=20)
    
    plt.axhline(y=0, color='black', linestyle='-', alpha=0.7)
    plt.axhline(y=1, color='red', linestyle='--', alpha=0.7)
    plt.axhline(y=-1, color='red', linestyle='--', alpha=0.7)
    
    plt.xlabel('Log10 Base Mean')
    plt.ylabel('Log2 Fold Change')
    plt.title(f'MA Plot - {dataset.name}')
    plt.grid(True, alpha=0.3)
    
    # Save plot
    buffer = BytesIO()
    plt.savefig(buffer, format='png', dpi=300, bbox_inches='tight')
    buffer.seek(0)
    
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp_file:
        tmp_file.write(buffer.getvalue())
        tmp_file.flush()
        
        with open(tmp_file.name, 'rb') as f:
            dataset.visualization_image.save(
                f'ma_plot_{dataset.id}.png',
                File(f),
                save=True
            )
        
        os.unlink(tmp_file.name)
    
    plt.close()

@shared_task
def create_rnaseq_presentation(dataset_id, user_id, title, include_methods=True, 
                              include_results=True, include_discussion=True, quality='medium'):
    """
    Create a presentation from RNA-seq analysis results
    """
    try:
        from django.contrib.auth.models import User
        
        dataset = RNASeqDataset.objects.get(id=dataset_id)
        user = User.objects.get(id=user_id)
        
        # Create presentation
        presentation = Presentation.objects.create(
            user=user,
            title=title,
            original_prompt=f"RNA-seq analysis presentation for {dataset.name}"
        )
        
        # Create slides based on analysis
        slides_data = []
        
        # Title slide
        slides_data.append({
            'title': title,
            'description': f'RNA-seq differential expression analysis of {dataset.name}',
            'image_prompt': f'Scientific presentation title slide for RNA sequencing analysis, {dataset.organism} organism, molecular biology theme'
        })
        
        if include_methods:
            slides_data.append({
                'title': 'Methods',
                'description': f'RNA-seq analysis was performed on {dataset.organism} samples. Differential expression analysis identified genes with significant expression changes.',
                'image_prompt': f'RNA sequencing methodology flowchart, {dataset.organism} samples, bioinformatics pipeline, scientific illustration'
            })
        
        if include_results:
            # Get top significant genes
            top_genes = dataset.analysis_results.filter(
                adjusted_p_value__lt=0.05
            ).order_by('adjusted_p_value')[:10]
            
            if top_genes.exists():
                gene_list = ', '.join([g.gene_name or g.gene_id for g in top_genes[:5]])
                slides_data.append({
                    'title': 'Differential Expression Results',
                    'description': f'Analysis identified {top_genes.count()} significantly differentially expressed genes. Top genes include: {gene_list}.',
                    'image_prompt': f'Volcano plot showing differential gene expression, RNA-seq results, {dataset.organism} genes, scientific visualization'
                })
            
            # Add visualization slide if available
            if dataset.visualization_image:
                slides_data.append({
                    'title': 'Expression Visualization',
                    'description': 'Volcano plot showing the relationship between fold change and statistical significance of differentially expressed genes.',
                    'image_prompt': f'RNA-seq data visualization, volcano plot, gene expression heatmap, {dataset.organism} transcriptomics'
                })
        
        if include_discussion:
            slides_data.append({
                'title': 'Discussion',
                'description': 'The RNA-seq analysis revealed significant transcriptional changes that provide insights into the biological processes under investigation.',
                'image_prompt': f'Scientific discussion slide, RNA sequencing conclusions, {dataset.organism} biology, research implications'
            })
        
        # Generate images and create slides
        for i, slide_data in enumerate(slides_data):
            try:
                # Generate image for slide (mock request object)
                class MockRequest:
                    def __init__(self):
                        self.scheme = 'https'
                    def get_host(self):
                        return 'api.biosketch.ai'
                
                mock_request = MockRequest()
                image_url = generate_image(slide_data['image_prompt'], mock_request)
                
                slide = Slide.objects.create(
                    presentation=presentation,
                    order=i,
                    title=slide_data['title'],
                    description=slide_data['description'],
                    image_prompt=slide_data['image_prompt'],
                    image_url=image_url or '',
                )
                
                # If this is the visualization slide and we have the actual plot, use it
                if 'Visualization' in slide_data['title'] and dataset.visualization_image:
                    slide.rendered_image = dataset.visualization_image
                    slide.save()
                
            except Exception as e:
                logger.error(f"Failed to create slide {i}: {str(e)}")
                # Create slide without image
                Slide.objects.create(
                    presentation=presentation,
                    order=i,
                    title=slide_data['title'],
                    description=slide_data['description'],
                    image_prompt=slide_data['image_prompt'],
                    image_url='',
                )
        
        # Link dataset to presentation
        RNASeqPresentation.objects.create(
            dataset=dataset,
            presentation=presentation,
            slide_order=0
        )
        
        logger.info(f"Created presentation {presentation.id} from RNA-seq dataset {dataset_id}")
        
        return presentation.id
        
    except Exception as e:
        logger.error(f"Failed to create RNA-seq presentation: {str(e)}")
        raise