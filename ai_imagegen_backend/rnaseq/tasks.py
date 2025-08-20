from celery import shared_task
from django.utils import timezone
from django.conf import settings
import logging
import os
import traceback
from .models import AnalysisJob, PipelineStep
from .pipeline_core import MultiSampleBulkRNASeqPipeline, MultiSampleSingleCellRNASeqPipeline
from .downstream_analysis import BulkRNASeqDownstreamAnalysis, SingleCellRNASeqDownstreamAnalysis
from .ai_service import ai_service

logger = logging.getLogger(__name__)

@shared_task(bind=True)
def process_upstream_pipeline(self, job_id):
    """
    Process upstream RNA-seq pipeline using real bioinformatics tools
    """
    logger.info(f"Starting upstream processing for job {job_id}")
    
    try:
        job = AnalysisJob.objects.get(id=job_id)
        
        # Initialize job status
        job.status = 'processing_upstream'
        job.started_at = timezone.now()
        job.current_step = 1
        job.current_step_name = 'Initializing upstream pipeline'
        job.progress_percentage = 5
        job.save()
        
        # Initialize appropriate pipeline based on dataset type
        if job.dataset_type == 'bulk':
            pipeline = MultiSampleBulkRNASeqPipeline(job)
            pipeline_steps = [
                ('step_1_quality_control', 'Quality Control (FastQC)', 20),
                ('step_2_read_trimming', 'Read Trimming (Trimmomatic)', 25),
                ('step_3_read_alignment', 'Genome Alignment (STAR)', 30),
                ('step_4_quantification', 'Gene Quantification (RSEM)', 15),
                ('step_5_generate_expression_matrix', 'Generate Expression Matrix', 10)
            ]
        else:  # single_cell
            pipeline = MultiSampleSingleCellRNASeqPipeline(job)
            pipeline_steps = [
                ('step_1_quality_control', 'Quality Control', 25),
                ('step_2_cell_barcode_processing', 'Barcode Processing', 30),
                ('step_3_read_alignment', 'Read Alignment (STAR Solo)', 25),
                ('step_4_cell_filtering', 'Cell Filtering', 10),
                ('step_5_generate_expression_matrix', 'Generate Expression Matrix', 10)
            ]
        
        # Execute pipeline steps
        total_steps = len(pipeline_steps)
        for step_num, (method_name, step_name, estimated_duration) in enumerate(pipeline_steps, 1):
            try:
                # Update job status
                job.current_step = step_num
                job.current_step_name = step_name
                job.progress_percentage = int((step_num / total_steps) * 85) + 5
                job.save()
                
                # Create pipeline step record
                pipeline_step = PipelineStep.objects.create(
                    job=job,
                    step_number=step_num,
                    step_name=step_name,
                    status='running',
                    started_at=timezone.now()
                )
                
                logger.info(f"[Upstream] Starting step {step_num}: {step_name}")
                
                # Execute the actual pipeline method
                if hasattr(pipeline, method_name):
                    step_method = getattr(pipeline, method_name)
                    step_results = step_method()
                    
                    # Store step results
                    pipeline_step.metrics = step_results
                    pipeline_step.status = 'completed'
                    pipeline_step.completed_at = timezone.now()
                    pipeline_step.duration_seconds = int(
                        (pipeline_step.completed_at - pipeline_step.started_at).total_seconds()
                    )
                    pipeline_step.save()
                    
                    # Update job metrics based on step results
                    if step_name.lower().find('alignment') != -1:
                        job.total_reads = step_results.get('total_reads', job.total_reads)
                        job.mapped_reads = step_results.get('mapped_reads', job.mapped_reads)
                        job.alignment_rate = step_results.get('alignment_rate', job.alignment_rate)
                    elif step_name.lower().find('quantification') != -1 or step_name.lower().find('matrix') != -1:
                        job.genes_quantified = step_results.get('genes_quantified', job.genes_quantified)
                        if job.dataset_type == 'single_cell':
                            job.cells_detected = step_results.get('cells_detected', job.cells_detected)
                    
                    job.save()
                    
                    logger.info(f"[Upstream] Completed step {step_num}: {step_name}")
                else:
                    raise ValueError(f"Pipeline method {method_name} not found")
                
                # Update task progress
                self.update_state(
                    state='PROGRESS',
                    meta={'current': step_num, 'total': total_steps, 'status': step_name}
                )
                
            except Exception as e:
                logger.error(f"[Upstream] Step {step_num} failed: {str(e)}")
                logger.error(traceback.format_exc())
                
                # Update pipeline step
                pipeline_step.status = 'failed'
                pipeline_step.error_message = str(e)
                pipeline_step.completed_at = timezone.now()
                pipeline_step.save()
                
                # Update job
                job.status = 'failed'
                job.error_message = f"Step {step_num} ({step_name}) failed: {str(e)}"
                job.save()
                
                raise
        
        # Finalize upstream processing
        job.current_step_name = 'Upstream processing completed'
        job.progress_percentage = 100
        job.status = 'upstream_complete'
        job.completed_at = timezone.now()
        job.save()
        
        logger.info(f"Upstream processing completed successfully for job {job_id}")
        
        return {
            'status': 'completed',
            'job_id': str(job_id),
            'message': 'Upstream processing completed successfully'
        }
        
    except Exception as e:
        logger.error(f"Upstream processing failed for job {job_id}: {str(e)}")
        logger.error(traceback.format_exc())
        
        try:
            job = AnalysisJob.objects.get(id=job_id)
            job.status = 'failed'
            job.error_message = str(e)
            job.completed_at = timezone.now()
            job.save()
        except:
            pass
        
        raise

