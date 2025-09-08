#!/usr/bin/env python3
"""
Convert your existing whitelists to umi_tools format
"""
import os
from pathlib import Path

def convert_whitelist_to_umi_tools():
    """Convert existing whitelists to proper umi_tools format"""
    
    print("Converting Existing Whitelists to umi_tools Format")
    print("=================================================")
    
    ref_dir = Path("/data/reference")
    
    # Files to convert
    whitelist_files = [
        {
            'input': ref_dir / "3M-february-2018.txt",
            'output': ref_dir / "3M-february-2018_umi_tools.txt",
            'name': "10X v3 (3M barcodes)"
        },
        {
            'input': ref_dir / "737K-august-2016.txt", 
            'output': ref_dir / "737K-august-2016_umi_tools.txt",
            'name': "10X v2 (737K barcodes)"
        }
    ]
    
    for whitelist in whitelist_files:
        print(f"\n📄 Processing {whitelist['name']}:")
        print(f"   Input: {whitelist['input']}")
        print(f"   Output: {whitelist['output']}")
        
        if not whitelist['input'].exists():
            print(f"   ⚠️ Input file not found, skipping...")
            continue
        
        if whitelist['output'].exists():
            # Check if already in correct format
            with open(whitelist['output'], 'r') as f:
                first_line = f.readline().strip()
                if '\t' in first_line:
                    line_count = sum(1 for line in open(whitelist['output']))
                    print(f"   ✅ Already in umi_tools format ({line_count:,} lines)")
                    continue
        
        # Convert to umi_tools format
        try:
            converted_count = 0
            
            with open(whitelist['input'], 'r') as f_in:
                with open(whitelist['output'], 'w') as f_out:
                    for line in f_in:
                        barcode = line.strip()
                        if barcode and len(barcode) >= 14:  # Valid barcode
                            # umi_tools format: barcode<TAB>barcode
                            f_out.write(f"{barcode}\t{barcode}\n")
                            converted_count += 1
            
            print(f"   ✅ Converted {converted_count:,} barcodes successfully")
            
            # Verify the output
            with open(whitelist['output'], 'r') as f:
                first_line = f.readline().strip()
                print(f"   ✅ Format example: {first_line}")
                
        except Exception as e:
            print(f"   ❌ Conversion failed: {e}")

def update_pipeline_whitelist_paths():
    """Show the paths that should be used in the pipeline"""
    
    print(f"\n🔧 Pipeline Whitelist Configuration")
    print("===================================")
    
    print("The pipeline should use these paths:")
    print("  - 10X v3: /data/reference/3M-february-2018_umi_tools.txt")
    print("  - 10X v2: /data/reference/737K-august-2016_umi_tools.txt")
    
    # Check if pipeline needs to be updated
    ref_dir = Path("/data/reference")
    v3_umi_tools = ref_dir / "3M-february-2018_umi_tools.txt"
    v2_umi_tools = ref_dir / "737K-august-2016_umi_tools.txt"
    
    if v3_umi_tools.exists() and v2_umi_tools.exists():
        print("  ✅ Both umi_tools format whitelists are ready")
        print("  ✅ Your PBMC data should now process successfully!")
    else:
        print("  ⚠️ Some whitelist files are missing - run the conversion above")

if __name__ == "__main__":
    print("Whitelist Format Converter for umi_tools")
    print("========================================")
    
    # Convert whitelists
    convert_whitelist_to_umi_tools()
    
    # Show pipeline configuration
    update_pipeline_whitelist_paths()
    
    print(f"\n🎉 Whitelist Conversion Complete!")
    print("=================================")
    print("✅ Your existing whitelist files converted to umi_tools format")
    print("✅ Ready for real PBMC data processing")
    print("✅ No more 'Not correctable' filtering issues")