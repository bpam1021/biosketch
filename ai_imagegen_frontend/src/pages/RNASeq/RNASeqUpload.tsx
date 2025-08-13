import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiUpload, FiFile, FiInfo, FiPlay, FiDatabase, FiX, FiPlus, FiTrash2 } from 'react-icons/fi';
import Sidebar from '../../components/Sidebar';
import { createRNASeqDataset, createMultiSampleDataset } from '../../api/rnaseqApi';
import { FastqFilePair } from '../../types/RNASeq';

const RNASeqUpload = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    organism: 'human',
    dataset_type: 'bulk',
    analysis_type: 'differential',
    start_from_upstream: true,
    is_multi_sample: false,
  });
  
  // Single sample files
  const [fastqR1File, setFastqR1File] = useState<File | null>(null);
  const [fastqR2File, setFastqR2File] = useState<File | null>(null);
  const [countsFile, setCountsFile] = useState<File | null>(null);
  const [metadataFile, setMetadataFile] = useState<File | null>(null);
  
  // Multi-sample files
  const [sampleSheetFile, setSampleSheetFile] = useState<File | null>(null);
  const [fastqPairs, setFastqPairs] = useState<FastqFilePair[]>([]);
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

  const handleSampleSheetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSampleSheetFile(file);
  };

  const addFastqPair = () => {
    const newPair: FastqFilePair = {
      id: Date.now().toString(),
      sample_name: `Sample_${fastqPairs.length + 1}`,
      r1_file: null as any,
      r2_file: null as any,
      condition: '',
      batch: '',
      replicate: 1,
    };
    setFastqPairs([...fastqPairs, newPair]);
  };

  const removeFastqPair = (id: string) => {
    setFastqPairs(pairs => pairs.filter(pair => pair.id !== id));
  };

  const updateFastqPair = (id: string, field: keyof FastqFilePair, value: any) => {
    setFastqPairs(pairs => pairs.map(pair => 
      pair.id === id ? { ...pair, [field]: value } : pair
    ));
  };

  const handlePairFileUpload = (pairId: string, fileType: 'r1' | 'r2', file: File) => {
    updateFastqPair(pairId, `${fileType}_file` as keyof FastqFilePair, file);
  };

  const handleQualityThresholdChange = (key: string, value: number) => {
    setQualityThresholds(prev => ({ ...prev, [key]: value }));
  };

  const validateForm = () => {
    if (formData.is_multi_sample) {
      if (formData.start_from_upstream && fastqPairs.length === 0) {
        toast.error('Please add at least one FASTQ file pair for multi-sample analysis');
        return false;
      }
      
      // Validate all pairs have required files
      for (const pair of fastqPairs) {
        if (!pair.sample_name.trim()) {
          toast.error('Please provide sample names for all FASTQ pairs');
          return false;
        }
        if (formData.start_from_upstream && (!pair.r1_file || !pair.r2_file)) {
          toast.error(`Please upload both R1 and R2 files for ${pair.sample_name}`);
          return false;
        }
      }
    } else if (formData.start_from_upstream) {
      if (!fastqR1File || !fastqR2File) {
        toast.error('Please upload both FASTQ files for upstream processing');
        return false;
      }
    } else {
      if (!countsFile) {
        toast.error('Please upload a counts file for downstream analysis');
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
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value.toString());
      });
      
      // Add quality thresholds
      data.append('quality_thresholds', JSON.stringify(qualityThresholds));
      
      if (formData.is_multi_sample) {
        // Multi-sample upload
        if (sampleSheetFile) data.append('sample_sheet', sampleSheetFile);
        
        // Add FASTQ pairs data
        data.append('fastq_pairs_count', fastqPairs.length.toString());
        fastqPairs.forEach((pair, index) => {
          data.append(`sample_${index}_name`, pair.sample_name);
          data.append(`sample_${index}_condition`, pair.condition || '');
          data.append(`sample_${index}_batch`, pair.batch || '');
          data.append(`sample_${index}_replicate`, pair.replicate?.toString() || '1');
          if (pair.r1_file) data.append(`sample_${index}_r1`, pair.r1_file);
          if (pair.r2_file) data.append(`sample_${index}_r2`, pair.r2_file);
        });
        
        const response = await createMultiSampleDataset(data);
        toast.success('Multi-sample dataset uploaded successfully! Processing will begin shortly.');
        navigate(`/rnaseq/dataset/${response.data.dataset_id}`);
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
      console.error('Upload error:', error);
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Analysis Type
                      </label>
                      <select
                        name="analysis_type"
                        value={formData.analysis_type}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="differential">Differential Expression</option>
                        <option value="clustering">Clustering & PCA</option>
                        <option value="pathway">Pathway Enrichment</option>
                        <option value="signature_correlation">Signature Correlation</option>
                        <option value="phenotype_correlation">Phenotype Correlation</option>
                        {formData.dataset_type === 'single_cell' && (
                          <>
                            <option value="cell_type_annotation">Cell Type Annotation</option>
                            <option value="pseudotime">Pseudotime Analysis</option>
                            <option value="cell_communication">Cell-Cell Communication</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>
                  
                  {/* Multi-sample and processing options */}
                  <div className="space-y-4">
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
                          ? "Run complete pipeline: QC → Trimming → Alignment → Quantification → Analysis"
                          : "Skip upstream processing and start directly with downstream analysis"
                        }
                      </p>
                    </div>
                  </div>
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

                {/* File Uploads */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900">Data Files</h2>
                  
                  {formData.is_multi_sample ? (
                    <>
                      {/* Sample Sheet (Optional for multi-sample) */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sample Sheet <span className="text-gray-500">(Optional - CSV format with sample information)</span>
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                          <input
                            type="file"
                            accept=".csv,.txt,.tsv"
                            onChange={handleSampleSheetChange}
                            className="hidden"
                            id="sample-sheet-file"
                          />
                          <label htmlFor="sample-sheet-file" className="cursor-pointer">
                            <FiUpload className="mx-auto h-8 w-8 text-gray-400" />
                            <div className="mt-2">
                              {sampleSheetFile ? (
                                <div className="flex items-center justify-center gap-2 text-green-600">
                                  <FiFile size={16} />
                                  <span className="font-medium">{sampleSheetFile.name}</span>
                                </div>
                              ) : (
                                <>
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium text-blue-600">Click to upload</span> sample sheet
                                  </p>
                                  <p className="text-xs text-gray-500">CSV, TSV, or TXT files</p>
                                </>
                              )}
                            </div>
                          </label>
                        </div>
                      </div>
                      
                      {/* Multiple FASTQ File Pairs */}
                      {formData.start_from_upstream && (
                        <div>
                          <div className="flex justify-between items-center mb-4">
                            <label className="block text-sm font-medium text-gray-700">
                              FASTQ File Pairs * <span className="text-gray-500">(R1 & R2 files for each sample)</span>
                            </label>
                            <button
                              type="button"
                              onClick={addFastqPair}
                              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium"
                            >
                              <FiPlus size={16} />
                              Add Sample Pair
                            </button>
                          </div>
                          
                          <div className="space-y-4 max-h-96 overflow-y-auto">
                            {fastqPairs.map((pair, index) => (
                              <div key={pair.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                <div className="flex justify-between items-center mb-3">
                                  <h4 className="font-medium text-gray-900">Sample Pair {index + 1}</h4>
                                  <button
                                    type="button"
                                    onClick={() => removeFastqPair(pair.id)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <FiTrash2 size={16} />
                                  </button>
                                </div>
                                
                                {/* Sample metadata */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                  <input
                                    type="text"
                                    placeholder="Sample name"
                                    value={pair.sample_name}
                                    onChange={(e) => updateFastqPair(pair.id, 'sample_name', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded text-sm"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Condition"
                                    value={pair.condition}
                                    onChange={(e) => updateFastqPair(pair.id, 'condition', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded text-sm"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Batch"
                                    value={pair.batch}
                                    onChange={(e) => updateFastqPair(pair.id, 'batch', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded text-sm"
                                  />
                                  <input
                                    type="number"
                                    placeholder="Replicate"
                                    value={pair.replicate}
                                    onChange={(e) => updateFastqPair(pair.id, 'replicate', parseInt(e.target.value))}
                                    className="px-3 py-2 border border-gray-300 rounded text-sm"
                                    min="1"
                                  />
                                </div>
                                
                                {/* File uploads */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">R1 File (Forward)</label>
                                    <input
                                      type="file"
                                      accept=".fastq,.fastq.gz,.fq,.fq.gz"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handlePairFileUpload(pair.id, 'r1', file);
                                      }}
                                      className="w-full text-sm"
                                    />
                                    {pair.r1_file && (
                                      <p className="text-xs text-green-600 mt-1">✓ {pair.r1_file.name}</p>
                                    )}
                                  </div>
                                  
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">R2 File (Reverse)</label>
                                    <input
                                      type="file"
                                      accept=".fastq,.fastq.gz,.fq,.fq.gz"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handlePairFileUpload(pair.id, 'r2', file);
                                      }}
                                      className="w-full text-sm"
                                    />
                                    {pair.r2_file && (
                                      <p className="text-xs text-green-600 mt-1">✓ {pair.r2_file.name}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                            
                            {fastqPairs.length === 0 && (
                              <div className="text-center py-8 text-gray-500">
                                <FiUpload className="mx-auto h-12 w-12 mb-2" />
                                <p>No FASTQ pairs added yet.</p>
                                <p className="text-sm">Click "Add Sample Pair" to get started.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : formData.start_from_upstream ? (
                    <>
                      {/* Single Sample FASTQ Files */}
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
                    <p className="font-medium">🔽 Downstream Steps:</p>
                    <p>• AI-Assisted Analysis</p>
                    <p>• Statistical Testing</p>
                    <p>• Pathway Enrichment</p>
                    <p>• Visualization</p>
                    <p>• Interpretation</p>
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
                <h3 className="font-semibold text-yellow-900 mb-3">📋 Multi-Sample Requirements</h3>
                <div className="space-y-3 text-sm text-yellow-800">
                  <div>
                    <p className="font-medium">FASTQ File Pairs:</p>
                    <p>• Each sample needs both R1 and R2 files</p>
                    <p>• Consistent naming convention recommended</p>
                    <p>• Add sample metadata for better analysis</p>
                  </div>
                  <div>
                    <p className="font-medium">Sample Sheet (Optional):</p>
                    <p>• CSV format with sample information</p>
                    <p>• Columns: sample_name, condition, batch, etc.</p>
                    <p>• Helps with automated metadata assignment</p>
                  </div>
                  <div>
                    <p className="font-medium">Processing Notes:</p>
                    <p>• Multi-sample analysis takes longer</p>
                    <p>• Real-time progress tracking available</p>
                    <p>• Batch effects automatically corrected</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                <h3 className="font-semibold text-purple-900 mb-3">🎯 Analysis Types</h3>
                <div className="space-y-2 text-sm text-purple-800">
                  <p><strong>Bulk RNA-seq:</strong></p>
                  <p>• Differential expression</p>
                  <p>• Sample clustering & PCA</p>
                  <p>• Pathway enrichment</p>
                  <p>• Signature correlation</p>
                  <p>• Phenotype correlation</p>
                  
                  <p className="mt-3"><strong>Single-cell RNA-seq:</strong></p>
                  <p>• Cell clustering & UMAP</p>
                  <p>• Cell type annotation</p>
                  <p>• Marker gene identification</p>
                  <p>• Pseudotime analysis</p>
                  <p>• Cell-cell communication</p>
                  
                  <p className="mt-3"><strong>Multi-sample Analysis:</strong></p>
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