from celery import shared_task
from django.utils import timezone
from .models import (
    AnalysisJob, RNASeqAnalysisResult, RNASeqCluster, 
    RNASeqPathwayResult, RNASeqAIChat, RNASeqPresentation
)
from users.models import Presentation, Slide
import logging
import random
import time

logger = logging.getLogger(__name__)

@shared_task
def process_upstream_pipeline(job_id):
    """
    Process upstream RNA-seq pipeline
    """
    logger.info(f"Upstream processing started for job {job_id}")
    try:
        job = AnalysisJob.objects.get(id=job_id)
        
        job.status = 'processing_upstream'
        job.started_at = timezone.now()
        job.current_step = 1
        job.current_step_name = 'Initializing upstream pipeline'
        job.progress_percentage = 5
        job.save()
        
        # Define pipeline steps based on dataset type
        if job.dataset_type == 'bulk':
            steps = [
                ('Quality Control (FastQC)', 20),
                ('Read Trimming (Trimmomatic)', 25),
                ('Genome Alignment (STAR)', 30),
                ('Gene Quantification (RSEM)', 15),
                ('Generate Expression Matrix', 10)
            ]
        else:  # single_cell
            steps = [
                ('Quality Control', 25),
                ('Barcode Processing', 30),
                ('Cell Filtering', 25),
                ('Generate Cell-Gene Matrix', 20)
            ]
        
        # Simulate pipeline execution
        for step_num, (step_name, duration) in enumerate(steps, 1):
            try:
                job.current_step = step_num
                job.current_step_name = step_name
                job.progress_percentage = int((step_num / len(steps)) * 90)
                job.save()
                
                logger.info(f"[Upstream] Starting step {step_num}: {step_name}")
                
                # Simulate processing time
                time.sleep(duration)
                
                # Update job metrics with realistic values
                if step_name.lower().includes('alignment'):
                    job.total_reads = random.randint(20000000, 50000000)
                    job.mapped_reads = int(job.total_reads * random.uniform(0.75, 0.95))
                    job.alignment_rate = job.mapped_reads / job.total_reads
                elif step_name.lower().includes('quantification'):
                    job.genes_quantified = random.randint(15000, 25000)
                elif step_name.lower().includes('cell') and job.dataset_type == 'single_cell':
                    job.cells_detected = random.randint(3000, 8000)
                
                job.save()
                
                logger.info(f"[Upstream] Completed step {step_num}: {step_name}")
                
            except Exception as e:
                logger.error(f"[Upstream] Step {step_num} failed: {str(e)}")
                job.status = 'failed'
                job.error_message = f"Step {step_num} ({step_name}) failed: {str(e)}"
                job.save()
                return
        
        # Finalize upstream processing
        job.current_step_name = 'Upstream processing completed'
        job.progress_percentage = 100
        job.status = 'upstream_complete'
        job.completed_at = timezone.now()
        job.save()
        
        logger.info(f"Upstream processing completed for job {job_id}")
        
    except Exception as e:
        logger.error(f"Upstream processing failed for job {job_id}: {str(e)}")
        try:
            job = AnalysisJob.objects.get(id=job_id)
            job.status = 'failed'
            job.error_message = str(e)
            job.save()
        except:
            pass

@shared_task
def process_downstream_analysis(job_id):
    """
    Process downstream RNA-seq analysis
    """
    try:
        job = AnalysisJob.objects.get(id=job_id)
        
        job.status = 'processing_downstream'
        job.started_at = timezone.now()
        job.current_step = 1
        job.current_step_name = 'Initializing downstream analysis'
        job.progress_percentage = 5
        job.save()
        
        # Define analysis steps based on dataset type
        if job.dataset_type == 'bulk':
            steps = [
                ('Sample Clustering & PCA', 15),
                ('Differential Expression Analysis', 20),
                ('Pathway Enrichment Analysis', 15),
                ('Generate Visualizations', 10)
            ]
        else:  # single_cell
            steps = [
                ('Cell Clustering & UMAP', 20),
                ('Cell Type Annotation', 15),
                ('Differential Expression (by cluster)', 20),
                ('Trajectory Analysis', 15)
            ]
        
        # Simulate analysis execution
        for step_num, (step_name, duration) in enumerate(steps, 1):
            try:
                job.current_step = step_num
                job.current_step_name = step_name
                job.progress_percentage = int((step_num / len(steps)) * 80) + 10
                job.save()
                
                logger.info(f"[Downstream] Starting step {step_num}: {step_name}")
                
                # Simulate processing time
                time.sleep(duration)
                
                # Update job metrics with realistic values
                if 'differential' in step_name.lower():
                    job.significant_genes = random.randint(500, 3000)
                elif 'pathway' in step_name.lower():
                    job.enriched_pathways = random.randint(20, 100)
                elif 'clustering' in step_name.lower() and job.dataset_type == 'single_cell':
                    job.cell_clusters = random.randint(8, 15)
                
                job.save()
                
                logger.info(f"[Downstream] Completed step {step_num}: {step_name}")
                
            except Exception as e:
                logger.error(f"[Downstream] Step {step_num} failed: {str(e)}")
                job.status = 'failed'
                job.error_message = f"Step {step_num} ({step_name}) failed: {str(e)}"
                job.save()
                return
        
        # Finalize downstream processing
        job.current_step_name = 'Analysis completed'
        job.progress_percentage = 100
        job.status = 'completed'
        job.completed_at = timezone.now()
        job.save()
        
        logger.info(f"Downstream analysis completed for job {job_id}")
        
    except Exception as e:
        logger.error(f"Downstream analysis failed for job {job_id}: {str(e)}")
        try:
            job = AnalysisJob.objects.get(id=job_id)
            job.status = 'failed'
            job.error_message = str(e)
            job.save()
        except:
            pass

