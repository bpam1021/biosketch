#!/bin/bash
# ===== Alternative scRNA-seq Sample Data Downloads =====
# Multiple sources for compatible single-cell RNA-seq data

set -e

echo "🧬 Downloading scRNA-seq Sample Data"
echo "===================================="

# Create data directory
mkdir -p scrna_samples
cd scrna_samples

# Option 1: Try alternative 10X links
echo "🔄 Trying alternative 10X Genomics sources..."

# Alternative 10X hosting locations
PBMC_URLS=(
    "https://s3-us-west-2.amazonaws.com/10x.files/samples/cell/pbmc3k/pbmc3k_fastqs.tar.gz"
    "https://cf.10xgenomics.com/samples/cell-exp/3.0.0/pbmc_1k_v3/pbmc_1k_v3_fastqs.tar.gz"
    "https://cf.10xgenomics.com/samples/cell-exp/3.0.0/pbmc_10k_v3/pbmc_10k_v3_fastqs.tar.gz"
)

# Try each URL until one works
for url in "${PBMC_URLS[@]}"; do
    echo "🔗 Trying: $url"
    if wget -q --spider "$url" 2>/dev/null; then
        echo "✅ URL accessible, downloading..."
        wget "$url" -O pbmc_data.tar.gz
        tar -xzf pbmc_data.tar.gz
        echo "✅ Downloaded and extracted successfully"
        break
    else
        echo "❌ URL not accessible"
    fi
done

# Option 2: Download from European Bioinformatics Institute (EBI)
if [ ! -f "pbmc_data.tar.gz" ]; then
    echo ""
    echo "🇪🇺 Trying EBI (European Bioinformatics Institute)..."
    
    # PBMC data from EBI
    EBI_URLS=(
        "ftp://ftp.sra.ebi.ac.uk/vol1/fastq/SRR111/051/SRR11102251/SRR11102251_1.fastq.gz"
        "ftp://ftp.sra.ebi.ac.uk/vol1/fastq/SRR111/051/SRR11102251/SRR11102251_2.fastq.gz"
    )
    
    echo "📥 Downloading from EBI SRA..."
    wget "${EBI_URLS[0]}" -O pbmc_R1.fastq.gz || echo "❌ EBI R1 failed"
    wget "${EBI_URLS[1]}" -O pbmc_R2.fastq.gz || echo "❌ EBI R2 failed"
    
    if [ -f "pbmc_R1.fastq.gz" ] && [ -f "pbmc_R2.fastq.gz" ]; then
        echo "✅ EBI download successful"
    fi
fi

# Option 3: Download from NCBI SRA
if [ ! -f "pbmc_R1.fastq.gz" ] && [ ! -f "pbmc_data.tar.gz" ]; then
    echo ""
    echo "🇺🇸 Trying NCBI SRA (requires SRA toolkit)..."
    
    # Check if SRA toolkit is available
    if command -v fastq-dump &> /dev/null; then
        echo "📊 Downloading SRR8599150 (10X PBMC data)..."
        fastq-dump --split-files --gzip SRR8599150
        
        if [ -f "SRR8599150_1.fastq.gz" ] && [ -f "SRR8599150_2.fastq.gz" ]; then
            mv SRR8599150_1.fastq.gz pbmc_R1.fastq.gz
            mv SRR8599150_2.fastq.gz pbmc_R2.fastq.gz
            echo "✅ NCBI SRA download successful"
        fi
    else
        echo "❌ SRA toolkit not available"
    fi
fi

# Option 4: Generate synthetic test data
if [ ! -f "pbmc_R1.fastq.gz" ] && [ ! -f "pbmc_data.tar.gz" ]; then
    echo ""
    echo "🧪 Creating synthetic test data..."
    
    python3 << 'EOF'
import gzip
import random

print("🔬 Generating synthetic scRNA-seq data...")

# Valid 10X v3 barcodes (real ones from whitelist)
valid_barcodes = [
    "AAACATACAACTGC", "AAACATTGAGCTAC", "AAACATTGATCAGC", "AAACCGTGCTTCCG",
    "AAACCGTGTATGCG", "AAACGCACTGGTAC", "AAACGCTGACCAGT", "AAACGCTGGTTCTT",
    "AAACGCTGTAGCCA", "AAACGCTGTTTCTG", "AAACATACATTTCC", "AAACATTGCGGTAT",
    "AAACGAACATGTAC", "AAACGAAGATCACT", "AAACGCATCAGAGC", "AAACGCGAGACTAT"
]

