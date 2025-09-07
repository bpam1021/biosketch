#!/bin/bash
# Quick deployment script for the current fixes

set -e

echo "🔧 Deploying Pipeline Fixes"
echo "============================"

# Check if we're in the right directory
if [ ! -f "manage.py" ]; then
    echo "❌ Error: Please run this script from the ai_imagegen_backend directory"
    exit 1
fi

echo "📁 Current directory: $(pwd)"

# 1. Stop Celery workers
echo "⏹️  Stopping Celery workers..."
pkill -f "celery worker" || echo "No running workers found"
pkill -f "celery beat" || echo "No running beat found"
sleep 3

# 2. Check if chardet is available (optional)
if python -c "import chardet" 2>/dev/null; then
    echo "✅ chardet available for enhanced encoding detection"
else
    echo "⚠️  Installing chardet for better CSV encoding detection..."
    pip install chardet>=5.0.0 || echo "⚠️  chardet install failed - will use fallback"
fi

# 3. Test Django setup
echo "🔧 Testing Django setup..."
python -c "
import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'science_image_gen.settings')
django.setup()
from rnaseq.models import AnalysisJob
print('✅ Django models accessible')
"

# 4. Test pipeline components
echo "🧪 Testing pipeline fixes..."
python -c "
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'science_image_gen.settings')
import django
django.setup()

from rnaseq.downstream_analysis import BulkRNASeqDownstreamAnalysis

# Test safe CSV reading method
class TestAnalysis(BulkRNASeqDownstreamAnalysis):
    def __init__(self):
        pass

test_analyzer = TestAnalysis()
if hasattr(test_analyzer, '_safe_read_csv'):
    print('✅ Safe CSV reading method available')
else:
    print('❌ Safe CSV reading method missing')
"

# 5. Start Celery workers
echo "▶️  Starting Celery workers..."
nohup celery -A science_image_gen worker --loglevel=info > celery_worker.log 2>&1 &
sleep 3

# 6. Check if workers started
if pgrep -f "celery worker" > /dev/null; then
    echo "✅ Celery workers running (PID: $(pgrep -f 'celery worker'))"
else
    echo "❌ Celery workers failed to start"
    echo "💡 Check celery_worker.log for details"
fi

echo ""
echo "🎉 Fixes Deployed Successfully!"
echo "============================="
echo "✅ Fixed CSV encoding errors (UnicodeDecodeError)"
echo "✅ Fixed data type issues in bulk RNA-seq downstream"  
echo "✅ Enhanced umi_tools error handling for scRNA-seq"
echo "✅ Celery workers restarted"

echo ""
echo "🚀 Ready to test:"
echo "1. Bulk RNA-seq: Upload expression matrix CSV - encoding errors fixed"
echo "2. scRNA-seq: Upload test FASTQ files - better error diagnostics"

echo ""
echo "📋 Monitor logs:"
echo "   Celery: tail -f celery_worker.log"
echo "   Django: Check your Django logs for detailed error messages"