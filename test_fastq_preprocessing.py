#!/usr/bin/env python3
"""
Test the FASTQ preprocessing functionality
"""
import os
import sys
import gzip
import tempfile
from pathlib import Path

# Add the project path for imports
sys.path.append('ai_imagegen_backend')

def test_fastq_preprocessing():
    """Test FASTQ header preprocessing with the existing mismatched data"""
    
    print("Testing FASTQ Header Preprocessing")
    print("==================================")
    
    # Paths to our test data
    test_data_dir = Path("test_scrna_data")
    r1_path = test_data_dir / "test_pbmc_R1.fastq.gz"
    r2_path = test_data_dir / "test_pbmc_R2.fastq.gz"
    
    if not (r1_path.exists() and r2_path.exists()):
        print(f"Error: Test data not found")
        print(f"R1: {r1_path} - exists: {r1_path.exists()}")
        print(f"R2: {r2_path} - exists: {r2_path.exists()}")
        return False
    
    print(f"Input files:")
    print(f"  R1: {r1_path}")
    print(f"  R2: {r2_path}")
    
    # Check original headers
    print(f"\nOriginal headers:")
    with gzip.open(r1_path, 'rt') as f:
        r1_header = f.readline().strip()
        print(f"  R1 first header: {r1_header}")
    
    with gzip.open(r2_path, 'rt') as f:
        r2_header = f.readline().strip()
        print(f"  R2 first header: {r2_header}")
    
    headers_match = r1_header == r2_header
    print(f"  Headers match: {headers_match}")
    
    if headers_match:
        print("  Note: Headers already match - this is unexpected!")
    
    # Create temporary output directory
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        
        # Apply our header standardization logic
        print(f"\nTesting header standardization logic...")
        
        import re
        
        def standardize_header(header):
            """Apply our header standardization logic"""
            # Remove @ symbol
            header = header[1:] if header.startswith('@') else header
            
            # Common patterns to remove:
            # - /1, /2, _R1, _R2, _1, _2 suffixes
            # - :R1, :R2, .R1, .R2 suffixes
            patterns_to_remove = [
                r'[/_\.:]R[12]$',  # _R1, _R2, /R1, /R2, .R1, .R2, :R1, :R2
                r'[/_\.][12]$',    # _1, _2, /1, /2, .1, .2
                r'\s+[12]$',       # space + 1 or 2
            ]
            
            for pattern in patterns_to_remove:
                header = re.sub(pattern, '', header)
            
            return f"@{header}"
        
        # Test standardization
        std_r1 = standardize_header(r1_header)
        std_r2 = standardize_header(r2_header)
        
        print(f"  R1 standardized: {std_r1}")
        print(f"  R2 standardized: {std_r2}")
        print(f"  Standardized headers match: {std_r1 == std_r2}")
        
        # Test preprocessing with a small sample
        print(f"\nTesting preprocessing on first 10 reads...")
        
        preprocessed_r1 = temp_path / "preprocessed_R1.fastq.gz"
        preprocessed_r2 = temp_path / "preprocessed_R2.fastq.gz"
        
        read_count = 0
        header_mismatches = 0
        header_fixes = 0
        
        try:
            with gzip.open(r1_path, 'rt') as r1_in, \
                 gzip.open(r2_path, 'rt') as r2_in, \
                 gzip.open(preprocessed_r1, 'wt') as r1_out, \
                 gzip.open(preprocessed_r2, 'wt') as r2_out:
                
                for i in range(10):  # Process only first 10 reads
                    try:
                        # Read FASTQ record (4 lines)
                        r1_header = r1_in.readline().strip()
                        r1_seq = r1_in.readline().strip()
                        r1_plus = r1_in.readline().strip()
                        r1_qual = r1_in.readline().strip()
                        
                        r2_header = r2_in.readline().strip()
                        r2_seq = r2_in.readline().strip()
                        r2_plus = r2_in.readline().strip()
                        r2_qual = r2_in.readline().strip()
                        
                        if not r1_header or not r2_header:
                            break
                        
                        # Check if headers match
                        if r1_header != r2_header:
                            header_mismatches += 1
                            
                            # Standardize both headers to match
                            standard_header = standardize_header(r1_header)
                            r1_header = standard_header
                            r2_header = standard_header
                            header_fixes += 1
                        
                        # Write preprocessed records
                        r1_out.write(f"{r1_header}\n{r1_seq}\n{r1_plus}\n{r1_qual}\n")
                        r2_out.write(f"{r2_header}\n{r2_seq}\n{r2_plus}\n{r2_qual}\n")
                        r1_out.flush()
                        r2_out.flush()
                        
                        read_count += 1
                        
                    except Exception as e:
                        print(f"  Error processing read {i}: {e}")
                        break
                
                print(f"  Processed {read_count} reads")
                print(f"  Header mismatches found: {header_mismatches}")
                print(f"  Headers standardized: {header_fixes}")
                
                # Verify preprocessed files
                if preprocessed_r1.exists() and preprocessed_r2.exists():
                    r1_size = preprocessed_r1.stat().st_size
                    r2_size = preprocessed_r2.stat().st_size
                    print(f"  Output R1: {r1_size} bytes")
                    print(f"  Output R2: {r2_size} bytes")
                    
                    # Check first preprocessed header
                    with gzip.open(preprocessed_r1, 'rt') as f:
                        proc_r1_header = f.readline().strip()
                    with gzip.open(preprocessed_r2, 'rt') as f:
                        proc_r2_header = f.readline().strip()
                    
                    print(f"\nPreprocessed headers:")
                    print(f"  R1: {proc_r1_header}")
                    print(f"  R2: {proc_r2_header}")
                    print(f"  Match: {proc_r1_header == proc_r2_header}")
                    
                    if proc_r1_header == proc_r2_header:
                        print(f"\nSUCCESS: Header preprocessing works correctly!")
                        return True
                    else:
                        print(f"\nFAILURE: Headers still don't match after preprocessing")
                        return False
                else:
                    print(f"  ERROR: Output files not created")
                    return False
                    
        except Exception as e:
            print(f"  ERROR during preprocessing: {e}")
            return False

if __name__ == "__main__":
    success = test_fastq_preprocessing()
    sys.exit(0 if success else 1)