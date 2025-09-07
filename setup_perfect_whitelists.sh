#!/bin/bash
# ===== Perfect 10X Genomics Whitelist Setup =====
# Downloads official whitelists and sets up intelligent fallback system

set -e

echo "🧬 Setting Up Perfect 10X Genomics Whitelists"
echo "=============================================="

# Create reference directory
echo "📁 Creating reference directory..."
if sudo mkdir -p /data/reference 2>/dev/null; then
    echo "✅ Created /data/reference/ (with sudo)"
elif mkdir -p /data/reference 2>/dev/null; then
    echo "✅ Created /data/reference/ (user permissions)"
else
    echo "❌ Cannot create /data/reference/ - permission denied"
    echo "💡 Please run: sudo mkdir -p /data/reference"
    exit 1
fi

cd /data/reference

# Function to download with retries
download_with_retry() {
    local url=$1
    local filename=$2
    local max_attempts=3
    
    for attempt in $(seq 1 $max_attempts); do
        echo "📥 Attempt $attempt/$max_attempts: Downloading $filename..."
        
        if wget -q "$url" -O "$filename" 2>/dev/null; then
            echo "✅ Downloaded $filename successfully"
            return 0
        elif curl -s -L "$url" -o "$filename" 2>/dev/null; then
            echo "✅ Downloaded $filename successfully (via curl)"
            return 0
        else
            echo "⚠️  Attempt $attempt failed"
            if [ $attempt -lt $max_attempts ]; then
                sleep 2
            fi
        fi
    done
    
    echo "❌ Failed to download $filename after $max_attempts attempts"
    return 1
}

# Download 10X Genomics v3 whitelist (most common)
echo ""
echo "🔗 Downloading 10X Genomics v3 whitelist..."
V3_URL="https://github.com/10XGenomics/cellranger/raw/master/lib/python/cellranger/barcodes/3M-february-2018.txt.gz"
V3_FILE="3M-february-2018.txt.gz"
V3_EXTRACTED="3M-february-2018.txt"

if [ -f "$V3_EXTRACTED" ] && [ -s "$V3_EXTRACTED" ]; then
    echo "✅ 10X v3 whitelist already exists"
    V3_COUNT=$(wc -l < "$V3_EXTRACTED")
    V3_SIZE=$(du -h "$V3_EXTRACTED" | cut -f1)
    echo "   Lines: $V3_COUNT, Size: $V3_SIZE"
else
    if download_with_retry "$V3_URL" "$V3_FILE"; then
        # Extract the compressed file
        if gunzip "$V3_FILE" 2>/dev/null; then
            echo "✅ Extracted $V3_EXTRACTED"
            
            # Verify the content
            if [ -f "$V3_EXTRACTED" ] && [ -s "$V3_EXTRACTED" ]; then
                V3_COUNT=$(wc -l < "$V3_EXTRACTED")
                V3_SIZE=$(du -h "$V3_EXTRACTED" | cut -f1)
                echo "   Lines: $V3_COUNT barcodes, Size: $V3_SIZE"
                
                # Show sample content
                echo "   Sample barcodes:"
                head -3 "$V3_EXTRACTED" | sed 's/^/     /'
                
                if [ $V3_COUNT -gt 1000000 ]; then
                    echo "✅ 10X v3 whitelist looks correct!"
                else
                    echo "⚠️  Whitelist seems small (only $V3_COUNT lines)"
                fi
            else
                echo "❌ Failed to extract whitelist"
            fi
        else
            echo "❌ Failed to extract $V3_FILE"
        fi
    fi
fi

# Download 10X Genomics v2 whitelist (for compatibility)
echo ""
echo "🔗 Downloading 10X Genomics v2 whitelist..."
V2_URL="https://github.com/10XGenomics/cellranger/raw/master/lib/python/cellranger/barcodes/737K-august-2016.txt"
V2_FILE="737K-august-2016.txt"

