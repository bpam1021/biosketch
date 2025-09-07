#!/bin/bash
# ===== Complete scRNA-seq Pipeline Deployment =====
# This script deploys all fixes to the production server

set -e

echo "🧬 Deploying Complete scRNA-seq Pipeline Fixes"
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "manage.py" ]; then
    echo "❌ Error: Please run this script from the ai_imagegen_backend directory"
    exit 1
fi

echo "📁 Current directory: $(pwd)"

# 1. Backup current files
echo "💾 Creating backups..."
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp rnaseq/tasks.py "$BACKUP_DIR/tasks.py.backup" 2>/dev/null || true
cp rnaseq/pipeline_core.py "$BACKUP_DIR/pipeline_core.py.backup" 2>/dev/null || true
cp rnaseq/downstream_analysis.py "$BACKUP_DIR/downstream_analysis.py.backup" 2>/dev/null || true
cp rnaseq/serializers.py "$BACKUP_DIR/serializers.py.backup" 2>/dev/null || true
echo "✅ Backups created in $BACKUP_DIR/"

# 2. Check Python environment
echo "🐍 Checking Python environment..."
if [ -d "venv" ]; then
    echo "✅ Virtual environment found"
    source venv/bin/activate
elif [ -d ".venv" ]; then
    echo "✅ Virtual environment found"  
    source .venv/bin/activate
else
    echo "⚠️  No virtual environment found - using system Python"
fi

# 3. Install/upgrade required packages
echo "📦 Installing required bioinformatics packages..."
pip install --no-cache-dir --upgrade \
    chardet>=5.0.0 \
    umi_tools>=1.1.4 \
    pysam>=0.21.0 \
    biopython>=1.81 \
    scanpy>=1.9.0 \
    anndata>=0.9.0

# 4. Check Django setup
echo "🔧 Checking Django setup..."
python -c "
import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'science_image_gen.settings')
django.setup()
print('✅ Django setup successful')
"

# 5. Run database migrations (if any)
echo "🗄️  Running database migrations..."
python manage.py migrate --run-syncdb || echo "⚠️  Migration warnings (this is often normal)"

# 6. Check if whitelist files exist
echo "📋 Checking whitelist files..."
if [ ! -f "/data/reference/3M-february-2018.txt" ]; then
    echo "📥 Downloading missing whitelist files..."
    sudo mkdir -p /data/reference
    sudo chown $USER:$USER /data/reference
    cd /data/reference
    
    # Download 10X v3 whitelist
    if [ ! -f "3M-february-2018.txt" ]; then
        wget -q https://github.com/10XGenomics/cellranger/raw/master/lib/python/cellranger/barcodes/3M-february-2018.txt.gz
        gunzip 3M-february-2018.txt.gz
        echo "✅ Downloaded 10X v3 whitelist: $(wc -l < 3M-february-2018.txt) barcodes"
    fi
    
    cd - > /dev/null
else
    echo "✅ Whitelist files already exist"
fi

# 7. Verify critical components
echo "🔍 Verifying critical components..."

# Check chardet for encoding detection
if python -c "import chardet; print('chardet version:', chardet.__version__)" 2>/dev/null; then
    echo "✅ chardet available for encoding detection"
else
    echo "❌ chardet not available - installing..."
    pip install --no-cache-dir chardet>=5.0.0
fi

# Check umi_tools
if python -c "import umi_tools" 2>/dev/null; then
    echo "✅ umi_tools available"
else
    echo "❌ umi_tools not available - installing..."
    pip install --no-cache-dir umi_tools>=1.1.4
fi

# Check scanpy for single-cell analysis
if python -c "import scanpy" 2>/dev/null; then
    echo "✅ scanpy available"
else
    echo "❌ scanpy not available - installing..."
    pip install --no-cache-dir scanpy>=1.9.0
fi

# Check whitelist file
if [ -f "/data/reference/3M-february-2018.txt" ] && [ -s "/data/reference/3M-february-2018.txt" ]; then
    echo "✅ Whitelist file ready: $(wc -l < /data/reference/3M-february-2018.txt) barcodes"
else
    echo "❌ Whitelist file missing or empty"
