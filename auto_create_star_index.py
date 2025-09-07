#!/usr/bin/env python3
"""
Auto-create STAR index if missing - integrated with scRNA-seq pipeline
"""
import os
import subprocess
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

def auto_create_star_index_if_missing():
    """
    Automatically create a minimal STAR index if it doesn't exist.
    This should be called from the pipeline before STAR alignment.
    
    Returns:
        bool: True if index is available (existing or newly created), False if failed
    """
    
    star_index_dir = Path("/data/reference/star_index")
    genome_dir = Path("/data/reference/genome")
    
    logger.info("Checking STAR index availability...")
    
    # Check if index already exists and is complete
    required_files = ["genomeParameters.txt", "Genome", "SA", "SAindex"]
    missing_files = []
    
    if star_index_dir.exists():
        for required_file in required_files:
            file_path = star_index_dir / required_file
            if not file_path.exists():
                missing_files.append(required_file)
        
        if not missing_files:
            logger.info(f"✅ STAR index already exists and is complete: {star_index_dir}")
            return True
        else:
            logger.warning(f"⚠️ STAR index incomplete, missing: {missing_files}")
    else:
        logger.info(f"📁 STAR index directory does not exist: {star_index_dir}")
    
    # Check if STAR is available
    try:
        result = subprocess.run(['STAR', '--version'], capture_output=True, text=True)
        if result.returncode != 0:
            logger.error("❌ STAR command failed")
            return False
        logger.info(f"✅ STAR available: {result.stdout.strip()}")
    except FileNotFoundError:
        logger.error("❌ STAR not found in PATH - please install STAR")
        return False
    
    logger.info("🏗️ Creating minimal STAR index for scRNA-seq testing...")
    
    try:
        # Create directories
        star_index_dir.mkdir(parents=True, exist_ok=True)
        genome_dir.mkdir(parents=True, exist_ok=True)
        
        # Create minimal test genome (800bp with realistic gene sequences)
        genome_file = genome_dir / "minimal_test_genome.fa"
        logger.info(f"Creating minimal genome: {genome_file}")
        
        # Realistic gene sequences for scRNA-seq testing
        gene_sequences = [
            "ATGAGTGACCTGAAGTGCCTGACCTGTGTGGAGTATGGCTTCAAGTGTGACCTGAAGTGC",  # β-globin-like
            "ATGGAGCAGAAACTCATCTCTGAAGAGGATCTGAATATGCAGCTCCGTGTGGAGTATGGC",  # Immunoglobulin-like  
            "ATGAAGTTCGTGAAGCTGGTGGAGAAGGAGCTGAACTTCAAGGAGGTGAAGCTGCTGAAG",  # Histone-like
            "ATGGCTCTGAAGGCTAAGGAGAAGCTGCTGGAGAAGGAGCTGCAGTTCAAGCTGGTGAAG",  # Actin-like
            "ATGAAGGCTCTGAAGGAGAAGCTGGTGGAGAAGGAGCTGCAGTTCAAGGGCGTGAAGCTG",  # Tubulin-like
            "ATGGCTGAGAAGGCTAAGGAGAAGCTGCTGGAGAAGGAGGTGCAGTTCAAGGCTGTGAAG",  # GAPDH-like
        ]
        
        with open(genome_file, 'w') as f:
            f.write(">chr1 Minimal test chromosome for scRNA-seq\n")
            # Concatenate gene sequences with spacers
            full_sequence = ""
            for i, seq in enumerate(gene_sequences):
                full_sequence += seq
                if i < len(gene_sequences) - 1:
                    full_sequence += "N" * 20  # Spacer between genes
            f.write(full_sequence + "\n")
        
        # Create GTF annotation with multiple genes
        gtf_file = genome_dir / "minimal_test_genes.gtf"
        logger.info(f"Creating minimal annotation: {gtf_file}")
        
        with open(gtf_file, 'w') as f:
            start_pos = 1
            for i, seq in enumerate(gene_sequences):
                gene_id = f"GENE{i+1:02d}"
                gene_name = f"TEST{i+1:02d}"
                transcript_id = f"TRANS{i+1:02d}"
                end_pos = start_pos + len(seq) - 1
                
                # Gene, transcript, and exon lines
                f.write(f'chr1\ttest\tgene\t{start_pos}\t{end_pos}\t.\t+\t.\tgene_id "{gene_id}"; gene_name "{gene_name}";\n')
                f.write(f'chr1\ttest\ttranscript\t{start_pos}\t{end_pos}\t.\t+\t.\tgene_id "{gene_id}"; transcript_id "{transcript_id}";\n')  
                f.write(f'chr1\ttest\texon\t{start_pos}\t{end_pos}\t.\t+\t.\tgene_id "{gene_id}"; transcript_id "{transcript_id}";\n')
                
                start_pos = end_pos + 21  # Account for N spacer
        
        # Build STAR index
        logger.info("Building STAR index (may take a few minutes)...")
        
        star_cmd = [
            'STAR',
            '--runMode', 'genomeGenerate',
            '--genomeDir', str(star_index_dir),
            '--genomeFastaFiles', str(genome_file),
            '--sjdbGTFfile', str(gtf_file),
            '--genomeSAindexNbases', '2',  # Small value for tiny genome
            '--runThreadN', '4',
            '--sjdbOverhang', '50'
        ]
        
        logger.info(f"Running: {' '.join(star_cmd)}")
        result = subprocess.run(star_cmd, capture_output=True, text=True, timeout=600)
        
        if result.returncode == 0:
            logger.info("✅ STAR index created successfully!")
            
            # Verify all required files were created
            missing_after_creation = []
            for required_file in required_files:
                file_path = star_index_dir / required_file
                if not file_path.exists():
                    missing_after_creation.append(required_file)
                else:
                    file_size = file_path.stat().st_size
                    logger.info(f"  ✅ {required_file} ({file_size} bytes)")
            
            if missing_after_creation:
                logger.error(f"❌ STAR index creation incomplete, still missing: {missing_after_creation}")
                return False
            else:
                logger.info("🎉 STAR index creation completed successfully!")
                return True
                
        else:
            logger.error(f"❌ STAR index creation failed with exit code {result.returncode}")
            logger.error(f"STDOUT: {result.stdout}")
            logger.error(f"STDERR: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        logger.error("❌ STAR index creation timed out (>10 minutes)")
        return False
    except Exception as e:
        logger.error(f"❌ STAR index creation failed with exception: {e}")
        return False

def integrate_into_pipeline():
    """
    Example of how to integrate this into the existing pipeline.
    Add this call before step_3_read_alignment() in the scRNA-seq pipeline.
    """
    
    # This should be called in pipeline_core.py before STAR alignment
    if not auto_create_star_index_if_missing():
        raise FileNotFoundError(
            "STAR genome index is not available and could not be created automatically. "
            "Please create a STAR index manually or check STAR installation."
        )

if __name__ == "__main__":
    import logging
    logging.basicConfig(level=logging.INFO)
    
    print("Auto STAR Index Creator")
    print("======================")
    
    success = auto_create_star_index_if_missing()
    if success:
        print("\n🎉 SUCCESS! STAR index is ready for scRNA-seq processing")
    else:
        print("\n❌ FAILURE! Could not create STAR index")