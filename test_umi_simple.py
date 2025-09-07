#!/usr/bin/env python3
"""
Simple test script to debug umi_tools issues
"""

import subprocess
import os
from pathlib import Path

def test_umi_tools():
    # Check if test data exists
    r1_file = "test_scrna_data/test_pbmc_R1.fastq.gz"
    r2_file = "test_scrna_data/test_pbmc_R2.fastq.gz"
    
    if not os.path.exists(r1_file) or not os.path.exists(r2_file):
        print("Test data not found")
        return
    
    print(f"Test data found: {r1_file}, {r2_file}")
    
    # Create output directory
    os.makedirs("test_umi_output", exist_ok=True)
    
    processed_r1 = "test_umi_output/test_processed_R1.fastq.gz"
    processed_r2 = "test_umi_output/test_processed_R2.fastq.gz"
    
    # Create minimal whitelist with our test barcodes
    test_whitelist = "test_umi_output/test_whitelist.txt"
    test_barcodes = [
        "AAACATACAACTGC", "AAACATTGAGCTAC", "AAACATTGATCAGC", "AAACCGTGCTTCCG",
        "AAACCGTGTATGCG", "AAACGCACTGGTAC", "AAACGCTGACCAGT", "AAACGCTGGTTCTT",
        "AAACGCTGTAGCCA", "AAACGCTGTTTCTG", "AAACATACATTTCC", "AAACATTGCGGTAT",
        "AAACGAACATGTAC", "AAACGAAGATCACT", "AAACGCATCAGAGC", "AAACGCGAGACTAT",
        "AAACGCTTCGTCCA", "AAACGGGTGAGACG", "AAACGGGTGATGTT", "AAACGGGTGTTGAC",
        "AAACGTAAGGCAGT", "AAACGTACATGACT", "AAACGTACCTGTTG", "AAACGTCCAAGATG",
        "AAACGTCCATCGAT", "AAACGTCCTTGTAG", "AAACGTCTACGGTC", "AAACGTCTTCGCAT",
        "AAACGTGAACCTCT", "AAACGTGAGATCGC", "AAACGTGATACCAG", "AAACGTGATTCGAG"
    ]
    
    with open(test_whitelist, 'w') as f:
        for barcode in test_barcodes:
            f.write(f"{barcode}\n")
    
    print(f"Created test whitelist: {test_whitelist}")
    
    # Test umi_tools extract command
    bc_pattern = "CCCCCCCCCCCCCCCCNNNNNNNNNN"  # 16bp barcode + 10bp UMI
    
    umi_extract_cmd = [
        'umi_tools',
        'extract',
        '--bc-pattern', bc_pattern,
        '--stdin', r1_file,
        '--read2-in', r2_file,
        '--stdout', processed_r1,
        '--read2-out', processed_r2,
        '--filter-cell-barcode',
        '--error-correct-cell',
        '--whitelist', test_whitelist
    ]
    
    print(f"Running umi_tools command:")
    print(f"{' '.join(umi_extract_cmd)}")
    
    try:
        result = subprocess.run(umi_extract_cmd, capture_output=True, text=True, timeout=60)
        
        print(f"Exit code: {result.returncode}")
        if result.stdout:
            print(f"STDOUT: {result.stdout}")
        if result.stderr:
            print(f"STDERR: {result.stderr}")
        
        # Check output files
        if os.path.exists(processed_r1) and os.path.exists(processed_r2):
            r1_size = os.path.getsize(processed_r1)
            r2_size = os.path.getsize(processed_r2)
            print(f"Output files created:")
            print(f"   R1: {processed_r1} ({r1_size} bytes)")
            print(f"   R2: {processed_r2} ({r2_size} bytes)")
        else:
            print(f"Output files not created")
            
    except subprocess.TimeoutExpired:
        print("Command timed out after 60 seconds")
    except FileNotFoundError:
        print("umi_tools command not found. Please install umi_tools:")
        print("   pip install umi_tools")
    except Exception as e:
        print(f"Error running umi_tools: {e}")

if __name__ == "__main__":
    test_umi_tools()