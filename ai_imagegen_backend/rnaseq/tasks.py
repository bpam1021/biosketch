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
from .models import (
    RNASeqDataset, RNASeqAnalysisResult, RNASeqCluster, 
    RNASeqPathwayResult, RNASeqAIInteraction
)
from users.models import Presentation, Slide
from users.utils.ai_generation import decompose_prompt, generate_image
import logging

logger = logging.getLogger(__name__)
client = OpenAI()

@shared_task
def process_upstream_pipeline(dataset_id, config=None):
    """
    Process upstream RNA-seq pipeline: QC -> Trimming -> Alignment -> Quantification
    """
    try:
        dataset = RNASeqDataset.objects.get(id=dataset_id)
        dataset.status = 'processing_upstream'
        dataset.save()
        
        config = config or {}
        
        # Step 1: Quality Control with FastQC
        if not config.get('skip_qc', False):
            logger.info(f"Running FastQC for dataset {dataset_id}")
            qc_results = run_fastqc(dataset)
            if qc_results:
                dataset.qc_report.save(f"qc_report_{dataset_id}.html", ContentFile(qc_results))
        
        # Step 2: Read Trimming with Trimmomatic
        if not config.get('skip_trimming', False):
            logger.info(f"Running Trimmomatic for dataset {dataset_id}")
            trimmed_files = run_trimmomatic(dataset)
            if trimmed_files:
                dataset.trimmed_fastq_r1.save(f"trimmed_r1_{dataset_id}.fastq.gz", File(open(trimmed_files[0], 'rb')))
                dataset.trimmed_fastq_r2.save(f"trimmed_r2_{dataset_id}.fastq.gz", File(open(trimmed_files[1], 'rb')))
        
        # Step 3: Read Alignment with STAR
        logger.info(f"Running STAR alignment for dataset {dataset_id}")
        alignment_file = run_star_alignment(dataset, config.get('reference_genome', 'hg38'))
        if alignment_file:
            dataset.alignment_bam.save(f"aligned_{dataset_id}.bam", File(open(alignment_file, 'rb')))
        
        # Step 4: Quantification with RSEM
        logger.info(f"Running RSEM quantification for dataset {dataset_id}")
        expression_files = run_rsem_quantification(dataset)
        if expression_files:
            dataset.expression_matrix_tpm.save(f"expression_tpm_{dataset_id}.tsv", File(open(expression_files['tpm'], 'rb')))
            dataset.expression_matrix_counts.save(f"expression_counts_{dataset_id}.tsv", File(open(expression_files['counts'], 'rb')))
        
        # Step 5: Generate metadata for downstream processing
        metadata = generate_upstream_metadata(dataset)
        dataset.generated_metadata = metadata
        
        dataset.status = 'upstream_complete'
        dataset.save()
        
        logger.info(f"Upstream processing completed for dataset {dataset_id}")
        
    except Exception as e:
        logger.error(f"Upstream processing failed for dataset {dataset_id}: {str(e)}")
        dataset = RNASeqDataset.objects.get(id=dataset_id)
        dataset.status = 'failed'
        dataset.save()

