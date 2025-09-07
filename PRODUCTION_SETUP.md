# Production Server Setup for RNA-seq Processing

This guide provides step-by-step instructions to set up the required bioinformatics tools on your production server.

## 🚨 Immediate Fix (umi_tools installation)

To quickly resolve the current RNA-seq processing issue, run this on your production server:

```bash
# Navigate to your project directory
cd /path/to/biosketch/ai_imagegen_backend

# Step 1: Install umi_tools and fix packages
chmod +x ../quick_setup_umi_tools.sh
../quick_setup_umi_tools.sh

# Step 2: Download required whitelist files for single-cell processing
chmod +x ../download_whitelist_files.sh
../download_whitelist_files.sh

# Step 3: Update Python requirements
pip install -r requirements.txt

# Step 4: Restart Celery workers
./stop_celery.sh
./start_celery.sh
```

## 🔧 Complete Bioinformatics Setup

For full RNA-seq processing capabilities, run the comprehensive setup:

```bash
# Make the script executable
chmod +x ../production_setup_bioinformatics.sh

# Run the setup (requires sudo access)
../production_setup_bioinformatics.sh
```

## 📋 Required Tools Summary

### Python Packages (automatically installed via requirements.txt)
- ✅ `umi_tools` - UMI processing for single-cell RNA-seq
- ✅ `pysam` - Python interface for SAM/BAM files  
- ✅ `biopython` - Sequence analysis tools
- ✅ `cutadapt` - Adapter trimming
- ✅ `multiqc` - Analysis reports

### System Tools (via setup script)
- 🔬 `fastqc` - Quality control for sequencing data
- ⭐ `STAR` - RNA-seq alignment tool
- 🧰 `samtools` - SAM/BAM file manipulation
- ✂️ `trimmomatic` - Read trimming tool
- 📊 `rsem` - RNA-seq quantification
- 📱 `cellranger` - 10X Genomics single-cell processing (manual install)

## 🌍 Environment Variables

The setup automatically configures these environment variables in `/etc/profile.d/bioinformatics.sh`:

```bash
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
```

## 📁 Reference Data Setup

Create and populate the reference data directory:

```bash
# Create reference directory
sudo mkdir -p /data/reference
sudo chown $USER:$USER /data/reference

# Download reference genome (example for human GRCh38)
cd /data/reference

# Download genome FASTA
wget http://ftp.ebi.ac.uk/pub/databases/gencode/Gencode_human/release_44/GRCh38.primary_assembly.genome.fa.gz
gunzip GRCh38.primary_assembly.genome.fa.gz
mv GRCh38.primary_assembly.genome.fa genome.fa

# Download gene annotations  
wget http://ftp.ebi.ac.uk/pub/databases/gencode/Gencode_human/release_44/gencode.v44.primary_assembly.annotation.gtf.gz
gunzip gencode.v44.primary_assembly.annotation.gtf.gz
mv gencode.v44.primary_assembly.annotation.gtf genes.gtf

# Build STAR index
mkdir -p star_index
STAR --runMode genomeGenerate \
     --genomeDir star_index \
     --genomeFastaFiles genome.fa \
     --sjdbGTFfile genes.gtf \
     --runThreadN 8

# Build RSEM index
mkdir -p rsem_index
rsem-prepare-reference --gtf genes.gtf \
                       --star \
                       genome.fa \
                       rsem_index/rsem_ref
```

## 🔄 Service Restart Commands

After installation, restart your services:

```bash
# Restart Celery workers
cd /path/to/biosketch/ai_imagegen_backend
./stop_celery.sh
./start_celery.sh

# Restart Django (if using systemd)
sudo systemctl restart your-django-service

# Or restart gunicorn/uwsgi as appropriate
```

## ✅ Verification

Test that everything is working:

```bash
# Test tool availability
fastqc --version
STAR --version
samtools --version
umi_tools --version

# Test Python packages
python -c "import umi_tools; import pysam; print('All packages available')"

# Test RNA-seq pipeline by creating a test job in the web interface
```

## 🐛 Troubleshooting

### Common Issues:

1. **Permission denied**: Make sure scripts are executable (`chmod +x script.sh`)
2. **Command not found**: Source the environment (`source /etc/profile.d/bioinformatics.sh`)
3. **Import errors**: Make sure you're in the correct virtual environment
4. **Celery not picking up changes**: Always restart Celery workers after installing new packages

### Logs to check:
- Django logs: Check your Django log files
- Celery logs: Check Celery worker output
- System logs: `journalctl -u your-service-name`

## 📞 Support

If you encounter issues:

1. Check the verification section above
2. Review the logs mentioned in troubleshooting
3. Ensure all environment variables are set correctly
4. Make sure Celery workers are restarted after any package installation

---

**Note**: This setup assumes Ubuntu/Debian-based systems. For CentOS/RHEL, replace `apt-get` with `yum` or `dnf`.