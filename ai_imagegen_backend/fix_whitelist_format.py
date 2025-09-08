#!/usr/bin/env python3
"""
Quick fix for whitelist format - run this on your server
"""
import os

def fix_whitelist_format():
    """Convert the existing 3M whitelist to umi_tools format"""
    
    # Path to your existing whitelist
    original_whitelist = "/data/reference/3M-february-2018.txt"
    umi_tools_whitelist = "/data/reference/3M-february-2018_umi_tools.txt"
    
    print(f"Converting whitelist format...")
    print(f"Input: {original_whitelist}")
    print(f"Output: {umi_tools_whitelist}")
    
    if not os.path.exists(original_whitelist):
        print(f"ERROR: Original whitelist not found: {original_whitelist}")
        return False
    
    try:
        converted_count = 0
        
        with open(original_whitelist, 'r') as f_in:
            with open(umi_tools_whitelist, 'w') as f_out:
                for line in f_in:
                    barcode = line.strip()
                    if barcode and len(barcode) >= 14:
                        # umi_tools format: barcode<TAB>barcode
                        f_out.write(f"{barcode}\t{barcode}\n")
                        converted_count += 1
        
        print(f"SUCCESS: Converted {converted_count:,} barcodes")
        print(f"Whitelist ready for umi_tools: {umi_tools_whitelist}")
        return True
        
    except Exception as e:
        print(f"ERROR: Conversion failed: {e}")
        return False

if __name__ == "__main__":
    success = fix_whitelist_format()
    if success:
        print("\nNow retry your scRNA-seq analysis - it should work!")
    else:
        print("\nWhitelist conversion failed - check the error above")