@shared_task
def process_downstream_analysis(dataset_id, analysis_config):
    """
    Process downstream RNA-seq analysis with AI assistance
    """
    try:
        dataset = RNASeqDataset.objects.get(id=dataset_id)
        dataset.status = 'processing_downstream'
        dataset.save()
        
        analysis_type = analysis_config.get('analysis_type')
        
        if dataset.dataset_type == 'bulk':
            if analysis_type == 'clustering':
                perform_bulk_clustering_pca(dataset, analysis_config)
            elif analysis_type == 'differential':
                perform_differential_expression(dataset, analysis_config)
            elif analysis_type == 'pathway':
                perform_pathway_enrichment(dataset, analysis_config)
            elif analysis_type == 'signature_correlation':
                perform_signature_correlation(dataset, analysis_config)
            elif analysis_type == 'phenotype_correlation':
                perform_phenotype_correlation(dataset, analysis_config)
        
        elif dataset.dataset_type == 'single_cell':
            if analysis_type == 'clustering':
                perform_sc_clustering(dataset, analysis_config)
            elif analysis_type == 'cell_type_annotation':
                perform_cell_type_annotation(dataset, analysis_config)
            elif analysis_type == 'differential':
                perform_sc_differential_expression(dataset, analysis_config)
            elif analysis_type == 'pseudotime':
                perform_pseudotime_analysis(dataset, analysis_config)
            elif analysis_type == 'cell_communication':
                perform_cell_communication_analysis(dataset, analysis_config)
        
        dataset.status = 'completed'
        dataset.save()
        
        logger.info(f"Downstream analysis completed for dataset {dataset_id}")
        
    except Exception as e:
        logger.error(f"Downstream analysis failed for dataset {dataset_id}: {str(e)}")
        dataset = RNASeqDataset.objects.get(id=dataset_id)
        dataset.status = 'failed'
        dataset.save()

def run_fastqc(dataset):
    """
    Run FastQC quality control
    """
    try:
        # Mock implementation - in production, run actual FastQC
        fastq_files = [dataset.fastq_r1_file.path, dataset.fastq_r2_file.path]
        
        # Simulate FastQC results
        qc_report = f"""
        <html>
        <head><title>FastQC Report - {dataset.name}</title></head>
        <body>
        <h1>FastQC Quality Control Report</h1>
        <h2>Dataset: {dataset.name}</h2>
        <p>Total Sequences: 10,000,000</p>
        <p>Sequence Length: 150bp</p>
        <p>%GC: 45%</p>
        <p>Quality Score: PASS</p>
        </body>
        </html>
        """
        return qc_report.encode()
    except Exception as e:
        logger.error(f"FastQC failed: {e}")
        return None

def run_trimmomatic(dataset):
    """
    Run Trimmomatic for read trimming
    """
    try:
        # Mock implementation - in production, run actual Trimmomatic
        input_r1 = dataset.fastq_r1_file.path
        input_r2 = dataset.fastq_r2_file.path
        
        # Create mock trimmed files
        output_r1 = f"/tmp/trimmed_r1_{dataset.id}.fastq.gz"
        output_r2 = f"/tmp/trimmed_r2_{dataset.id}.fastq.gz"
        
        # In production, run: trimmomatic PE input_r1 input_r2 output_r1 unpaired_r1 output_r2 unpaired_r2 ILLUMINACLIP:adapters.fa:2:30:10 LEADING:3 TRAILING:3 SLIDINGWINDOW:4:15 MINLEN:36
        
        # Mock file creation
        with open(output_r1, 'w') as f:
            f.write("@mock_read_1\nACGTACGT\n+\nIIIIIIII\n")
        with open(output_r2, 'w') as f:
            f.write("@mock_read_2\nTGCATGCA\n+\nIIIIIIII\n")
        
        return [output_r1, output_r2]
    except Exception as e:
        logger.error(f"Trimmomatic failed: {e}")
        return None

def run_star_alignment(dataset, reference_genome):
    """
    Run STAR alignment
    """
    try:
        # Mock implementation - in production, run actual STAR
        trimmed_r1 = dataset.trimmed_fastq_r1.path if dataset.trimmed_fastq_r1 else dataset.fastq_r1_file.path
        trimmed_r2 = dataset.trimmed_fastq_r2.path if dataset.trimmed_fastq_r2 else dataset.fastq_r2_file.path
        
        output_bam = f"/tmp/aligned_{dataset.id}.bam"
        
        # In production, run: STAR --genomeDir /path/to/genome --readFilesIn trimmed_r1 trimmed_r2 --outFileNamePrefix output_prefix
        
        # Mock BAM file creation
        with open(output_bam, 'w') as f:
            f.write("mock_bam_content")
        
        return output_bam
    except Exception as e:
        logger.error(f"STAR alignment failed: {e}")
        return None

