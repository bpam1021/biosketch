import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiUpload, FiFile, FiInfo, FiPlay, FiDatabase, FiCpu, FiUsers, FiCheck } from 'react-icons/fi';
import Sidebar from '../../components/Sidebar';
import { createRNASeqJob, createMultiSampleJob } from '../../api/rnaseqApi';

const RNASeqUpload = () => {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    organism: 'human',
    dataset_type: 'bulk' as 'bulk' | 'single_cell',
    selected_pipeline_stage: searchParams.get('stage') || 'upstream' as 'upstream' | 'downstream',
    is_multi_sample: false,
    user_hypothesis: '',
    enable_ai_interpretation: true,
  });
  
  const [fastqFiles, setFastqFiles] = useState<File[]>([]);
  const [expressionMatrix, setExpressionMatrix] = useState<File | null>(null);
  const [metadataFile, setMetadataFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  // Auto-detect multi-sample based on URL params
  useEffect(() => {
    const stage = searchParams.get('stage');
    if (stage) {
      setFormData(prev => ({ ...prev, selected_pipeline_stage: stage as 'upstream' | 'downstream' }));
    }
  }, [searchParams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value 
    }));
  };

  const handleFastqFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFastqFiles(files);
    
    // Auto-detect if multi-sample based on file count
    if (files.length > 2) {
      setFormData(prev => ({ ...prev, is_multi_sample: true }));
    }
  };

  const handleExpressionMatrixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setExpressionMatrix(file);
  };

  const handleMetadataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setMetadataFile(file);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Please provide a dataset name');
      return false;
    }

    if (formData.selected_pipeline_stage === 'upstream') {
      if (fastqFiles.length < 2) {
        toast.error('Please upload at least 2 FASTQ files (R1 and R2) for upstream processing');
        return false;
      }
      if (fastqFiles.length % 2 !== 0) {
        toast.error('FASTQ files must be in pairs (R1 and R2 for each sample)');
        return false;
      }
    } else {
      if (!expressionMatrix) {
        toast.error('Please upload an expression matrix for downstream analysis');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setUploading(true);
    
    try {
      const data = new FormData();
      
      // Add basic job information
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value.toString());
      });
      
      // Add files based on pipeline stage
      if (formData.selected_pipeline_stage === 'upstream') {
        fastqFiles.forEach((file) => {
          data.append('fastq_files', file);
        });
      } else {
        if (expressionMatrix) {
          data.append('expression_matrix', expressionMatrix);
        }
      }
      
      if (metadataFile) {
        data.append('metadata_file', metadataFile);
      }

      let response;
      if (formData.is_multi_sample) {
        response = await createMultiSampleJob(data);
      } else {
        response = await createRNASeqJob(data);
      }
      
      const jobId = response.data.id;
      
      toast.success('Analysis job created successfully! Processing will begin shortly.');
      navigate(`/rnaseq/job/${jobId}`);
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to create analysis job';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const getUpstreamSteps = () => {
    if (formData.dataset_type === 'bulk') {
      return [
        'Quality Control (FastQC)',
        'Read Trimming (Trimmomatic)', 
        'Genome Alignment (STAR)',
        'Gene Quantification (RSEM/featureCounts)',
        'Expression Matrix Generation'
      ];
    } else {
      return [
        'Barcode Processing (Cell Ranger)',
        'Quality Control & Cell Filtering',
        'UMI Counting & Deduplication', 
        'Cell-Gene Matrix Generation',
        'Initial Quality Metrics'
      ];
    }
  };

  const getDownstreamOptions = () => {
    if (formData.dataset_type === 'bulk') {
      return [
        'Differential Expression Analysis',
        'Sample Clustering & PCA',
        'Pathway Enrichment Analysis',
        'Gene Set Enrichment Analysis'
      ];
    } else {
      return [
        'Cell Clustering & UMAP/t-SNE',
        'Cell Type Annotation',
        'Differential Expression (between clusters)',
        'Trajectory Analysis',
        'Marker Gene Discovery'
      ];
    }
  };

  const getProcessingTime = () => {
    const baseTime = formData.dataset_type === 'bulk' ? 
      (formData.selected_pipeline_stage === 'upstream' ? '30-120 min' : '10-30 min') :
      (formData.selected_pipeline_stage === 'upstream' ? '45-180 min' : '15-45 min');
    
    return formData.is_multi_sample ? 
      `${baseTime} (longer for multi-sample)` : baseTime;
  };

  const getSamplePairCount = () => {
    return Math.floor(fastqFiles.length / 2);
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">🧬 Create RNA-seq Analysis</h1>
            <p className="text-gray-600 mt-2">Upload your RNA sequencing data for comprehensive analysis with AI assistance</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Upload Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900">Analysis Information</h2>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Analysis Name *
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Research Hypothesis (Optional)
                    </label>
                    <textarea
                      name="user_hypothesis"
                      value={formData.user_hypothesis}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="What biological question are you trying to answer? This helps AI provide better insights..."
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
                </div>

                {/* Pipeline Stage Selection */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900">Analysis Pipeline</h2>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className={`flex items-start gap-3 cursor-pointer p-4 border-2 rounded-lg hover:border-blue-300 transition-colors ${
                        formData.selected_pipeline_stage === 'upstream' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}>
                        <input
                          type="radio"
                          name="selected_pipeline_stage"
                          value="upstream"
                          checked={formData.selected_pipeline_stage === 'upstream'}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-blue-600 mt-1"
                        />
                        <div>
                          <div className="flex items-center gap-2 font-medium text-gray-900">
                            <FiPlay className="text-blue-600" />
                            Full Pipeline (Upstream + Downstream)
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Start from FASTQ files and run complete analysis
                          </p>
                          <div className="mt-2 text-xs text-gray-500">
                            Estimated time: {formData.dataset_type === 'bulk' ? '30-120 min' : '45-180 min'}
                          </div>
                        </div>
                      </label>
                      
                      <label className={`flex items-start gap-3 cursor-pointer p-4 border-2 rounded-lg hover:border-blue-300 transition-colors ${
                        formData.selected_pipeline_stage === 'downstream' ? 'border-green-500 bg-green-50' : 'border-gray-200'
                      }`}>
                        <input
                          type="radio"
                          name="selected_pipeline_stage"
                          value="downstream"
                          checked={formData.selected_pipeline_stage === 'downstream'}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-green-600 mt-1"
                        />
                        <div>
                          <div className="flex items-center gap-2 font-medium text-gray-900">
                            <FiDatabase className="text-green-600" />
                            Downstream Only
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Start from expression matrix (skip preprocessing)
                          </p>
                          <div className="mt-2 text-xs text-gray-500">
                            Estimated time: {formData.dataset_type === 'bulk' ? '10-30 min' : '15-45 min'}
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* AI and Multi-sample options */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                    <input
                      type="checkbox"
                      name="enable_ai_interpretation"
                      checked={formData.enable_ai_interpretation}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">🤖 AI-Powered Analysis</span>
                      </div>
                      <p className="text-sm text-gray-600">Enable real-time AI interpretation and interactive Q&A during analysis</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
                    <input
                      type="checkbox"
                      name="is_multi_sample"
                      checked={formData.is_multi_sample}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <FiUsers className="text-purple-600" />
                        <span className="font-medium text-gray-900">Multi-sample Analysis</span>
                      </div>
                      <p className="text-sm text-gray-600">Process multiple samples together for comparative analysis</p>
                    </div>
                  </div>
                </div>

                {/* File Uploads */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900">Data Files</h2>
                  
                  {formData.selected_pipeline_stage === 'upstream' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        FASTQ Files * 
                        <span className="text-gray-500">
                          ({formData.is_multi_sample ? 'Multiple pairs for all samples' : 'R1 and R2 pair'})
                        </span>
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                        <input
                          type="file"
                          accept=".fastq,.fastq.gz,.fq,.fq.gz"
                          multiple
                          onChange={handleFastqFilesChange}
                          className="hidden"
                          id="fastq-files"
                        />
                        <label htmlFor="fastq-files" className="cursor-pointer">
                          <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="mt-4">
                            {fastqFiles.length > 0 ? (
                              <div className="text-green-600">
                                <FiCheck size={16} className="mx-auto mb-2" />
                                <span className="font-medium">{fastqFiles.length} files selected</span>
                                {formData.is_multi_sample && getSamplePairCount() > 0 && (
                                  <p className="text-sm mt-1">
                                    {getSamplePairCount()} sample pairs detected
                                  </p>
                                )}
                                <div className="text-xs mt-2 max-h-20 overflow-y-auto bg-white rounded p-2 border">
                                  {fastqFiles.slice(0, 6).map((file, idx) => (
                                    <div key={idx} className="flex justify-between">
                                      <span>{file.name}</span>
                                      <span className="text-gray-500">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                                    </div>
                                  ))}
                                  {fastqFiles.length > 6 && <div className="text-center text-gray-500">... and {fastqFiles.length - 6} more</div>}
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium text-blue-600">Click to upload</span> FASTQ files
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formData.is_multi_sample 
                                    ? 'Upload all R1 and R2 files for all samples'
                                    : 'Upload R1 and R2 files for your sample'
                                  }
                                </p>
                              </>
                            )}
                          </div>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Expression Matrix * <span className="text-gray-500">(Gene expression counts/TPM)</span>
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                        <input
                          type="file"
                          accept=".csv,.txt,.tsv,.h5,.h5ad"
                          onChange={handleExpressionMatrixChange}
                          className="hidden"
                          id="expression-matrix"
                        />
                        <label htmlFor="expression-matrix" className="cursor-pointer">
                          <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="mt-4">
                            {expressionMatrix ? (
                              <div className="flex items-center justify-center gap-2 text-green-600">
                                <FiCheck size={16} />
                                <span className="font-medium">{expressionMatrix.name}</span>
                                <span className="text-sm text-gray-500">
                                  ({(expressionMatrix.size / 1024 / 1024).toFixed(1)}MB)
                                </span>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium text-blue-600">Click to upload</span> expression matrix
                                </p>
                                <p className="text-xs text-gray-500">CSV, TSV, TXT, H5, or H5AD files</p>
                              </>
                            )}
                          </div>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Metadata File (Optional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sample Metadata <span className="text-gray-500">(Optional - Sample information and conditions)</span>
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                      <input
                        type="file"
                        accept=".csv,.txt,.tsv"
                        onChange={handleMetadataChange}
                        className="hidden"
                        id="metadata-file"
                      />
                      <label htmlFor="metadata-file" className="cursor-pointer">
                        <FiUpload className="mx-auto h-8 w-8 text-gray-400" />
                        <div className="mt-2">
                          {metadataFile ? (
                            <div className="flex items-center justify-center gap-2 text-green-600">
                              <FiCheck size={16} />
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
                        Creating Analysis Job...
                      </>
                    ) : (
                      <>
                        <FiUpload size={16} />
                        Create Analysis Job
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
                  <h3 className="font-semibold text-blue-900">
                    {formData.dataset_type === 'bulk' ? 'Bulk' : 'Single-cell'} RNA-seq Pipeline
                  </h3>
                </div>
                <div className="space-y-3 text-sm text-blue-800">
                  {formData.selected_pipeline_stage === 'upstream' && (
                    <div>
                      <p className="font-medium">🔼 Upstream Steps:</p>
                      {getUpstreamSteps().map((step, idx) => (
                        <p key={idx} className="ml-2">• {step}</p>
                      ))}
                    </div>
                  )}
                  <div>
                    <p className="font-medium">🔽 Downstream Analysis:</p>
                    {getDownstreamOptions().map((option, idx) => (
                      <p key={idx} className="ml-2">• {option}</p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <FiCpu className="text-green-600" />
                  Processing Timeline
                </h3>
                <div className="space-y-2 text-sm text-green-800">
                  <p>• Analysis: {getProcessingTime()}</p>
                  <p>• AI Analysis: 2-5 min</p>
                  <p>• Presentation: 3-8 min</p>
                  {formData.is_multi_sample && (
                    <p className="text-xs text-green-600 mt-2">
                      * Multi-sample analysis may take longer depending on sample count
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <h3 className="font-semibold text-yellow-900 mb-3">📋 File Requirements</h3>
                <div className="space-y-3 text-sm text-yellow-800">
                  {formData.selected_pipeline_stage === 'upstream' ? (
                    <div>
                      <p className="font-medium">FASTQ Files:</p>
                      <p>• Paired-end sequencing data (R1 & R2)</p>
                      <p>• Gzipped or uncompressed format</p>
                      <p>• Quality scores in Phred+33 format</p>
                      {formData.is_multi_sample && (
                        <p>• Multiple sample pairs supported</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium">Expression Matrix:</p>
                      <p>• Genes as rows, samples as columns</p>
                      <p>• Raw counts or normalized values</p>
                      <p>• CSV, TSV, or H5 format</p>
                    </div>
                  )}
                  <div>
                    <p className="font-medium">Metadata (Optional):</p>
                    <p>• Sample conditions and groups</p>
                    <p>• Phenotype data for analysis</p>
                    <p>• Batch and technical variables</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                <h3 className="font-semibold text-purple-900 mb-3">🤖 AI Features</h3>
                <div className="space-y-2 text-sm text-purple-800">
                  <p>• Real-time progress monitoring</p>
                  <p>• Interactive Q&A during analysis</p>
                  <p>• Automated result interpretation</p>
                  <p>• Biological insights and recommendations</p>
                  <p>• Scientific presentation generation</p>
                  <p>• Hypothesis-driven analysis</p>
                </div>
              </div>

              {/* Quick Start Guide */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-3">🚀 Quick Start</h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>1. Choose your analysis type and pipeline</p>
                  <p>2. Upload your data files</p>
                  <p>3. Provide research context (optional)</p>
                  <p>4. Create analysis job</p>
                  <p>5. Monitor progress in real-time</p>
                  <p>6. Explore results and chat with AI</p>
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