@shared_task
def create_rnaseq_presentation(job_id, user_id, title, include_methods=True, 
                              include_results=True, include_discussion=True, quality='medium'):
    """
    Create a comprehensive presentation from RNA-seq analysis results
    """
    try:
        from django.contrib.auth.models import User
        
        job = AnalysisJob.objects.get(id=job_id)
        user = User.objects.get(id=user_id)
        
        # Create presentation
        presentation = Presentation.objects.create(
            user=user,
            title=title,
            original_prompt=f"Comprehensive RNA-seq analysis presentation for {job.name}"
        )
        
        # Generate slides based on analysis type and results
        slides_data = []
        
        # Title slide
        slides_data.append({
            'title': title,
            'description': f'{job.dataset_type.title()} RNA-seq analysis of {job.name} ({job.organism}). This presentation summarizes the comprehensive analysis pipeline and key findings.',
            'image_prompt': f'Scientific presentation title slide for {job.dataset_type} RNA sequencing analysis, {job.organism} organism, molecular biology theme, professional academic style'
        })
        
        if include_methods:
            slides_data.append({
                'title': 'Methods and Analysis Pipeline',
                'description': f'Comprehensive {job.dataset_type} RNA-seq analysis pipeline including quality control, alignment, quantification, and statistical analysis.',
                'image_prompt': f'{job.dataset_type} RNA sequencing methodology flowchart, {job.organism} samples, bioinformatics pipeline, scientific illustration'
            })
        
        if include_results:
            if job.significant_genes > 0:
                slides_data.append({
                    'title': 'Differential Expression Results',
                    'description': f'Analysis identified {job.significant_genes} significantly altered genes with statistical significance.',
                    'image_prompt': f'Volcano plot showing differential gene expression, RNA-seq results, {job.organism} genes, statistical significance visualization'
                })
            
            if job.enriched_pathways > 0:
                slides_data.append({
                    'title': 'Pathway Enrichment Analysis',
                    'description': f'Functional enrichment analysis identified {job.enriched_pathways} significantly enriched biological pathways.',
                    'image_prompt': f'Pathway enrichment analysis visualization, {job.organism} biological pathways, systems biology'
                })
        
        if include_discussion:
            slides_data.append({
                'title': 'Discussion and Future Directions',
                'description': f'The {job.dataset_type} RNA-seq analysis provides significant insights into {job.organism} transcriptional regulation with important implications for research.',
                'image_prompt': f'Scientific discussion slide, {job.dataset_type} RNA sequencing conclusions, {job.organism} biology, research implications'
            })
        
        # Create slides (simplified - would use actual image generation in production)
        for i, slide_data in enumerate(slides_data):
            Slide.objects.create(
                presentation=presentation,
                order=i,
                title=slide_data['title'],
                description=slide_data['description'],
                image_prompt=slide_data['image_prompt'],
                image_url='',  # Would generate actual images in production
            )
        
        # Link job to presentation
        RNASeqPresentation.objects.create(
            job=job,
            presentation=presentation
        )
        
        logger.info(f"Created presentation {presentation.id} from RNA-seq job {job_id}")
        
        return presentation.id
        
    except Exception as e:
        logger.error(f"Failed to create RNA-seq presentation: {str(e)}")
        raise