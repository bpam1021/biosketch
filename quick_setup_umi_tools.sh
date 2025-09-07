#!/bin/bash
# ===== Quick Setup: Install umi_tools for Production Server =====
# This script quickly installs umi_tools to resolve the immediate RNA-seq processing issue

set -e

echo "🧬 Quick Setup: Installing umi_tools for RNA-seq processing"
echo "=========================================================="

# Check if we're in the correct environment
if [ -d ".venv" ]; then
    echo "📦 Activating Python virtual environment..."
    source .venv/bin/activate
    echo "✅ Virtual environment activated: $(which python)"
else
    echo "⚠️  No .venv directory found. Using system Python."
fi

# Install umi_tools
echo "🔧 Installing umi_tools..."
pip install umi_tools>=1.1.4

# Install additional required bioinformatics packages
echo "📊 Installing additional bioinformatics packages..."
pip install pysam>=0.21.0 biopython>=1.81

# Verify installation
echo "🔍 Verifying installation..."
if python -c "import umi_tools" 2>/dev/null; then
    echo "✅ umi_tools installed successfully"
    umi_tools --version
else
    echo "❌ umi_tools installation failed"
    exit 1
fi

if python -c "import pysam" 2>/dev/null; then
    echo "✅ pysam installed successfully"
else
    echo "❌ pysam installation failed"
fi

# Set environment variable if not already set
echo "🌍 Setting environment variables..."
if ! grep -q "UMI_TOOLS_PATH" ~/.bashrc; then
    echo 'export UMI_TOOLS_PATH="umi_tools"' >> ~/.bashrc
    echo "✅ Added UMI_TOOLS_PATH to ~/.bashrc"
fi

echo ""
echo "🎉 Quick setup completed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Restart your shell or run: source ~/.bashrc"
echo "2. Restart your Celery workers to pick up the new packages"
echo "3. Test your RNA-seq pipeline"
echo ""
echo "🔧 To restart Celery workers:"
echo "   ./stop_celery.sh && ./start_celery.sh"