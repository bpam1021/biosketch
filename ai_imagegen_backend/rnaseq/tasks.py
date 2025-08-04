import os
import gc
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from celery import shared_task
from django.core.files.base import ContentFile
from django.core.files import File
from io import BytesIO
import tempfile
import subprocess
import json
from openai import OpenAI
from django.utils import timezone
from .models import (
    RNASeqDataset, RNASeqAnalysisResult, RNASeqCluster, 
    RNASeqPathwayResult, RNASeqAIInteraction, AnalysisJob, PipelineStep
)
from users.models import Presentation, Slide
from users.utils.ai_generation import decompose_prompt, generate_image
from .ai_service import ai_service
import logging

logger = logging.getLogger(__name__)
client = OpenAI()

@shared_task
def process_upstream_pipeline(dataset_id, config=None):
    """
    Process upstream RNA-seq pipeline using real pipeline_core classes
    """
    try:
        dataset = RNASeqDataset.objects.get(id=dataset_id)
        job = dataset.get_current_job()
        
        if not job:
            logger.error(f"No active job found for dataset {dataset_id}")
            return
            
        dataset.status = 'processing_upstream'
        job.status = 'processing'
        job.current_step_name = 'Initializing upstream pipeline'
        job.progress_percentage = 5
        dataset.save()
        job.save()
        
        config = config or {}
        
        # Import and initialize real pipeline from pipeline_core.py
        from .pipeline_core import MultiSampleBulkRNASeqPipeline, MultiSampleSingleCellRNASeqPipeline
        
        # Use appropriate pipeline class based on dataset type
        if dataset.dataset_type == 'bulk':
            pipeline = MultiSampleBulkRNASeqPipeline(job
            )
        else:  # single_cell
            pipeline = MultiSampleSingleCellRNASeqPipeline(job
            )
        
        # Create pipeline steps
        steps = [
            {'name': 'Quality Control', 'step_number': 1},
            {'name': 'Read Trimming', 'step_number': 2},
            {'name': 'Alignment', 'step_number': 3},
            {'name': 'Quantification', 'step_number': 4},
            {'name': 'Metadata Generation', 'step_number': 5}
        ]
        
        for step_info in steps:
            PipelineStep.objects.create(
                job=job,
                step_number=step_info['step_number'],
                step_name=step_info['name'],
                status='pending'
            )
        
        # Get FASTQ pairs using real pipeline methods
        fastq_pairs = dataset.get_fastq_pairs()
        
        if not fastq_pairs:
            raise ValueError("No FASTQ pairs found for processing")
        
        job.num_samples = len(fastq_pairs)
        job.save()
        
        # Step 1: Quality Control using real pipeline
        update_job_progress(job, 1, 'Running Quality Control', 20)
        qc_results = pipeline.run_quality_control(fastq_pairs)
        
        if qc_results:
            dataset.qc_report.save(
                f"qc_report_{dataset_id}.html", 
                ContentFile(qc_results['report'])
            )
            job.total_reads = qc_results.get('total_reads', 0)
            job.save()
        
        # Step 2: Read Trimming using real pipeline
        if not config.get('skip_trimming', False):
            update_job_progress(job, 2, 'Trimming reads', 40)
            trimmed_files = pipeline.run_trimming(fastq_pairs, qc_results)
            
            if trimmed_files and not dataset.is_multi_sample:
                # Save trimmed files for single sample
                first_sample = trimmed_files[0]
                if 'r1_trimmed' in first_sample:
                    dataset.trimmed_fastq_r1.save(
                        f"trimmed_r1_{dataset_id}.fastq.gz", 
                        File(open(first_sample['r1_trimmed'], 'rb'))
                    )
                if 'r2_trimmed' in first_sample:
                    dataset.trimmed_fastq_r2.save(
                        f"trimmed_r2_{dataset_id}.fastq.gz", 
                        File(open(first_sample['r2_trimmed'], 'rb'))
                    )
        
        # Step 3: Alignment using real pipeline
        update_job_progress(job, 3, 'Aligning reads to reference genome', 60)
        alignment_results = pipeline.run_alignment(
            trimmed_files if not config.get('skip_trimming', False) else fastq_pairs,
            config.get('reference_genome', 'hg38')
        )
        
        if alignment_results:
            job.mapped_reads = alignment_results.get('total_mapped_reads', 0)
            job.alignment_rate = alignment_results.get('alignment_rate', 0.0)
            job.save()
            
            if not dataset.is_multi_sample and alignment_results.get('bam_files'):
                first_bam = alignment_results['bam_files'][0]
                dataset.alignment_bam.save(
                    f"aligned_{dataset_id}.bam", 
                    File(open(first_bam, 'rb'))
                )
        
        # Step 4: Quantification using real pipeline
        update_job_progress(job, 4, 'Quantifying gene expression', 80)
        expression_results = pipeline.run_quantification(alignment_results)
        
        if expression_results:
            job.genes_quantified = expression_results.get('genes_quantified', 0)
            job.save()
            
            # Save expression matrices
            if 'tpm_matrix' in expression_results:
                dataset.expression_matrix_tpm.save(
                    f"expression_tpm_{dataset_id}.tsv", 
                    File(open(expression_results['tpm_matrix'], 'rb'))
                )
            if 'counts_matrix' in expression_results:
                dataset.expression_matrix_counts.save(
                    f"expression_counts_{dataset_id}.tsv", 
                    File(open(expression_results['counts_matrix'], 'rb'))
                )
        
        # Step 5: Generate metadata using real pipeline
        update_job_progress(job, 5, 'Generating metadata and summary', 95)
        metadata = pipeline.generate_metadata(qc_results, alignment_results, expression_results)
        dataset.generated_metadata = metadata
        
        # Complete upstream processing
        dataset.status = 'upstream_complete'
        job.status = 'completed'
        job.progress_percentage = 100
        job.current_step_name = 'Upstream processing completed'
        job.completed_at = timezone.now()
        dataset.save()
        job.save()
        
        logger.info(f"Upstream processing completed for dataset {dataset_id}")
        
    except Exception as e:
        logger.error(f"Upstream processing failed for dataset {dataset_id}: {str(e)}")
        dataset = RNASeqDataset.objects.get(id=dataset_id)
        job = dataset.get_current_job()
        if job:
            job.status = 'failed'
            job.error_message = str(e)
            job.save()
        dataset.status = 'failed'
        dataset.save()

