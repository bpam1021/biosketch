import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiBarChart, FiFileText, FiRefreshCw, FiEye } from 'react-icons/fi';
import Sidebar from '../../components/Sidebar';
import { 
  getRNASeqDataset, 
  getRNASeqResults, 
  generateRNASeqVisualization,
  getAnalysisJobs,
  getAIInterpretations,
  generateAIInterpretation,
  updateJobStatus,
  getPipelineStatusDetail
} from '../../api/rnaseqApi';
import { RNASeqDataset, RNASeqAnalysisResult, AnalysisJob, AIInterpretation, DetailedPipelineStatus } from '../../types/RNASeq';

const RNASeqDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [dataset, setDataset] = useState<RNASeqDataset | null>(null);
  const [results, setResults] = useState<RNASeqAnalysisResult[]>([]);
  const [jobs, setJobs] = useState<AnalysisJob[]>([]);
  const [aiInterpretations, setAIInterpretations] = useState<AIInterpretation[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [generatingViz, setGeneratingViz] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'p_value' | 'log2_fold_change' | 'gene_name'>('p_value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [detailedStatus, setDetailedStatus] = useState<DetailedPipelineStatus | null>(null);
  const [showDetailedStatus, setShowDetailedStatus] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      fetchDataset();
      fetchResults();
      fetchJobs();
      fetchAIInterpretations();
    }
  }, [id, currentPage, sortBy, sortOrder]);

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
        page_size: 20
      });
      setResults(response.data.results || response.data);
    } catch (error) {
      toast.error('Failed to load analysis results');
    } finally {
      setResultsLoading(false);
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

  const fetchAIInterpretations = async () => {
    if (!id) return;
    try {
      const response = await getAIInterpretations(id);
      setAIInterpretations(response.data);
    } catch (error) {
      console.error('Failed to load AI interpretations:', error);
    }
  };

  const fetchDetailedStatus = async () => {
    if (!id) return;
    try {
      const response = await getPipelineStatusDetail(id);
      setDetailedStatus(response.data);
    } catch (error) {
      console.error('Failed to load detailed status:', error);
    }
  };

  const handleGenerateVisualization = async (type: string) => {
    if (!id) return;
    
    setGeneratingViz(true);
    try {
      await generateRNASeqVisualization(id, type);
      toast.success(`${type} visualization generation started`);
      // Refresh dataset to get updated visualization
      setTimeout(fetchDataset, 2000);
    } catch (error) {
      toast.error('Failed to generate visualization');
    } finally {
      setGeneratingViz(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!id) return;
    
    setGeneratingAI(true);
    try {
      await generateAIInterpretation(id);
      toast.success('AI interpretation generation started');
      // Refresh interpretations after a delay
      setTimeout(fetchAIInterpretations, 3000);
    } catch (error) {
      toast.error('Failed to generate AI interpretation');
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleJobStatusUpdate = async (jobId: string, continueAnalysis: boolean) => {
    try {
      await updateJobStatus(jobId, {
        user_input: userInput,
        continue_analysis: continueAnalysis
      });
      
      if (continueAnalysis) {
        toast.success('Analysis continued with your input');
      } else {
        toast.info('Analysis stopped');
      }
      
      setUserInput('');
      fetchJobs();
      fetchDataset();
    } catch (error) {
      toast.error('Failed to update job status');
    }
  };
  // const handleSort = (column: 'p_value' | 'log2_fold_change' | 'gene_name') => {
  //   if (sortBy === column) {
  //     setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  //   } else {
  //     setSortBy(column);
  //     setSortOrder('asc');
  //   }
  //   setCurrentPage(1);
  // };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-yellow-600 bg-yellow-100';
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
                <h1 className="text-3xl font-bold text-gray-900">{dataset.name}</h1>
                <p className="text-gray-600 mt-2">{dataset.description}</p>
                <div className="flex items-center gap-4 mt-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(dataset.status)}`}>
                    {dataset.status}
                  </span>
                  <span className="text-sm text-gray-500">Organism: {dataset.organism}</span>
                  <span className="text-sm text-gray-500">Type: {dataset.analysis_type}</span>
                  <span className="text-sm text-gray-500">Results: {dataset.results_count}</span>
                  {dataset.is_multi_sample && (
                    <span className="text-sm text-purple-600 font-medium">Multi-sample</span>
                  )}
                </div>
                
                {/* Job Progress */}
                {dataset.job_progress && dataset.job_progress.status !== 'no_job' && (
                  <div className="mt-4 bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {dataset.job_progress.current_step}
                      </span>
                      <span className="text-sm text-gray-500">
                        {dataset.job_progress.progress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${dataset.job_progress.progress}%` }}
                      ></div>
                    </div>
                    {dataset.is_multi_sample && (
                      <div className="mt-2 text-xs text-purple-600">
                        Multi-sample processing ({Object.keys(dataset.sample_files_mapping || {}).length} samples)
                        {dataset.batch_id && ` • Batch: ${dataset.batch_id}`}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowJobDetails(!showJobDetails)}
                  className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <FiEye size={16} />
                  Job Details
                </button>
                
                <button
                  onClick={() => {
                    setShowDetailedStatus(!showDetailedStatus);
                    if (!showDetailedStatus) fetchDetailedStatus();
                  }}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <FiEye size={16} />
                  Pipeline Status
                </button>
                
                {dataset.status === 'completed' && (
                  <button
                    onClick={() => setShowAIPanel(!showAIPanel)}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <FiFileText size={16} />
                    AI Insights
                  </button>
                )}
                  {dataset.is_multi_sample && (
                    <button
                      onClick={() => {/* TODO: Show multi-sample details */}}
                      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      <FiEye size={16} />
                      Multi-Sample Info
                    </button>
                  )}
                  
                
                {dataset.status === 'completed' && (
                  <>
                    <button
                      onClick={() => navigate(`/rnaseq/presentation/${dataset.id}`)}
                      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      <FiFileText size={16} />
                      Create Presentation
                    </button>
                    
                    <div className="relative group">
                      <button
                        disabled={generatingViz}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        <FiBarChart size={16} />
                        Visualize
                      </button>
                      
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        <div className="p-2">
                          {dataset.dataset_type === 'bulk' ? (
                            <>
                              <button
                                onClick={() => handleGenerateVisualization('volcano')}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
                              >
                                Volcano Plot
                              </button>
                              <button
                                onClick={() => handleGenerateVisualization('heatmap')}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
                              >
                                Heatmap
                              </button>
                              <button
                                onClick={() => handleGenerateVisualization('ma_plot')}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
                              >
                                MA Plot
                              </button>
                              <button
                                onClick={() => handleGenerateVisualization('pca')}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
                              >
                                PCA Plot
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleGenerateVisualization('umap')}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
                              >
                                UMAP Plot
                              </button>
                              <button
                                onClick={() => handleGenerateVisualization('tsne')}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
                              >
                                t-SNE Plot
                              </button>
                              <button
                                onClick={() => handleGenerateVisualization('violin')}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
                              >
                                Violin Plot
                              </button>
                              <button
                                onClick={() => handleGenerateVisualization('heatmap')}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
                              >
                                Heatmap
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
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
          {showJobDetails && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">🔧 Analysis Jobs</h2>
              <div className="space-y-4">
                {jobs.map((job) => (
                  <div key={job.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {job.analysis_type.replace('_', ' ').toUpperCase()} Analysis
                        </h3>
                        <p className="text-sm text-gray-600">{job.current_step_name}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                    
                    {job.status === 'processing' && (
                      <div className="mb-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${job.progress_percentage}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Step {job.current_step}/5</p>
                      </div>
                    )}
                    
                    {job.status === 'waiting_for_input' && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm text-yellow-800 mb-2">
                          This analysis is waiting for your input to continue.
                        </p>
                        <textarea
                          value={userInput}
                          onChange={(e) => setUserInput(e.target.value)}
                          placeholder="Enter your hypothesis or additional information..."
                          className="w-full p-2 border border-gray-300 rounded text-sm"
                          rows={3}
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleJobStatusUpdate(job.id, true)}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          >
                            Continue Analysis
                          </button>
                          <button
                            onClick={() => handleJobStatusUpdate(job.id, false)}
                            className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                          >
                            Stop Analysis
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                      {job.num_samples > 0 && (
                        <div>
                          <span className="text-gray-500">Samples:</span>
                          <span className="ml-1 font-medium">{job.num_samples}</span>
                        </div>
                      )}
                      {job.genes_quantified > 0 && (
                        <div>
                          <span className="text-gray-500">Genes:</span>
                          <span className="ml-1 font-medium">{job.genes_quantified.toLocaleString()}</span>
                        </div>
                      )}
                      {job.significant_genes > 0 && (
                        <div>
                          <span className="text-gray-500">DEGs:</span>
                          <span className="ml-1 font-medium">{job.significant_genes.toLocaleString()}</span>
                        </div>
                      )}
                      {job.duration_minutes > 0 && (
                        <div>
                          <span className="text-gray-500">Duration:</span>
                          <span className="ml-1 font-medium">{job.duration_minutes} min</span>
                        </div>
                      )}
                    </div>
                    
                    {job.error_message && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm text-red-800">{job.error_message}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Pipeline Status Panel */}
          {showDetailedStatus && detailedStatus && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">🔧 Detailed Pipeline Status</h2>
              
              {/* Pipeline Steps */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Pipeline Steps</h3>
                <div className="space-y-3">
                  {detailedStatus.pipeline_steps.map((step, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-900">{step.step_name}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(step.status)}`}>
                          {step.status}
                        </span>
                      </div>
                      {step.progress > 0 && (
                        <div className="mb-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${step.progress}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {step.progress}% complete
                            {step.estimated_time_remaining && ` • ${step.estimated_time_remaining} remaining`}
                          </p>
                        </div>
                      )}
                      {Object.keys(step.resource_usage).length > 0 && (
                        <div className="text-xs text-gray-600">
                          Resource usage: {JSON.stringify(step.resource_usage)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Quality Metrics */}
              {Object.keys(detailedStatus.quality_metrics).length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Quality Metrics</h3>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(detailedStatus.quality_metrics, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              
              {/* Performance Stats */}
              {Object.keys(detailedStatus.performance_stats).length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Performance Statistics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(detailedStatus.performance_stats).map(([key, value]) => (
                      <div key={key} className="bg-gray-50 rounded-lg p-3 text-center">
                        <div className="text-sm text-gray-600">{key.replace('_', ' ')}</div>
                        <div className="text-lg font-semibold text-gray-900">{String(value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Error Logs */}
              {detailedStatus.error_logs.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Error Logs</h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                    {detailedStatus.error_logs.map((error, index) => (
                      <div key={index} className="text-sm text-red-800 mb-1">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI Interpretations Panel */}
          {showAIPanel && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">🤖 AI Interpretations</h2>
                <button
                  onClick={handleGenerateAI}
                  disabled={generatingAI}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  {generatingAI ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <FiFileText size={16} />
                      Generate New Interpretation
                    </>
                  )}
                </button>
              </div>
              
              <div className="space-y-4">
                {aiInterpretations.length === 0 ? (
                  <p className="text-gray-500 italic">No AI interpretations available yet.</p>
                ) : (
                  aiInterpretations.map((interpretation) => (
                    <div key={interpretation.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {interpretation.analysis_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {new Date(interpretation.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {interpretation.user_input && (
                        <div className="mb-3 p-2 bg-blue-50 rounded">
                          <p className="text-sm text-blue-800">
                            <strong>Your input:</strong> {interpretation.user_input}
                          </p>
                        </div>
                      )}
                      
                      <div className="prose prose-sm max-w-none">
                        <p className="text-gray-700 whitespace-pre-wrap">{interpretation.ai_response}</p>
                      </div>
                      
                      {interpretation.confidence_score > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                          Confidence: {(interpretation.confidence_score * 100).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          {/* Visualization */}
          {dataset.visualization_image && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Visualization</h2>
              <div className="text-center">
                <img
                  src={dataset.visualization_image}
                  alt="RNA-seq Visualization"
                  className="max-w-full h-auto rounded-lg border border-gray-200"
                />
              </div>
            </div>
          )}

          {/* Results Table */}
          {dataset.status === 'completed' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">🧬 Analysis Results</h2>
                  <div className="flex gap-2">
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
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {resultsLoading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-gray-600">Loading results...</span>
                          </div>
                        </td>
                      </tr>
                    ) : results.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
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
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-700">
                    Showing page {currentPage} of results
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
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

          {/* Processing Status */}
          {dataset.status === 'pending' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Analysis in Progress</h3>
              <p className="text-blue-700">
                Your RNA-seq data is being processed. 
                {dataset.is_multi_sample ? ' Multi-sample analysis may take longer.' : ' This may take several minutes.'}
              </p>
              {dataset.job_progress && (
                <div className="mt-4">
                  <p className="text-sm text-blue-600 mb-2">{dataset.job_progress.current_step}</p>
                  <div className="w-full bg-blue-200 rounded-full h-2 max-w-md mx-auto">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${dataset.job_progress.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Failed Status */}
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