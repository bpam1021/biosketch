import os
import logging
import subprocess
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from django.conf import settings
from pathlib import Path
import tempfile
import shutil

logger = logging.getLogger(__name__)

class BasePipeline:
    """Base class for RNA-seq pipelines with real bioinformatics processing"""
    
    def __init__(self, organism: str, config: Optional[Dict[str, Any]] = None):
        self.organism = organism
        self.config = config or {}
        self.supported_organisms = ['human', 'mouse', 'rat', 'drosophila', 'zebrafish']
        self.pipeline_config = getattr(settings, 'PIPELINE_CONFIG', {})
        self.temp_dir = tempfile.mkdtemp(prefix='rnaseq_')
        
    def get_supported_organisms(self) -> List[str]:
        """Get list of supported organisms"""
        return self.supported_organisms
    
    def get_supported_file_formats(self) -> List[str]:
        """Get supported file formats"""
        return ['fastq', 'fastq.gz', 'fq', 'fq.gz']
    
    def get_available_references(self, organism: str) -> List[str]:
        """Get available reference genomes for organism"""
        references = {
            'human': ['hg38', 'hg19', 'GRCh38', 'GRCh37'],
            'mouse': ['mm10', 'mm39', 'GRCm38', 'GRCm39'],
            'rat': ['rn6', 'rn7'],
            'drosophila': ['dm6', 'dm3'],
            'zebrafish': ['danRer11', 'danRer10']
        }
        return references.get(organism, ['hg38'])
    
    def run_command(self, cmd: List[str], cwd: Optional[str] = None) -> Tuple[int, str, str]:
        """Execute command and return exit code, stdout, stderr"""
        try:
            result = subprocess.run(
                cmd,
                cwd=cwd or self.temp_dir,
                capture_output=True,
                text=True,
                timeout=3600  # 1 hour timeout
            )
            return result.returncode, result.stdout, result.stderr
        except subprocess.TimeoutExpired:
            logger.error(f"Command timed out: {' '.join(cmd)}")
            return 1, "", "Command timed out"
        except Exception as e:
            logger.error(f"Command failed: {' '.join(cmd)}, Error: {str(e)}")
            return 1, "", str(e)
    
    def validate_fastq_file(self, file_path: str) -> Dict[str, Any]:
        """Validate FASTQ file format and quality"""
        if not os.path.exists(file_path):
            return {'valid': False, 'error': 'File does not exist'}
        
        try:
            # Check file format using basic parsing
            with open(file_path, 'r') as f:
                first_line = f.readline().strip()
                if not first_line.startswith('@'):
                    return {'valid': False, 'error': 'Invalid FASTQ format'}
            
            # Get basic file stats
            file_size = os.path.getsize(file_path)
            return {
                'valid': True,
                'file_size': file_size,
                'format': 'fastq'
            }
        except Exception as e:
            return {'valid': False, 'error': str(e)}