@shared_task
def process_downstream_analysis(dataset_id, analysis_config):
    """
    Process downstream RNA-seq analysis using real downstream_analysis classes
    """
    try:
        dataset = RNASeqDataset.objects.get(id=dataset_id)
        job = dataset.get_current_job()
        
        if not job:
            # Create new job for downstream analysis
            job = AnalysisJob.objects.create(
                user=dataset.user,
                dataset=dataset,
                analysis_type=dataset.dataset_type,
                job_config=analysis_config
            )
        
        dataset.status = 'processing_downstream'
        job.status = 'processing'
        job.current_step_name = 'Initializing downstream analysis'
        job.progress_percentage = 10
        dataset.save()
        job.save()
        
        # Import and initialize real downstream analyzer from downstream_analysis.py
        from .downstream_analysis import BulkRNASeqDownstreamAnalysis, SingleCellRNASeqDownstreamAnalysis
        
        # Use appropriate analyzer class based on dataset type
        if dataset.dataset_type == 'bulk':
            analyzer = BulkRNASeqDownstreamAnalysis(
                job
            )
        else:  # single_cell
            analyzer = SingleCellRNASeqDownstreamAnalysis(
                job
            )
        
        # Load expression data using real analyzer methods
        expression_data = analyzer.load_expression_data(dataset)
        
        analysis_type = analysis_config.get('analysis_type')
        
        if dataset.dataset_type == 'bulk':
            if analysis_type == 'clustering':
                update_job_progress(job, 1, 'Performing PCA and clustering analysis', 30)
                results = analyzer.perform_bulk_clustering_pca(expression_data, analysis_config)
                save_clustering_results(dataset, job, results)
                
            elif analysis_type == 'differential':
                update_job_progress(job, 1, 'Performing differential expression analysis', 30)
                results = analyzer.perform_differential_expression(expression_data, analysis_config)
                save_differential_results(dataset, job, results)
                
            elif analysis_type == 'pathway':
                update_job_progress(job, 1, 'Performing pathway enrichment analysis', 30)
                results = analyzer.perform_pathway_enrichment(expression_data, analysis_config)
                save_pathway_results(dataset, job, results)
                
            elif analysis_type == 'signature_correlation':
                update_job_progress(job, 1, 'Analyzing gene signature correlations', 30)
                results = analyzer.perform_signature_correlation(expression_data, analysis_config)
                save_signature_results(dataset, job, results)
                
            elif analysis_type == 'phenotype_correlation':
                update_job_progress(job, 1, 'Analyzing phenotype correlations', 30)
                results = analyzer.perform_phenotype_correlation(expression_data, analysis_config)
                save_phenotype_results(dataset, job, results)
        
        elif dataset.dataset_type == 'single_cell':
            if analysis_type == 'clustering':
                update_job_progress(job, 1, 'Performing single-cell clustering', 30)
                results = analyzer.perform_sc_clustering(expression_data, analysis_config)
                save_sc_clustering_results(dataset, job, results)
                
            elif analysis_type == 'cell_type_annotation':
                update_job_progress(job, 1, 'Annotating cell types', 30)
                results = analyzer.perform_cell_type_annotation(expression_data, analysis_config)
                save_cell_annotation_results(dataset, job, results)
                
            elif analysis_type == 'differential':
                update_job_progress(job, 1, 'Finding marker genes', 30)
                results = analyzer.perform_sc_differential_expression(expression_data, analysis_config)
                save_sc_differential_results(dataset, job, results)
                
            elif analysis_type == 'pseudotime':
                update_job_progress(job, 1, 'Performing pseudotime analysis', 30)
                results = analyzer.perform_pseudotime_analysis(expression_data, analysis_config)
                save_pseudotime_results(dataset, job, results)
                
            elif analysis_type == 'cell_communication':
                update_job_progress(job, 1, 'Analyzing cell-cell communication', 30)
                results = analyzer.perform_cell_communication_analysis(expression_data, analysis_config)
                save_communication_results(dataset, job, results)
        
        # Generate visualizations using real analyzer
        update_job_progress(job, 2, 'Generating visualizations', 70)
        visualization_path = analyzer.generate_visualizations(results, dataset)
        if visualization_path:
            dataset.visualization_image.save(
                f"visualization_{dataset_id}.png",
                File(open(visualization_path, 'rb'))
            )
        
        # AI interpretation using real AI service
        if analysis_config.get('enable_ai_interpretation', True):
            update_job_progress(job, 3, 'Generating AI interpretation', 90)
            ai_interpretation = analyzer.generate_ai_interpretation(
                results, 
                analysis_config.get('user_hypothesis', ''),
                dataset
            )
            dataset.ai_interpretation = ai_interpretation
        
        # Complete analysis
        dataset.status = 'completed'
        job.status = 'completed'
        job.progress_percentage = 100
        job.current_step_name = 'Analysis completed successfully'
        job.completed_at = timezone.now()
        dataset.save()
        job.save()
        
        logger.info(f"Downstream analysis completed for dataset {dataset_id}")
        
    except Exception as e:
        logger.error(f"Downstream analysis failed for dataset {dataset_id}: {str(e)}")
        dataset = RNASeqDataset.objects.get(id=dataset_id)
        job = dataset.get_current_job()
        if job:
            job.status = 'failed'
            job.error_message = str(e)
            job.save()
        dataset.status = 'failed'
        dataset.save()

