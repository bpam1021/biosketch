import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiDownload, FiBarChart, FiFileText, FiRefreshCw, FiEye, FiActivity } from 'react-icons/fi';
import Sidebar from '../../components/Sidebar';
import RealTimeProgressPanel from '../../components/RNASeq/RealTimeProgressPanel';
import { 
  getRNASeqDataset, 
  getRNASeqResults, 
  getRNASeqAnalysisStatus,
  generateRNASeqVisualization,
  getAnalysisJobs,
  getAIInterpretations,
  generateAIInterpretation,
  updateJobStatus
} from '../../api/rnaseqApi';
import { RNASeqDataset, RNASeqAnalysisResult, AnalysisJob, AIInterpretation } from '../../types/RNASeq';

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
  const [showJobDetails, setShowJobDetails] = useState(true); // Default to true to show progress
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      fetchDataset();
      fetchResults();
      fetchJobs();
      fetchAIInterpretations();
    }
  }, [id, currentPage, sortBy, sortOrder]);

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

  const handleGenerateVisualization = async (type: string) => {
    if (!id) return;
    
    setGeneratingViz(true);
    try {
      await generateRNASeqVisualization(id, type);
      toast.success(`${type} visualization generation started`);
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
      setTimeout(fetchAIInterpretations, 3000);
    } catch (error) {
      toast.error('Failed to generate AI interpretation');
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleJobStatusUpdate = async (jobId: string, continueAnalysis: boolean) => {
    try {
      await updateJobStatus({
        job_id: jobId,
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
                      Multi-Sample ({dataset.total_samples} samples)
                    </span>
                  )}
                </div>
                <p className="text-gray-600 mt-2">{dataset.description}</p>
                <div className="flex items-center gap-4 mt-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(dataset.status)}`}>
                    {dataset.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-500">Organism: {dataset.organism}</span>
                  <span className="text-sm text-gray-500">Type: {dataset.dataset_type} • {dataset.analysis_type}</span>
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
                      AI Insights
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

          {/* Real-time Progress Panel */}
          {(dataset.status === 'processing_upstream' || dataset.status === 'processing_downstream') && (
            <RealTimeProgressPanel 
              dataset={dataset} 
              onStatusUpdate={setDataset}
            />
          )}

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
                                Step {job.current_step}/5 • {job.progress_percentage}%
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
                    
                    {/* Multi-sample progress */}
                    {dataset.is_multi_sample && dataset.processed_samples !== undefined && (
                      <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-blue-800">Sample Progress</span>
                          <span className="text-sm text-blue-600">
                            {dataset.processed_samples} / {dataset.total_samples}
                          </span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ 
                              width: `${((dataset.processed_samples || 0) / (dataset.total_samples || 1)) * 100}%` 
                            }}
                          ></div>
                        </div>
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
                                    {step.duration_minutes > 0 && (
                                      <span className="text-xs text-gray-500">{step.duration_minutes} min</span>
                                    )}
                                  </div>
                                  {step.progress_details && (
                                    <div className="text-xs text-gray-600 mt-1">
                                      {step.progress_details.current_operation && (
                                        <span>{step.progress_details.current_operation}</span>
                                      )}
                                      {step.progress_details.samples_completed !== undefined && (
                                        <span className="ml-2">
                                          ({step.progress_details.samples_completed}/{step.progress_details.total_samples})
                                        </span>
                                      )}
                                    </div>
                                  )}
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
                    
                    {dataset.status === 'completed' && (
                      <div className="relative group">
                        <button
                          disabled={generatingViz}
                          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                          <FiBarChart size={16} />
                          Generate Viz
                        </button>
                        
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                          <div className="p-2">
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
                          </div>
                        </div>
                      </div>
                    )}
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
                {dataset.is_multi_sample && ` Processing ${dataset.total_samples} samples.`}
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