class MultiSampleBulkRNASeqPipeline(BasePipeline):
    """Pipeline for bulk RNA-seq analysis with real bioinformatics tools"""
    
    def __init__(self, organism: str, config: Optional[Dict[str, Any]] = None):
        super().__init__(organism, config)
        self.analysis_type = 'bulk'
        self.tools = self.pipeline_config.get('BULK_RNASEQ', {}).get('TOOLS', {})
        self.reference = self.pipeline_config.get('BULK_RNASEQ', {}).get('REFERENCE', {})
        self.parameters = self.pipeline_config.get('BULK_RNASEQ', {}).get('PARAMETERS', {})
    
    def run_quality_control(self, fastq_pairs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Run FastQC quality control on FASTQ files"""
        logger.info("Starting quality control with FastQC")
        
        qc_results = {
            'total_reads': 0,
            'quality_scores': [],
            'gc_content': [],
            'sequence_length': [],
            'report': ''
        }
        
        try:
            fastqc_cmd = [
                self.tools.get('FASTQC', 'fastqc'),
                '--outdir', os.path.join(self.temp_dir, 'qc'),
                '--format', 'fastq',
                '--threads', str(self.config.get('processing_threads', 4))
            ]
            
            os.makedirs(os.path.join(self.temp_dir, 'qc'), exist_ok=True)
            
            for pair in fastq_pairs:
                # Add FASTQ files to command
                fastqc_cmd.extend([pair['r1_path'], pair['r2_path']])
            
            # Run FastQC
            exit_code, stdout, stderr = self.run_command(fastqc_cmd)
            
            if exit_code == 0:
                # Parse FastQC results
                qc_results.update(self._parse_fastqc_results())
                logger.info("Quality control completed successfully")
            else:
                logger.error(f"FastQC failed: {stderr}")
                qc_results['error'] = stderr
                
        except Exception as e:
            logger.error(f"Quality control failed: {str(e)}")
            qc_results['error'] = str(e)
        
        return qc_results
    
    def run_trimming(self, fastq_pairs: List[Dict[str, Any]], qc_results: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Run Trimmomatic for read trimming"""
        logger.info("Starting read trimming with Trimmomatic")
        
        trimmed_files = []
        trimmomatic_settings = self.parameters.get('TRIMMOMATIC_SETTINGS', {})
        
        try:
            for i, pair in enumerate(fastq_pairs):
                sample_id = pair.get('sample_id', f'sample_{i+1}')
                
                # Output file paths
                r1_trimmed = os.path.join(self.temp_dir, f'{sample_id}_R1_trimmed.fastq.gz')
                r2_trimmed = os.path.join(self.temp_dir, f'{sample_id}_R2_trimmed.fastq.gz')
                r1_unpaired = os.path.join(self.temp_dir, f'{sample_id}_R1_unpaired.fastq.gz')
                r2_unpaired = os.path.join(self.temp_dir, f'{sample_id}_R2_unpaired.fastq.gz')
                
                # Trimmomatic command
                trimmomatic_cmd = [
                    self.tools.get('TRIMMOMATIC', 'trimmomatic.jar'),
                    'PE',
                    '-threads', str(self.config.get('processing_threads', 4)),
                    pair['r1_path'], pair['r2_path'],
                    r1_trimmed, r1_unpaired,
                    r2_trimmed, r2_unpaired,
                    f"LEADING:{trimmomatic_settings.get('LEADING', 3)}",
                    f"TRAILING:{trimmomatic_settings.get('TRAILING', 3)}",
                    f"SLIDINGWINDOW:{trimmomatic_settings.get('SLIDINGWINDOW', '4:15')}",
                    f"MINLEN:{trimmomatic_settings.get('MINLEN', 20)}"
                ]
                
                exit_code, stdout, stderr = self.run_command(trimmomatic_cmd)
                
                if exit_code == 0:
                    trimmed_files.append({
                        'sample_id': sample_id,
                        'r1_trimmed': r1_trimmed,
                        'r2_trimmed': r2_trimmed,
                        'r1_unpaired': r1_unpaired,
                        'r2_unpaired': r2_unpaired,
                        'trimming_stats': self._parse_trimmomatic_output(stdout)
                    })
                    logger.info(f"Trimming completed for {sample_id}")
                else:
                    logger.error(f"Trimming failed for {sample_id}: {stderr}")
                    
        except Exception as e:
            logger.error(f"Trimming process failed: {str(e)}")
        
        return trimmed_files
    
    def run_alignment(self, input_files: List[Dict[str, Any]], reference_genome: str) -> Dict[str, Any]:
        """Run STAR alignment"""
        logger.info("Starting alignment with STAR")
        
        alignment_results = {
            'bam_files': [],
            'total_mapped_reads': 0,
            'alignment_rate': 0.0,
            'star_logs': []
        }
        
        try:
            star_index = self.reference.get('GENOME_INDEX', '')
            star_settings = self.parameters.get('STAR_SETTINGS', {})
            
            for file_info in input_files:
                sample_id = file_info['sample_id']
                output_prefix = os.path.join(self.temp_dir, f'{sample_id}_')
                
                # STAR alignment command
                star_cmd = [
                    self.tools.get('STAR', 'STAR'),
                    '--runMode', 'alignReads',
                    '--genomeDir', star_index,
                    '--readFilesIn', file_info['r1_trimmed'], file_info['r2_trimmed'],
                    '--readFilesCommand', 'zcat',
                    '--outFileNamePrefix', output_prefix,
                    '--outSAMtype', star_settings.get('outSAMtype', 'BAM Unsorted'),
                    '--quantMode', star_settings.get('quantMode', 'TranscriptomeSAM'),
                    '--outSAMunmapped', star_settings.get('outSAMunmapped', 'Within'),
                    '--runThreadN', str(self.config.get('processing_threads', 4))
                ]
                
                exit_code, stdout, stderr = self.run_command(star_cmd)
                
                if exit_code == 0:
                    bam_file = f'{output_prefix}Aligned.out.bam'
                    alignment_results['bam_files'].append(bam_file)
                    
                    # Parse STAR log
                    log_file = f'{output_prefix}Log.final.out'
                    if os.path.exists(log_file):
                        stats = self._parse_star_log(log_file)
                        alignment_results['star_logs'].append(stats)
                        alignment_results['total_mapped_reads'] += stats.get('mapped_reads', 0)
                    
                    logger.info(f"Alignment completed for {sample_id}")
                else:
                    logger.error(f"STAR alignment failed for {sample_id}: {stderr}")
                    
        except Exception as e:
            logger.error(f"Alignment process failed: {str(e)}")
        
        # Calculate overall alignment rate
        if alignment_results['star_logs']:
            total_reads = sum(log.get('total_reads', 0) for log in alignment_results['star_logs'])
            if total_reads > 0:
                alignment_results['alignment_rate'] = alignment_results['total_mapped_reads'] / total_reads
        
        return alignment_results
    
    def run_quantification(self, alignment_results: Dict[str, Any], input_files: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Run RSEM quantification"""
        logger.info("Starting quantification with RSEM")
        
        quantification_results = {
            'tpm_matrix': None,
            'counts_matrix': None,
            'genes_quantified': 0,
            'rsem_logs': []
        }
        
        try:
            rsem_index = self.reference.get('TRANSCRIPTOME_INDEX', '')
            rsem_settings = self.parameters.get('RSEM_SETTINGS', {})
            
            sample_results = []
            
            for i, file_info in input_files:
                sample_id = f'sample_{i+1}'
                output_prefix = os.path.join(self.temp_dir, f'{sample_id}_rsem')
                
                # RSEM command
                rsem_cmd = [
                    self.tools.get('RSEM', 'rsem-calculate-expression'),
                    'star',
                    '--star-gzipped-read-file',
                    file_info['r1_trimmed'], file_info['r2_trimmed'],
                    '--paired-end',
                    '--bam',
                    '--no-bam-output',
                    '-p', str(self.config.get('processing_threads', 4)),
                    rsem_index,
                    output_prefix
                ]
                
                if rsem_settings.get('estimate_rspd', True):
                    rsem_cmd.append('--estimate-rspd')
                if rsem_settings.get('calc_ci', True):
                    rsem_cmd.append('--calc-ci')
                if 'seed' in rsem_settings:
                    rsem_cmd.extend(['--seed', str(rsem_settings['seed'])])
                
                exit_code, stdout, stderr = self.run_command(rsem_cmd)
                
                if exit_code == 0:
                    # Parse RSEM results
                    genes_file = f'{output_prefix}.genes.results'
                    if os.path.exists(genes_file):
                        sample_data = pd.read_csv(genes_file, sep='\t')
                        sample_results.append({
                            'sample_id': sample_id,
                            'data': sample_data,
                            'genes_count': len(sample_data)
                        })
                    logger.info(f"Quantification completed for {sample_id}")
                else:
                    logger.error(f"RSEM failed for {sample_id}: {stderr}")
            
            # Combine results into expression matrices
            if sample_results:
                quantification_results.update(self._create_expression_matrices(sample_results))
                
        except Exception as e:
            logger.error(f"Quantification process failed: {str(e)}")
        
        return quantification_results
    
    def _parse_fastqc_results(self) -> Dict[str, Any]:
        """Parse FastQC output files"""
        qc_dir = os.path.join(self.temp_dir, 'qc')
        results = {
            'total_reads': 0,
            'quality_scores': [],
            'gc_content': [],
            'sequence_length': []
        }
        
        try:
            # Look for FastQC data files
            for file in os.listdir(qc_dir):
                if file.endswith('_fastqc_data.txt'):
                    data_file = os.path.join(qc_dir, file)
                    with open(data_file, 'r') as f:
                        content = f.read()
                        
                        # Parse basic statistics
                        if 'Total Sequences' in content:
                            for line in content.split('\n'):
                                if line.startswith('Total Sequences'):
                                    results['total_reads'] += int(line.split('\t')[1])
                                elif line.startswith('%GC'):
                                    results['gc_content'].append(float(line.split('\t')[1]))
                                elif line.startswith('Sequence length'):
                                    results['sequence_length'].append(line.split('\t')[1])
        except Exception as e:
            logger.error(f"Failed to parse FastQC results: {str(e)}")
        
        return results
    
    def _parse_trimmomatic_output(self, stdout: str) -> Dict[str, Any]:
        """Parse Trimmomatic output statistics"""
        stats = {
            'input_reads': 0,
            'surviving_reads': 0,
            'dropped_reads': 0,
            'survival_rate': 0.0
        }
        
        try:
            for line in stdout.split('\n'):
                if 'Input Read Pairs:' in line:
                    stats['input_reads'] = int(line.split(':')[1].strip().split()[0])
                elif 'Both Surviving:' in line:
                    parts = line.split(':')[1].strip().split()
                    stats['surviving_reads'] = int(parts[0])
                    stats['survival_rate'] = float(parts[1].strip('()%'))
                elif 'Dropped:' in line:
                    stats['dropped_reads'] = int(line.split(':')[1].strip().split()[0])
        except Exception as e:
            logger.error(f"Failed to parse Trimmomatic output: {str(e)}")
        
        return stats
    
    def _parse_star_log(self, log_file: str) -> Dict[str, Any]:
        """Parse STAR alignment log file"""
        stats = {
            'total_reads': 0,
            'mapped_reads': 0,
            'uniquely_mapped': 0,
            'multimapped': 0,
            'unmapped': 0,
            'alignment_rate': 0.0
        }
        
        try:
            with open(log_file, 'r') as f:
                content = f.read()
                
                for line in content.split('\n'):
                    line = line.strip()
                    if 'Number of input reads' in line:
                        stats['total_reads'] = int(line.split('|')[1].strip())
                    elif 'Uniquely mapped reads number' in line:
                        stats['uniquely_mapped'] = int(line.split('|')[1].strip())
                    elif 'Number of reads mapped to multiple loci' in line:
                        stats['multimapped'] = int(line.split('|')[1].strip())
                    elif 'Number of reads unmapped' in line:
                        stats['unmapped'] = int(line.split('|')[1].strip())
                
                stats['mapped_reads'] = stats['uniquely_mapped'] + stats['multimapped']
                if stats['total_reads'] > 0:
                    stats['alignment_rate'] = stats['mapped_reads'] / stats['total_reads']
                    
        except Exception as e:
            logger.error(f"Failed to parse STAR log: {str(e)}")
        
        return stats
    
    def _create_expression_matrices(self, sample_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Create TPM and counts expression matrices"""
        try:
            if not sample_results:
                return {}
            
            # Get gene IDs from first sample
            first_sample = sample_results[0]['data']
            gene_ids = first_sample['gene_id'].tolist()
            
            # Create matrices
            tpm_matrix = pd.DataFrame(index=gene_ids)
            counts_matrix = pd.DataFrame(index=gene_ids)
            
            for result in sample_results:
                sample_id = result['sample_id']
                data = result['data']
                
                tpm_matrix[sample_id] = data['TPM'].values
                counts_matrix[sample_id] = data['expected_count'].values
            
            # Save matrices
            tpm_file = os.path.join(self.temp_dir, 'expression_tpm.tsv')
            counts_file = os.path.join(self.temp_dir, 'expression_counts.tsv')
            
            tpm_matrix.to_csv(tpm_file, sep='\t')
            counts_matrix.to_csv(counts_file, sep='\t')
            
            return {
                'tpm_matrix': tpm_file,
                'counts_matrix': counts_file,
                'genes_quantified': len(gene_ids)
            }
            
        except Exception as e:
            logger.error(f"Failed to create expression matrices: {str(e)}")
            return {}
    
    def generate_metadata(self, qc_results: Dict[str, Any], alignment_results: Dict[str, Any], 
                         expression_results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive metadata from pipeline results"""
        metadata = {
            'pipeline_version': '1.0',
            'organism': self.organism,
            'reference_genome': self.config.get('reference_genome', 'hg38'),
            'processing_date': pd.Timestamp.now().isoformat(),
            'quality_control': {
                'total_reads': qc_results.get('total_reads', 0),
                'mean_quality_score': np.mean(qc_results.get('quality_scores', [0])),
                'mean_gc_content': np.mean(qc_results.get('gc_content', [0]))
            },
            'alignment': {
                'total_mapped_reads': alignment_results.get('total_mapped_reads', 0),
                'alignment_rate': alignment_results.get('alignment_rate', 0.0),
                'aligner': 'STAR'
            },
            'quantification': {
                'genes_quantified': expression_results.get('genes_quantified', 0),
                'quantification_method': 'RSEM'
            },
            'parameters': self.config
        }
        
        return metadata

class MultiSampleSingleCellRNASeqPipeline(BasePipeline):
    """Pipeline for single-cell RNA-seq analysis with real bioinformatics tools"""
    
    def __init__(self, organism: str, config: Optional[Dict[str, Any]] = None):
        super().__init__(organism, config)
        self.analysis_type = 'single_cell'
        self.tools = self.pipeline_config.get('SCRNA_SEQ', {}).get('TOOLS', {})
        self.reference = self.pipeline_config.get('SCRNA_SEQ', {}).get('REFERENCE', {})
        self.parameters = self.pipeline_config.get('SCRNA_SEQ', {}).get('PARAMETERS', {})
    
    def process_barcodes(self, fastq_pairs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Process cell barcodes and UMIs"""
        logger.info("Processing cell barcodes and UMIs")
        
        barcode_results = {
            'processed_samples': [],
            'total_barcodes': 0,
            'valid_barcodes': 0
        }
        
        try:
            for pair in fastq_pairs:
                sample_id = pair.get('sample_id', 'sample_1')
                
                # Use UMI-tools for barcode processing
                umi_cmd = [
                    self.tools.get('UMI_TOOLS', 'umi_tools'),
                    'extract',
                    '--stdin', pair['r1_path'],
                    '--stdout', os.path.join(self.temp_dir, f'{sample_id}_extracted_R1.fastq.gz'),
                    '--read2-in', pair['r2_path'],
                    '--read2-out', os.path.join(self.temp_dir, f'{sample_id}_extracted_R2.fastq.gz'),
                    '--bc-pattern', 'CCCCCCCCCCCCCCCCNNNNNNNNNNNN',  # 16bp barcode + 12bp UMI
                    '--log', os.path.join(self.temp_dir, f'{sample_id}_umi_extract.log')
                ]
                
                exit_code, stdout, stderr = self.run_command(umi_cmd)
                
                if exit_code == 0:
                    barcode_results['processed_samples'].append({
                        'sample_id': sample_id,
                        'r1_processed': os.path.join(self.temp_dir, f'{sample_id}_extracted_R1.fastq.gz'),
                        'r2_processed': os.path.join(self.temp_dir, f'{sample_id}_extracted_R2.fastq.gz')
                    })
                    logger.info(f"Barcode processing completed for {sample_id}")
                else:
                    logger.error(f"Barcode processing failed for {sample_id}: {stderr}")
                    
        except Exception as e:
            logger.error(f"Barcode processing failed: {str(e)}")
        
        return barcode_results
    
    def run_star_solo_alignment(self, barcode_results: Dict[str, Any], reference_genome: str) -> Dict[str, Any]:
        """Run STAR Solo for single-cell alignment"""
        logger.info("Starting STAR Solo alignment")
        
        alignment_results = {
            'feature_matrices': [],
            'total_mapped_reads': 0,
            'alignment_rate': 0.0,
            'solo_logs': []
        }
        
        try:
            star_index = self.reference.get('GENOME_INDEX', '')
            gtf_file = self.reference.get('GTF_FILE', '')
            solo_settings = self.parameters.get('STAR_SOLO_SETTINGS', {})
            
            for sample_info in barcode_results.get('processed_samples', []):
                sample_id = sample_info['sample_id']
                output_prefix = os.path.join(self.temp_dir, f'{sample_id}_solo_')
                
                # STAR Solo command
                star_solo_cmd = [
                    self.tools.get('STAR_SOLO', 'STAR'),
                    '--runMode', 'alignReads',
                    '--genomeDir', star_index,
                    '--readFilesIn', sample_info['r2_processed'], sample_info['r1_processed'],
                    '--readFilesCommand', 'zcat',
                    '--outFileNamePrefix', output_prefix,
                    '--soloType', solo_settings.get('soloType', 'CB_UMI_Simple'),
                    '--soloCBwhitelist', 'None',  # Use built-in whitelist
                    '--soloUMIlen', str(solo_settings.get('soloUMIlen', 12)),
                    '--soloCBlen', str(solo_settings.get('soloCBlen', 16)),
                    '--soloFeatures', 'Gene',
                    '--soloUMIdedup', '1MM_All',
                    '--runThreadN', str(self.config.get('processing_threads', 4))
                ]
                
                if gtf_file:
                    star_solo_cmd.extend(['--sjdbGTFfile', gtf_file])
                
                exit_code, stdout, stderr = self.run_command(star_solo_cmd)
                
                if exit_code == 0:
                    # Get feature matrix path
                    matrix_dir = f'{output_prefix}Solo.out/Gene/filtered'
                    if os.path.exists(matrix_dir):
                        alignment_results['feature_matrices'].append({
                            'sample_id': sample_id,
                            'matrix_dir': matrix_dir,
                            'barcodes': os.path.join(matrix_dir, 'barcodes.tsv'),
                            'features': os.path.join(matrix_dir, 'features.tsv'),
                            'matrix': os.path.join(matrix_dir, 'matrix.mtx')
                        })
                    
                    logger.info(f"STAR Solo alignment completed for {sample_id}")
                else:
                    logger.error(f"STAR Solo failed for {sample_id}: {stderr}")
                    
        except Exception as e:
            logger.error(f"STAR Solo alignment failed: {str(e)}")
        
        return alignment_results
    
    def count_umis(self, alignment_results: Dict[str, Any]) -> Dict[str, Any]:
        """Count UMIs and create expression matrix"""
        logger.info("Counting UMIs and creating expression matrix")
        
        umi_results = {
            'expression_matrix': None,
            'cells_detected': 0,
            'genes_detected': 0,
            'umi_counts': {}
        }
        
        try:
            import scanpy as sc
            import anndata as ad
            
            # Process each sample's feature matrix
            sample_matrices = []
            
            for matrix_info in alignment_results.get('feature_matrices', []):
                sample_id = matrix_info['sample_id']
                matrix_dir = matrix_info['matrix_dir']
                
                # Read 10X format matrix
                adata = sc.read_10x_mtx(
                    matrix_dir,
                    var_names='gene_symbols',
                    cache=True
                )
                
                # Make variable names unique
                adata.var_names_unique()
                adata.obs_names = [f"{sample_id}_{barcode}" for barcode in adata.obs_names]
                
                sample_matrices.append(adata)
            
            # Concatenate all samples
            if sample_matrices:
                combined_adata = ad.concat(sample_matrices, axis=0)
                
                # Basic filtering
                sc.pp.filter_cells(combined_adata, min_genes=self.parameters.get('MIN_GENES_PER_CELL', 200))
                sc.pp.filter_genes(combined_adata, min_cells=self.parameters.get('MIN_CELLS_PER_GENE', 3))
                
                # Calculate mitochondrial gene percentage
                combined_adata.var['mt'] = combined_adata.var_names.str.startswith('MT-')
                sc.pp.calculate_qc_metrics(combined_adata, percent_top=None, log1p=False, inplace=True)
                
                # Filter cells based on QC metrics
                max_mito = self.parameters.get('MAX_MITO_PERCENT', 20)
                combined_adata = combined_adata[combined_adata.obs.pct_counts_mt < max_mito, :]
                
                # Save expression matrix
                expression_file = os.path.join(self.temp_dir, 'sc_expression_matrix.h5ad')
                combined_adata.write(expression_file)
                
                umi_results.update({
                    'expression_matrix': expression_file,
                    'cells_detected': combined_adata.n_obs,
                    'genes_detected': combined_adata.n_vars,
                    'umi_counts': {
                        'total_umis': int(combined_adata.X.sum()),
                        'median_umis_per_cell': int(np.median(combined_adata.X.sum(axis=1))),
                        'median_genes_per_cell': int(np.median((combined_adata.X > 0).sum(axis=1)))
                    }
                })
                
                logger.info(f"UMI counting completed: {umi_results['cells_detected']} cells, {umi_results['genes_detected']} genes")
                
        except Exception as e:
            logger.error(f"UMI counting failed: {str(e)}")
        
        return umi_results
    
    def get_qc_tools(self) -> List[str]:
        """Get available QC tools"""
        return ['FastQC', 'CellRanger', 'STARsolo']
    
    def get_alignment_tools(self) -> List[str]:
        """Get available alignment tools"""
        return ['STAR Solo', 'CellRanger', 'Alevin']
    
    def get_quantification_methods(self) -> List[str]:
        """Get quantification methods"""
        return ['CellRanger', 'STARsolo', 'Alevin', 'Kallisto-bustools']
    
    def validate_dataset(self, dataset) -> Dict[str, Any]:
        """Validate dataset for processing"""
        errors = []
        
        if not dataset.fastq_r1_file and not dataset.is_multi_sample:
            errors.append("FASTQ R1 file required for single sample")
        
        if dataset.is_multi_sample and not dataset.sample_files_mapping:
            errors.append("Sample files mapping required for multi-sample")
        
        # Validate FASTQ files exist and are readable
        if dataset.fastq_r1_file:
            validation = self.validate_fastq_file(dataset.fastq_r1_file.path)
            if not validation['valid']:
                errors.append(f"R1 FASTQ validation failed: {validation['error']}")
        
        if dataset.fastq_r2_file:
            validation = self.validate_fastq_file(dataset.fastq_r2_file.path)
            if not validation['valid']:
                errors.append(f"R2 FASTQ validation failed: {validation['error']}")
        
        return {'valid': len(errors) == 0, 'errors': errors}
    
    def validate_input_files(self, dataset) -> Dict[str, Any]:
        """Validate input files"""
        errors = []
        
        if dataset.is_multi_sample:
            for sample_id, file_info in (dataset.sample_files_mapping or {}).items():
                if not isinstance(file_info, dict):
                    errors.append(f"Invalid file info for sample {sample_id}")
                    continue
                if 'r1_file' not in file_info or 'r2_file' not in file_info:
                    errors.append(f"Missing FASTQ files for sample {sample_id}")
        else:
            if not dataset.fastq_r1_file:
                errors.append("R1 FASTQ file required")
            if not dataset.fastq_r2_file:
                errors.append("R2 FASTQ file required")
        
        return {'valid': len(errors) == 0, 'errors': errors}
    
    def check_tools_availability(self) -> Dict[str, bool]:
        """Check if required tools are available"""
        tools_status = {}
        
        for tool_name, tool_path in self.tools.items():
            try:
                # Try to run tool with --version or --help
                if tool_name == 'FASTQC':
                    exit_code, _, _ = self.run_command([tool_path, '--version'])
                elif tool_name == 'STAR':
                    exit_code, _, _ = self.run_command([tool_path, '--version'])
                elif tool_name == 'RSEM':
                    exit_code, _, _ = self.run_command([tool_path, '--version'])
                else:
                    exit_code = 0  # Assume available if no specific check
                
                tools_status[tool_name.lower()] = exit_code == 0
            except Exception:
                tools_status[tool_name.lower()] = False
        
        return tools_status
    
    def get_valid_threshold_keys(self) -> List[str]:
        """Get valid quality threshold keys"""
        return ['min_quality_score', 'min_read_length', 'max_n_content', 'min_gc_content', 'max_gc_content']
    
    def cleanup(self):
        """Clean up temporary files"""
        try:
            if os.path.exists(self.temp_dir):
                shutil.rmtree(self.temp_dir)
                logger.info(f"Cleaned up temporary directory: {self.temp_dir}")
        except Exception as e:
            logger.error(f"Failed to cleanup temporary directory: {str(e)}")