def update_job_progress(job, step_number, step_name, progress):
    """Update job progress"""
    job.current_step = step_number
    job.current_step_name = step_name
    job.progress_percentage = progress
    job.save()
    
    # Update pipeline step
    step, created = PipelineStep.objects.get_or_create(
        job=job,
        step_number=step_number,
        defaults={'step_name': step_name, 'status': 'running'}
    )
    if not created:
        step.status = 'running'
        step.save()

def save_clustering_results(dataset, job, results):
    """Save clustering analysis results"""
    # Save PCA results and clusters
    if 'clusters' in results:
        clusters = []
        for i, cluster_data in enumerate(results['clusters']):
            cluster = RNASeqCluster(
                dataset=dataset,
                cluster_id=f"cluster_{i}",
                cluster_name=f"Cluster {i}",
                cell_count=cluster_data.get('cell_count', 0),
                marker_genes=cluster_data.get('marker_genes', []),
                coordinates=cluster_data.get('coordinates', {})
            )
            clusters.append(cluster)
        
        RNASeqCluster.objects.bulk_create(clusters)
        job.cell_clusters = len(clusters)
        job.save()

def save_differential_results(dataset, job, results):
    """Save differential expression results"""
    if 'differential_genes' in results:
        deg_results = []
        for gene_data in results['differential_genes']:
            result = RNASeqAnalysisResult(
                dataset=dataset,
                gene_id=gene_data['gene_id'],
                gene_name=gene_data.get('gene_name', ''),
                log2_fold_change=gene_data.get('log2fc', 0),
                p_value=gene_data.get('pvalue', 1),
                adjusted_p_value=gene_data.get('padj', 1),
                base_mean=gene_data.get('baseMean', 0),
                chromosome=gene_data.get('chromosome', ''),
                gene_type=gene_data.get('gene_type', 'protein_coding')
            )
            deg_results.append(result)
        
        RNASeqAnalysisResult.objects.bulk_create(deg_results, batch_size=1000)
        
        # Count significant genes
        significant_count = len([r for r in deg_results if r.adjusted_p_value < 0.05])
        job.significant_genes = significant_count
        job.save()

