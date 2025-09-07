#!/bin/bash
# ===== Production Server Bioinformatics Tools Setup =====
# This script installs all required bioinformatics tools for RNA-seq processing
# Run this script on your production server to set up the required dependencies

set -e  # Exit on any error

echo "🧬 Setting up Bioinformatics Tools for RNA-seq Processing"
echo "========================================================="

# Check if we're running as root or with sudo
if [[ $EUID -eq 0 ]]; then
   echo "⚠️  Running as root - please run as regular user with sudo access"
   exit 1
fi

# Update system packages
echo "📦 Updating system packages..."
sudo apt-get update -y

# Install system dependencies
echo "🔧 Installing system dependencies..."
sudo apt-get install -y \
    build-essential \
    gcc \
    g++ \
    cmake \
    git \
    wget \
    curl \
    unzip \
    gzip \
    bzip2 \
    libz-dev \
    libbz2-dev \
    liblzma-dev \
    libcurl4-openssl-dev \
    libssl-dev \
    libncurses5-dev \
    libncursesw5-dev \
    libreadline-dev \
    libsqlite3-dev \
    libgdbm-dev \
    libdb5.3-dev \
    libbz2-dev \
    libexpat1-dev \
    liblzma-dev \
    tk-dev \
    libffi-dev

# Create bioinformatics tools directory
BIOTOOLS_DIR="/opt/bioinformatics"
echo "📁 Creating bioinformatics tools directory: $BIOTOOLS_DIR"
sudo mkdir -p $BIOTOOLS_DIR
sudo chown $USER:$USER $BIOTOOLS_DIR

cd $BIOTOOLS_DIR

# ===== Install FASTQC =====
echo "🔬 Installing FastQC..."
if ! command -v fastqc &> /dev/null; then
    wget https://www.bioinformatics.babraham.ac.uk/projects/fastqc/fastqc_v0.12.1.zip
    unzip fastqc_v0.12.1.zip
    chmod +x FastQC/fastqc
    sudo ln -sf $BIOTOOLS_DIR/FastQC/fastqc /usr/local/bin/fastqc
    rm fastqc_v0.12.1.zip
    echo "✅ FastQC installed successfully"
else
    echo "✅ FastQC already installed"
fi

# ===== Install STAR =====
echo "⭐ Installing STAR aligner..."
if ! command -v STAR &> /dev/null; then
    wget https://github.com/alexdobin/STAR/archive/2.7.11a.tar.gz
    tar -xzf 2.7.11a.tar.gz
    cd STAR-2.7.11a/source
    make STAR
    sudo ln -sf $BIOTOOLS_DIR/STAR-2.7.11a/source/STAR /usr/local/bin/STAR
    cd $BIOTOOLS_DIR
    rm 2.7.11a.tar.gz
    echo "✅ STAR installed successfully"
else
    echo "✅ STAR already installed"
fi

# ===== Install SAMtools =====
echo "🧰 Installing SAMtools..."
if ! command -v samtools &> /dev/null; then
    wget https://github.com/samtools/samtools/releases/download/1.19.2/samtools-1.19.2.tar.bz2
    tar -xjf samtools-1.19.2.tar.bz2
    cd samtools-1.19.2
    ./configure --prefix=$BIOTOOLS_DIR/samtools
    make
    make install
    sudo ln -sf $BIOTOOLS_DIR/samtools/bin/samtools /usr/local/bin/samtools
    cd $BIOTOOLS_DIR
    rm samtools-1.19.2.tar.bz2
    echo "✅ SAMtools installed successfully"
else
    echo "✅ SAMtools already installed"
fi

# ===== Install Trimmomatic =====
echo "✂️  Installing Trimmomatic..."
if [ ! -f "$BIOTOOLS_DIR/Trimmomatic-0.39/trimmomatic-0.39.jar" ]; then
    wget http://www.usadellab.org/cms/uploads/supplementary/Trimmomatic/Trimmomatic-0.39.zip
    unzip Trimmomatic-0.39.zip
    # Create wrapper script for trimmomatic
    cat > trimmomatic << 'EOF'
#!/bin/bash
java -jar /opt/bioinformatics/Trimmomatic-0.39/trimmomatic-0.39.jar "$@"
EOF
    chmod +x trimmomatic
    sudo cp trimmomatic /usr/local/bin/trimmomatic
    rm Trimmomatic-0.39.zip
    echo "✅ Trimmomatic installed successfully"
else
    echo "✅ Trimmomatic already installed"
fi

# ===== Install RSEM =====
echo "📊 Installing RSEM..."
if ! command -v rsem-calculate-expression &> /dev/null; then
    wget https://github.com/deweylab/RSEM/archive/v1.3.3.tar.gz
    tar -xzf v1.3.3.tar.gz
    cd RSEM-1.3.3
    make
    sudo ln -sf $BIOTOOLS_DIR/RSEM-1.3.3/rsem-calculate-expression /usr/local/bin/rsem-calculate-expression
    sudo ln -sf $BIOTOOLS_DIR/RSEM-1.3.3/rsem-prepare-reference /usr/local/bin/rsem-prepare-reference
    cd $BIOTOOLS_DIR
    rm v1.3.3.tar.gz
    echo "✅ RSEM installed successfully"