def run_rsem_quantification(dataset):
    """
    Run RSEM quantification
    """
    try:
        # Mock implementation - in production, run actual RSEM
        bam_file = dataset.alignment_bam.path
        
        output_tpm = f"/tmp/expression_tpm_{dataset.id}.tsv"
        output_counts = f"/tmp/expression_counts_{dataset.id}.tsv"
        
        # Generate mock expression matrices
        genes = [f"GENE_{i:05d}" for i in range(1000)]
        samples = ['Sample_1', 'Sample_2', 'Sample_3', 'Sample_4']
        
        # TPM matrix
        tpm_data = np.random.lognormal(2, 1, (len(genes), len(samples)))
        tpm_df = pd.DataFrame(tpm_data, index=genes, columns=samples)
        tpm_df.to_csv(output_tpm, sep='\t')
        
        # Counts matrix
        counts_data = np.random.poisson(100, (len(genes), len(samples)))
        counts_df = pd.DataFrame(counts_data, index=genes, columns=samples)
        counts_df.to_csv(output_counts, sep='\t')
        
        return {'tpm': output_tpm, 'counts': output_counts}
    except Exception as e:
        logger.error(f"RSEM quantification failed: {e}")
        return None

def generate_upstream_metadata(dataset):
    """
    Generate metadata during upstream processing
    """
    metadata = {
        'sample_info': {
            'total_reads': 20000000,
            'mapped_reads': 18000000,
            'mapping_rate': 0.9,
            'unique_genes_detected': 15000,
        },
        'quality_metrics': {
            'mean_quality_score': 35.2,
            'gc_content': 0.45,
            'duplication_rate': 0.15,
        },
        'processing_info': {
            'reference_genome': 'hg38',
            'annotation_version': 'GENCODE_v38',
            'aligner': 'STAR',
            'quantifier': 'RSEM',
        }
    }
    return metadata

def perform_bulk_clustering_pca(dataset, config):
    """
    Perform PCA and clustering analysis for bulk RNA-seq
    """
    try:
        # Load expression data
        if dataset.expression_matrix_tpm:
            expression_df = pd.read_csv(dataset.expression_matrix_tpm.path, sep='\t', index_col=0)
        else:
            # Generate mock data
            genes = [f"GENE_{i:05d}" for i in range(1000)]
            samples = ['Sample_1', 'Sample_2', 'Sample_3', 'Sample_4']
            expression_df = pd.DataFrame(
                np.random.lognormal(2, 1, (len(genes), len(samples))),
                index=genes, columns=samples
            )
        
        # Perform PCA
        from sklearn.decomposition import PCA
        from sklearn.preprocessing import StandardScaler
        
        scaler = StandardScaler()
        scaled_data = scaler.fit_transform(expression_df.T)
        
        pca = PCA(n_components=2)
        pca_result = pca.fit_transform(scaled_data)
        
        # Create PCA plot
        plt.figure(figsize=(10, 8))
        plt.scatter(pca_result[:, 0], pca_result[:, 1])
        for i, sample in enumerate(expression_df.columns):
            plt.annotate(sample, (pca_result[i, 0], pca_result[i, 1]))
        plt.xlabel(f'PC1 ({pca.explained_variance_ratio_[0]:.1%} variance)')
        plt.ylabel(f'PC2 ({pca.explained_variance_ratio_[1]:.1%} variance)')
        plt.title(f'PCA Analysis - {dataset.name}')
        plt.grid(True, alpha=0.3)
        
        # Save plot
        buffer = BytesIO()
        plt.savefig(buffer, format='png', dpi=300, bbox_inches='tight')
        buffer.seek(0)
        
        dataset.visualization_image.save(
            f'pca_{dataset.id}.png',
            ContentFile(buffer.getvalue()),
            save=True
        )
        plt.close()
        
        # AI interpretation
        ai_interpretation = get_ai_interpretation(
            dataset, 
            'pca_clustering',
            {
                'pca_variance': pca.explained_variance_ratio_.tolist(),
                'sample_names': expression_df.columns.tolist(),
                'user_hypothesis': config.get('user_hypothesis', '')
            }
        )
        dataset.ai_interpretation = ai_interpretation
        dataset.save()
        
    except Exception as e:
        logger.error(f"PCA/Clustering analysis failed: {e}")