def save_pathway_results(dataset, job, results):
    """Save pathway enrichment results"""
    if 'enriched_pathways' in results:
        pathway_results = []
        for pathway_data in results['enriched_pathways']:
            result = RNASeqPathwayResult(
                dataset=dataset,
                pathway_id=pathway_data['pathway_id'],
                pathway_name=pathway_data['pathway_name'],
                database=pathway_data.get('database', 'GO'),
                p_value=pathway_data.get('pvalue', 1),
                adjusted_p_value=pathway_data.get('padj', 1),
                gene_count=pathway_data.get('gene_count', 0),
                gene_list=pathway_data.get('gene_list', []),
                enrichment_score=pathway_data.get('enrichment_score', 0)
            )
            pathway_results.append(result)
        
        RNASeqPathwayResult.objects.bulk_create(pathway_results)
        job.enriched_pathways = len(pathway_results)
        job.save()

def save_signature_results(dataset, job, results):
    """Save gene signature correlation results"""
    # Store signature results in job metadata
    job.result_files.append({
        'type': 'signature_correlation',
        'results': results
    })
    job.save()

def save_phenotype_results(dataset, job, results):
    """Save phenotype correlation results"""
    # Store phenotype results in job metadata
    job.result_files.append({
        'type': 'phenotype_correlation',
        'results': results
    })
    job.save()

def save_sc_clustering_results(dataset, job, results):
    """Save single-cell clustering results"""
    save_clustering_results(dataset, job, results)
    
    if 'umap_coordinates' in results:
        job.cells_detected = results.get('total_cells', 0)
        job.save()

def save_cell_annotation_results(dataset, job, results):
    """Save cell type annotation results"""
    if 'annotated_clusters' in results:
        # Update existing clusters with cell type annotations
        for cluster_data in results['annotated_clusters']:
            try:
                cluster = RNASeqCluster.objects.get(
                    dataset=dataset,
                    cluster_id=cluster_data['cluster_id']
                )
                cluster.cell_type = cluster_data.get('predicted_cell_type', '')
                cluster.save()
            except RNASeqCluster.DoesNotExist:
                continue

def save_sc_differential_results(dataset, job, results):
    """Save single-cell differential expression results"""
    if 'marker_genes' in results:
        marker_results = []
        for gene_data in results['marker_genes']:
            result = RNASeqAnalysisResult(
                dataset=dataset,
                gene_id=gene_data['gene_id'],
                gene_name=gene_data.get('gene_name', ''),
                log2_fold_change=gene_data.get('avg_log2FC', 0),
                p_value=gene_data.get('p_val', 1),
                adjusted_p_value=gene_data.get('p_val_adj', 1),
                cluster=gene_data.get('cluster', ''),
                pct_1=gene_data.get('pct.1', 0),
                pct_2=gene_data.get('pct.2', 0)
            )
            marker_results.append(result)
        
        RNASeqAnalysisResult.objects.bulk_create(marker_results, batch_size=1000)
        job.significant_genes = len(marker_results)
        job.save()

def save_pseudotime_results(dataset, job, results):
    """Save pseudotime analysis results"""
    job.result_files.append({
        'type': 'pseudotime',
        'results': results
    })
    job.save()

def save_communication_results(dataset, job, results):
    """Save cell communication results"""
    job.result_files.append({
        'type': 'cell_communication',
        'results': results
    })
    job.save()