# Gene sequences (realistic)
gene_sequences = [
    "ATGGCTGAGAAGGCTAAGGAGAAGCTGCTGGAGAAGGAGCTGCAGTTCAAGGCTGTGAAG",  # GAPDH-like
    "ATGAGTGACCTGAAGTGCCTGACCTGTGTGGAGTATGGCTTCAAGTGTGACCTGAAGTGC",  # β-globin-like  
    "ATGGAGCAGAAACTCATCTCTGAAGAGGATCTGAATATGCAGCTCCGTGTGGAGTATGGC",  # Immunoglobulin-like
    "ATGAAGTTCGTGAAGCTGGTGGAGAAGGAGCTGAACTTCAAGGAGGTGAAGCTGCTGAAG",  # Histone-like
    "ATGGCTCTGAAGGCTAAGGAGAAGCTGCTGGAGAAGGAGCTGCAGTTCAAGCTGGTGAAG"   # Actin-like
]

num_reads = 5000

with gzip.open('pbmc_R1.fastq.gz', 'wt') as r1, \
     gzip.open('pbmc_R2.fastq.gz', 'wt') as r2:
    
    for i in range(num_reads):
        # R1: Cell barcode + UMI
        barcode = random.choice(valid_barcodes)
        umi = ''.join(random.choices('ACGT', k=10))
        r1_seq = barcode + umi
        
        # R2: Gene sequence with variations
        base_seq = random.choice(gene_sequences)
        seq_len = random.randint(50, 75)
        if len(base_seq) >= seq_len:
            r2_seq = base_seq[:seq_len]
        else:
            r2_seq = base_seq + ''.join(random.choices('ACGT', k=seq_len-len(base_seq)))
        
        # Add some mutations (5% rate)
        if random.random() < 0.05:
            pos = random.randint(0, len(r2_seq)-1)
            r2_seq = r2_seq[:pos] + random.choice('ACGT') + r2_seq[pos+1:]
        
        # Write FASTQ entries
        r1.write(f'@read_{i:06d}/1\n{r1_seq}\n+\n{"I"*len(r1_seq)}\n')
        r2.write(f'@read_{i:06d}/2\n{r2_seq}\n+\n{"I"*len(r2_seq)}\n')

print(f"✅ Created synthetic data: pbmc_R1.fastq.gz and pbmc_R2.fastq.gz")
print(f"📊 {num_reads} read pairs with realistic single-cell format")
EOF
fi

# Verify what we have
echo ""
echo "📋 Data Summary"
echo "==============="

if [ -f "pbmc_data.tar.gz" ]; then
    echo "✅ 10X Official data downloaded"
    echo "📦 Archive: pbmc_data.tar.gz"
    
    # Extract and find FASTQ files
    if [ ! -f "pbmc_R1.fastq.gz" ]; then
        echo "📂 Extracting and organizing files..."
        find . -name "*R1*.fastq.gz" -exec cp {} pbmc_R1.fastq.gz \; 2>/dev/null || true
        find . -name "*R2*.fastq.gz" -exec cp {} pbmc_R2.fastq.gz \; 2>/dev/null || true
    fi
fi

if [ -f "pbmc_R1.fastq.gz" ] && [ -f "pbmc_R2.fastq.gz" ]; then
    echo "✅ Ready to upload:"
    echo "   📄 R1: pbmc_R1.fastq.gz ($(du -h pbmc_R1.fastq.gz | cut -f1))"
    echo "   📄 R2: pbmc_R2.fastq.gz ($(du -h pbmc_R2.fastq.gz | cut -f1))"
    
    # Count reads
    r1_reads=$(zcat pbmc_R1.fastq.gz | wc -l | awk '{print $1/4}')
    r2_reads=$(zcat pbmc_R2.fastq.gz | wc -l | awk '{print $1/4}')
    echo "   📊 Read pairs: R1=$r1_reads, R2=$r2_reads"
    
    # Check first read format
    echo "   🔍 Sample format check:"
    echo "   R1 (first read): $(zcat pbmc_R1.fastq.gz | head -2 | tail -1)"
    echo "   R2 (first read): $(zcat pbmc_R2.fastq.gz | head -2 | tail -1)"
    
else
    echo "❌ No suitable data files found"
    echo "Please check network connection or try manual download"
fi

echo ""
echo "🚀 Next Steps:"
echo "1. Go to your RNA-seq upload interface"
echo "2. Select 'Single-cell RNA-seq' as dataset type"  
echo "3. Upload both pbmc_R1.fastq.gz and pbmc_R2.fastq.gz"
echo "4. Watch the pipeline process automatically!"
echo ""
echo "🔗 Files location: $(pwd)/"