def perform_differential_expression(dataset, config):
    """
    Perform differential expression analysis using DESeq2-like approach
    """
    try:
        # Load counts data
        if dataset.expression_matrix_counts:
            counts_df = pd.read_csv(dataset.expression_matrix_counts.path, sep='\t', index_col=0)
        else:
            # Generate mock data
            genes = [f"GENE_{i:05d}" for i in range(1000)]
            samples = ['Control_1', 'Control_2', 'Treatment_1', 'Treatment_2']
            counts_df = pd.DataFrame(
                np.random.poisson(100, (len(genes), len(samples))),
                index=genes, columns=samples
            )
        
        # Mock differential expression analysis
        results = []
        for gene_id in counts_df.index[:500]:  # Limit for demo
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
        
        # Generate volcano plot
        generate_volcano_plot(dataset)
        
        # AI interpretation
        significant_genes = len([r for r in results if r.adjusted_p_value < 0.05])
        ai_interpretation = get_ai_interpretation(
            dataset,
            'differential_expression',
            {
                'total_genes': len(results),
                'significant_genes': significant_genes,
                'user_hypothesis': config.get('user_hypothesis', ''),
                'comparison_groups': config.get('comparison_groups', {})
            }
        )
        dataset.ai_interpretation = ai_interpretation
        dataset.save()
        
    except Exception as e:
        logger.error(f"Differential expression analysis failed: {e}")

def perform_pathway_enrichment(dataset, config):
    """
    Perform pathway enrichment analysis
    """
    try:
        # Get significant genes from previous analysis
        significant_genes = dataset.analysis_results.filter(adjusted_p_value__lt=0.05)
        
        if not significant_genes.exists():
            logger.warning("No significant genes found for pathway analysis")
            return
        
        # Mock pathway enrichment results
        pathways = [
            {'id': 'GO:0006955', 'name': 'immune response', 'database': 'GO'},
            {'id': 'hsa04060', 'name': 'Cytokine-cytokine receptor interaction', 'database': 'KEGG'},
            {'id': 'R-HSA-168256', 'name': 'Immune System', 'database': 'REACTOME'},
        ]
        
        pathway_results = []
        for pathway in pathways:
            result = RNASeqPathwayResult(
                dataset=dataset,
                pathway_id=pathway['id'],
                pathway_name=pathway['name'],
                database=pathway['database'],
                p_value=np.random.beta(0.1, 1),
                adjusted_p_value=np.random.beta(0.1, 1),
                gene_count=np.random.randint(5, 50),
                gene_list=[g.gene_id for g in significant_genes[:10]],
                enrichment_score=np.random.uniform(1.5, 5.0)
            )
            pathway_results.append(result)
        
        RNASeqPathwayResult.objects.bulk_create(pathway_results)
        
        # AI interpretation
        ai_interpretation = get_ai_interpretation(
            dataset,
            'pathway_enrichment',
            {
                'enriched_pathways': len(pathway_results),
                'top_pathways': [p.pathway_name for p in pathway_results[:5]],
                'user_hypothesis': config.get('user_hypothesis', '')
            }
        )
        dataset.ai_interpretation = ai_interpretation
        dataset.save()
        
    except Exception as e:
        logger.error(f"Pathway enrichment analysis failed: {e}")