@shared_task(bind=True)
def process_downstream_analysis(self, job_id):
    """
    Process downstream RNA-seq analysis using real bioinformatics methods
    """
    logger.info(f"Starting downstream analysis for job {job_id}")
    
    try:
        job = AnalysisJob.objects.get(id=job_id)
        
        # Initialize job status
        job.status = 'processing_downstream'
        job.started_at = timezone.now()
        job.current_step = 1
        job.current_step_name = 'Initializing downstream analysis'
        job.progress_percentage = 5
        job.save()
        
        # Initialize appropriate downstream analysis based on dataset type
        if job.dataset_type == 'bulk':
            analysis = BulkRNASeqDownstreamAnalysis(job)
            analysis_steps = [
                ('step_1_pca_clustering', 'Sample Clustering & PCA', 25),
                ('step_2_differential_expression', 'Differential Expression Analysis', 30),
                ('step_3_pathway_enrichment', 'Pathway Enrichment Analysis', 25),
                ('step_4_signature_analysis', 'Gene Signature Analysis', 20)
            ]
        else:  # single_cell
            analysis = SingleCellRNASeqDownstreamAnalysis(job)
            analysis_steps = [
                ('step_1_qc_normalization', 'QC and Normalization', 20),
                ('step_2_dimensionality_reduction', 'Dimensionality Reduction', 25),
                ('step_3_clustering', 'Cell Clustering', 25),
                ('step_4_cell_type_annotation', 'Cell Type Annotation', 30)
            ]
        
        # Execute analysis steps
        total_steps = len(analysis_steps)
        for step_num, (method_name, step_name, estimated_duration) in enumerate(analysis_steps, 1):
            try:
                # Update job status
                job.current_step = step_num
                job.current_step_name = step_name
                job.progress_percentage = int((step_num / total_steps) * 85) + 5
                job.save()
                
                # Create pipeline step record
                pipeline_step = PipelineStep.objects.create(
                    job=job,
                    step_number=step_num,
                    step_name=step_name,
                    status='running',
                    started_at=timezone.now()
                )
                
                logger.info(f"[Downstream] Starting step {step_num}: {step_name}")
                
                # Execute the actual analysis method
                if hasattr(analysis, method_name):
                    step_method = getattr(analysis, method_name)
                    step_results = step_method()
                    
                    # Store step results
                    pipeline_step.metrics = step_results
                    pipeline_step.status = 'completed'
                    pipeline_step.completed_at = timezone.now()
                    pipeline_step.duration_seconds = int(
                        (pipeline_step.completed_at - pipeline_step.started_at).total_seconds()
                    )
                    pipeline_step.save()
                    
                    # Update job metrics based on step results
                    if 'differential' in step_name.lower():
                        job.significant_genes = step_results.get('significant_genes', job.significant_genes)
                    elif 'pathway' in step_name.lower():
                        job.enriched_pathways = step_results.get('significant_pathways', job.enriched_pathways)
                    elif 'clustering' in step_name.lower() and job.dataset_type == 'single_cell':
                        job.cell_clusters = step_results.get('n_clusters', job.cell_clusters)
                    
                    job.save()
                    
                    logger.info(f"[Downstream] Completed step {step_num}: {step_name}")
                    
                    # Generate AI interpretation if enabled
                    if job.enable_ai_interpretation and settings.ANALYSIS_CONFIG.get('AI_INTERPRETATION', {}).get('ENABLE_AI_INTERPRETATION', True):
                        try:
                            interpretation = generate_ai_interpretation(job, step_name, step_results)
                            if interpretation:
                                logger.info(f"Generated AI interpretation for {step_name}")
                        except Exception as ai_error:
                            logger.warning(f"AI interpretation failed for {step_name}: {ai_error}")
                else:
                    raise ValueError(f"Analysis method {method_name} not found")
                
                # Update task progress
                self.update_state(
                    state='PROGRESS',
                    meta={'current': step_num, 'total': total_steps, 'status': step_name}
                )
                
            except Exception as e:
                logger.error(f"[Downstream] Step {step_num} failed: {str(e)}")
                logger.error(traceback.format_exc())
                
                # Update pipeline step
                pipeline_step.status = 'failed'
                pipeline_step.error_message = str(e)
                pipeline_step.completed_at = timezone.now()
                pipeline_step.save()
                
                # Update job
                job.status = 'failed'
                job.error_message = f"Step {step_num} ({step_name}) failed: {str(e)}"
                job.save()
                
                raise
        
        # Finalize downstream analysis
        job.current_step_name = 'Downstream analysis completed'
        job.progress_percentage = 100
        job.status = 'completed'
        job.completed_at = timezone.now()
        job.save()
        
        logger.info(f"Downstream analysis completed successfully for job {job_id}")
        
        return {
            'status': 'completed',
            'job_id': str(job_id),
            'message': 'Downstream analysis completed successfully'
        }
        
    except Exception as e:
        logger.error(f"Downstream analysis failed for job {job_id}: {str(e)}")
        logger.error(traceback.format_exc())
        
        try:
            job = AnalysisJob.objects.get(id=job_id)
            job.status = 'failed'
            job.error_message = str(e)
            job.completed_at = timezone.now()
            job.save()
        except:
            pass
        
        raise

