#!/usr/bin/env python3
"""
Create simple test scRNA-seq data compatible with the current pipeline logic
Windows-compatible version without emoji characters
"""

import gzip
import random
import os
from pathlib import Path

def create_test_scrna_data(output_dir="test_scrna_data", num_reads=2000):
    """
    Create test single-cell RNA-seq data files
    
    Args:
        output_dir: Directory to save files
        num_reads: Number of reads to generate
    """
    
    # Create output directory
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)
    
    print(f"Creating test scRNA-seq data in {output_dir}/")
    
    # Valid 10X Genomics v3 cell barcodes (subset from actual whitelist)
    valid_barcodes = [
        "AAACATACAACTGC", "AAACATTGAGCTAC", "AAACATTGATCAGC", "AAACCGTGCTTCCG",
        "AAACCGTGTATGCG", "AAACGCACTGGTAC", "AAACGCTGACCAGT", "AAACGCTGGTTCTT",
        "AAACGCTGTAGCCA", "AAACGCTGTTTCTG", "AAACATACATTTCC", "AAACATTGCGGTAT",
        "AAACGAACATGTAC", "AAACGAAGATCACT", "AAACGCATCAGAGC", "AAACGCGAGACTAT",
        "AAACGCTTCGTCCA", "AAACGGGTGAGACG", "AAACGGGTGATGTT", "AAACGGGTGTTGAC",
        "AAACGTAAGGCAGT", "AAACGTACATGACT", "AAACGTACCTGTTG", "AAACGTCCAAGATG",
        "AAACGTCCATCGAT", "AAACGTCCTTGTAG", "AAACGTCTACGGTC", "AAACGTCTTCGCAT",
        "AAACGTGAACCTCT", "AAACGTGAGATCGC", "AAACGTGATACCAG", "AAACGTGATTCGAG"
    ]
    
    # Common gene sequences (simplified representations)
    common_sequences = [
        "ATGAGTGACCTGAAGTGCCTGACCTGTGTGGAGTATGGCTTCAAGTGTGACCTGAAGTGC",  # β-globin-like
        "ATGGAGCAGAAACTCATCTCTGAAGAGGATCTGAATATGCAGCTCCGTGTGGAGTATGGC",  # Immunoglobulin-like
        "ATGAAGTTCGTGAAGCTGGTGGAGAAGGAGCTGAACTTCAAGGAGGTGAAGCTGCTGAAG",  # Histone-like
        "ATGGCTCTGAAGGCTAAGGAGAAGCTGCTGGAGAAGGAGCTGCAGTTCAAGCTGGTGAAG",  # Actin-like
        "ATGAAGGCTCTGAAGGAGAAGCTGGTGGAGAAGGAGCTGCAGTTCAAGGGCGTGAAGCTG",  # Tubulin-like
        "ATGGCTGAGAAGGCTAAGGAGAAGCTGCTGGAGAAGGAGGTGCAGTTCAAGGCTGTGAAG"   # GAPDH-like
    ]
    
    # File paths
    r1_path = output_path / "test_pbmc_R1.fastq.gz"
    r2_path = output_path / "test_pbmc_R2.fastq.gz"
    
    print(f"Generating {num_reads} read pairs...")
    
    with gzip.open(r1_path, 'wt') as r1_file, \
         gzip.open(r2_path, 'wt') as r2_file:
        
        for read_id in range(num_reads):
            # Generate R1: Cell barcode (16bp) + UMI (10bp)
            cell_barcode = random.choice(valid_barcodes)
            umi = ''.join(random.choices(['A', 'C', 'G', 'T'], k=10))
            r1_sequence = cell_barcode + umi  # 26bp total
            
            # Generate R2: cDNA sequence (gene fragment)
            base_sequence = random.choice(common_sequences)
            # Add some variation and random length (50-75bp)
            seq_length = random.randint(50, 75)
            if len(base_sequence) >= seq_length:
                r2_sequence = base_sequence[:seq_length]
            else:
                # Extend with random nucleotides
                extension = ''.join(random.choices(['A', 'C', 'G', 'T'], k=seq_length - len(base_sequence)))
                r2_sequence = base_sequence + extension
            
            # Add some mutations for realism (5% mutation rate)
            if random.random() < 0.05:
                pos = random.randint(0, len(r2_sequence) - 1)
                r2_sequence = list(r2_sequence)
                r2_sequence[pos] = random.choice(['A', 'C', 'G', 'T'])
                r2_sequence = ''.join(r2_sequence)
            
            # Quality scores (using high quality for simplicity)
            r1_quality = 'I' * len(r1_sequence)  # Quality score ~40
            r2_quality = 'I' * len(r2_sequence)
            
            # Write FASTQ records
            # R1 file (barcode + UMI)
            r1_file.write(f"@read_{read_id:06d}_R1\n")
            r1_file.write(f"{r1_sequence}\n")
            r1_file.write(f"+\n")
            r1_file.write(f"{r1_quality}\n")
            
            # R2 file (cDNA)
            r2_file.write(f"@read_{read_id:06d}_R2\n")
            r2_file.write(f"{r2_sequence}\n")
            r2_file.write(f"+\n")
            r2_file.write(f"{r2_quality}\n")
    
    # Get file sizes
    r1_size = r1_path.stat().st_size / (1024 * 1024)  # MB
    r2_size = r2_path.stat().st_size / (1024 * 1024)  # MB
    
    print(f"Test data created successfully!")
    print(f"R1 file: {r1_path} ({r1_size:.2f} MB)")
    print(f"R2 file: {r2_path} ({r2_size:.2f} MB)")
    print(f"Total reads: {num_reads} per file")
    print(f"Cell barcodes used: {len(valid_barcodes)} unique barcodes")
    
    # Create a summary file
    summary_path = output_path / "README.txt"
    with open(summary_path, 'w') as f:
        f.write("Test scRNA-seq Data Summary\n")
        f.write("============================\n\n")
        f.write(f"Generated: {num_reads} read pairs\n")
        f.write(f"R1 file: {r1_path.name} ({r1_size:.2f} MB)\n")
        f.write(f"R2 file: {r2_path.name} ({r2_size:.2f} MB)\n")
        f.write(f"Cell barcodes: {len(valid_barcodes)} unique 10X v3 barcodes\n")
        f.write(f"UMI length: 10bp\n")
        f.write(f"Read length: 26bp (R1), 50-75bp (R2)\n\n")
        f.write("Upload Instructions:\n")
        f.write("1. Select 'Single-cell RNA-seq' as dataset type\n")
        f.write("2. Upload both R1 and R2 files\n")
        f.write("3. Pipeline will automatically process upstream -> downstream\n")
        f.write("4. Expected processing time: 5-10 minutes\n")
    
    return r1_path, r2_path

if __name__ == "__main__":
    print("scRNA-seq Test Data Generator")
    print("================================")
    
    # Create test dataset for quick testing
    r1, r2 = create_test_scrna_data()
    
    print(f"\nReady to upload:")
    print(f"   R1: {r1}")
    print(f"   R2: {r2}")
    print(f"\nNext steps:")
    print(f"   1. Go to your RNA-seq upload page")
    print(f"   2. Select 'Single-cell RNA-seq'")
    print(f"   3. Upload both files")
    print(f"   4. Watch the pipeline process automatically!")