@shared_task
def create_rnaseq_presentation(dataset_id, user_id, title, include_methods=True, 
                              include_results=True, include_discussion=True, quality='medium'):
    """
    Create a presentation from RNA-seq analysis results with AI assistance
    """
    try:
        from django.contrib.auth.models import User
        from django.utils import timezone
        
        dataset = RNASeqDataset.objects.get(id=dataset_id)
        user = User.objects.get(id=user_id)
        
        # Create presentation
        presentation = Presentation.objects.create(
            user=user,
            title=title,
            original_prompt=f"RNA-seq analysis presentation for {dataset.name}"
        )
        
        # Create slides based on analysis using real results
        slides_data = []
        
        # Title slide
        slides_data.append({
            'title': title,
            'description': f'{dataset.dataset_type.title()} RNA-seq analysis of {dataset.name} ({dataset.organism})',
            'image_prompt': f'Scientific presentation title slide for {dataset.dataset_type} RNA sequencing analysis, {dataset.organism} organism, molecular biology theme'
        })
        
        if include_methods:
            # Methods slide
            methods_description = f"""
            Analysis pipeline for {dataset.dataset_type} RNA-seq data:
            
            Upstream Processing:
            • Quality control with FastQC
            • Read trimming with Trimmomatic  
            • Alignment with STAR aligner
            • Quantification with RSEM
            
            Downstream Analysis:
            • {dataset.analysis_type.replace('_', ' ').title()} analysis
            • Statistical analysis and visualization
            • AI-assisted interpretation
            """
            
            slides_data.append({
                'title': 'Methods and Pipeline',
                'description': methods_description,
                'image_prompt': f'{dataset.dataset_type} RNA sequencing methodology flowchart, {dataset.organism} samples, bioinformatics pipeline, scientific illustration'
            })
        
        if include_results:
            # Results slides based on real analysis type
            if dataset.analysis_type == 'differential':
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
            
            elif dataset.analysis_type == 'clustering':
                if dataset.dataset_type == 'single_cell':
                    clusters = dataset.clusters.all()
                    if clusters.exists():
                        slides_data.append({
                            'title': 'Single-cell Clustering Results',
                            'description': f'Identified {clusters.count()} distinct cell clusters with unique expression profiles.',
                            'image_prompt': f'Single-cell RNA-seq UMAP clustering plot, {dataset.organism} cells, cell type identification'
                        })
                else:
                    slides_data.append({
                        'title': 'Sample Clustering and PCA',
                        'description': 'Principal component analysis reveals sample relationships and expression patterns.',
                        'image_prompt': f'PCA plot RNA-seq samples, {dataset.organism} bulk sequencing, sample clustering visualization'
                    })
            
            elif dataset.analysis_type == 'pathway':
                pathways = dataset.pathway_results.all()[:5]
                if pathways.exists():
                    pathway_list = ', '.join([p.pathway_name for p in pathways])
                    slides_data.append({
                        'title': 'Pathway Enrichment Analysis',
                        'description': f'Enriched biological pathways include: {pathway_list}.',
                        'image_prompt': f'Pathway enrichment analysis visualization, {dataset.organism} biological pathways, systems biology'
                    })
            
            # Add AI interpretation slide if available
            if dataset.ai_interpretation:
                slides_data.append({
                    'title': 'AI-Assisted Interpretation',
                    'description': dataset.ai_interpretation[:500] + "..." if len(dataset.ai_interpretation) > 500 else dataset.ai_interpretation,
                    'image_prompt': f'AI analysis interpretation, {dataset.dataset_type} RNA-seq insights, {dataset.organism} biology'
                })
            
            # Add visualization slide if available
            if dataset.visualization_image:
                slides_data.append({
                    'title': 'Data Visualization',
                    'description': f'Key visualization from {dataset.analysis_type.replace("_", " ")} analysis showing expression patterns and statistical significance.',
                    'image_prompt': f'{dataset.dataset_type} RNA-seq data visualization, {dataset.analysis_type} plot, {dataset.organism} transcriptomics'
                })
        
        if include_discussion:
            discussion_text = f"""
            The {dataset.dataset_type} RNA-seq analysis of {dataset.name} revealed significant transcriptional changes 
            that provide insights into the biological processes under investigation.
            
            Key findings:
            • {dataset.analysis_results.count()} genes analyzed
            • {dataset.clusters.count() if dataset.dataset_type == 'single_cell' else 'Multiple'} distinct expression patterns identified
            • AI interpretation highlights biological relevance and potential mechanisms
            
            These results contribute to our understanding of {dataset.organism} biology and may have implications 
            for therapeutic development and biomarker discovery.
            """
            
            slides_data.append({
                'title': 'Discussion and Conclusions',
                'description': discussion_text,
                'image_prompt': f'Scientific discussion slide, {dataset.dataset_type} RNA sequencing conclusions, {dataset.organism} biology, research implications'
            })
        
        # Generate images and create slides
        for i, slide_data in enumerate(slides_data):
            try:
                # Generate image for slide
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
        from .models import RNASeqPresentation
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