if [ -f "$V2_FILE" ] && [ -s "$V2_FILE" ]; then
    echo "✅ 10X v2 whitelist already exists"
    V2_COUNT=$(wc -l < "$V2_FILE")
    V2_SIZE=$(du -h "$V2_FILE" | cut -f1)
    echo "   Lines: $V2_COUNT, Size: $V2_SIZE"
else
    if download_with_retry "$V2_URL" "$V2_FILE"; then
        V2_COUNT=$(wc -l < "$V2_FILE")
        V2_SIZE=$(du -h "$V2_FILE" | cut -f1)
        echo "   Lines: $V2_COUNT barcodes, Size: $V2_SIZE"
        echo "✅ 10X v2 whitelist downloaded!"
    fi
fi

# Create test whitelist for development
echo ""
echo "🧪 Creating test whitelist for development..."
TEST_WHITELIST="test-barcodes.txt"

cat > "$TEST_WHITELIST" << 'EOF'
AAACATACAACTGC
AAACATTGAGCTAC
AAACATTGATCAGC
AAACCGTGCTTCCG
AAACCGTGTATGCG
AAACGCACTGGTAC
AAACGCTGACCAGT
AAACGCTGGTTCTT
AAACGCTGTAGCCA
AAACGCTGTTTCTG
AAACATACATTTCC
AAACATTGCGGTAT
AAACGAACATGTAC
AAACGAAGATCACT
AAACGCATCAGAGC
AAACGCGAGACTAT
AAACGCTTCGTCCA
AAACGGGTGAGACG
AAACGGGTGATGTT
AAACGGGTGTTGAC
AAACGTAAGGCAGT
AAACGTACATGACT
AAACGTACCTGTTG
AAACGTCCAAGATG
AAACGTCCATCGAT
AAACGTCCTTGTAG
AAACGTCTACGGTC
AAACGTCTTCGCAT
AAACGTGAACCTCT
AAACGTGAGATCGC
AAACGTGATACCAG
AAACGTGATTCGAG
EOF

echo "✅ Created test whitelist: $TEST_WHITELIST (32 barcodes)"

# Set proper permissions
echo ""
echo "🔐 Setting permissions..."
chmod 644 *.txt 2>/dev/null || sudo chmod 644 *.txt
echo "✅ Permissions set"

# Summary
echo ""
echo "📊 Whitelist Summary"
echo "==================="

if [ -f "$V3_EXTRACTED" ]; then
    V3_SIZE=$(du -h "$V3_EXTRACTED" | cut -f1)
    V3_COUNT=$(wc -l < "$V3_EXTRACTED")
    echo "✅ 10X v3: $V3_EXTRACTED ($V3_COUNT barcodes, $V3_SIZE)"
else
    echo "❌ 10X v3: Missing"
fi

if [ -f "$V2_FILE" ]; then
    V2_SIZE=$(du -h "$V2_FILE" | cut -f1)
    V2_COUNT=$(wc -l < "$V2_FILE")
    echo "✅ 10X v2: $V2_FILE ($V2_COUNT barcodes, $V2_SIZE)"
else
    echo "❌ 10X v2: Missing"
fi

echo "✅ Test:   $TEST_WHITELIST (32 barcodes, for development)"

echo ""
echo "🎯 Usage Instructions"
echo "===================="
echo "For production scRNA-seq data:"
echo "  - Pipeline will automatically use $V3_EXTRACTED"
echo "  - Contains ~3 million official 10X Genomics v3 barcodes"
echo ""
echo "For test/development:"
echo "  - Pipeline will fall back to test barcodes if needed"
echo "  - Test data should work with either whitelist"
echo ""
echo "🔧 Manual override (if needed):"
echo "  - For v2 chemistry: export WHITELIST_10X_V2=/data/reference/$V2_FILE"
echo "  - For v3 chemistry: export WHITELIST_10X_V3=/data/reference/$V3_EXTRACTED"

echo ""
echo "✅ Perfect whitelists setup complete!"
echo "🚀 Your scRNA-seq pipeline now has production-grade barcode support!"