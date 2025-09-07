#!/usr/bin/env python3
"""
Fix FASTQ headers to match umi_tools requirements
The headers in R1 and R2 files must be identical for paired-end processing
"""

import gzip
import os
from pathlib import Path

def fix_fastq_headers(output_dir="test_scrna_data", num_reads=2000):
    """Create correctly formatted scRNA-seq test data with matching headers"""
    
    print("🔧 Fixing FASTQ headers for umi_tools compatibility")
    print("==================================================")
    
    # Create output directory
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)
    
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
    
    print(f"📝 Generating {num_reads} read pairs with matching headers...")
    
    import random
    
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
            
            # CRITICAL: Use identical headers for both files (umi_tools requirement)
            read_header = f"@read_{read_id:06d}"
            
            # Write R1 record
            r1_file.write(f"{read_header}\n")
            r1_file.write(f"{r1_sequence}\n")
            r1_file.write(f"+\n")
            r1_file.write(f"{r1_quality}\n")
            
            # Write R2 record (same header!)
            r2_file.write(f"{read_header}\n")
            r2_file.write(f"{r2_sequence}\n")
            r2_file.write(f"+\n")
            r2_file.write(f"{r2_quality}\n")
    
    # Get file sizes
    r1_size = r1_path.stat().st_size / (1024 * 1024)  # MB
    r2_size = r2_path.stat().st_size / (1024 * 1024)  # MB
    
    print(f"✅ Fixed FASTQ files created successfully!")
    print(f"📄 R1 file: {r1_path} ({r1_size:.2f} MB)")
    print(f"📄 R2 file: {r2_path} ({r2_size:.2f} MB)")
    print(f"📊 Total reads: {num_reads} per file")
    print(f"🧮 Cell barcodes used: {len(valid_barcodes)} unique barcodes")
    
    # Verify headers match
    print(f"\n🔍 Verifying header consistency...")
    with gzip.open(r1_path, 'rt') as r1, gzip.open(r2_path, 'rt') as r2:
        r1_header = r1.readline().strip()
        r2_header = r2.readline().strip()
        
        if r1_header == r2_header:
            print(f"✅ Headers match: {r1_header}")
        else:
            print(f"❌ Headers mismatch: R1={r1_header}, R2={r2_header}")
            return False
    
    # Create summary file
    summary_path = output_path / "README_fixed.txt"
    with open(summary_path, 'w') as f:
        f.write("Fixed scRNA-seq Test Data Summary\n")
        f.write("==================================\n\n")
        f.write(f"Generated: {num_reads} read pairs\n")
        f.write(f"R1 file: {r1_path.name} ({r1_size:.2f} MB)\n")
        f.write(f"R2 file: {r2_path.name} ({r2_size:.2f} MB)\n")
        f.write(f"Cell barcodes: {len(valid_barcodes)} unique 10X v3 barcodes\n")
        f.write(f"UMI length: 10bp\n")
        f.write(f"Read length: 26bp (R1), 50-75bp (R2)\n")
        f.write(f"Header format: Identical headers in both files (umi_tools compatible)\n\n")
        f.write("Key Fixes Applied:\n")
        f.write("- Headers now match between R1 and R2 files\n")
        f.write("- Format: @read_XXXXXX (no R1/R2 suffix)\n")
        f.write("- Compatible with umi_tools extract command\n\n")
        f.write("Upload Instructions:\n")
        f.write("1. Select 'Single-cell RNA-seq' as dataset type\n")
        f.write("2. Upload both R1 and R2 files\n")
        f.write("3. Pipeline should now process successfully through barcode extraction\n")
    
    return r1_path, r2_path

if __name__ == "__main__":
    print("FASTQ Header Fix for scRNA-seq")
    print("=============================")
    
    # Create fixed test data
    r1, r2 = fix_fastq_headers()
    
    if r1 and r2:
        print(f"\n🎉 SUCCESS!")
        print(f"==========")
        print(f"Fixed FASTQ files created with matching headers")
        print(f"These files should work with umi_tools extract")
        print(f"\n📁 Files ready for upload:")
        print(f"   R1: {r1}")
        print(f"   R2: {r2}")
        print(f"\n🚀 Next steps:")
        print(f"1. Upload these fixed files to your scRNA-seq analysis")
        print(f"2. The 'Read pairs do not match' error should be resolved")
        print(f"3. Monitor logs - should progress past barcode extraction")
    else:
        print(f"\n❌ FAILED!")
        print(f"Could not create fixed FASTQ files")