@shared_task
def process_multi_sample_upload(dataset_id, sample_files_data):
    """
    Process multiple FASTQ pairs for multi-sample analysis using real pipeline classes
    """
    try:
        dataset = RNASeqDataset.objects.get(id=dataset_id)
        job = dataset.get_current_job()
        
        if not job:
            job = AnalysisJob.objects.create(
                user=dataset.user,
                dataset=dataset,
                analysis_type=f"{dataset.dataset_type}_rnaseq",
                job_config={'multi_sample': True}
            )
        
        # Update job with sample information
        job.sample_files = sample_files_data
        job.num_samples = len(sample_files_data)
        job.save()
        
        # Import and initialize real pipeline for multi-sample processing
        from .pipeline_core import MultiSampleBulkRNASeqPipeline, MultiSampleSingleCellRNASeqPipeline
        
        # Use appropriate pipeline class based on dataset type
        if dataset.dataset_type == 'bulk':
            pipeline = MultiSampleBulkRNASeqPipeline(
                organism=dataset.organism,
                config={'multi_sample': True}
            )
        else:  # single_cell
            pipeline = MultiSampleSingleCellRNASeqPipeline(
                organism=dataset.organism,
                config={'multi_sample': True}
            )
        
        # Process multi-sample data using real pipeline methods
        multi_sample_results = pipeline.process_multi_sample_data(sample_files_data)
        
        # Process upstream pipeline with multiple samples
        process_upstream_pipeline.delay(str(dataset_id), {
            'multi_sample': True,
            'sample_files': sample_files_data,
            'multi_sample_results': multi_sample_results
        })
        
        logger.info(f"Started multi-sample processing for dataset {dataset_id}")
        
    except Exception as e:
        logger.error(f"Multi-sample upload processing failed: {str(e)}")
        raise

