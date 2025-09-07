#!/bin/bash
# ===== Download 10X Genomics Whitelist Files =====
# This script downloads the required barcode whitelist files for single-cell RNA-seq processing

set -e

echo "📱 Downloading 10X Genomics Barcode Whitelist Files"
echo "==================================================="

# Create reference directory
REF_DIR="/data/reference"
echo "📁 Creating reference directory: $REF_DIR"
sudo mkdir -p $REF_DIR
sudo chown $USER:$USER $REF_DIR

cd $REF_DIR

# Download 10X v3 whitelist (most common)
echo "📥 Downloading 10X Genomics v3 whitelist (3M barcodes)..."
if [ ! -f "3M-february-2018.txt" ]; then
    wget -q --show-progress "https://github.com/10XGenomics/cellranger/raw/master/lib/python/cellranger/barcodes/3M-february-2018.txt.gz"
    gunzip 3M-february-2018.txt.gz
    echo "✅ 10X v3 whitelist downloaded: $(wc -l < 3M-february-2018.txt) barcodes"
else
    echo "✅ 10X v3 whitelist already exists"
fi

# Download 10X v2 whitelist
echo "📥 Downloading 10X Genomics v2 whitelist (737K barcodes)..."
if [ ! -f "737K-august-2016.txt" ]; then
    wget -q --show-progress "https://github.com/10XGenomics/cellranger/raw/master/lib/python/cellranger/barcodes/737K-august-2016.txt"
    echo "✅ 10X v2 whitelist downloaded: $(wc -l < 737K-august-2016.txt) barcodes"
else
    echo "✅ 10X v2 whitelist already exists"
fi

# Set proper permissions
chmod 644 *.txt

# Verify files
echo ""
echo "🔍 Verifying downloaded files:"
echo "================================"

if [ -f "3M-february-2018.txt" ]; then
    echo "✅ 10X v3 whitelist: $(wc -l < 3M-february-2018.txt) barcodes"
    echo "   File size: $(du -h 3M-february-2018.txt | cut -f1)"
else
    echo "❌ 10X v3 whitelist: Missing"
fi

if [ -f "737K-august-2016.txt" ]; then
    echo "✅ 10X v2 whitelist: $(wc -l < 737K-august-2016.txt) barcodes"
    echo "   File size: $(du -h 737K-august-2016.txt | cut -f1)"
else
    echo "❌ 10X v2 whitelist: Missing"
fi

echo ""
echo "🎉 Whitelist download completed!"
echo ""
echo "📝 Files created:"
echo "   $REF_DIR/3M-february-2018.txt (10X v3 chemistry)"
echo "   $REF_DIR/737K-august-2016.txt (10X v2 chemistry)"
echo ""
echo "🚀 You can now restart your RNA-seq processing pipeline."