def generate_ai_interpretation(job, step_name, step_results):
    """
    Generate AI interpretation for analysis results
    """
    try:
        metadata = {
            'conditions': list(job.job_config.get('comparison_groups', {}).keys()),
            'organism': job.organism,
            'dataset_type': job.dataset_type
        }
        
        if 'pca' in step_name.lower() and 'clustering' in step_name.lower():
            interpretation = ai_service.interpret_pca_clustering(
                step_results, step_results, metadata, job.user_hypothesis
            )
        elif 'differential' in step_name.lower():
            interpretation = ai_service.interpret_differential_expression(
                step_results, metadata
            )
        elif 'pathway' in step_name.lower():
            # Get DEG results for pathway interpretation
            deg_data = {
                'upregulated': step_results.get('upregulated', 0),
                'downregulated': step_results.get('downregulated', 0)
            }
            interpretation = ai_service.interpret_pathway_enrichment(
                step_results, deg_data
            )
        elif 'clustering' in step_name.lower() and job.dataset_type == 'single_cell':
            interpretation = ai_service.interpret_scrna_clustering(
                step_results, metadata
            )
        else:
            return None
        
        # Store interpretation in job's AI chat history
        if interpretation:
            from .models import RNASeqAIChat
            RNASeqAIChat.objects.create(
                job=job,
                user_message=f"System: Analysis interpretation for {step_name}",
                ai_response=interpretation,
                context_data={
                    'step_name': step_name,
                    'step_results': step_results,
                    'auto_generated': True
                }
            )
        
        return interpretation
        
    except Exception as e:
        logger.error(f"Failed to generate AI interpretation: {e}")
        return None

