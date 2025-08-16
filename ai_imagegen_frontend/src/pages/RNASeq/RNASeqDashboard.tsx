import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiPlus, FiEye, FiBarChart, FiFileText, FiTrash2, FiDownload, FiPlay, FiDatabase, FiCpu, FiActivity, FiUsers, FiArrowRight } from 'react-icons/fi';
import Sidebar from '../../components/Sidebar';
import { getRNASeqDatasets, deleteRNASeqDataset } from '../../api/rnaseqApi';
import { RNASeqDataset } from '../../types/RNASeq';
import ProgressIndicator from '../../components/RNASeq/ProgressIndicator';

const RNASeqDashboard = () => {
  const [datasets, setDatasets] = useState<RNASeqDataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'bulk' | 'single_cell'>('all');
  const [filterStage, setFilterStage] = useState<'all' | 'upstream' | 'downstream'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'processing' | 'failed'>('all');
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDatasets();
    
    // Set up auto-refresh for processing datasets
    const interval = setInterval(() => {
      const hasProcessing = datasets.some(d => 
        d.status.includes('processing') || d.status === 'pending'
      );
      if (hasProcessing) {
        fetchDatasets();
      }
    }, 10000); // Refresh every 10 seconds
    
    setRefreshInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);
  
  useEffect(() => {
    // Clear interval when no datasets are processing
    const hasProcessing = datasets.some(d => 
      d.status.includes('processing') || d.status === 'pending'
    );
    
    if (!hasProcessing && refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [datasets, refreshInterval]);

  const fetchDatasets = async () => {
    try {
      const response = await getRNASeqDatasets();
      setDatasets(response.data.results);
    } catch (error) {
      toast.error('Failed to load RNA-seq datasets');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dataset? This action cannot be undone.')) return;
    
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
      case 'processing_upstream': 
      case 'processing_downstream': return 'text-blue-600 bg-blue-100';
      case 'upstream_complete': return 'text-purple-600 bg-purple-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'processing_upstream': 
      case 'processing_downstream': return '⏳';
      case 'upstream_complete': return '🔄';
      case 'failed': return '❌';
      default: return '⏸️';
    }
  };

  const getDatasetTypeIcon = (type: string) => {
    return type === 'single_cell' ? '🔬' : '🧪';
  };

  const getPipelineStageIcon = (stage: string) => {
    return stage === 'upstream' ? '🔼' : '🔽';
  };

  const filteredDatasets = datasets.filter(dataset => {
    const typeMatch = filterType === 'all' || dataset.dataset_type === filterType;
    const stageMatch = filterStage === 'all' || dataset.selected_pipeline_stage === filterStage;
    const statusMatch = filterStatus === 'all' || 
      (filterStatus === 'processing' && (dataset.status.includes('processing') || dataset.status === 'pending')) ||
      dataset.status === filterStatus;
    return typeMatch && stageMatch && statusMatch;
  });

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
              <h1 className="text-3xl font-bold text-gray-900">🧬 RNA-seq Analysis Platform</h1>
              <p className="text-gray-600 mt-2">Comprehensive RNA sequencing analysis with AI assistance</p>
            </div>
            <button
              onClick={() => navigate('/rnaseq/upload')}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <FiPlus size={20} />
              New Analysis
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Type:</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="bulk">Bulk RNA-seq</option>
                  <option value="single_cell">Single-cell RNA-seq</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Pipeline:</label>
                <select
                  value={filterStage}
                  onChange={(e) => setFilterStage(e.target.value as any)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All Stages</option>
                  <option value="upstream">Upstream</option>
                  <option value="downstream">Downstream</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Status:</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="processing">Processing</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              
              <div className="ml-auto text-sm text-gray-500">
                {filteredDatasets.length} of {datasets.length} datasets
              </div>
            </div>
          </div>

          {/* Datasets Grid */}
          {filteredDatasets.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🧬</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {datasets.length === 0 ? 'No RNA-seq datasets yet' : 'No datasets match your filters'}
              </h3>
              <p className="text-gray-600 mb-6">
                {datasets.length === 0 
                  ? 'Upload your first dataset to get started with RNA sequencing analysis'
                  : 'Try adjusting your filters to see more datasets'
                }
              </p>
              {datasets.length === 0 && (
                <button
                  onClick={() => navigate('/rnaseq/upload')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
                >
                  Upload Your First Dataset
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDatasets.map((dataset) => (
                <div key={dataset.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{getDatasetTypeIcon(dataset.dataset_type)}</span>
                          <span className="text-sm">{getPipelineStageIcon(dataset.selected_pipeline_stage)}</span>
                          <h3 className="text-lg font-semibold text-gray-900 truncate">{dataset.name}</h3>
                          {dataset.is_multi_sample && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full flex items-center gap-1">
                              <FiUsers size={10} />
                              Multi
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {dataset.organism} • {dataset.dataset_type.replace('_', '-')} • {dataset.selected_pipeline_stage}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(dataset.status)}`}>
                        {getStatusIcon(dataset.status)} {dataset.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {dataset.description || 'No description provided'}
                    </p>

                    {/* Job Progress */}
                    {dataset.current_job && dataset.current_job.status === 'processing' && (
                      <div className="mb-4">
                        <ProgressIndicator job={dataset.current_job} showDetails={false} />
                      </div>
                    )}

                    {/* Analysis Info */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FiActivity className="text-blue-600" size={16} />
                        <span className="text-sm font-medium text-gray-700">
                          {dataset.selected_pipeline_stage === 'upstream' ? 'Full Pipeline' : 'Downstream Only'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div>Samples: {dataset.sample_count}</div>
                        <div>Results: {dataset.results_count}</div>
                        {dataset.dataset_type === 'single_cell' && (
                          <div>Clusters: {dataset.clusters_count}</div>
                        )}
                        <div>Pathways: {dataset.pathways_count}</div>
                      </div>
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
                            onClick={() => navigate(`/rnaseq/presentation/${dataset.id}`)}
                            className="flex items-center justify-center gap-1 bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                            title="Create Presentation"
                          >
                            <FiFileText size={16} />
                          </button>
                        </>
                      )}
                      
                      {dataset.status === 'upstream_complete' && (
                        <button
                          onClick={() => navigate(`/rnaseq/dataset/${dataset.id}`)}
                          className="flex items-center justify-center gap-1 bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                          title="Continue to Downstream"
                        >
                          <FiPlay size={16} />
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDelete(dataset.id)}
                        className="flex items-center justify-center gap-1 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        title="Delete Dataset"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>

                    {/* Processing Indicator */}
                    {(dataset.status.includes('processing') || dataset.status === 'pending') && (
                      <div className="mt-4 flex items-center gap-2 text-sm text-blue-600">
                        <FiCpu className="animate-pulse" size={16} />
                        <span>
                          {dataset.status === 'processing_upstream' && 'Running upstream pipeline...'}
                          {dataset.status === 'processing_downstream' && 'Performing downstream analysis...'}
                          {dataset.status === 'pending' && 'Queued for processing...'}
                          {dataset.is_multi_sample && ' (Multi-sample analysis)'}
                        </span>
                      </div>
                    )}

                    {/* Job Progress for Processing Datasets */}
                    {dataset.current_job && dataset.current_job.status === 'processing' && (
                      <div className="mt-4">
                        <div className="text-xs text-gray-500 mb-1">
                          {dataset.current_job.current_step_name}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div 
                            className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${dataset.current_job.progress_percentage}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Step {dataset.current_job.current_step}/{dataset.current_job.total_steps} • {dataset.current_job.progress_percentage}%
                        </div>
                      </div>
                    )}

                    {/* Upstream Complete Indicator */}
                    {dataset.status === 'upstream_complete' && (
                      <div className="mt-4 flex items-center gap-2 text-sm text-purple-600">
                        <FiDownload size={16} />
                        <span>Upstream complete - Ready for downstream analysis</span>
                      </div>
                    )}

                    {/* Created date */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        Created {new Date(dataset.created_at).toLocaleDateString()}
                        {dataset.current_job && dataset.current_job.duration_minutes > 0 && (
                          <span className="ml-2">• Processed in {dataset.current_job.duration_minutes} min</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Start Guide */}
          {datasets.length === 0 && (
            <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">🚀 Getting Started</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-center p-6 border border-gray-200 rounded-lg">
                  <FiPlay className="mx-auto h-12 w-12 text-blue-600 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Full Pipeline</h3>
                  <p className="text-gray-600 mb-4">
                    Start from FASTQ files and run complete upstream + downstream analysis
                  </p>
                  <button
                    onClick={() => navigate('/rnaseq/upload?stage=upstream')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    Upload FASTQ Files
                  </button>
                </div>
                
                <div className="text-center p-6 border border-gray-200 rounded-lg">
                  <FiDatabase className="mx-auto h-12 w-12 text-green-600 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Downstream Only</h3>
                  <p className="text-gray-600 mb-4">
                    Start from expression matrix and perform statistical analysis
                  </p>
                  <button
                    onClick={() => navigate('/rnaseq/upload?stage=downstream')}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    Upload Expression Matrix
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RNASeqDashboard;