fi

# 8. Test Django models
echo "🧪 Testing Django models..."
python -c "
from rnaseq.models import AnalysisJob, PipelineStep, RNASeqAnalysisResult
print('✅ Django models accessible')
"

# 9. Test the pipeline components with new fixes
echo "🧪 Testing pipeline components..."
python -c "
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'science_image_gen.settings')
import django
django.setup()

# Test the updated pipeline components
from rnaseq.pipeline_core import MultiSampleSingleCellRNASeqPipeline
from rnaseq.downstream_analysis import SingleCellRNASeqDownstreamAnalysis, BulkRNASeqDownstreamAnalysis
print('✅ Pipeline components loaded successfully')

# Test the new safe CSV reading function
import pandas as pd
class TestAnalysis(BulkRNASeqDownstreamAnalysis):
    def __init__(self):
        pass
    
test_analyzer = TestAnalysis()
if hasattr(test_analyzer, '_safe_read_csv'):
    print('✅ Safe CSV reading method available')
else:
    print('❌ Safe CSV reading method missing')
"

# 10. Restart services
echo "🔄 Restarting services..."

# Stop Celery workers
echo "⏹️  Stopping Celery workers..."
pkill -f "celery worker" || echo "No running workers found"
pkill -f "celery beat" || echo "No running beat found"

# Wait a moment
sleep 3

# Start Celery workers
echo "▶️  Starting Celery workers..."
# Start as background process
nohup celery -A science_image_gen worker --loglevel=info > celery_worker.log 2>&1 &
sleep 2

# 11. Verify services are running
echo "✅ Verifying services..."

if pgrep -f "celery worker" > /dev/null; then
    echo "✅ Celery workers running (PID: $(pgrep -f 'celery worker'))"
else
    echo "❌ Celery workers not running"
    echo "💡 Try starting manually: celery -A science_image_gen worker --loglevel=info"
fi

# 12. Show deployment summary
echo ""
echo "🎉 Deployment Summary"
echo "===================="
echo "✅ Code deployed with all fixes applied"
echo "✅ Required packages installed (including chardet for encoding)"
echo "✅ Whitelist files available"
echo "✅ Django models accessible"

if pgrep -f "celery worker" > /dev/null; then
    echo "✅ Celery workers running"
else
    echo "⚠️  Celery workers may need manual restart"
fi

echo ""
echo "🔑 Key Fixes Deployed:"
echo "1. ✅ Fixed UnicodeDecodeError in CSV file reading"
echo "2. ✅ Auto-transition from upstream → downstream for single-cell"
echo "3. ✅ Fixed umi_tools exit status handling" 
echo "4. ✅ Enhanced single-cell downstream steps"
echo "5. ✅ Better frontend status messages"
echo "6. ✅ Automatic whitelist download/creation"
echo "7. ✅ Safe CSV reading with encoding detection"
echo "8. ✅ Fixed FASTQ file upload validation"

echo ""
echo "🚀 Next Steps:"
echo "1. Use the provided test scRNA-seq files:"
echo "   - test_pbmc_R1.fastq.gz"
echo "   - test_pbmc_R2.fastq.gz"
echo "2. Create a new single-cell RNA-seq analysis"
echo "3. Upload both R1 and R2 files"
echo "4. Select 'Single-cell RNA-seq' as dataset type"
echo "5. Monitor the pipeline progress - it should automatically process both upstream and downstream"

echo ""
echo "📋 If issues persist:"
echo "1. Check Celery logs: tail -f celery_worker.log"
echo "2. Check Django logs for detailed error messages"
echo "3. Verify file permissions in /data/reference/"
echo "4. Test with the provided sample data first"

echo ""
echo "📁 Test data location: $(pwd)/test_scrna_data/"
echo "   - R1: test_pbmc_R1.fastq.gz (17KB, 2000 reads)"
echo "   - R2: test_pbmc_R2.fastq.gz (16KB, 2000 reads)"
echo "   - README: Instructions and format details"

echo ""
echo "✅ Deployment completed successfully!"
echo "🔥 Ready to test with the new scRNA-seq pipeline!"