@shared_task
def create_rnaseq_presentation(job_id, user_id, title, include_methods=True, 
                              include_results=True, include_discussion=True, quality='medium'):
    """
    Create a comprehensive presentation from RNA-seq analysis results
    """
    try:
        from django.contrib.auth.models import User
        from users.models import Presentation, Slide
        from .models import RNASeqPresentation
        
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
            'description': f'{job.dataset_type.title()} RNA-seq analysis of {job.name} ({job.organism}). This presentation summarizes the comprehensive analysis pipeline and key findings. Total samples: {job.sample_count}, Pipeline stage: {job.selected_pipeline_stage}.',
            'image_prompt': f'Scientific presentation title slide for {job.dataset_type} RNA sequencing analysis, {job.organism} organism, molecular biology theme, professional academic style, modern design'
        })
        
        if include_methods:
            # Methods slide
            methods_description = f'Comprehensive {job.dataset_type} RNA-seq analysis pipeline '
            if job.dataset_type == 'bulk':
                methods_description += 'including quality control with FastQC, read trimming with Trimmomatic, genome alignment with STAR, and gene quantification with RSEM.'
            else:
                methods_description += 'including quality control, barcode processing, STAR Solo alignment, cell filtering, and single-cell analysis with Scanpy.'
            
            slides_data.append({
                'title': 'Methods and Analysis Pipeline',
                'description': methods_description,
                'image_prompt': f'{job.dataset_type} RNA sequencing methodology flowchart, {job.organism} samples, bioinformatics pipeline diagram, scientific illustration, workflow chart'
            })
        
        if include_results:
            # Results slides based on actual job metrics
            if job.genes_quantified > 0:
                slides_data.append({
                    'title': 'Gene Expression Overview',
                    'description': f'Expression analysis identified {job.genes_quantified:,} quantified genes across {job.sample_count} samples. Alignment rate: {job.alignment_rate:.1f}%, Total reads: {job.total_reads:,}.',
                    'image_prompt': f'Gene expression heatmap, RNA-seq data visualization, {job.organism} transcriptome, scientific color scheme'
                })
            
            if job.significant_genes > 0:
                slides_data.append({
                    'title': 'Differential Expression Results',
                    'description': f'Differential expression analysis identified {job.significant_genes:,} significantly altered genes with statistical significance (FDR < 0.05, |log2FC| > 1).',
                    'image_prompt': f'Volcano plot showing differential gene expression, RNA-seq results, {job.organism} genes, statistical significance visualization, red and blue points'
                })
            
            if job.enriched_pathways > 0:
                slides_data.append({
                    'title': 'Pathway Enrichment Analysis',
                    'description': f'Functional enrichment analysis identified {job.enriched_pathways} significantly enriched biological pathways, providing insights into affected cellular processes.',
                    'image_prompt': f'Pathway enrichment bar chart, {job.organism} biological pathways, systems biology visualization, functional analysis'
                })
            
            if job.dataset_type == 'single_cell' and job.cell_clusters > 0:
                slides_data.append({
                    'title': 'Single-Cell Clustering Results',
                    'description': f'Single-cell analysis identified {job.cell_clusters} distinct cell clusters from {job.cells_detected:,} high-quality cells, revealing cellular heterogeneity.',
                    'image_prompt': f'UMAP plot showing single cell clusters, {job.organism} cells, colorful cell type visualization, dimensional reduction'
                })
        
        if include_discussion:
            discussion_text = f'The {job.dataset_type} RNA-seq analysis of {job.organism} samples provides significant insights into transcriptional regulation'
            if job.significant_genes > 0:
                discussion_text += f' with {job.significant_genes} differentially expressed genes'
            if job.enriched_pathways > 0:
                discussion_text += f' and {job.enriched_pathways} enriched pathways'
            discussion_text += ', offering important implications for future research and potential therapeutic targets.'
            
            slides_data.append({
                'title': 'Discussion and Future Directions',
                'description': discussion_text,
                'image_prompt': f'Scientific discussion slide, {job.dataset_type} RNA sequencing conclusions, {job.organism} biology research, future directions diagram'
            })
        
        # Create slides
        for i, slide_data in enumerate(slides_data):
            Slide.objects.create(
                presentation=presentation,
                order=i,
                title=slide_data['title'],
                description=slide_data['description'],
                image_prompt=slide_data['image_prompt'],
                image_url='',  # Will be generated by the presentation system
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
        logger.error(traceback.format_exc())
        raise

@shared_task
def process_ai_chat_request(chat_id, job_id, user_message, context_type='general'):
    """
    Process AI chat request for RNA-seq analysis
    """
    try:
        from .models import RNASeqAIChat
        
        job = AnalysisJob.objects.get(id=job_id)
        chat = RNASeqAIChat.objects.get(id=chat_id)
        
        # Gather context data based on job status and results
        context_data = {
            'job_status': job.status,
            'dataset_type': job.dataset_type,
            'organism': job.organism,
            'sample_count': job.sample_count,
            'genes_quantified': job.genes_quantified,
            'significant_genes': job.significant_genes,
            'enriched_pathways': job.enriched_pathways,
            'context_type': context_type
        }
        
        if job.dataset_type == 'single_cell':
            context_data.update({
                'cells_detected': job.cells_detected,
                'cell_clusters': job.cell_clusters
            })
        
        # Generate AI response based on context type
        if context_type == 'results_interpretation':
            if job.status == 'completed':
                response = ai_service.interpret_differential_expression(
                    {'total_genes': job.genes_quantified, 'significant_genes': job.significant_genes},
                    {'organism': job.organism, 'conditions': ['treatment', 'control']}
                )
            else:
                response = "Analysis is not yet complete. Please wait for the analysis to finish before requesting results interpretation."
        
        elif context_type == 'methodology':
            pipeline_info = f"This {job.dataset_type} RNA-seq analysis uses a comprehensive bioinformatics pipeline"
            if job.dataset_type == 'bulk':
                pipeline_info += " including FastQC quality control, Trimmomatic read trimming, STAR alignment, and RSEM quantification."
            else:
                pipeline_info += " including barcode processing, STAR Solo alignment, and single-cell analysis with Scanpy."
            response = pipeline_info
        
        else:  # general
            response = ai_service.suggest_analysis_steps(
                job.dataset_type, 
                job.current_step_name, 
                context_data
            )
        
        # Update chat with AI response
        chat.ai_response = response
        chat.context_data = context_data
        chat.save()
        
        logger.info(f"Processed AI chat request for job {job_id}")
        
        return response
        
    except Exception as e:
        logger.error(f"Failed to process AI chat request: {str(e)}")
        
        # Update chat with error message
        try:
            chat = RNASeqAIChat.objects.get(id=chat_id)
            chat.ai_response = "I apologize, but I'm having trouble processing your request right now. Please try again later."
            chat.save()
        except:
            pass
        
        raise