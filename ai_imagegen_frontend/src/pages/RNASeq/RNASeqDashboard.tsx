import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiPlus, FiEye, FiBarChart3, FiFileText, FiTrash2, FiDownload } from 'react-icons/fi';
import Sidebar from '../../components/Sidebar';
import { getRNASeqDatasets, deleteRNASeqDataset } from '../../api/rnaseqApi';
import { RNASeqDataset } from '../../types/RNASeq';

const RNASeqDashboard = () => {
  const [datasets, setDatasets] = useState<RNASeqDataset[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDatasets();
  }, []);

  const fetchDatasets = async () => {
    try {
      const response = await getRNASeqDatasets();
      setDatasets(response.data);
    } catch (error) {
      toast.error('Failed to load RNA-seq datasets');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dataset?')) return;
    
    try {
      await deleteRNASeqDataset(id);
      setDatasets(prev => prev.filter(d => d.id !== id));
      toast.success('Dataset deleted successfully');
    } catch (error) {
      toast.error('Failed to delete dataset');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'processing': return '⏳';
      case 'failed': return '❌';
      default: return '⏸️';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading RNA-seq datasets...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🧬 RNA-seq Analysis</h1>
              <p className="text-gray-600 mt-2">Analyze gene expression data and create presentations</p>
            </div>
            <button
              onClick={() => navigate('/rnaseq/upload')}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <FiPlus size={20} />
              New Analysis
            </button>
          </div>

          {/* Datasets Grid */}
          {datasets.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🧬</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No RNA-seq datasets yet</h3>
              <p className="text-gray-600 mb-6">Upload your first dataset to get started with gene expression analysis</p>
              <button
                onClick={() => navigate('/rnaseq/upload')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
              >
                Upload Dataset
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {datasets.map((dataset) => (
                <div key={dataset.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">{dataset.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{dataset.organism}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(dataset.status)}`}>
                        {getStatusIcon(dataset.status)} {dataset.status}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {dataset.description || 'No description provided'}
                    </p>

                    {/* Stats */}
                    <div className="flex justify-between text-sm text-gray-500 mb-4">
                      <span>Type: {dataset.analysis_type}</span>
                      <span>Results: {dataset.results_count}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/rnaseq/dataset/${dataset.id}`)}
                        className="flex-1 flex items-center justify-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        <FiEye size={16} />
                        View
                      </button>
                      
                      {dataset.status === 'completed' && (
                        <>
                          <button
                            onClick={() => navigate(`/rnaseq/visualize/${dataset.id}`)}
                            className="flex items-center justify-center gap-1 bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            <FiBarChart3 size={16} />
                          </button>
                          
                          <button
                            onClick={() => navigate(`/rnaseq/presentation/${dataset.id}`)}
                            className="flex items-center justify-center gap-1 bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            <FiFileText size={16} />
                          </button>
                        </>
                      )}
                      
                      <button
                        onClick={() => handleDelete(dataset.id)}
                        className="flex items-center justify-center gap-1 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>

                    {/* Created date */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        Created {new Date(dataset.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RNASeqDashboard;