import os
import json
import logging
import subprocess
import pandas as pd
import numpy as np
from pathlib import Path
from django.conf import settings
from django.utils import timezone
from typing import Dict, List, Any, Optional, Tuple
import shutil
import tempfile
import gzip
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

logger = logging.getLogger(__name__)

class MultiSampleBulkRNASeqPipeline:
    """Real multi-sample bulk RNA-seq processing pipeline with comprehensive bioinformatics tools"""
    
    def __init__(self, job):
        self.job = job
        self.job_dir = os.path.join(settings.MEDIA_ROOT, 'results', str(job.id))
        self.temp_dir = os.path.join(self.job_dir, 'temp')
        self.results_dir = os.path.join(self.job_dir, 'results')
        
        # Create directories
        os.makedirs(self.job_dir, exist_ok=True)
        os.makedirs(self.temp_dir, exist_ok=True)
        os.makedirs(self.results_dir, exist_ok=True)
        
        # Pipeline configuration
        self.config = settings.PIPELINE_CONFIG['BULK_RNASEQ']
        self.threads = settings.PIPELINE_CONFIG['THREADS']
        
        # Sample information
        self.sample_files = job.fastq_files or []
        self.num_samples = len(self.sample_files)
        
        logger.info(f"Initialized bulk RNA-seq pipeline for {self.num_samples} samples")
    
    def step_1_quality_control(self) -> Dict[str, Any]:
        """Real quality control using FastQC on all samples"""
        logger.info("Starting real quality control with FastQC")
        
        try:
            fastqc_path = self.config['TOOLS']['FASTQC']
            qc_results = []
            
            # Create QC output directory
            qc_dir = os.path.join(self.results_dir, 'fastqc')
            os.makedirs(qc_dir, exist_ok=True)
            
            # Process each sample pair
            for sample_info in self.sample_files:
                sample_name = sample_info['sample_id']
                r1_path = sample_info['r1_file']
                r2_path = sample_info['r2_file']
                
                logger.info(f"Running FastQC on {sample_name}")
                
                # Run FastQC on R1 and R2 files
                for read_file, read_type in [(r1_path, 'R1'), (r2_path, 'R2')]:
                    if not os.path.exists(read_file):
                        logger.error(f"File not found: {read_file}")
                        continue
                    
                    # Run FastQC
                    cmd = [
                        fastqc_path,
                        '--outdir', qc_dir,
                        '--threads', str(self.threads),
                        '--format', 'fastq',
                        read_file
                    ]
                    
                    result = subprocess.run(cmd, capture_output=True, text=True)
                    
                    if result.returncode != 0:
                        logger.error(f"FastQC failed for {sample_name} {read_type}: {result.stderr}")
                        continue
                    
                    # Parse FastQC results
                    qc_metrics = self._parse_fastqc_results(read_file, qc_dir)
                    qc_metrics.update({
                        'sample_name': sample_name,
                        'read_type': read_type,
                        'file_path': read_file
                    })
                    qc_results.append(qc_metrics)
            
            # Generate summary report
            summary_report = self._generate_qc_summary(qc_results)
            
            # Save QC summary
            qc_summary_path = os.path.join(self.results_dir, 'qc_summary.json')
            with open(qc_summary_path, 'w') as f:
                json.dump(summary_report, f, indent=2)
            
            logger.info(f"Quality control completed for {len(qc_results)} files")
            return summary_report
            
        except Exception as e:
            logger.error(f"Error in quality control: {str(e)}")
            raise
    
    def step_2_read_trimming(self) -> Dict[str, Any]:
        """Real read trimming using Trimmomatic"""
        logger.info("Starting real read trimming with Trimmomatic")
        
        try:
            trimmomatic_path = self.config['TOOLS']['TRIMMOMATIC']
            trimming_results = []
            
            # Create trimming output directory
            trim_dir = os.path.join(self.results_dir, 'trimmed')
            os.makedirs(trim_dir, exist_ok=True)
            
            # Trimmomatic parameters
            trim_params = self.config['PARAMETERS']['TRIMMOMATIC_SETTINGS']
            
            # Process each sample pair
            for sample_info in self.sample_files:
                sample_name = sample_info['sample_id']
                r1_path = sample_info['r1_file']
                r2_path = sample_info['r2_file']
                
                logger.info(f"Trimming reads for {sample_name}")
                
                # Output file paths
                r1_paired = os.path.join(trim_dir, f"{sample_name}_R1_paired.fastq.gz")
                r1_unpaired = os.path.join(trim_dir, f"{sample_name}_R1_unpaired.fastq.gz")
                r2_paired = os.path.join(trim_dir, f"{sample_name}_R2_paired.fastq.gz")
                r2_unpaired = os.path.join(trim_dir, f"{sample_name}_R2_unpaired.fastq.gz")
                
                # Build Trimmomatic command
                cmd = [
                    trimmomatic_path,
                    'PE',  # Paired-end mode
                    '-threads', str(self.threads),
                    r1_path, r2_path,
                    r1_paired, r1_unpaired,
                    r2_paired, r2_unpaired,
                    f"LEADING:{trim_params['LEADING']}",
                    f"TRAILING:{trim_params['TRAILING']}",
                    f"SLIDINGWINDOW:{trim_params['SLIDINGWINDOW']}",
                    f"MINLEN:{trim_params['MINLEN']}"
                ]
                
                result = subprocess.run(cmd, capture_output=True, text=True)
                
                if result.returncode != 0:
                    logger.error(f"Trimmomatic failed for {sample_name}: {result.stderr}")
                    continue
                
                # Parse trimming statistics
                trim_stats = self._parse_trimmomatic_output(result.stderr)
                trim_stats.update({
                    'sample_name': sample_name,
                    'r1_paired_output': r1_paired,
                    'r2_paired_output': r2_paired,
                    'r1_unpaired_output': r1_unpaired,
                    'r2_unpaired_output': r2_unpaired
                })
                
                trimming_results.append(trim_stats)
                
                # Update sample info with trimmed file paths
                sample_info['r1_trimmed'] = r1_paired
                sample_info['r2_trimmed'] = r2_paired
            
            # Generate trimming summary
            summary_report = self._generate_trimming_summary(trimming_results)
            
            # Save trimming summary
            trim_summary_path = os.path.join(self.results_dir, 'trimming_summary.json')
            with open(trim_summary_path, 'w') as f:
                json.dump(summary_report, f, indent=2)
            
            logger.info(f"Read trimming completed for {len(trimming_results)} samples")
            return summary_report
            
        except Exception as e:
            logger.error(f"Error in read trimming: {str(e)}")
            raise
    
    def step_3_read_alignment(self) -> Dict[str, Any]:
        """Real read alignment using STAR aligner"""
        logger.info("Starting real read alignment with STAR")
        
        try:
            star_path = self.config['TOOLS']['STAR']
            star_index = self.config['REFERENCE']['GENOME_INDEX']
            alignment_results = []
            
            # Create alignment output directory
            align_dir = os.path.join(self.results_dir, 'aligned')
            os.makedirs(align_dir, exist_ok=True)
            
            # STAR parameters
            star_params = self.config['PARAMETERS']['STAR_SETTINGS']
            
            # Process each sample
            for sample_info in self.sample_files:
                sample_name = sample_info['sample_id']
                r1_trimmed = sample_info.get('r1_trimmed', sample_info['r1_file'])
                r2_trimmed = sample_info.get('r2_trimmed', sample_info['r2_file'])
                
                logger.info(f"Aligning reads for {sample_name}")
                
                # Create sample-specific output directory
                sample_align_dir = os.path.join(align_dir, sample_name)
                os.makedirs(sample_align_dir, exist_ok=True)
                
                # Output prefix
                output_prefix = os.path.join(sample_align_dir, f"{sample_name}_")
                
                # Build STAR command
                cmd = [
                    star_path,
                    '--runMode', 'alignReads',
                    '--genomeDir', star_index,
                    '--readFilesIn', r1_trimmed, r2_trimmed,
                    '--readFilesCommand', 'zcat',  # For gzipped files
                    '--outFileNamePrefix', output_prefix,
                    '--runThreadN', str(self.threads),
                    '--outSAMtype'] + star_params['outSAMtype'].split() + [
                    '--quantMode', star_params['quantMode'],
                    '--outSAMunmapped', star_params['outSAMunmapped'],
                ]
                
                result = subprocess.run(cmd, capture_output=True, text=True)
                
                if result.returncode != 0:
                    logger.error(f"STAR alignment failed for {sample_name}: {result.stderr}")
                    continue
                
                # Parse alignment statistics
                log_file = f"{output_prefix}Log.final.out"
                align_stats = self._parse_star_log(log_file)
                align_stats.update({
                    'sample_name': sample_name,
                    'bam_file': f"{output_prefix}Aligned.sortedByCoord.out.bam",
                    'transcriptome_bam': f"{output_prefix}Aligned.toTranscriptome.out.bam"
                })
                
                alignment_results.append(align_stats)
                
                # Update sample info with alignment results
                sample_info['bam_file'] = align_stats['bam_file']
                sample_info['transcriptome_bam'] = align_stats['transcriptome_bam']
            
            # Generate alignment summary
            summary_report = self._generate_alignment_summary(alignment_results)
            
            # Save alignment summary
            align_summary_path = os.path.join(self.results_dir, 'alignment_summary.json')
            with open(align_summary_path, 'w') as f:
                json.dump(summary_report, f, indent=2)
            
            # Update job metrics
            if alignment_results:
                total_reads = sum(r.get('total_reads', 0) for r in alignment_results)
                mapped_reads = sum(r.get('mapped_reads', 0) for r in alignment_results)
                alignment_rate = (mapped_reads / total_reads * 100) if total_reads > 0 else 0
                
                self.job.total_reads = total_reads
                self.job.mapped_reads = mapped_reads
                self.job.alignment_rate = alignment_rate
                self.job.save()
            
            logger.info(f"Read alignment completed for {len(alignment_results)} samples")
            return summary_report
            
        except Exception as e:
            logger.error(f"Error in read alignment: {str(e)}")
            raise
    
    def step_4_quantification(self) -> Dict[str, Any]:
        """Real gene quantification using RSEM"""
        logger.info("Starting real gene quantification with RSEM")
        
        try:
            rsem_path = self.config['TOOLS']['RSEM']
            rsem_index = self.config['REFERENCE']['TRANSCRIPTOME_INDEX']
            quantification_results = []
            
            # Create quantification output directory
            quant_dir = os.path.join(self.results_dir, 'quantification')
            os.makedirs(quant_dir, exist_ok=True)
            
            # RSEM parameters
            rsem_params = self.config['PARAMETERS']['RSEM_SETTINGS']
            
            # Process each sample
            for sample_info in self.sample_files:
                sample_name = sample_info['sample_id']
                transcriptome_bam = sample_info.get('transcriptome_bam')
                
                if not transcriptome_bam or not os.path.exists(transcriptome_bam):
                    logger.error(f"Transcriptome BAM not found for {sample_name}")
                    continue
                
                logger.info(f"Quantifying genes for {sample_name}")
                
                # Output prefix
                output_prefix = os.path.join(quant_dir, sample_name)
                
                # Build RSEM command
                cmd = [
                    rsem_path,
                    '--bam',
                    '--paired-end',
                    '-p', str(self.threads),
                    transcriptome_bam,
                    rsem_index,
                    output_prefix
                ]
                
                # Add optional parameters
                if rsem_params.get('estimate_rspd'):
                    cmd.append('--estimate-rspd')
                if rsem_params.get('calc_ci'):
                    cmd.append('--calc-ci')
                if rsem_params.get('seed'):
                    cmd.extend(['--seed', str(rsem_params['seed'])])
                
                result = subprocess.run(cmd, capture_output=True, text=True)
                
                if result.returncode != 0:
                    logger.error(f"RSEM quantification failed for {sample_name}: {result.stderr}")
                    continue
                
                # Parse quantification results
                genes_results_file = f"{output_prefix}.genes.results"
                isoforms_results_file = f"{output_prefix}.isoforms.results"
                
                if os.path.exists(genes_results_file):
                    quant_stats = self._parse_rsem_results(genes_results_file)
                    quant_stats.update({
                        'sample_name': sample_name,
                        'genes_results': genes_results_file,
                        'isoforms_results': isoforms_results_file
                    })
                    
                    quantification_results.append(quant_stats)
                    
                    # Update sample info
                    sample_info['genes_results'] = genes_results_file
                    sample_info['isoforms_results'] = isoforms_results_file
            
            # Generate quantification summary
            summary_report = self._generate_quantification_summary(quantification_results)
            
            # Save quantification summary
            quant_summary_path = os.path.join(self.results_dir, 'quantification_summary.json')
            with open(quant_summary_path, 'w') as f:
                json.dump(summary_report, f, indent=2)
            
            logger.info(f"Gene quantification completed for {len(quantification_results)} samples")
            return summary_report
            
        except Exception as e:
            logger.error(f"Error in gene quantification: {str(e)}")
            raise
    
    def step_5_generate_expression_matrix(self) -> Dict[str, Any]:
        """Generate comprehensive expression matrix from RSEM results"""
        logger.info("Generating expression matrix from quantification results")
        
        try:
            # Collect all gene results files
            gene_files = []
            sample_names = []
            
            for sample_info in self.sample_files:
                genes_results = sample_info.get('genes_results')
                if genes_results and os.path.exists(genes_results):
                    gene_files.append(genes_results)
                    sample_names.append(sample_info['sample_id'])
            
            if not gene_files:
                raise ValueError("No quantification results found")
            
            logger.info(f"Combining results from {len(gene_files)} samples")
            
            # Read first file to get gene information
            first_df = pd.read_csv(gene_files[0], sep='\t')
            
            # Safely check for gene_name
            if 'gene_name' not in first_df.columns:
                first_df['gene_name'] = first_df['gene_id']  # fallback
                
            # Initialize expression matrices
            tpm_matrix = pd.DataFrame(index=first_df['gene_id'])
            count_matrix = pd.DataFrame(index=first_df['gene_id'])
            
            # Add gene information
            gene_info = first_df[['gene_id', 'gene_name', 'length']].set_index('gene_id')
            
            # Combine data from all samples
            for gene_file, sample_name in zip(gene_files, sample_names):
                df = pd.read_csv(gene_file, sep='\t')
                df = df.set_index('gene_id')
                
                tpm_matrix[f'{sample_name}_TPM'] = df['TPM']
                count_matrix[f'{sample_name}_count'] = df['expected_count']
            
            # Combine TPM and count matrices
            expression_matrix = pd.concat([gene_info, tpm_matrix, count_matrix], axis=1)
            
            # Filter low-expressed genes
            min_expression = self.config['PARAMETERS']['MIN_EXPRESSION_THRESHOLD']
            min_samples = self.config['PARAMETERS']['MIN_SAMPLES_EXPRESSING']
            
            # Keep genes expressed above threshold in at least min_samples
            tpm_cols = [col for col in expression_matrix.columns if '_TPM' in col]
            expressed_mask = (expression_matrix[tpm_cols] > min_expression).sum(axis=1) >= min_samples
            expression_matrix_filtered = expression_matrix[expressed_mask]
            
            logger.info(f"Filtered expression matrix: {expression_matrix_filtered.shape[0]} genes, {len(sample_names)} samples")
            
            # Save expression matrix
            expr_matrix_path = os.path.join(self.results_dir, 'expression_matrix.csv')
            expression_matrix_filtered.to_csv(expr_matrix_path)
            
            # Generate metadata
            metadata = self._generate_sample_metadata()
            metadata_path = os.path.join(self.results_dir, 'metadata.csv')
            metadata.to_csv(metadata_path)
            
            # Update job with file paths
            self.job.expression_matrix_output = expr_matrix_path
            self.job.metadata_file = metadata_path
            self.job.genes_quantified = len(expression_matrix_filtered)
            self.job.save()
            
            # Generate final summary
            summary_report = {
                'total_genes_before_filtering': len(expression_matrix),
                'genes_quantified': len(expression_matrix_filtered),
                'num_samples': len(sample_names),
                'sample_names': sample_names,
                'expression_matrix_file': expr_matrix_path,
                'metadata_file': metadata_path,
                'filtering_parameters': {
                    'min_expression_threshold': min_expression,
                    'min_samples_expressing': min_samples
                }
            }
            
            # Save final summary
            final_summary_path = os.path.join(self.results_dir, 'final_summary.json')
            with open(final_summary_path, 'w') as f:
                json.dump(summary_report, f, indent=2)
            
            logger.info("Expression matrix generation completed successfully")
            return summary_report
            
        except Exception as e:
            logger.error(f"Error generating expression matrix: {str(e)}")
            raise
    
    # Helper methods for parsing results
    
    def _parse_fastqc_results(self, fastq_file, qc_dir) -> Dict[str, Any]:
        """Parse FastQC results"""
        try:
            # Get FastQC output file name
            base_name = os.path.basename(fastq_file)
            if base_name.endswith('.gz'):
                base_name = base_name[:-3]
            if base_name.endswith('.fastq') or base_name.endswith('.fq'):
                base_name = base_name.rsplit('.', 1)[0]
            
            fastqc_data_file = os.path.join(qc_dir, f"{base_name}_fastqc", "fastqc_data.txt")
            
            if not os.path.exists(fastqc_data_file):
                logger.warning(f"FastQC data file not found: {fastqc_data_file}")
                return {'status': 'failed'}
            
            # Parse FastQC data
            qc_metrics = {'status': 'passed'}
            
            with open(fastqc_data_file, 'r') as f:
                for line in f:
                    if line.startswith('Total Sequences'):
                        qc_metrics['total_sequences'] = int(line.split('\t')[1])
                    elif line.startswith('Sequence length'):
                        qc_metrics['sequence_length'] = line.split('\t')[1]
                    elif line.startswith('%GC'):
                        qc_metrics['gc_content'] = float(line.split('\t')[1])
            
            return qc_metrics
            
        except Exception as e:
            logger.error(f"Error parsing FastQC results: {str(e)}")
            return {'status': 'failed', 'error': str(e)}
    
    def _parse_trimmomatic_output(self, stderr_output) -> Dict[str, Any]:
        """Parse Trimmomatic statistics from stderr"""
        try:
            stats = {}
            
            for line in stderr_output.split('\n'):
                if 'Input Read Pairs:' in line:
                    stats['input_read_pairs'] = int(line.split(':')[1].strip().split()[0])
                elif 'Both Surviving:' in line:
                    parts = line.split(':')[1].strip().split()
                    stats['both_surviving'] = int(parts[0])
                    stats['both_surviving_percent'] = float(parts[1].strip('()%'))
                elif 'Forward Only Surviving:' in line:
                    parts = line.split(':')[1].strip().split()
                    stats['forward_only_surviving'] = int(parts[0])
                elif 'Reverse Only Surviving:' in line:
                    parts = line.split(':')[1].strip().split()
                    stats['reverse_only_surviving'] = int(parts[0])
                elif 'Dropped:' in line:
                    parts = line.split(':')[1].strip().split()
                    stats['dropped'] = int(parts[0])
                    stats['dropped_percent'] = float(parts[1].strip('()%'))
            
            return stats
            
        except Exception as e:
            logger.error(f"Error parsing Trimmomatic output: {str(e)}")
            return {}
    
    def _parse_star_log(self, log_file) -> Dict[str, Any]:
        """Parse STAR alignment log file"""
        try:
            stats = {}
            
            if not os.path.exists(log_file):
                return stats
            
            with open(log_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if 'Number of input reads' in line:
                        stats['total_reads'] = int(line.split('|')[1].strip())
                    elif 'Uniquely mapped reads number' in line:
                        stats['uniquely_mapped'] = int(line.split('|')[1].strip())
                    elif 'Uniquely mapped reads %' in line:
                        stats['uniquely_mapped_percent'] = float(line.split('|')[1].strip().rstrip('%'))
                    elif 'Number of reads mapped to multiple loci' in line:
                        stats['multi_mapped'] = int(line.split('|')[1].strip())
                    elif '% of reads mapped to multiple loci' in line:
                        stats['multi_mapped_percent'] = float(line.split('|')[1].strip().rstrip('%'))
            
            # Calculate total mapped reads
            stats['mapped_reads'] = stats.get('uniquely_mapped', 0) + stats.get('multi_mapped', 0)
            
            return stats
            
        except Exception as e:
            logger.error(f"Error parsing STAR log: {str(e)}")
            return {}
    
    def _parse_rsem_results(self, genes_results_file) -> Dict[str, Any]:
        """Parse RSEM gene results"""
        try:
            df = pd.read_csv(genes_results_file, sep='\t')
            
            stats = {
                'total_genes': len(df),
                'genes_with_counts': len(df[df['expected_count'] > 0]),
                'total_expected_count': df['expected_count'].sum(),
                'total_tpm': df['TPM'].sum()
            }
            
            return stats
            
        except Exception as e:
            logger.error(f"Error parsing RSEM results: {str(e)}")
            return {}
    
    def _generate_sample_metadata(self) -> pd.DataFrame:
        """Generate sample metadata DataFrame"""
        metadata_rows = []
        
        for sample_info in self.sample_files:
            metadata_rows.append({
                'sample_id': sample_info['sample_id'],
                'condition': sample_info.get('condition', 'Unknown'),
                'batch': sample_info.get('batch', '1'),
                'r1_file': os.path.basename(sample_info['r1_file']),
                'r2_file': os.path.basename(sample_info['r2_file'])
            })
        
        return pd.DataFrame(metadata_rows).set_index('sample_id')
    
    def _generate_qc_summary(self, qc_results) -> Dict[str, Any]:
        """Generate QC summary report"""
        summary = {
            'total_files_processed': len(qc_results),
            'successful_qc': len([r for r in qc_results if r.get('status') == 'passed']),
            'failed_qc': len([r for r in qc_results if r.get('status') == 'failed']),
            'samples': {}
        }
        
        # Group by sample
        for result in qc_results:
            sample_name = result['sample_name']
            if sample_name not in summary['samples']:
                summary['samples'][sample_name] = {}
            summary['samples'][sample_name][result['read_type']] = result
        
        return summary
    
    def _generate_trimming_summary(self, trimming_results) -> Dict[str, Any]:
        """Generate trimming summary report"""
        if not trimming_results:
            return {'total_samples': 0}
        
        total_input = sum(r.get('input_read_pairs', 0) for r in trimming_results)
        total_surviving = sum(r.get('both_surviving', 0) for r in trimming_results)
        
        summary = {
            'total_samples': len(trimming_results),
            'total_input_read_pairs': total_input,
            'total_surviving_pairs': total_surviving,
            'overall_survival_rate': (total_surviving / total_input * 100) if total_input > 0 else 0,
            'samples': {r['sample_name']: r for r in trimming_results}
        }
        
        return summary
    
    def _generate_alignment_summary(self, alignment_results) -> Dict[str, Any]:
        """Generate alignment summary report"""
        if not alignment_results:
            return {'total_samples': 0}
        
        total_reads = sum(r.get('total_reads', 0) for r in alignment_results)
        total_mapped = sum(r.get('mapped_reads', 0) for r in alignment_results)
        
        summary = {
            'total_samples': len(alignment_results),
            'total_reads': total_reads,
            'total_mapped_reads': total_mapped,
            'overall_alignment_rate': (total_mapped / total_reads * 100) if total_reads > 0 else 0,
            'samples': {r['sample_name']: r for r in alignment_results}
        }
        
        return summary
    
    def _generate_quantification_summary(self, quantification_results) -> Dict[str, Any]:
        """Generate quantification summary report"""
        if not quantification_results:
            return {'total_samples': 0}
        
        total_genes = sum(r.get('total_genes', 0) for r in quantification_results)
        avg_genes = total_genes / len(quantification_results) if quantification_results else 0
        
        summary = {
            'total_samples': len(quantification_results),
            'average_genes_quantified': avg_genes,
            'samples': {r['sample_name']: r for r in quantification_results}
        }
        
        return summary


class MultiSampleSingleCellRNASeqPipeline:
    """Real single-cell RNA-seq processing pipeline"""
    
    def __init__(self, job):
        self.job = job
        self.job_dir = Path(settings.MEDIA_ROOT) / 'results' / str(job.id)
        self.job_dir.mkdir(parents=True, exist_ok=True)
        
        # Get pipeline configuration
        self.config = settings.PIPELINE_CONFIG['SCRNA_SEQ']
        self.tools = self.config['TOOLS']
        self.reference = self.config['REFERENCE']
        self.params = self.config['PARAMETERS']
        
        # Setup working directories
        self.fastq_dir = self.job_dir / 'fastq'
        self.qc_dir = self.job_dir / 'qc'
        self.processed_dir = self.job_dir / 'processed'
        self.aligned_dir = self.job_dir / 'aligned'
        self.filtered_dir = self.job_dir / 'filtered'
        self.results_dir = self.job_dir / 'results'
        
        for dir_path in [self.fastq_dir, self.qc_dir, self.processed_dir, 
                        self.aligned_dir, self.filtered_dir, self.results_dir]:
            dir_path.mkdir(exist_ok=True)
        
        # Process sample files from job
        self.samples = self._process_sample_files()
        
    def _process_sample_files(self) -> List[Dict[str, Any]]:
        """Process and organize sample files from job data"""
        samples = []
        
        if hasattr(self.job, 'fastq_files') and self.job.fastq_files:
            for sample_info in self.job.fastq_files:
                sample = {
                    'sample_name': sample_info.get('sample_id', f"Sample_{len(samples)+1}"),
                    'condition': sample_info.get('condition', 'Unknown'),
                    'batch': sample_info.get('batch', '1'),
                    'r1_path': sample_info.get('r1_file'),  # Cell barcodes + UMIs
                    'r2_path': sample_info.get('r2_file')   # cDNA reads
                }
                samples.append(sample)
        
        logger.info(f"Processed {len(samples)} samples for single-cell RNA-seq analysis")
        return samples
    
    def step_1_quality_control(self) -> Dict[str, Any]:
        """Step 1: Quality control for single-cell data"""
        logger.info("Step 1: Running single-cell quality control for all samples")
        
        qc_results = {}
        
        for sample in self.samples:
            sample_name = sample['sample_name']
            r1_path = sample['r1_path']  # Barcodes + UMIs
            r2_path = sample['r2_path']  # cDNA reads
            
            logger.info(f"Running QC for sample: {sample_name}")
            
            # Create sample-specific QC directory
            sample_qc_dir = self.qc_dir / sample_name
            sample_qc_dir.mkdir(exist_ok=True)
            
            # Run FastQC on both R1 and R2
            for read_type, file_path in [('R1', r1_path), ('R2', r2_path)]:
                if file_path and os.path.exists(file_path):
                    fastqc_cmd = [
                        self.tools['FASTQC'],
                        '--outdir', str(sample_qc_dir),
                        '--threads', str(self.config.get('THREADS', 4)),
                        '--extract',
                        file_path
                    ]
                    
                    try:
                        result = subprocess.run(fastqc_cmd, check=True, capture_output=True, text=True)
                        logger.info(f"FastQC completed for {sample_name} {read_type}")
                    except subprocess.CalledProcessError as e:
                        logger.error(f"FastQC failed for {sample_name} {read_type}: {e}")
                        raise
            
            # Parse QC results
            sample_qc_results = self._parse_scrna_qc_results(sample_qc_dir, sample_name)
            qc_results[sample_name] = sample_qc_results
        
        # Save QC summary
        with open(self.results_dir / 'qc_summary.json', 'w') as f:
            json.dump(qc_results, f, indent=2)
        
        return {
            'qc_results': qc_results,
            'qc_dir': str(self.qc_dir)
        }
    
    def step_2_cell_barcode_processing(self) -> Dict[str, Any]:
        """Step 2: Process cell barcodes and UMIs using UMI-tools"""
        logger.info("Step 2: Processing cell barcodes and UMIs for all samples")

        processing_results = {}

        for sample in self.samples:
            sample_name = sample['sample_name']
            r1_path = sample['r1_path']  # Barcodes + UMIs
            r2_path = sample['r2_path']  # cDNA reads

            if not (r1_path and r2_path and os.path.exists(r1_path) and os.path.exists(r2_path)):
                logger.warning(f"Missing files for sample {sample_name}, skipping barcode processing")
                continue

            logger.info(f"Processing barcodes for sample: {sample_name}")

            # Create sample-specific processed directory
            sample_processed_dir = self.processed_dir / sample_name
            sample_processed_dir.mkdir(exist_ok=True)

            processed_r1 = sample_processed_dir / f"{sample_name}_R1_processed.fastq.gz"
            processed_r2 = sample_processed_dir / f"{sample_name}_R2_processed.fastq.gz"

            # Define barcode pattern: default for 10X v3
            bc_pattern = "CCCCCCCCCCCCCCCCNNNNNNNNNNNN"

            # UMI-tools extract command
            umi_extract_cmd = [
                self.tools['UMI_TOOLS'],
                'extract',
                '--bc-pattern', bc_pattern,
                '--stdin', r1_path,
                '--read2-in', r2_path,
                '--stdout', str(processed_r1),
                '--read2-out', str(processed_r2),
                '--filter-cell-barcode',
                '--error-correct-cell',
                '--whitelist', self._get_whitelist_path()
            ]

            try:
                result = subprocess.run(umi_extract_cmd, check=True, capture_output=True, text=True)
                logger.info(f"UMI extraction completed for {sample_name}")

                barcode_stats = self._parse_umi_extract_output(result.stderr)

                processing_results[sample_name] = {
                    'processed_r1': str(processed_r1),
                    'processed_r2': str(processed_r2),
                    'barcode_stats': barcode_stats
                }

            except subprocess.CalledProcessError as e:
                logger.error(f"UMI extraction failed for {sample_name}: {e.stderr}")
                raise

        # Save processing summary
        summary_path = self.results_dir / 'barcode_processing_summary.json'
        with open(summary_path, 'w') as f:
            json.dump(processing_results, f, indent=2)

        return {
            'processing_results': processing_results,
            'processed_dir': str(self.processed_dir)
        }

    def step_3_read_alignment(self) -> Dict[str, Any]:
        """Step 3: STAR Solo alignment for single-cell"""
        logger.info("Step 3: Running STAR Solo alignment for all samples")
        
        alignment_results = {}
        
        for sample in self.samples:
            sample_name = sample['sample_name']
            r1_path = sample['r1_path']
            r2_path = sample['r2_path']
            
            logger.info(f"Aligning single-cell reads for sample: {sample_name}")
            
            # Sample-specific output directory
            sample_align_dir = self.aligned_dir / sample_name
            sample_align_dir.mkdir(exist_ok=True)

            solo_features = self.params.get('STAR_SOLO_SETTINGS', {}).get('soloFeatures', 'Gene')
            if isinstance(solo_features, str):
                solo_features = solo_features.split() 
            
            # STAR Solo command for single-cell
            star_solo_cmd = [
                self.tools['STAR_SOLO'],
                '--runMode', 'alignReads',
                '--genomeDir', self.reference['GENOME_INDEX'],
                '--readFilesIn', r2_path, r1_path,  # R2 first (reads), then R1 (barcodes)
                '--readFilesCommand', 'zcat',
                '--outFileNamePrefix', str(sample_align_dir / f"{sample_name}_"),
                '--soloType', self.params.get('STAR_SOLO_SETTINGS', {}).get('soloType', 'CB_UMI_Simple'),
                '--soloCBwhitelist', self._get_whitelist_path(),
                '--soloUMIlen', str(self.params.get('STAR_SOLO_SETTINGS', {}).get('soloUMIlen', 12)),
                '--soloCBlen', str(self.params.get('STAR_SOLO_SETTINGS', {}).get('soloCBlen', 16)),
                '--soloMultiMappers', self.params.get('STAR_SOLO_SETTINGS', {}).get('soloMultiMappers', 'EM'),
                '--runThreadN', str(self.config.get('THREADS', 4)),
                '--outSAMtype', 'BAM', 'SortedByCoordinate',
                '--outSAMattributes', 'NH', 'HI', 'nM', 'AS', 'CR', 'UR', 'CB', 'UB', 'GX', 'GN',
                '--soloCellFilter', 'EmptyDrops_CR',
                '--soloStrand', 'Forward',
                '--soloFeatures', *solo_features
            ]
            
            try:
                result = subprocess.run(star_solo_cmd, check=True, capture_output=True, text=True)
                logger.info(f"STAR Solo alignment completed for {sample_name}")
                
                # Parse alignment statistics
                log_file = sample_align_dir / f"{sample_name}_Log.final.out"
                alignment_stats = self._parse_star_solo_log(log_file)
                
                alignment_results[sample_name] = {
                    'stats': alignment_stats,
                    'solo_out_dir': str(sample_align_dir / f"{sample_name}_Solo.out"),
                    'bam_file': str(sample_align_dir / f"{sample_name}_Aligned.sortedByCoord.out.bam"),
                    'log_file': str(log_file)
                }
                
            except subprocess.CalledProcessError as e:
                logger.error(f"STAR Solo alignment failed for {sample_name}: {e}")
                raise
        
        # Save alignment summary
        with open(self.results_dir / 'alignment_summary.json', 'w') as f:
            json.dump(alignment_results, f, indent=2)
        
        return {
            'alignment_results': alignment_results,
            'aligned_dir': str(self.aligned_dir)
        }
    
    def step_4_cell_filtering(self) -> Dict[str, Any]:
        """Step 4: Cell filtering and quality control"""
        logger.info("Step 4: Cell filtering and quality control for all samples")
        
        filtering_results = {}
        total_cells_detected = 0
        
        for sample in self.samples:
            sample_name = sample['sample_name']
            
            logger.info(f"Filtering cells for sample: {sample_name}")
            
            # Get STAR Solo output directory
            sample_align_dir = self.aligned_dir / sample_name
            solo_dir = sample_align_dir / f"{sample_name}_Solo.out" / "Gene" / "filtered"
            
            if not solo_dir.exists():
                logger.warning(f"STAR Solo output not found for sample {sample_name}")
                continue
            
            # Create sample-specific filtered directory
            sample_filtered_dir = self.filtered_dir / sample_name
            sample_filtered_dir.mkdir(exist_ok=True)
            
            # Copy filtered matrices
            matrix_file = solo_dir / "matrix.mtx"
            barcodes_file = solo_dir / "barcodes.tsv"
            features_file = solo_dir / "features.tsv"
            
            if matrix_file.exists() and barcodes_file.exists() and features_file.exists():
                # Copy files to filtered directory
                shutil.copy2(matrix_file, sample_filtered_dir / "matrix.mtx")
                shutil.copy2(barcodes_file, sample_filtered_dir / "barcodes.tsv")
                shutil.copy2(features_file, sample_filtered_dir / "features.tsv")
                
                # Count cells and genes
                with open(barcodes_file, 'rt') as f:
                    cells_detected = sum(1 for _ in f)

                with open(features_file, 'rt') as f:
                    genes_detected = sum(1 for _ in f)
                
                total_cells_detected += cells_detected
                
                filtering_results[sample_name] = {
                    'filtered_matrix': str(sample_filtered_dir / "matrix.mtx"),
                    'filtered_barcodes': str(sample_filtered_dir / "barcodes.tsv"),
                    'filtered_features': str(sample_filtered_dir / "features.tsv"),
                    'cells_detected': cells_detected,
                    'genes_detected': genes_detected
                }
                
                logger.info(f"Sample {sample_name}: {cells_detected} cells, {genes_detected} genes")
            else:
                logger.warning(f"Missing filtered matrices for sample {sample_name}")
        
        # Update job metrics
        self.job.cells_detected = total_cells_detected
        self.job.save()
        
        # Save filtering summary
        with open(self.results_dir / 'filtering_summary.json', 'w') as f:
            json.dump({
                'sample_results': filtering_results,
                'total_cells_detected': total_cells_detected
            }, f, indent=2)
        
        return {
            'filtering_results': filtering_results,
            'total_cells_detected': total_cells_detected,
            'filtered_dir': str(self.filtered_dir)
        }
    
    def step_5_generate_expression_matrix(self) -> Dict[str, Any]:
        """Step 5: Generate combined single-cell expression matrix"""
        logger.info("Step 5: Generating combined single-cell expression matrix")
        
        # Combine all samples into a single expression matrix
        all_matrices = []
        all_barcodes = []
        all_features = None
        sample_mapping = {}
        
        for sample in self.samples:
            sample_name = sample['sample_name']
            sample_filtered_dir = self.filtered_dir / sample_name
            
            matrix_file = sample_filtered_dir / "matrix.mtx"
            barcodes_file = sample_filtered_dir / "barcodes.tsv"
            features_file = sample_filtered_dir / "features.tsv"
            
            if not (matrix_file.exists() and barcodes_file.exists() and features_file.exists()):
                logger.warning(f"Missing filtered files for sample {sample_name}")
                continue
            
            # Load matrix using scipy
            from scipy.io import mmread
            
            # Read matrix
            matrix = mmread(str(matrix_file)).tocsr()

            # Read barcodes
            with open(barcodes_file, 'rt') as f:
                barcodes = [line.strip() for line in f]
            
            # Add sample prefix to barcodes
            prefixed_barcodes = [f"{sample_name}_{bc}" for bc in barcodes]
            all_barcodes.extend(prefixed_barcodes)
            
            # Store sample mapping
            for bc in prefixed_barcodes:
                sample_mapping[bc] = sample_name
            
            # Read features (only once, should be same for all samples)
            if all_features is None:
                 with open(features_file, 'rt') as f:
                    all_features = [line.strip().split('\t') for line in f]
            
            all_matrices.append(matrix)
        
        if not all_matrices:
            raise ValueError("No valid matrices found for any sample")
        
        # Combine matrices horizontally (concatenate cells)
        from scipy.sparse import hstack
        combined_matrix = hstack(all_matrices)
        
        # Create expression DataFrame
        gene_ids = [feature[0] for feature in all_features]
        gene_names = [feature[1] if len(feature) > 1 else feature[0] for feature in all_features]
        
        # Convert to dense for CSV output (for smaller datasets)
        if combined_matrix.shape[1] < 10000:  # Less than 10k cells
            dense_matrix = combined_matrix.toarray()
            
            # Create DataFrame
            expression_df = pd.DataFrame(
                dense_matrix.T,  # Transpose: cells as rows, genes as columns
                index=all_barcodes,
                columns=gene_ids
            )
            
            # Save as CSV
            expression_matrix_file = self.results_dir / 'scrna_expression_matrix.csv'
            expression_df.to_csv(expression_matrix_file)
        else:
            # For larger datasets, save in H5AD format
            import anndata as ad
            
            adata = ad.AnnData(
                X=combined_matrix.T,  # Transpose: cells as obs, genes as var
                obs=pd.DataFrame(index=all_barcodes),
                var=pd.DataFrame({'gene_name': gene_names}, index=gene_ids)
            )
            
            expression_matrix_file = self.results_dir / 'scrna_expression_matrix.h5ad'
            adata.write(expression_matrix_file)
        
        # Generate cell metadata
        cell_metadata_df = pd.DataFrame([
            {
                'cell_id': cell_id,
                'sample_id': sample_mapping[cell_id],
                'condition': next((s['condition'] for s in self.samples if s['sample_name'] == sample_mapping[cell_id]), 'Unknown'),
                'batch': next((s['batch'] for s in self.samples if s['sample_name'] == sample_mapping[cell_id]), '1')
            }
            for cell_id in all_barcodes
        ])
        
        cell_metadata_file = self.results_dir / 'cell_metadata.csv'
        cell_metadata_df.to_csv(cell_metadata_file, index=False)
        
        # Calculate summary statistics
        cells_detected = len(all_barcodes)
        genes_quantified = len(gene_ids)
        
        # Update job with file paths
        self.job.expression_matrix_output = str(expression_matrix_file)
        self.job.metadata_file = str(cell_metadata_file)
        self.job.genes_quantified = genes_quantified
        self.job.save()
        
        # Save final summary
        final_summary = {
            'cells_detected': cells_detected,
            'genes_quantified': genes_quantified,
            'total_samples': len(self.samples),
            'expression_matrix_file': str(expression_matrix_file),
            'cell_metadata_file': str(cell_metadata_file)
        }
        
        with open(self.results_dir / 'final_summary.json', 'w') as f:
            json.dump(final_summary, f, indent=2)
        
        logger.info(f"Single-cell expression matrix generated: {genes_quantified} genes x {cells_detected} cells")
        
        return final_summary
    
    # Helper methods for single-cell processing
    
    def _parse_scrna_qc_results(self, qc_dir: Path, sample_name: str) -> Dict[str, Any]:
        """Parse single-cell QC results"""
        results = {
            'total_reads': 0,
            'valid_barcodes': 0,
            'sequencing_saturation': 0.0,
            'median_genes_per_cell': 0
        }
        
        # Parse FastQC results for both R1 and R2
        for fastqc_dir in qc_dir.glob("*_fastqc"):
            fastqc_data = fastqc_dir / "fastqc_data.txt"
            if fastqc_data.exists():
                try:
                    with open(fastqc_data, 'r') as f:
                        for line in f:
                            if line.startswith('Total Sequences'):
                                results['total_reads'] += int(line.split('\t')[1])
                except Exception as e:
                    logger.warning(f"Failed to parse FastQC data: {e}")
        
        return results
    
    def _parse_umi_extract_output(self, stderr_output: str) -> Dict[str, Any]:
        """Parse UMI-tools extract output"""
        stats = {
            'total_reads': 0,
            'valid_barcodes': 0,
            'valid_umis': 0
        }
        
        for line in stderr_output.split('\n'):
            if 'Reads output:' in line:
                stats['total_reads'] = int(line.split(':')[1].strip())
            elif 'Valid barcodes:' in line:
                stats['valid_barcodes'] = int(line.split(':')[1].strip())
        
        return stats
    
    def _parse_star_solo_log(self, log_file: Path) -> Dict[str, Any]:
        """Parse STAR Solo alignment log"""
        stats = {
            'input_reads': 0,
            'uniquely_mapped': 0,
            'multimapped': 0,
            'unmapped': 0
        }
        
        if log_file.exists():
            try:
                with open(log_file, 'r') as f:
                    content = f.read()
                    
                for line in content.split('\n'):
                    line = line.strip()
                    if 'Number of input reads' in line:
                        stats['input_reads'] = int(line.split('\t')[1])
                    elif 'Uniquely mapped reads number' in line:
                        stats['uniquely_mapped'] = int(line.split('\t')[1])
                    elif 'Number of reads mapped to multiple loci' in line:
                        stats['multimapped'] = int(line.split('\t')[1])
                        
            except Exception as e:
                logger.warning(f"Failed to parse STAR Solo log: {e}")
        
        return stats
    
    def _get_whitelist_path(self) -> str:
        """Get appropriate whitelist path based on chemistry"""
        chemistry = self.params.get('CHEMISTRY', '10x_v3')
        
        if chemistry == '10x_v2':
            return self.reference.get('WHITELIST_10X_V2', '/data/reference/737K-august-2016.txt')
        else:
            return self.reference.get('WHITELIST_10X_V3', '/data/reference/3M-february-2018.txt')