import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiUpload, FiFile, FiInfo } from 'react-icons/fi';
import Sidebar from '../../components/Sidebar';
import { createRNASeqDataset } from '../../api/rnaseqApi';

const RNASeqUpload = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    organism: 'human',
    analysis_type: 'differential',
  });
  const [countsFile, setCountsFile] = useState<File | null>(null);
  const [metadataFile, setMetadataFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'counts' | 'metadata') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'counts') {
        setCountsFile(file);
      } else {
        setMetadataFile(file);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!countsFile) {
      toast.error('Please upload a counts file');
      return;
    }

    setUploading(true);
    
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('description', formData.description);
      data.append('organism', formData.organism);
      data.append('analysis_type', formData.analysis_type);
      data.append('counts_file', countsFile);
      
      if (metadataFile) {
        data.append('metadata_file', metadataFile);
      }

      const response = await createRNASeqDataset(data);
      toast.success('Dataset uploaded successfully! Analysis will begin shortly.');
      navigate(`/rnaseq/dataset/${response.data.id}`);
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
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">📤 Upload RNA-seq Dataset</h1>
            <p className="text-gray-600 mt-2">Upload your gene expression data for analysis</p>
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
                      placeholder="e.g., Treatment vs Control"
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
                      placeholder="Describe your experiment..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <option value="pathway">Pathway Analysis</option>
                        <option value="clustering">Clustering Analysis</option>
                        <option value="volcano">Volcano Plot</option>
                        <option value="heatmap">Heatmap</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* File Uploads */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900">Data Files</h2>
                  
                  {/* Counts File */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Counts File * <span className="text-gray-500">(CSV format)</span>
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <input
                        type="file"
                        accept=".csv,.txt,.tsv"
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
                              <p className="text-xs text-gray-500">CSV, TSV, or TXT files</p>
                            </>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Metadata File */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Metadata File <span className="text-gray-500">(Optional, CSV format)</span>
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
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
                    disabled={uploading || !countsFile}
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
                        Upload & Analyze
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
                  <h3 className="font-semibold text-blue-900">File Format Requirements</h3>
                </div>
                <div className="space-y-3 text-sm text-blue-800">
                  <div>
                    <p className="font-medium">Counts File:</p>
                    <p>• First column: Gene IDs</p>
                    <p>• Subsequent columns: Sample counts</p>
                    <p>• CSV format with headers</p>
                  </div>
                  <div>
                    <p className="font-medium">Metadata File (Optional):</p>
                    <p>• Sample information</p>
                    <p>• Condition labels</p>
                    <p>• Batch information</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h3 className="font-semibold text-green-900 mb-3">What happens next?</h3>
                <div className="space-y-2 text-sm text-green-800">
                  <p>1. 📊 Data validation and preprocessing</p>
                  <p>2. 🧮 Statistical analysis</p>
                  <p>3. 📈 Visualization generation</p>
                  <p>4. 📋 Results summary</p>
                  <p>5. 🎯 Ready for presentation creation</p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <h3 className="font-semibold text-yellow-900 mb-3">💡 Tips</h3>
                <div className="space-y-2 text-sm text-yellow-800">
                  <p>• Ensure gene IDs are consistent</p>
                  <p>• Remove low-count genes beforehand</p>
                  <p>• Include biological replicates</p>
                  <p>• Use standard file formats</p>
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