def perform_signature_correlation(dataset, config):
    """
    Perform correlation analysis with user-provided gene signatures
    """
    try:
        gene_signatures = config.get('gene_signatures', [])
        if not gene_signatures:
            logger.warning("No gene signatures provided")
            return
        
        # Load expression data
        if dataset.expression_matrix_tpm:
            expression_df = pd.read_csv(dataset.expression_matrix_tpm.path, sep='\t', index_col=0)
        else:
            # Generate mock data
            genes = [f"GENE_{i:05d}" for i in range(1000)]
            samples = ['Sample_1', 'Sample_2', 'Sample_3', 'Sample_4']
            expression_df = pd.DataFrame(
                np.random.lognormal(2, 1, (len(genes), len(samples))),
                index=genes, columns=samples
            )
        
        # Calculate signature scores and correlations
        signature_scores = {}
        for signature_name, signature_genes in gene_signatures.items():
            # Calculate signature score as mean expression of signature genes
            available_genes = [g for g in signature_genes if g in expression_df.index]
            if available_genes:
                signature_scores[signature_name] = expression_df.loc[available_genes].mean()
        
        # AI interpretation
        ai_interpretation = get_ai_interpretation(
            dataset,
            'signature_correlation',
            {
                'signatures_analyzed': list(signature_scores.keys()),
                'correlation_results': signature_scores,
                'user_hypothesis': config.get('user_hypothesis', '')
            }
        )
        dataset.ai_interpretation = ai_interpretation
        dataset.save()
        
    except Exception as e:
        logger.error(f"Signature correlation analysis failed: {e}")

def perform_sc_clustering(dataset, config):
    """
    Perform single-cell clustering analysis
    """
    try:
        # Mock single-cell clustering
        n_clusters = np.random.randint(5, 15)
        clusters = []
        
        for i in range(n_clusters):
            cluster = RNASeqCluster(
                dataset=dataset,
                cluster_id=f"cluster_{i}",
                cluster_name=f"Cluster {i}",
                cell_count=np.random.randint(50, 500),
                marker_genes=[f"GENE_{j:05d}" for j in range(i*10, (i+1)*10)],
                coordinates={
                    'umap_1': np.random.normal(0, 2, 100).tolist(),
                    'umap_2': np.random.normal(0, 2, 100).tolist()
                }
            )
            clusters.append(cluster)
        
        RNASeqCluster.objects.bulk_create(clusters)
        
        # Generate UMAP plot
        generate_umap_plot(dataset)
        
        # AI interpretation
        ai_interpretation = get_ai_interpretation(
            dataset,
            'sc_clustering',
            {
                'n_clusters': n_clusters,
                'total_cells': sum(c.cell_count for c in clusters),
                'user_hypothesis': config.get('user_hypothesis', '')
            }
        )
        dataset.ai_interpretation = ai_interpretation
        dataset.save()
        
    except Exception as e:
        logger.error(f"Single-cell clustering failed: {e}")

def get_ai_interpretation(dataset, analysis_type, context_data):
    """
    Get AI interpretation of analysis results
    """
    try:
        prompt = f"""
        Analyze the following RNA-seq results for dataset '{dataset.name}':
        
        Analysis Type: {analysis_type}
        Dataset Type: {dataset.dataset_type}
        Organism: {dataset.organism}
        User Hypothesis: {context_data.get('user_hypothesis', 'Not provided')}
        
        Context Data: {json.dumps(context_data, indent=2)}
        
        Please provide a comprehensive biological interpretation of these results, including:
        1. Key findings and their biological significance
        2. Relationship to the user's hypothesis (if provided)
        3. Suggested next steps for analysis
        4. Potential biological mechanisms or pathways involved
        5. Clinical or research implications
        
        Format the response in clear, scientific language suitable for researchers.
        """
        
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
            temperature=0.7
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        logger.error(f"AI interpretation failed: {e}")
        return "AI interpretation unavailable due to technical issues."

