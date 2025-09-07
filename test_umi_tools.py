#!/usr/bin/env python3
"""
Test script to debug umi_tools issues with our test data
"""

import subprocess
import os
from pathlib import Path

def test_umi_tools():
    """Test umi_tools extract with our sample data"""
    
    print("Testing umi_tools with sample data")
    print("====================================")
    
    # Check if test data exists
    test_dir = Path("test_scrna_data")
    r1_file = test_dir / "test_pbmc_R1.fastq.gz"
    r2_file = test_dir / "test_pbmc_R2.fastq.gz"
    
    if not r1_file.exists() or not r2_file.exists():
        print("❌ Test data not found. Please run create_simple_scrna_data.py first")
        return
    
    print(f"✅ Test data found:")
    print(f"   R1: {r1_file} ({r1_file.stat().st_size} bytes)")
    print(f"   R2: {r2_file} ({r2_file.stat().st_size} bytes)")
    
    # Create output directory
    output_dir = Path("test_umi_output")
    output_dir.mkdir(exist_ok=True)
    
    processed_r1 = output_dir / "test_processed_R1.fastq.gz"
    processed_r2 = output_dir / "test_processed_R2.fastq.gz"
    
    # Check if whitelist exists
    whitelist_path = "/data/reference/3M-february-2018.txt"
    if not os.path.exists(whitelist_path):
        print(f"⚠️  Whitelist not found at {whitelist_path}")
        print("Creating minimal test whitelist...")
        
        # Create minimal whitelist with our test barcodes
        test_whitelist = output_dir / "test_whitelist.txt"
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
        
        whitelist_path = str(test_whitelist)
        print(f"✅ Created test whitelist: {whitelist_path}")
    else:
        print(f"✅ Whitelist found: {whitelist_path}")
    
    # Test umi_tools extract command
    bc_pattern = "CCCCCCCCCCCCCCCCNNNNNNNNNN"  # 16bp barcode + 10bp UMI
    
    umi_extract_cmd = [
        'umi_tools',
        'extract',
        '--bc-pattern', bc_pattern,
        '--stdin', str(r1_file),
        '--read2-in', str(r2_file),
        '--stdout', str(processed_r1),
        '--read2-out', str(processed_r2),
        '--filter-cell-barcode',
        '--error-correct-cell',
        '--whitelist', whitelist_path
    ]
    
    print(f"\n🔧 Running umi_tools command:")
    print(f"Command: {' '.join(umi_extract_cmd)}")
    print()
    
    try:
        result = subprocess.run(umi_extract_cmd, capture_output=True, text=True, timeout=60)
        
        print(f"Exit code: {result.returncode}")
        print(f"STDOUT:\n{result.stdout}")
        print(f"STDERR:\n{result.stderr}")
        
        # Check output files
        if processed_r1.exists() and processed_r2.exists():
            print(f"\n✅ Output files created:")
            print(f"   R1: {processed_r1} ({processed_r1.stat().st_size} bytes)")
            print(f"   R2: {processed_r2} ({processed_r2.stat().st_size} bytes)")
            
            # Check a few lines of output
            print(f"\n📋 Sample of processed R1:")
            sample_r1 = subprocess.run(['zcat', str(processed_r1)], capture_output=True, text=True)
            print(sample_r1.stdout[:500])
            
        else:
            print(f"\n❌ Output files not created")
            
    except subprocess.TimeoutExpired:
        print("⏰ Command timed out after 60 seconds")
    except FileNotFoundError:
        print("❌ umi_tools command not found. Please install umi_tools:")
        print("   pip install umi_tools")
    except Exception as e:
        print(f"❌ Error running umi_tools: {e}")

if __name__ == "__main__":
    test_umi_tools()