import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiDownload, FiBarChart, FiFileText, FiRefreshCw, FiEye, FiActivity, FiPlay, FiArrowRight } from 'react-icons/fi';
import Sidebar from '../../components/Sidebar';
import { 
  getRNASeqDataset, 
  getRNASeqResults, 
  getRNASeqAnalysisStatus,
  getRNASeqClusters,
  getRNASeqPathways,
  getAnalysisJobs,
  getAIChats,
  sendAIChat,
  continueToDownstream,
  downloadUpstreamResults
} from '../../api/rnaseqApi';
import { RNASeqDataset, RNASeqAnalysisResult, AnalysisJob, RNASeqCluster, RNASeqPathwayResult, RNASeqAIChat } from '../../types/RNASeq';

const RNASeqDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [dataset, setDataset] = useState<RNASeqDataset | null>(null);
  const [results, setResults] = useState<RNASeqAnalysisResult[]>([]);
  const [clusters, setClusters] = useState<RNASeqCluster[]>([]);
  const [pathways, setPathways] = useState<RNASeqPathwayResult[]>([]);
  const [jobs, setJobs] = useState<AnalysisJob[]>([]);
  const [aiChats, setAIChats] = useState<RNASeqAIChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'p_value' | 'log2_fold_change' | 'gene_name'>('p_value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showJobDetails, setShowJobDetails] = useState(true);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiMessage, setAIMessage] = useState('');
  const [sendingAI, setSendingAI] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showSignificantOnly, setShowSignificantOnly] = useState(false);
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      fetchDataset();
      fetchResults();
      fetchJobs();
      fetchAIChats();
      if (dataset?.dataset_type === 'single_cell') {
        fetchClusters();
      }
      fetchPathways();
    }
  }, [id, currentPage, sortBy, sortOrder, showSignificantOnly, selectedDatabase]);

  // Auto-refresh for processing datasets
  useEffect(() => {
    if (!autoRefresh || !dataset) return;
    
    if (dataset.status === 'processing_upstream' || dataset.status === 'processing_downstream') {
      const interval = setInterval(() => {
        fetchDataset();
        fetchJobs();
      }, 3000); // Refresh every 3 seconds

      return () => clearInterval(interval);
    }
  }, [dataset?.status, autoRefresh]);

  const fetchDataset = async () => {
    try {
      const response = await getRNASeqDataset(id!);
      setDataset(response.data);
    } catch (error) {
      toast.error('Failed to load dataset');
      navigate('/rnaseq');
    } finally {
      setLoading(false);
    }
  };

  const fetchResults = async () => {
    if (!id) return;
    
    setResultsLoading(true);
    try {
      const response = await getRNASeqResults(id, {
        page: currentPage,
        ordering: sortOrder === 'desc' ? `-${sortBy}` : sortBy,
        page_size: 20,
        significant_only: showSignificantOnly
      });
      setResults(response.data.results || response.data);
    } catch (error) {
      toast.error('Failed to load analysis results');
    } finally {
      setResultsLoading(false);
    }
  };

  const fetchClusters = async () => {
    if (!id) return;
    try {
      const response = await getRNASeqClusters(id);
      setClusters(response.data);
    } catch (error) {
      console.error('Failed to load clusters:', error);
    }
  };

  const fetchPathways = async () => {
    if (!id) return;
    try {
      const response = await getRNASeqPathways(id, {
        database: selectedDatabase || undefined
      });
      setPathways(response.data);
    } catch (error) {
      console.error('Failed to load pathways:', error);
    }
  };

  const fetchJobs = async () => {
    if (!id) return;
    try {
      const response = await getAnalysisJobs(id);
      setJobs(response.data);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    }
  };

  const fetchAIChats = async () => {
    if (!id) return;
    try {
      const response = await getAIChats(id);
      setAIChats(response.data);
    } catch (error) {
      console.error('Failed to load AI chats:', error);
    }
  };

  const handleSendAIMessage = async () => {
    if (!id || !aiMessage.trim()) return;
    
    setSendingAI(true);
    try {
      await sendAIChat({
        dataset_id: id,
        user_message: aiMessage,
        context_type: 'general'
      });
      setAIMessage('');
      toast.success('Message sent to AI assistant');
      setTimeout(fetchAIChats, 2000);
    } catch (error) {
      toast.error('Failed to send AI message');
    } finally {
      setSendingAI(false);
    }
  };

  const handleContinueToDownstream = async () => {
    if (!id) return;
    try {
      await continueToDownstream(id);
      toast.success('Ready for downstream analysis');
      fetchDataset();
    } catch (error) {
      toast.error('Failed to continue to downstream');
    }
  };

  const handleDownloadUpstream = async () => {
    if (!id) return;
    try {
      const response = await downloadUpstreamResults(id);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dataset?.name}_expression_matrix.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (error) {
      toast.error('Failed to download upstream results');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'processing_upstream': 
      case 'processing_downstream': return 'text-blue-600 bg-blue-100';
      case 'upstream_complete': return 'text-purple-600 bg-purple-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'waiting_for_input': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'processing_upstream': return 'Running quality control, trimming, alignment, and quantification...';
      case 'processing_downstream': return 'Performing statistical analysis and generating insights...';
      case 'upstream_complete': return 'Ready for downstream analysis configuration.';
      case 'completed': return 'Analysis completed successfully.';
      case 'failed': return 'Analysis failed. Please check logs and try again.';
      case 'waiting_for_input': return 'Waiting for your input to continue analysis.';
      default: return 'Analysis queued for processing.';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dataset...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">Dataset not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{dataset.name}</h1>
                  {dataset.is_multi_sample && (
                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                      Multi-Sample ({dataset.sample_count} samples)
                    </span>
                  )}
                </div>
                <p className="text-gray-600 mt-2">{dataset.description}</p>
                <div className="flex items-center gap-4 mt-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(dataset.status)}`}>
                    {dataset.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-500">Organism: {dataset.organism}</span>
                  <span className="text-sm text-gray-500">Type: {dataset.dataset_type} • {dataset.selected_pipeline_stage}</span>
                  <span className="text-sm text-gray-500">Results: {dataset.results_count}</span>
                </div>
                
                <p className="text-sm text-gray-600 mt-2">{getStatusMessage(dataset.status)}</p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    autoRefresh 
                      ? 'bg-green-100 text-green-700 border border-green-300' 
                      : 'bg-gray-100 text-gray-700 border border-gray-300'
                  }`}
                >
                  <FiActivity size={16} className={autoRefresh ? 'animate-pulse' : ''} />
                  Auto-refresh
                </button>
                
                <button
                  onClick={() => setShowJobDetails(!showJobDetails)}
                  className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <FiEye size={16} />
                  Progress Details
                </button>
                
                {dataset.status === 'completed' && (
                  <>
                    <button
                      onClick={() => setShowAIPanel(!showAIPanel)}
                      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      <FiFileText size={16} />
                      AI Chat
                    </button>
                    
                    <button
                      onClick={() => navigate(`/rnaseq/presentation/${dataset.id}`)}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      <FiFileText size={16} />
                      Create Presentation
                    </button>
                  </>
                )}

                {dataset.status === 'upstream_complete' && (
                  <>
                    <button
                      onClick={handleDownloadUpstream}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      <FiDownload size={16} />
                      Download Matrix
                    </button>
                    <button
                      onClick={handleContinueToDownstream}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      <FiPlay size={16} />
                      Continue to Downstream
                    </button>
                  </>
                )}
                
                <button
                  onClick={fetchDataset}
                  className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <FiRefreshCw size={16} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Job Details Panel */}
          {showJobDetails && jobs.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">🔧 Analysis Pipeline</h2>
              <div className="space-y-4">
                {jobs.map((job) => (
                  <div key={job.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          {job.analysis_type.replace('_', ' ').toUpperCase()} Analysis
                          {job.status === 'processing' && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          )}
                        </h3>
                        <p className="text-sm text-gray-600">{job.current_step_name}</p>
                        
                        {/* Enhanced Progress Display */}
                        {job.status === 'processing' && (
                          <div className="mt-3">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-gray-500">
                                Step {job.current_step}/{job.total_steps} • {job.progress_percentage}%
                              </span>
                              {job.duration_minutes > 0 && (
                                <span className="text-xs text-gray-500">
                                  {job.duration_minutes} min elapsed
                                </span>
                              )}
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300 relative overflow-hidden"
                                style={{ width: `${job.progress_percentage}%` }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(job.status)}`}>
                        {job.status.replace('_', ' ')}
                      </span>
                    </div>
                    
                    {/* Enhanced Job Statistics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                      {job.num_samples > 0 && (
                        <div className="bg-blue-50 p-2 rounded">
                          <span className="text-blue-600 font-medium">Samples:</span>
                          <div className="text-blue-800 font-semibold">{job.num_samples}</div>
                        </div>
                      )}
                      {job.total_reads > 0 && (
                        <div className="bg-green-50 p-2 rounded">
                          <span className="text-green-600 font-medium">Total Reads:</span>
                          <div className="text-green-800 font-semibold">{(job.total_reads / 1000000).toFixed(1)}M</div>
                        </div>
                      )}
                      {job.alignment_rate > 0 && (
                        <div className="bg-purple-50 p-2 rounded">
                          <span className="text-purple-600 font-medium">Alignment:</span>
                          <div className="text-purple-800 font-semibold">{(job.alignment_rate * 100).toFixed(1)}%</div>
                        </div>
                      )}
                      {job.genes_quantified > 0 && (
                        <div className="bg-orange-50 p-2 rounded">
                          <span className="text-orange-600 font-medium">Genes:</span>
                          <div className="text-orange-800 font-semibold">{job.genes_quantified.toLocaleString()}</div>
                        </div>
                      )}
                      {job.cells_detected > 0 && (
                        <div className="bg-pink-50 p-2 rounded">
                          <span className="text-pink-600 font-medium">Cells:</span>
                          <div className="text-pink-800 font-semibold">{job.cells_detected.toLocaleString()}</div>
                        </div>
                      )}
                      {job.cell_clusters > 0 && (
                        <div className="bg-indigo-50 p-2 rounded">
                          <span className="text-indigo-600 font-medium">Clusters:</span>
                          <div className="text-indigo-800 font-semibold">{job.cell_clusters}</div>
                        </div>
                      )}
                      {job.significant_genes > 0 && (
                        <div className="bg-red-50 p-2 rounded">
                          <span className="text-red-600 font-medium">DEGs:</span>
                          <div className="text-red-800 font-semibold">{job.significant_genes.toLocaleString()}</div>
                        </div>
                      )}
                      {job.enriched_pathways > 0 && (
                        <div className="bg-yellow-50 p-2 rounded">
                          <span className="text-yellow-600 font-medium">Pathways:</span>
                          <div className="text-yellow-800 font-semibold">{job.enriched_pathways}</div>
                        </div>
                      )}
                    </div>
                    
                    {job.error_message && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm text-red-800">{job.error_message}</p>
                      </div>
                    )}

                    {/* Pipeline Steps Detail */}
                    {job.pipeline_steps && job.pipeline_steps.length > 0 && (
                      <div className="mt-4">
                        <details className="group">
                          <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 font-medium">
                            Pipeline Steps ({job.pipeline_steps.filter(s => s.status === 'completed').length}/{job.pipeline_steps.length} completed)
                          </summary>
                          <div className="mt-3 space-y-2">
                            {job.pipeline_steps.map((step) => (
                              <div key={step.step_number} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                                <span className={`w-3 h-3 rounded-full ${
                                  step.status === 'completed' ? 'bg-green-500' :
                                  step.status === 'running' ? 'bg-blue-500 animate-pulse' :
                                  step.status === 'failed' ? 'bg-red-500' : 'bg-gray-300'
                                }`}></span>
                                <div className="flex-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-900">{step.step_name}</span>
                                    {step.duration_seconds > 0 && (
                                      <span className="text-xs text-gray-500">{Math.round(step.duration_seconds / 60)} min</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Chat Panel */}
          {showAIPanel && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">🤖 AI Assistant</h2>
              </div>
              
              {/* Chat History */}
              <div className="max-h-96 overflow-y-auto mb-4 space-y-3 border border-gray-200 rounded-lg p-4">
                {aiChats.length === 0 ? (
                  <p className="text-gray-500 italic text-center">No conversations yet. Ask me about your analysis!</p>
                ) : (
                  aiChats.map((chat) => (
                    <div key={chat.id} className="space-y-2">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-sm text-blue-900"><strong>You:</strong> {chat.user_message}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap"><strong>AI:</strong> {chat.ai_response}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* Chat Input */}
              <div className="flex gap-2">
                <textarea
                  value={aiMessage}
                  onChange={(e) => setAIMessage(e.target.value)}
                  placeholder="Ask about your analysis, methodology, or results..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none"
                  rows={2}
                />
                <button
                  onClick={handleSendAIMessage}
                  disabled={sendingAI || !aiMessage.trim()}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {sendingAI ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <FiArrowRight size={16} />
                  )}
                  Send
                </button>
              </div>
            </div>
          )}

          {/* Single-cell Clusters */}
          {dataset.dataset_type === 'single_cell' && clusters.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">🔬 Cell Clusters</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clusters.map((cluster) => (
                  <div key={cluster.cluster_id} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900">
                      Cluster {cluster.cluster_id}
                      {cluster.cluster_name && ` - ${cluster.cluster_name}`}
                    </h3>
                    {cluster.cell_type && (
                      <p className="text-sm text-gray-600">Cell Type: {cluster.cell_type}</p>
                    )}
                    <p className="text-sm text-gray-600">Cells: {cluster.cell_count}</p>
                    {cluster.marker_genes.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500">Top Markers:</p>
                        <p className="text-xs text-gray-700">{cluster.marker_genes.slice(0, 5).join(', ')}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pathway Results */}
          {pathways.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">🛤️ Pathway Enrichment</h2>
                <select
                  value={selectedDatabase}
                  onChange={(e) => setSelectedDatabase(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All Databases</option>
                  <option value="GO">Gene Ontology</option>
                  <option value="KEGG">KEGG</option>
                  <option value="REACTOME">Reactome</option>
                  <option value="HALLMARK">MSigDB Hallmark</option>
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pathway
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Database
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        P-value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gene Count
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pathways.slice(0, 20).map((pathway, index) => (
                      <tr key={`${pathway.pathway_id}-${index}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {pathway.pathway_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {pathway.database}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {pathway.p_value?.toExponential(2) || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {pathway.gene_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Results Table */}
          {dataset.status === 'completed' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">🧬 Analysis Results</h2>
                  <div className="flex gap-2 items-center">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={showSignificantOnly}
                        onChange={(e) => setShowSignificantOnly(e.target.checked)}
                        className="rounded"
                      />
                      Significant only
                    </label>
                    <select
                      value={`${sortBy}-${sortOrder}`}
                      onChange={(e) => {
                        const [col, order] = e.target.value.split('-');
                        setSortBy(col as any);
                        setSortOrder(order as any);
                        setCurrentPage(1);
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="p_value-asc">P-value (Low to High)</option>
                      <option value="p_value-desc">P-value (High to Low)</option>
                      <option value="log2_fold_change-desc">Fold Change (High to Low)</option>
                      <option value="log2_fold_change-asc">Fold Change (Low to High)</option>
                      <option value="gene_name-asc">Gene Name (A-Z)</option>
                      <option value="gene_name-desc">Gene Name (Z-A)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gene ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gene Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Log2 FC
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        P-value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Adj. P-value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Base Mean
                      </th>
                      {dataset.dataset_type === 'single_cell' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cluster
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {resultsLoading ? (
                      <tr>
                        <td colSpan={dataset.dataset_type === 'single_cell' ? 7 : 6} className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-gray-600">Loading results...</span>
                          </div>
                        </td>
                      </tr>
                    ) : results.length === 0 ? (
                      <tr>
                        <td colSpan={dataset.dataset_type === 'single_cell' ? 7 : 6} className="px-6 py-4 text-center text-gray-500">
                          No results available
                        </td>
                      </tr>
                    ) : (
                      results.map((result, index) => (
                        <tr key={`${result.gene_id}-${index}`} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {result.gene_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {result.gene_name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className={`font-medium ${
                              (result.log2_fold_change ?? 0) > 0 ? 'text-red-600' : 'text-blue-600'
                            }`}>
                              {result.log2_fold_change?.toFixed(3) || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {result.p_value?.toExponential(2) || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {result.adjusted_p_value?.toExponential(2) || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {result.base_mean?.toFixed(2) || '-'}
                          </td>
                          {dataset.dataset_type === 'single_cell' && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {result.cluster || '-'}
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Enhanced Pagination */}
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-700">
                    Showing page {currentPage} of results • {results.length} genes displayed
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-2 text-sm text-gray-600">
                      Page {currentPage}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      disabled={results.length < 20}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Processing Status Messages */}
          {dataset.status === 'processing_upstream' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Upstream Processing in Progress</h3>
              <p className="text-blue-700">
                Running quality control, trimming, alignment, and quantification.
                {dataset.is_multi_sample && ` Processing ${dataset.sample_count} samples.`}
              </p>
            </div>
          )}

          {dataset.status === 'processing_downstream' && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-purple-900 mb-2">Downstream Analysis in Progress</h3>
              <p className="text-purple-700">
                Performing statistical analysis, pathway enrichment, and generating AI insights.
              </p>
            </div>
          )}

          {dataset.status === 'upstream_complete' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
              <h3 className="text-lg font-semibold text-green-900 mb-2">Upstream Processing Complete</h3>
              <p className="text-green-700 mb-4">
                Your data has been successfully processed. You can now download the expression matrix or continue to downstream analysis.
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleDownloadUpstream}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <FiDownload size={16} />
                  Download Expression Matrix
                </button>
                <button
                  onClick={handleContinueToDownstream}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <FiPlay size={16} />
                  Continue to Downstream
                </button>
              </div>
            </div>
          )}

          {dataset.status === 'failed' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Analysis Failed</h3>
              <p className="text-red-700">There was an error processing your data. Please check your file format and try again.</p>
              {dataset.current_job?.error_message && (
                <div className="mt-3 p-3 bg-red-100 rounded text-left">
                  <p className="text-sm text-red-800">{dataset.current_job.error_message}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RNASeqDetail;