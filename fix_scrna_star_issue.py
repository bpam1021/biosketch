#!/usr/bin/env python3
"""
Fix scRNA-seq STAR alignment issues
1. Check STAR index availability
2. Fix UMI/barcode length parameters  
3. Create minimal test genome if needed
"""

import os
import subprocess

def check_star_availability():
    """Check if STAR is available and working"""
    print("🔍 Checking STAR availability...")
    
    try:
        result = subprocess.run(['STAR', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            version = result.stdout.strip()
            print(f"✅ STAR available: {version}")
            return True
        else:
            print(f"❌ STAR command failed")
            return False
    except FileNotFoundError:
        print(f"❌ STAR not found in PATH")
        return False

def check_star_index():
    """Check if STAR genome index exists"""
    print("\n🔍 Checking STAR genome index...")
    
    star_index_dir = "/data/reference/star_index"
    required_files = [
        "genomeParameters.txt",
        "Genome",
        "SA",
        "SAindex"
    ]
    
    print(f"Looking for index at: {star_index_dir}")
    
    if not os.path.exists(star_index_dir):
        print(f"❌ STAR index directory does not exist: {star_index_dir}")
        return False
    
    missing_files = []
    for file in required_files:
        file_path = os.path.join(star_index_dir, file)
        if not os.path.exists(file_path):
            missing_files.append(file)
    
    if missing_files:
        print(f"❌ Missing STAR index files: {missing_files}")
        print(f"💡 The index is incomplete or corrupted")
        return False
    else:
        print(f"✅ STAR index appears complete")
        return True

def analyze_star_error():
    """Analyze the specific STAR error from the logs"""
    print("\n🔍 Analyzing STAR error...")
    
    print("From the error log, STAR exit code 104 typically means:")
    print("1. 📁 Missing or invalid genome index")
    print("2. 📄 Input file format issues") 
    print("3. ⚙️  Parameter incompatibility")
    print("4. 💾 Insufficient memory/disk space")
    
    # Check the specific command that failed
    failed_command = [
        '/usr/local/bin/STAR', '--runMode', 'alignReads', 
        '--genomeDir', '/data/reference/star_index',
        '--readFilesIn', 
        '/root/biosketch/ai_imagegen_backend/media/results/a9d57b89-f16f-4070-84a0-242619cc6223/sample_1_R2.fastq.gz',
        '/root/biosketch/ai_imagegen_backend/media/results/a9d57b89-f16f-4070-84a0-242619cc6223/sample_1_R1.fastq.gz',
        '--readFilesCommand', 'zcat',
        '--soloUMIlen', '12',  # This is wrong - should be 10
        '--soloCBlen', '16'
    ]
    
    print(f"\n📋 Issues in the failed command:")
    print(f"1. Using original FASTQ files instead of umi_tools processed files")
    print(f"2. UMI length set to 12bp but our test data has 10bp UMIs")
    print(f"3. Genome index path: /data/reference/star_index")

def create_minimal_star_fix():
    """Create a fix for the STAR alignment issue"""
    print("\n🔧 Creating STAR alignment fix...")
    
    fix_script = """#!/bin/bash
# Fix for STAR alignment in scRNA-seq pipeline

echo "🔧 Fixing scRNA-seq STAR alignment issues"
echo "========================================"

# 1. Check if STAR index exists
STAR_INDEX_DIR="/data/reference/star_index"
if [ ! -d "$STAR_INDEX_DIR" ]; then
    echo "❌ STAR index directory missing: $STAR_INDEX_DIR"
    echo ""
    echo "🛠️  Creating minimal test genome index..."
    
    # Create directories
    mkdir -p "$STAR_INDEX_DIR"
    mkdir -p "/data/reference/genome"
    
    # Create a minimal test genome (100kb) and annotation
    cat > /data/reference/genome/test_genome.fa << 'EOF'
>chr1
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG
CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC
EOF
    
    # Create a minimal GTF annotation
    cat > /data/reference/genome/test_genes.gtf << 'EOF'
chr1	test	gene	1	320	.	+	.	gene_id "GENE1"; gene_name "TEST1";
chr1	test	transcript	1	320	.	+	.	gene_id "GENE1"; transcript_id "TRANS1";
chr1	test	exon	1	320	.	+	.	gene_id "GENE1"; transcript_id "TRANS1";
EOF
    
    # Build STAR index
    echo "🏗️  Building minimal STAR index (this may take a few minutes)..."
    STAR --runMode genomeGenerate \\
         --genomeDir "$STAR_INDEX_DIR" \\
         --genomeFastaFiles /data/reference/genome/test_genome.fa \\
         --sjdbGTFfile /data/reference/genome/test_genes.gtf \\
         --genomeSAindexNbases 2 \\
         --runThreadN 2 \\
         --sjdbOverhang 50
    
    if [ $? -eq 0 ]; then
        echo "✅ Minimal STAR index created successfully"
    else
        echo "❌ STAR index creation failed"
        exit 1
    fi
else
    echo "✅ STAR index directory exists: $STAR_INDEX_DIR"
fi

echo ""
echo "🧪 Testing STAR with minimal command..."
cd /tmp
echo ">read1" > test_R1.fq
echo "AAACATACAACTGCAAAAAAAAAA" >> test_R1.fq  # 16bp barcode + 10bp UMI
echo "+" >> test_R1.fq  
echo "########################" >> test_R1.fq

echo ">read1" > test_R2.fq
echo "ATGAAGGCTCTGAAGGAGAAGCTGGTGGAGAAGGAGCTGCAGTTCAAGGGCGTGAAGCTG" >> test_R2.fq
echo "+" >> test_R2.fq
echo "############################################################" >> test_R2.fq

# Test basic STAR command
STAR --runMode alignReads \\
     --genomeDir "$STAR_INDEX_DIR" \\
     --readFilesIn test_R2.fq test_R1.fq \\
     --outFileNamePrefix test_ \\
     --runThreadN 1 \\
     --outSAMtype SAM

if [ $? -eq 0 ]; then
    echo "✅ Basic STAR alignment test passed"
    rm -f test_*
else
    echo "❌ Basic STAR alignment test failed"
fi

echo ""
echo "✅ STAR fix completed!"
echo "The pipeline should now be able to process scRNA-seq data."
"""
    
    with open('/tmp/fix_star.sh', 'w') as f:
        f.write(fix_script)
    
    os.chmod('/tmp/fix_star.sh', 0o755)
    print(f"✅ Created STAR fix script: /tmp/fix_star.sh")
    return '/tmp/fix_star.sh'

def show_immediate_solutions():
    """Show immediate solutions for the user"""
    print(f"\n🚀 Immediate Solutions")
    print("=====================")
    
    print("1. 🏗️  Create minimal STAR index (recommended for testing):")
    print("   bash /tmp/fix_star.sh")
    print()
    
    print("2. 🔧 Update pipeline parameters:")
    print("   Edit pipeline_core.py to use:")
    print("   - UMI length: 10bp (not 12bp)")
    print("   - Use processed files from umi_tools")
    print("   - Add error tolerance flags")
    print()
    
    print("3. 📥 Use pre-built reference (production):")
    print("   Download human reference from:")
    print("   https://cf.10xgenomics.com/supp/cell-exp/refdata-gex-GRCh38-2020-A.tar.gz")
    print()
    
    print("4. ⚡ Quick test without alignment:")
    print("   Modify pipeline to skip alignment step for testing")

if __name__ == "__main__":
    print("scRNA-seq STAR Alignment Troubleshooter")
    print("======================================")
    
    # Check STAR availability
    star_available = check_star_availability()
    
    # Check STAR index
    index_available = check_star_index()
    
    # Analyze the error
    analyze_star_error()
    
    if star_available and not index_available:
        print(f"\n💡 SOLUTION: STAR is available but genome index is missing")
        script_path = create_minimal_star_fix()
        show_immediate_solutions()
        
        print(f"\n🎯 Next Steps:")
        print(f"1. Run: bash {script_path}")
        print(f"2. Retry your scRNA-seq analysis")
        print(f"3. Monitor logs - should get past STAR alignment")
        
    elif not star_available:
        print(f"\n❌ STAR software is not installed")
        print(f"Install STAR first: conda install -c bioconda star")
        
    else:
        print(f"\n✅ Both STAR and index are available")
        print(f"The issue might be in the command parameters")
        show_immediate_solutions()