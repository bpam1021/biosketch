import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiUpload, FiFile, FiInfo, FiPlay, FiDatabase } from 'react-icons/fi';
import Sidebar from '../../components/Sidebar';
import { createRNASeqDataset } from '../../api/rnaseqApi';

const RNASeqUpload = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    organism: 'human',
    dataset_type: 'bulk',
    start_from_upstream: true,
    is_multi_sample: false,
  });
  const [fastqR1File, setFastqR1File] = useState<File | null>(null);
  const [fastqR2File, setFastqR2File] = useState<File | null>(null);
  const [countsFile, setCountsFile] = useState<File | null>(null);
  const [metadataFile, setMetadataFile] = useState<File | null>(null);
  const [fastqFiles, setFastqFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [qualityThresholds, setQualityThresholds] = useState({
    min_reads: 1000000,
    max_mito_percent: 20,
    min_genes: 200,
    max_genes: 5000,
  });
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value 
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'fastq_r1' | 'fastq_r2' | 'counts' | 'metadata') => {
    const file = e.target.files?.[0];
    if (file) {
      switch (type) {
        case 'fastq_r1':
          setFastqR1File(file);
          break;
        case 'fastq_r2':
          setFastqR2File(file);
          break;
        case 'counts':
          setCountsFile(file);
          break;
        case 'metadata':
          setMetadataFile(file);
          break;
      }
    }
  };

  const handleMultipleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFastqFiles(files);
  };

  const handleQualityThresholdChange = (key: string, value: number) => {
    setQualityThresholds(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (formData.is_multi_sample) {
      if (formData.start_from_upstream && fastqFiles.length === 0) {
        toast.error('Please upload FASTQ files for multi-sample upstream processing');
        return;
      }
    } else if (formData.start_from_upstream) {
      if (!fastqR1File || !fastqR2File) {
        toast.error('Please upload both FASTQ files for upstream processing');
        return;
      }
    } else {
      if (!countsFile) {
        toast.error('Please upload a counts file for downstream analysis');
        return;
      }
    }

    setUploading(true);
    
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value.toString());
      });
      
      // Add quality thresholds
      data.append('quality_thresholds', JSON.stringify(qualityThresholds));
      
      if (formData.is_multi_sample) {
        // Multi-sample upload
        fastqFiles.forEach((file) => {
          data.append(`fastq_files`, file);
        });
        
        const response = await createRNASeqDataset(data);
        toast.success('Multi-sample dataset uploaded successfully! Processing will begin shortly.');
        navigate(`/rnaseq/dataset/${response.data.id}`);
      } else {
        // Single-sample upload
        if (fastqR1File) data.append('fastq_r1_file', fastqR1File);
        if (fastqR2File) data.append('fastq_r2_file', fastqR2File);
        if (countsFile) data.append('counts_file', countsFile);
        if (metadataFile) data.append('metadata_file', metadataFile);

        const response = await createRNASeqDataset(data);
        toast.success('Dataset uploaded successfully! Processing will begin shortly.');
        navigate(`/rnaseq/dataset/${response.data.id}`);
      }
    } catch (error) {
      toast.error('Failed to upload dataset');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">🧬 Upload RNA-seq Dataset</h1>
            <p className="text-gray-600 mt-2">Upload your RNA sequencing data for comprehensive analysis</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Upload Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900">Dataset Information</h2>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dataset Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Treatment vs Control Study"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe your experiment and research objectives..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dataset Type
                      </label>
                      <select
                        name="dataset_type"
                        value={formData.dataset_type}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="bulk">Bulk RNA-seq</option>
                        <option value="single_cell">Single-cell RNA-seq</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Organism
                      </label>
                      <select
                        name="organism"
                        value={formData.organism}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="human">Human</option>
                        <option value="mouse">Mouse</option>
                        <option value="rat">Rat</option>
                        <option value="drosophila">Drosophila</option>
                        <option value="zebrafish">Zebrafish</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Multi-sample option */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="is_multi_sample"
                      checked={formData.is_multi_sample}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-medium text-gray-900">Multi-sample Analysis</span>
                      <p className="text-sm text-gray-600">Process multiple samples together for comparative analysis</p>
                    </div>
                  </div>
                </div>

                {/* Processing Options */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900">Processing Options</h2>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-4 mb-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="start_from_upstream"
                          checked={formData.start_from_upstream}
                          onChange={() => setFormData(prev => ({ ...prev, start_from_upstream: true }))}
                          className="w-4 h-4 text-blue-600"
                        />
                        <FiPlay className="text-blue-600" />
                        <span className="font-medium">Start from FASTQ files (Full Pipeline)</span>
                      </label>
                      
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="start_from_upstream"
                          checked={!formData.start_from_upstream}
                          onChange={() => setFormData(prev => ({ ...prev, start_from_upstream: false }))}
                          className="w-4 h-4 text-blue-600"
                        />
                        <FiDatabase className="text-green-600" />
                        <span className="font-medium">Start from counts matrix (Downstream only)</span>
                      </label>
                    </div>
                    
                    <p className="text-sm text-gray-600">
                      {formData.start_from_upstream 
                        ? "Run complete pipeline: QC → Trimming → Alignment → Quantification → Comprehensive Analysis"
                        : "Skip upstream processing and start directly with comprehensive downstream analysis"
                      }
                    </p>
                  </div>
                  
                  {/* Quality Control Thresholds */}
                  {formData.start_from_upstream && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Quality Control Thresholds</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Minimum Reads per Sample
                          </label>
                          <input
                            type="number"
                            value={qualityThresholds.min_reads}
                            onChange={(e) => handleQualityThresholdChange('min_reads', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                        {formData.dataset_type === 'single_cell' && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Max Mitochondrial %
                              </label>
                              <input
                                type="number"
                                value={qualityThresholds.max_mito_percent}
                                onChange={(e) => handleQualityThresholdChange('max_mito_percent', parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Min Genes per Cell
                              </label>
                              <input
                                type="number"
                                value={qualityThresholds.min_genes}
                                onChange={(e) => handleQualityThresholdChange('min_genes', parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Max Genes per Cell
                              </label>
                              <input
                                type="number"
                                value={qualityThresholds.max_genes}
                                onChange={(e) => handleQualityThresholdChange('max_genes', parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* File Uploads */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900">Data Files</h2>
                  
                  {formData.is_multi_sample ? (
                    <>
                      {/* Multiple FASTQ Files */}
                      {formData.start_from_upstream && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            FASTQ Files * <span className="text-gray-500">(Multiple paired-end files for all samples)</span>
                          </label>
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                            <input
                              type="file"
                              accept=".fastq,.fastq.gz,.fq,.fq.gz"
                              multiple
                              onChange={handleMultipleFileChange}
                              className="hidden"
                              id="multi-fastq-files"
                            />
                            <label htmlFor="multi-fastq-files" className="cursor-pointer">
                              <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                              <div className="mt-4">
                                {fastqFiles.length > 0 ? (
                                  <div className="text-green-600">
                                    <FiFile size={16} className="mx-auto mb-2" />
                                    <span className="font-medium">{fastqFiles.length} files selected</span>
                                    <div className="text-xs mt-2 max-h-20 overflow-y-auto">
                                      {fastqFiles.map((file, idx) => (
                                        <div key={idx}>{file.name}</div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-sm text-gray-600">
                                      <span className="font-medium text-blue-600">Click to upload</span> multiple FASTQ files
                                    </p>
                                    <p className="text-xs text-gray-500">FASTQ or FASTQ.GZ files (paired-end)</p>
                                  </>
                                )}
                              </div>
                            </label>
                          </div>
                        </div>
                      )}
                    </>
                  ) : formData.start_from_upstream ? (
                    <>
                      {/* FASTQ Files */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            FASTQ R1 File * <span className="text-gray-500">(Forward reads)</span>
                          </label>
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                            <input
                              type="file"
                              accept=".fastq,.fastq.gz,.fq,.fq.gz"
                              onChange={(e) => handleFileChange(e, 'fastq_r1')}
                              className="hidden"
                              id="fastq-r1-file"
                            />
                            <label htmlFor="fastq-r1-file" className="cursor-pointer">
                              <FiUpload className="mx-auto h-8 w-8 text-gray-400" />
                              <div className="mt-2">
                                {fastqR1File ? (
                                  <div className="flex items-center justify-center gap-2 text-green-600">
                                    <FiFile size={16} />
                                    <span className="font-medium">{fastqR1File.name}</span>
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-sm text-gray-600">
                                      <span className="font-medium text-blue-600">Click to upload</span> R1 reads
                                    </p>
                                    <p className="text-xs text-gray-500">FASTQ or FASTQ.GZ files</p>
                                  </>
                                )}
                              </div>
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            FASTQ R2 File * <span className="text-gray-500">(Reverse reads)</span>
                          </label>
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                            <input
                              type="file"
                              accept=".fastq,.fastq.gz,.fq,.fq.gz"
                              onChange={(e) => handleFileChange(e, 'fastq_r2')}
                              className="hidden"
                              id="fastq-r2-file"
                            />
                            <label htmlFor="fastq-r2-file" className="cursor-pointer">
                              <FiUpload className="mx-auto h-8 w-8 text-gray-400" />
                              <div className="mt-2">
                                {fastqR2File ? (
                                  <div className="flex items-center justify-center gap-2 text-green-600">
                                    <FiFile size={16} />
                                    <span className="font-medium">{fastqR2File.name}</span>
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-sm text-gray-600">
                                      <span className="font-medium text-blue-600">Click to upload</span> R2 reads
                                    </p>
                                    <p className="text-xs text-gray-500">FASTQ or FASTQ.GZ files</p>
                                  </>
                                )}
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Counts File */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Counts Matrix File * <span className="text-gray-500">(Gene expression counts)</span>
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                          <input
                            type="file"
                            accept=".csv,.txt,.tsv,.h5,.h5ad"
                            onChange={(e) => handleFileChange(e, 'counts')}
                            className="hidden"
                            id="counts-file"
                          />
                          <label htmlFor="counts-file" className="cursor-pointer">
                            <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="mt-4">
                              {countsFile ? (
                                <div className="flex items-center justify-center gap-2 text-green-600">
                                  <FiFile size={16} />
                                  <span className="font-medium">{countsFile.name}</span>
                                </div>
                              ) : (
                                <>
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                                  </p>
                                  <p className="text-xs text-gray-500">CSV, TSV, TXT, H5, or H5AD files</p>
                                </>
                              )}
                            </div>
                          </label>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Metadata File (Optional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Metadata File <span className="text-gray-500">(Optional - Sample information)</span>
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                      <input
                        type="file"
                        accept=".csv,.txt,.tsv"
                        onChange={(e) => handleFileChange(e, 'metadata')}
                        className="hidden"
                        id="metadata-file"
                      />
                      <label htmlFor="metadata-file" className="cursor-pointer">
                        <FiUpload className="mx-auto h-8 w-8 text-gray-400" />
                        <div className="mt-2">
                          {metadataFile ? (
                            <div className="flex items-center justify-center gap-2 text-green-600">
                              <FiFile size={16} />
                              <span className="font-medium">{metadataFile.name}</span>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium text-blue-600">Click to upload</span> sample metadata
                              </p>
                              <p className="text-xs text-gray-500">CSV, TSV, or TXT files</p>
                            </>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => navigate('/rnaseq')}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <FiUpload size={16} />
                        {formData.is_multi_sample ? 'Upload Multi-Sample Dataset' : 'Upload & Start Analysis'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Help Panel */}
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FiInfo className="text-blue-600" size={20} />
                  <h3 className="font-semibold text-blue-900">Pipeline Overview</h3>
                </div>
                <div className="space-y-3 text-sm text-blue-800">
                  <div>
                    <p className="font-medium">🔼 Upstream Steps:</p>
                    <p>• Quality Control (FastQC)</p>
                    <p>• Read Trimming (Trimmomatic)</p>
                    <p>• Alignment (STAR)</p>
                    <p>• Quantification (RSEM)</p>
                    <p>• Metadata Generation</p>
                  </div>
                  <div>
                    <p className="font-medium">🔽 Comprehensive Analysis:</p>
                    <p>• Differential Expression Analysis</p>
                    <p>• Clustering & PCA Analysis</p>
                    <p>• Pathway Enrichment Analysis</p>
                    <p>• AI-Assisted Interpretation</p>
                    <p>• Advanced Visualizations</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h3 className="font-semibold text-green-900 mb-3">🤖 AI Features</h3>
                <div className="space-y-2 text-sm text-green-800">
                  <p>• Hypothesis generation and testing</p>
                  <p>• Result interpretation and insights</p>
                  <p>• Gene signature suggestions</p>
                  <p>• Pathway analysis guidance</p>
                  <p>• Cell type annotation (scRNA-seq)</p>
                  <p>• Natural language reports</p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <h3 className="font-semibold text-yellow-900 mb-3">📋 File Requirements</h3>
                <div className="space-y-3 text-sm text-yellow-800">
                  <div>
                    <p className="font-medium">FASTQ Files:</p>
                    <p>• Paired-end sequencing data</p>
                    <p>• Gzipped or uncompressed</p>
                    <p>• Quality scores in Phred+33 format</p>
                  </div>
                  <div>
                    <p className="font-medium">Counts Matrix:</p>
                    <p>• Genes as rows, samples as columns</p>
                    <p>• Raw or normalized counts</p>
                    <p>• CSV, TSV, or H5 format</p>
                  </div>
                  <div>
                    <p className="font-medium">Metadata:</p>
                    <p>• Sample information and conditions</p>
                    <p>• Phenotype data for correlation</p>
                    <p>• Batch and technical variables</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                <h3 className="font-semibold text-purple-900 mb-3">🎯 Comprehensive Analysis</h3>
                <div className="space-y-2 text-sm text-purple-800">
                  <p><strong>All analyses are performed automatically:</strong></p>
                  <p>• Differential expression testing</p>
                  <p>• Sample clustering & PCA</p>
                  <p>• Pathway enrichment analysis</p>
                  <p>• Gene signature correlation</p>
                  <p>• Quality control metrics</p>
                  
                  <p className="mt-3"><strong>Single-cell specific:</strong></p>
                  <p>• Cell clustering & UMAP</p>
                  <p>• Cell type annotation</p>
                  <p>• Marker gene identification</p>
                  <p>• Pseudotime analysis</p>
                  <p>• Cell-cell communication</p>
                  
                  <p className="mt-3"><strong>Multi-sample features:</strong></p>
                  <p>• Batch effect correction</p>
                  <p>• Cross-sample comparisons</p>
                  <p>• Meta-analysis capabilities</p>
                  <p>• Integrated visualizations</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RNASeqUpload;