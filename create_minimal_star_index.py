#!/usr/bin/env python3
"""
Create minimal STAR index for testing scRNA-seq pipeline
"""
import os
import subprocess
from pathlib import Path

def create_minimal_star_index():
    """Create a minimal STAR genome index for testing"""
    
    print("Creating Minimal STAR Index for scRNA-seq Testing")
    print("=================================================")
    
    # Define paths
    star_index_dir = Path("/data/reference/star_index")
    genome_dir = Path("/data/reference/genome")
    
    print(f"STAR index directory: {star_index_dir}")
    print(f"Genome directory: {genome_dir}")
    
    # Create directories
    star_index_dir.mkdir(parents=True, exist_ok=True)
    genome_dir.mkdir(parents=True, exist_ok=True)
    
    # Create minimal test genome (1000bp)
    genome_file = genome_dir / "test_genome.fa"
    print(f"Creating minimal genome: {genome_file}")
    
    with open(genome_file, 'w') as f:
        f.write(">chr1 Test chromosome\n")
        # Create 1000bp of realistic sequence
        sequence = "A" * 250 + "T" * 250 + "G" * 250 + "C" * 250
        f.write(sequence + "\n")
    
    # Create minimal GTF annotation
    gtf_file = genome_dir / "test_genes.gtf"
    print(f"Creating minimal annotation: {gtf_file}")
    
    with open(gtf_file, 'w') as f:
        f.write('chr1\ttest\tgene\t1\t1000\t.\t+\t.\tgene_id "GENE1"; gene_name "TEST1";\n')
        f.write('chr1\ttest\ttranscript\t1\t1000\t.\t+\t.\tgene_id "GENE1"; transcript_id "TRANS1";\n')
        f.write('chr1\ttest\texon\t1\t1000\t.\t+\t.\tgene_id "GENE1"; transcript_id "TRANS1";\n')
    
    # Check if STAR is available
    try:
        result = subprocess.run(['STAR', '--version'], capture_output=True, text=True)
        if result.returncode != 0:
            print("ERROR: STAR not available")
            print("Please install STAR: conda install -c bioconda star")
            return False
        
        print(f"STAR version: {result.stdout.strip()}")
    except FileNotFoundError:
        print("ERROR: STAR not found in PATH")
        print("Please install STAR: conda install -c bioconda star")
        return False
    
    # Build STAR index
    print("Building STAR index (this may take a few minutes)...")
    
    star_cmd = [
        'STAR',
        '--runMode', 'genomeGenerate',
        '--genomeDir', str(star_index_dir),
        '--genomeFastaFiles', str(genome_file),
        '--sjdbGTFfile', str(gtf_file),
        '--genomeSAindexNbases', '2',  # Small for tiny genome
        '--runThreadN', '2',
        '--sjdbOverhang', '50'
    ]
    
    try:
        print(f"Running: {' '.join(star_cmd)}")
        result = subprocess.run(star_cmd, capture_output=True, text=True, timeout=300)
        
        print(f"STAR exit code: {result.returncode}")
        if result.stdout:
            print(f"STAR stdout: {result.stdout}")
        if result.stderr:
            print(f"STAR stderr: {result.stderr}")
        
        if result.returncode == 0:
            print("SUCCESS: STAR index created successfully!")
            
            # Check created files
            required_files = ["genomeParameters.txt", "Genome", "SA", "SAindex"]
            missing_files = []
            
            for required_file in required_files:
                file_path = star_index_dir / required_file
                if not file_path.exists():
                    missing_files.append(required_file)
            
            if missing_files:
                print(f"WARNING: Missing expected files: {missing_files}")
            else:
                print("All required STAR index files created successfully!")
            
            return True
        else:
            print("ERROR: STAR index creation failed")
            return False
            
    except subprocess.TimeoutExpired:
        print("ERROR: STAR index creation timed out (>5 minutes)")
        return False
    except Exception as e:
        print(f"ERROR: STAR index creation failed: {e}")
        return False

def verify_star_index():
    """Verify the created STAR index"""
    
    print("\nVerifying STAR Index")
    print("====================")
    
    star_index_dir = Path("/data/reference/star_index")
    
    if not star_index_dir.exists():
        print(f"ERROR: STAR index directory does not exist: {star_index_dir}")
        return False
    
    required_files = ["genomeParameters.txt", "Genome", "SA", "SAindex"]
    
    for required_file in required_files:
        file_path = star_index_dir / required_file
        if file_path.exists():
            size = file_path.stat().st_size
            print(f"OK: {required_file} ({size} bytes)")
        else:
            print(f"ERROR: Missing {required_file}")
            return False
    
    print("STAR index verification completed successfully!")
    return True

if __name__ == "__main__":
    print("Minimal STAR Index Creator")
    print("==========================")
    
    # Create the index
    success = create_minimal_star_index()
    
    if success:
        # Verify it was created correctly
        verify_star_index()
        
        print("\nNext Steps:")
        print("1. The minimal STAR index is now ready")
        print("2. Retry your scRNA-seq analysis")
        print("3. The pipeline should now progress past STAR alignment")
        print("4. For production use, consider downloading a full reference genome")
    else:
        print("\nFailed to create STAR index")
        print("Please check the error messages above")