def generate_volcano_plot(dataset):
    """
    Generate a volcano plot for differential expression results
    """
    results = dataset.analysis_results.all()
    
    if not results.exists():
        return
    
    # Extract data
    log2fc = [r.log2_fold_change for r in results if r.log2_fold_change is not None]
    neg_log10_p = [-np.log10(r.p_value) for r in results if r.p_value is not None and r.p_value > 0]
    
    # Create volcano plot
    plt.figure(figsize=(12, 8))
    
    # Color points based on significance
    colors = []
    for r in results:
        if r.p_value and r.log2_fold_change:
            if r.adjusted_p_value < 0.05 and abs(r.log2_fold_change) > 1:
                colors.append('red' if r.log2_fold_change > 0 else 'blue')
            else:
                colors.append('gray')
        else:
            colors.append('gray')
    
    plt.scatter(log2fc, neg_log10_p, c=colors, alpha=0.6, s=20)
    
    # Add significance lines
    plt.axhline(y=-np.log10(0.05), color='red', linestyle='--', alpha=0.7, label='p=0.05')
    plt.axvline(x=1, color='red', linestyle='--', alpha=0.7, label='log2FC=1')
    plt.axvline(x=-1, color='red', linestyle='--', alpha=0.7, label='log2FC=-1')
    
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

def generate_umap_plot(dataset):
    """
    Generate UMAP plot for single-cell clustering
    """
    clusters = dataset.clusters.all()
    
    if not clusters.exists():
        return
    
    plt.figure(figsize=(12, 8))
    
    colors = plt.cm.tab20(np.linspace(0, 1, len(clusters)))
    
    for i, cluster in enumerate(clusters):
        coords = cluster.coordinates
        if 'umap_1' in coords and 'umap_2' in coords:
            plt.scatter(
                coords['umap_1'], coords['umap_2'],
                c=[colors[i]], label=f"{cluster.cluster_name} ({cluster.cell_count} cells)",
                alpha=0.7, s=10
            )
    
    plt.xlabel('UMAP 1')
    plt.ylabel('UMAP 2')
    plt.title(f'Single-cell Clustering - {dataset.name}')
    plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
    plt.grid(True, alpha=0.3)
    
    # Save plot
    buffer = BytesIO()
    plt.savefig(buffer, format='png', dpi=300, bbox_inches='tight')
    buffer.seek(0)
    
    dataset.visualization_image.save(
        f'umap_{dataset.id}.png',
        ContentFile(buffer.getvalue()),
        save=True
    )
    
    plt.close()