else
    echo "✅ RSEM already installed"
fi

# ===== Install Python packages for bioinformatics =====
echo "🐍 Installing Python bioinformatics packages..."

# Check if we're in a virtual environment
if [[ "$VIRTUAL_ENV" != "" ]]; then
    PIP_CMD="pip"
    echo "📦 Using virtual environment: $VIRTUAL_ENV"
else
    # Use system pip with user flag
    PIP_CMD="pip3"
    echo "📦 Installing to user directory (no virtual environment detected)"
fi

# Install umi_tools (critical for single-cell RNA-seq)
echo "🧬 Installing umi_tools..."
$PIP_CMD install umi_tools

# Install additional bioinformatics Python packages
echo "📊 Installing additional bioinformatics packages..."
$PIP_CMD install \
    pysam \
    biopython \
    cutadapt \
    multiqc

# ===== Install Cell Ranger (10X Genomics) =====
echo "📱 Setting up Cell Ranger (10X Genomics)..."
echo "⚠️  Cell Ranger requires manual download from 10X Genomics website"
echo "   Please download from: https://support.10xgenomics.com/single-cell-gene-expression/software/downloads/latest"
echo "   Then extract to $BIOTOOLS_DIR/cellranger-x.x.x/ and create symlink:"
echo "   sudo ln -sf $BIOTOOLS_DIR/cellranger-x.x.x/cellranger /usr/local/bin/cellranger"

# ===== Create Reference Data Directory =====
echo "📁 Creating reference data directory..."
REFERENCE_DIR="/data/reference"
sudo mkdir -p $REFERENCE_DIR
sudo chown $USER:$USER $REFERENCE_DIR

echo "📄 Reference genome files should be placed in: $REFERENCE_DIR"
echo "   Required files:"
echo "   - genome.fa (reference genome FASTA)"
echo "   - genes.gtf (gene annotations)"
echo "   - star_index/ (STAR genome index)"
echo "   - rsem_index/ (RSEM transcriptome index)"

# ===== Environment Variables Setup =====
echo "🌍 Setting up environment variables..."
cat > bioinformatics_env.sh << 'EOF'
# Bioinformatics Tools Environment Variables
export PATH="/usr/local/bin:$PATH"

# Tool paths
export FASTQC_PATH="fastqc"
export STAR_PATH="STAR"
export SAMTOOLS_PATH="samtools"
export TRIMMOMATIC_PATH="trimmomatic"
export RSEM_PATH="rsem-calculate-expression"
export UMI_TOOLS_PATH="umi_tools"
export CELLRANGER_PATH="cellranger"

# Reference data paths
export REFERENCE_GENOME_PATH="/data/reference/genome.fa"
export GTF_FILE_PATH="/data/reference/genes.gtf"
export STAR_INDEX_PATH="/data/reference/star_index"
export RSEM_INDEX_PATH="/data/reference/rsem_index/rsem_ref"
export CELLRANGER_INDEX_PATH="/data/reference/cellranger_index"
EOF

sudo cp bioinformatics_env.sh /etc/profile.d/bioinformatics.sh
echo "✅ Environment variables configured in /etc/profile.d/bioinformatics.sh"

# ===== Verification =====
echo ""
echo "🔍 Verifying installed tools..."
echo "=================================="

# Source the environment variables for verification
source /etc/profile.d/bioinformatics.sh

tools_status=()

# Check each tool
check_tool() {
    if command -v $1 &> /dev/null; then
        echo "✅ $1: $(which $1)"
        tools_status+=("✅ $1")
    else
        echo "❌ $1: NOT FOUND"
        tools_status+=("❌ $1")
    fi
}

check_tool fastqc
check_tool STAR
check_tool samtools
check_tool trimmomatic
check_tool rsem-calculate-expression
check_tool umi_tools
check_tool cellranger

# Check Python packages
echo ""
echo "🐍 Checking Python packages..."
python_packages=("umi_tools" "pysam" "biopython" "cutadapt" "multiqc")
for package in "${python_packages[@]}"; do
    if python3 -c "import $package" &> /dev/null; then
        echo "✅ Python package: $package"
        tools_status+=("✅ $package")
    else
        echo "❌ Python package: $package - NOT FOUND"
        tools_status+=("❌ $package")
    fi
done

# ===== Summary =====
echo ""
echo "📋 Installation Summary"
echo "======================="
for status in "${tools_status[@]}"; do
    echo "$status"
done

echo ""
echo "🎉 Bioinformatics tools setup completed!"
echo ""
echo "📝 Next Steps:"
echo "1. Restart your shell or run: source /etc/profile.d/bioinformatics.sh"
echo "2. Download reference genome files to /data/reference/"
echo "3. Download and install Cell Ranger manually"
echo "4. Test your RNA-seq pipeline"
echo ""
echo "🔗 Useful Links:"
echo "- STAR: https://github.com/alexdobin/STAR"
echo "- Cell Ranger: https://support.10xgenomics.com/single-cell-gene-expression/software/downloads/latest"
echo "- Reference genomes: https://www.gencodegenes.org/human/ or https://ftp.ensembl.org/pub/"