@shared_task
def process_ai_interaction(dataset_id, interaction_type, user_input, context_data=None):
    """
    Process AI interaction using real AI service
    """
    try:
        dataset = RNASeqDataset.objects.get(id=dataset_id)
        context_data = context_data or {}
        
        # Use real AI service for interactions
        if interaction_type == 'hypothesis_request':
            ai_response = ai_service.generate_hypothesis(
                {
                    'dataset_type': dataset.dataset_type,
                    'organism': dataset.organism,
                    'conditions': context_data.get('conditions', []),
                    'description': dataset.description
                },
                context_data.get('preliminary_results')
            )
        elif interaction_type == 'result_interpretation':
            # Get real analysis results
            results_summary = {
                'total_genes': dataset.analysis_results.count(),
                'significant_genes': dataset.analysis_results.filter(adjusted_p_value__lt=0.05).count(),
                'top_genes': list(dataset.analysis_results.filter(adjusted_p_value__lt=0.05).order_by('adjusted_p_value')[:10].values_list('gene_name', flat=True)),
                'analysis_type': dataset.analysis_type
            }
            
            if dataset.dataset_type == 'bulk':
                if dataset.analysis_type == 'differential':
                    deg_data = {
                        'total_genes': results_summary['total_genes'],
                        'upregulated': dataset.analysis_results.filter(log2_fold_change__gt=0, adjusted_p_value__lt=0.05).count(),
                        'downregulated': dataset.analysis_results.filter(log2_fold_change__lt=0, adjusted_p_value__lt=0.05).count(),
                        'top_up_genes': list(dataset.analysis_results.filter(log2_fold_change__gt=0, adjusted_p_value__lt=0.05).order_by('-log2_fold_change')[:5].values_list('gene_name', flat=True)),
                        'top_down_genes': list(dataset.analysis_results.filter(log2_fold_change__lt=0, adjusted_p_value__lt=0.05).order_by('log2_fold_change')[:5].values_list('gene_name', flat=True))
                    }
                    ai_response = ai_service.interpret_differential_expression(deg_data, {'conditions': [dataset.organism]})
                elif dataset.analysis_type == 'pathway':
                    pathway_data = {
                        'total_pathways': dataset.pathway_results.count(),
                        'significant_pathways': dataset.pathway_results.filter(adjusted_p_value__lt=0.05).count(),
                        'top_pathways': [
                            {
                                'name': p.pathway_name,
                                'genes': p.gene_count,
                                'p_value': p.adjusted_p_value
                            } for p in dataset.pathway_results.filter(adjusted_p_value__lt=0.05).order_by('adjusted_p_value')[:5]
                        ]
                    }
                    ai_response = ai_service.interpret_pathway_enrichment(pathway_data, results_summary)
                elif dataset.analysis_type == 'clustering':
                    clustering_data = {
                        'n_clusters': dataset.clusters.count(),
                        'total_cells': context_data.get('total_cells', 0),
                        'resolution': context_data.get('resolution', 0.5)
                    }
                    ai_response = ai_service.interpret_pca_clustering(
                        {'pc1_variance': 25, 'pc2_variance': 15, 'n_samples': dataset.get_current_job().num_samples if dataset.get_current_job() else 0},
                        clustering_data,
                        {'conditions': [dataset.organism]},
                        user_input
                    )
                else:
                    ai_response = f"Analysis interpretation for {dataset.analysis_type} is being processed."
            else:  # single_cell
                clustering_data = {
                    'total_cells': dataset.get_current_job().cells_detected if dataset.get_current_job() else 0,
                    'n_clusters': dataset.clusters.count(),
                    'resolution': context_data.get('resolution', 0.5)
                }
                ai_response = ai_service.interpret_scrna_clustering(clustering_data, {'sample_type': dataset.organism})
                
        elif interaction_type == 'signature_analysis':
            ai_response = ai_service.suggest_analysis_steps(dataset.dataset_type, 'signature_analysis', context_data)
        elif interaction_type == 'pathway_interpretation':
            ai_response = ai_service.suggest_analysis_steps(dataset.dataset_type, 'pathway_analysis', context_data)
        elif interaction_type == 'cell_type_suggestion':
            ai_response = ai_service.suggest_analysis_steps(dataset.dataset_type, 'cell_type_annotation', context_data)
        else:
            ai_response = "Unknown interaction type."
        
        # Save interaction
        interaction = RNASeqAIInteraction.objects.create(
            dataset=dataset,
            interaction_type=interaction_type,
            user_input=user_input,
            ai_response=ai_response,
            context_data=context_data
        )
        
        return interaction.id
        
    except Exception as e:
        logger.error(f"AI interaction processing failed: {e}")
        return None

@shared_task
def generate_rnaseq_visualization(dataset_id, visualization_type):
    """
    Generate visualizations for RNA-seq data using real downstream analyzer classes
    """
    try:
        dataset = RNASeqDataset.objects.get(id=dataset_id)
        
        # Import and use real downstream analyzer
        from .downstream_analysis import BulkRNASeqDownstreamAnalysis, SingleCellRNASeqDownstreamAnalysis
        
        # Use appropriate analyzer class based on dataset type
        if dataset.dataset_type == 'bulk':
            analyzer = BulkRNASeqDownstreamAnalysis(
                analysis_type=dataset.analysis_type
            )
        else:  # single_cell
            analyzer = SingleCellRNASeqDownstreamAnalysis(
                analysis_type=dataset.analysis_type
            )
        
        # Load expression data using real methods
        expression_data = analyzer.load_expression_data(dataset)
        
        # Generate visualization using real analyzer methods
        viz_path = None
        if visualization_type == 'volcano':
            viz_path = analyzer.generate_volcano_plot(dataset, expression_data)
        elif visualization_type == 'heatmap':
            viz_path = analyzer.generate_heatmap(dataset, expression_data)
        elif visualization_type == 'ma_plot':
            viz_path = analyzer.generate_ma_plot(dataset, expression_data)
        elif visualization_type == 'umap' and dataset.dataset_type == 'single_cell':
            viz_path = analyzer.generate_umap_plot(dataset, expression_data)
        
        if viz_path:
            dataset.visualization_image.save(
                f'{visualization_type}_{dataset.id}.png',
                File(open(viz_path, 'rb'))
            )
            dataset.save()
            
    except Exception as e:
        logger.error(f"Visualization generation failed: {e}")