@shared_task
def create_rnaseq_presentation(dataset_id, user_id, title, include_methods=True, 
                              include_results=True, include_discussion=True, quality='medium'):
    """
    Create a presentation from RNA-seq analysis results with AI assistance
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
            # Results slides based on analysis type
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
def process_ai_interaction(dataset_id, interaction_type, user_input, context_data=None):
    """
    Process AI interaction for hypothesis generation or result interpretation
    """
    try:
        dataset = RNASeqDataset.objects.get(id=dataset_id)
        context_data = context_data or {}
        
        # Generate AI response based on interaction type
        if interaction_type == 'hypothesis_request':
            ai_response = generate_hypothesis_suggestions(dataset, user_input, context_data)
        elif interaction_type == 'result_interpretation':
            ai_response = interpret_analysis_results(dataset, user_input, context_data)
        elif interaction_type == 'signature_analysis':
            ai_response = suggest_gene_signatures(dataset, user_input, context_data)
        elif interaction_type == 'pathway_interpretation':
            ai_response = interpret_pathway_results(dataset, user_input, context_data)
        elif interaction_type == 'cell_type_suggestion':
            ai_response = suggest_cell_types(dataset, user_input, context_data)
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

def generate_hypothesis_suggestions(dataset, user_input, context_data):
    """
    Generate hypothesis suggestions based on dataset and user input
    """
    try:
        prompt = f"""
        Based on the following RNA-seq dataset information, suggest relevant biological hypotheses:
        
        Dataset: {dataset.name}
        Type: {dataset.dataset_type}
        Organism: {dataset.organism}
        Analysis Type: {dataset.analysis_type}
        User Input: {user_input}
        
        Context: {json.dumps(context_data, indent=2)}
        
        Please suggest 3-5 specific, testable hypotheses that could be investigated with this data.
        Focus on biological mechanisms, disease pathways, or cellular processes relevant to the dataset.
        """
        
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800,
            temperature=0.7
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        logger.error(f"Hypothesis generation failed: {e}")
        return "Unable to generate hypothesis suggestions at this time."

def interpret_analysis_results(dataset, user_input, context_data):
    """
    Interpret analysis results with AI assistance
    """
    try:
        prompt = f"""
        Interpret the following RNA-seq analysis results:
        
        Dataset: {dataset.name}
        Analysis: {dataset.analysis_type}
        User Question: {user_input}
        
        Results Summary:
        - Total genes analyzed: {dataset.analysis_results.count()}
        - Significant results: {dataset.analysis_results.filter(adjusted_p_value__lt=0.05).count() if hasattr(dataset, 'analysis_results') else 'N/A'}
        - Clusters identified: {dataset.clusters.count() if hasattr(dataset, 'clusters') else 'N/A'}
        
        Context: {json.dumps(context_data, indent=2)}
        
        Provide a detailed biological interpretation addressing the user's question.
        """
        
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
            temperature=0.7
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        logger.error(f"Result interpretation failed: {e}")
        return "Unable to interpret results at this time."

def suggest_gene_signatures(dataset, user_input, context_data):
    """
    Suggest relevant gene signatures for analysis
    """
    try:
        prompt = f"""
        Suggest relevant gene signatures for the following RNA-seq analysis:
        
        Dataset: {dataset.name}
        Organism: {dataset.organism}
        User Request: {user_input}
        
        Context: {json.dumps(context_data, indent=2)}
        
        Suggest 3-5 well-established gene signatures that would be relevant for this analysis.
        Include the signature name, source/publication, and brief description of what it measures.
        Format as a list with gene symbols if available.
        """
        
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800,
            temperature=0.7
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        logger.error(f"Gene signature suggestion failed: {e}")
        return "Unable to suggest gene signatures at this time."

def suggest_cell_types(dataset, user_input, context_data):
    """
    Suggest cell type annotations for single-cell data
    """
    try:
        if dataset.dataset_type != 'single_cell':
            return "Cell type annotation is only applicable to single-cell RNA-seq data."
        
        prompt = f"""
        Suggest cell type annotations for single-cell RNA-seq clusters:
        
        Dataset: {dataset.name}
        Organism: {dataset.organism}
        Tissue/Context: {user_input}
        
        Cluster Information:
        {json.dumps([{'cluster_id': c.cluster_id, 'marker_genes': c.marker_genes[:10]} for c in dataset.clusters.all()], indent=2)}
        
        Based on the marker genes and tissue context, suggest likely cell types for each cluster.
        Provide confidence levels and alternative possibilities.
        """
        
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
            temperature=0.7
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        logger.error(f"Cell type suggestion failed: {e}")
        return "Unable to suggest cell types at this time."

def interpret_pathway_results(dataset, user_input, context_data):
    """
    Interpret pathway enrichment results
    """
    try:
        pathways = dataset.pathway_results.all()[:10]
        pathway_info = [
            {
                'name': p.pathway_name,
                'database': p.database,
                'p_value': p.p_value,
                'gene_count': p.gene_count
            }
            for p in pathways
        ]
        
        prompt = f"""
        Interpret the following pathway enrichment results:
        
        Dataset: {dataset.name}
        User Question: {user_input}
        
        Enriched Pathways:
        {json.dumps(pathway_info, indent=2)}
        
        Provide biological interpretation of these pathway results, including:
        1. Key biological processes involved
        2. Potential disease relevance
        3. Therapeutic implications
        4. Connections between pathways
        """
        
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
            temperature=0.7
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        logger.error(f"Pathway interpretation failed: {e}")
        return "Unable to interpret pathway results at this time."