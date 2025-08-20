import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiFileText, FiLoader, FiUsers, FiActivity, FiBarChart, FiEye, FiArrowLeft } from 'react-icons/fi';
import Sidebar from '../../components/Sidebar';
import { getRNASeqJob, createPresentationFromRNASeq } from '../../api/rnaseqApi';
import { AnalysisJob } from '../../types/RNASeq';
import { useCredits } from '../../context/CreditsContext';

const RNASeqPresentationCreate = () => {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<AnalysisJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { credits, fetchCredits } = useCredits();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    include_methods: true,
    include_results: true,
    include_discussion: true,
    quality: 'medium' as 'low' | 'medium' | 'high',
  });

  useEffect(() => {
    if (id) {
      fetchJob();
    }
  }, [id]);

  useEffect(() => {
    if (credits === 0) {
      toast.info("You've run out of credits. Redirecting to subscription...");
      navigate("/subscribe");
    }
  }, [credits]);

  const fetchJob = async () => {
    try {
      const response = await getRNASeqJob(id!);
      setJob(response.data);
      setFormData(prev => ({
        ...prev,
        title: `RNA-seq Analysis: ${response.data.name}`
      }));
    } catch (error) {
      toast.error('Failed to load analysis job');
      navigate('/rnaseq');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!job) return;

    if (job.status !== 'completed') {
      toast.error('Analysis must be completed before creating presentation');
      return;
    }

    if (credits !== null && credits < getCreditCost(formData.quality)) {
      toast.error(`Insufficient credits. You need ${getCreditCost(formData.quality)} credits but have ${credits}`);
      navigate("/subscribe");
      return;
    }

    setCreating(true);
    
    try {
      const response = await createPresentationFromRNASeq({
        job_id: job.id,
        ...formData
      });
      
      if(response.status === 201) {
        toast.success('Presentation creation started! You will be redirected when ready.');
        fetchCredits();
        setTimeout(() => {
          navigate('/presentation/create');
        }, 3000);
      } else {
        throw new Error('Unexpected response status');
      }

    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to create presentation';
      toast.error(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const getCreditCost = (quality: string) => {
    switch (quality) {
      case 'low': return 0.5;
      case 'medium': return 1.5;
      case 'high': return 5.0;
      default: return 1.5;
    }
  };

  const getQualityDescription = (quality: string) => {
    switch (quality) {
      case 'low': return 'Basic slides with essential content';
      case 'medium': return 'Enhanced visuals and detailed analysis';
      case 'high': return 'Premium quality with advanced visualizations';
      default: return 'Standard quality presentation';
    }
  };

  const getDatasetTypeIcon = (type: string) => {
    return type === 'single_cell' ? '🔬' : '🧪';
  };

  const getPipelineStageIcon = (stage: string) => {
    return stage === 'upstream' ? '🔼' : '🔽';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'processing_upstream': 
      case 'processing_downstream': return 'text-blue-600 bg-blue-100';
      case 'upstream_complete': return 'text-purple-600 bg-purple-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading analysis job...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">Analysis job not found</p>
            <button
              onClick={() => navigate('/rnaseq')}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => navigate(`/rnaseq/job/${job.id}`)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <FiArrowLeft size={20} />
                Back to Analysis
              </button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">📊 Create RNA-seq Presentation</h1>
            <p className="text-gray-600 mt-2">Generate a scientific presentation from your analysis results</p>
          </div>

          {/* Credits Warning */}
          {credits !== null && credits <= 5 && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <span className="text-yellow-600">⚠️</span>
                <p className="text-yellow-800">
                  You have {credits} credits remaining. 
                  <button
                    onClick={() => navigate("/subscribe")}
                    className="ml-2 text-yellow-600 underline hover:text-yellow-700"
                  >
                    Buy more credits
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* Analysis Status Check */}
          {job.status !== 'completed' && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <span className="text-red-600">❌</span>
                <div>
                  <p className="text-red-800 font-medium">Analysis Not Completed</p>
                  <p className="text-red-700 text-sm">
                    Your analysis must be completed before creating a presentation. 
                    Current status: <span className="font-medium">{job.status.replace('_', ' ')}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                {/* Job Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{getDatasetTypeIcon(job.dataset_type)}</span>
                    <span className="text-lg">{getPipelineStageIcon(job.selected_pipeline_stage)}</span>
                    <h3 className="font-semibold text-gray-900">{job.name}</h3>
                    {job.is_multi_sample && (
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <FiUsers size={10} />
                        Multi-Sample ({job.sample_count})
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Organism:</span>
                      <div className="text-gray-900">{job.organism}</div>
                    </div>
                    <div>
                      <span className="font-medium">Type:</span>
                      <div className="text-gray-900">{job.dataset_type.replace('_', '-')}</div>
                    </div>
                    <div>
                      <span className="font-medium">Pipeline:</span>
                      <div className="text-gray-900">{job.selected_pipeline_stage}</div>
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>
                      <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                        {job.status.replace('_', ' ')}
                      </div>
                    </div>
                  </div>

                  {/* Analysis Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                    {job.results_count > 0 && (
                      <div className="bg-blue-50 p-2 rounded">
                        <span className="text-blue-600 font-medium">Results:</span>
                        <div className="text-blue-800 font-semibold">{job.results_count}</div>
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
                    {job.clusters_count > 0 && (
                      <div className="bg-purple-50 p-2 rounded">
                        <span className="text-purple-600 font-medium">Clusters:</span>
                        <div className="text-purple-800 font-semibold">{job.clusters_count}</div>
                      </div>
                    )}
                  </div>

                  {job.description && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-700">{job.description}</p>
                    </div>
                  )}

                  {job.user_hypothesis && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500 font-medium">Research Hypothesis:</p>
                      <p className="text-sm text-gray-700 italic">"{job.user_hypothesis}"</p>
                    </div>
                  )}
                </div>

                {/* Presentation Settings */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900">Presentation Settings</h2>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Presentation Title
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter a descriptive title for your presentation"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quality Level
                    </label>
                    <select
                      name="quality"
                      value={formData.quality}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="low">Low ({getCreditCost('low')} credits) - {getQualityDescription('low')}</option>
                      <option value="medium">Medium ({getCreditCost('medium')} credits) - {getQualityDescription('medium')}</option>
                      <option value="high">High ({getCreditCost('high')} credits) - {getQualityDescription('high')}</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Higher quality includes more detailed visualizations and enhanced formatting
                    </p>
                  </div>
                </div>

                {/* Content Options */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900">Content Sections</h2>
                  
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        name="include_methods"
                        checked={formData.include_methods}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <FiActivity className="text-blue-600" size={16} />
                          <span className="font-medium text-gray-900">Methods Section</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Include methodology, analysis pipeline, and technical details
                        </p>
                        <div className="text-xs text-gray-500 mt-1">
                          • {job.selected_pipeline_stage === 'upstream' ? 'Full pipeline from FASTQ to results' : 'Downstream analysis only'}
                          • Data processing steps and parameters
                          • Statistical methods used
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        name="include_results"
                        checked={formData.include_results}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <FiBarChart className="text-green-600" size={16} />
                          <span className="font-medium text-gray-900">Results Section</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Include key findings, visualizations, and statistical results
                        </p>
                        <div className="text-xs text-gray-500 mt-1">
                          • Differential expression results ({job.significant_genes} significant genes)
                          • Pathway enrichment analysis ({job.enriched_pathways} pathways)
                          {job.dataset_type === 'single_cell' && job.clusters_count > 0 && (
                            <span>• Cell clustering and annotation ({job.clusters_count} clusters)</span>
                          )}
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        name="include_discussion"
                        checked={formData.include_discussion}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <FiFileText className="text-purple-600" size={16} />
                          <span className="font-medium text-gray-900">Discussion Section</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Include interpretation, biological significance, and conclusions
                        </p>
                        <div className="text-xs text-gray-500 mt-1">
                          • Biological interpretation of results
                          • Functional significance of findings
                          {job.user_hypothesis && <span>• Hypothesis validation and conclusions</span>}
                          • Future research directions
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => navigate(`/rnaseq/job/${job.id}`)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                  >
                    Back to Analysis
                  </button>
                  <button
                    type="submit"
                    disabled={creating || job.status !== 'completed' || (credits !== null && credits < getCreditCost(formData.quality))}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {creating ? (
                      <>
                        <FiLoader className="animate-spin" size={16} />
                        Creating Presentation...
                      </>
                    ) : (
                      <>
                        <FiFileText size={16} />
                        Create Presentation ({getCreditCost(formData.quality)} credits)
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Preview Panel */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FiEye className="text-blue-600" />
                  Presentation Preview
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span>Title Slide</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                    <span>Introduction & Objectives</span>
                  </div>
                  {formData.include_methods && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span>Methods & Analysis Pipeline</span>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <span className="w-1 h-1 bg-green-400 rounded-full"></span>
                        <span className="text-xs text-gray-600">
                          {job.selected_pipeline_stage === 'upstream' ? 'Data Processing & QC' : 'Statistical Analysis'}
                        </span>
                      </div>
                    </>
                  )}
                  {formData.include_results && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                        <span>Results Overview</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        <span>Differential Expression Analysis</span>
                      </div>
                      {job.enriched_pathways > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                          <span>Pathway Enrichment Results</span>
                        </div>
                      )}
                      {job.dataset_type === 'single_cell' && job.clusters_count > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                          <span>Cell Clustering & Annotation</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                        <span>Data Visualizations</span>
                      </div>
                    </>
                  )}
                  {formData.include_discussion && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                        <span>Discussion & Interpretation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                        <span>Conclusions & Future Work</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="mt-4 text-xs text-gray-500">
                  Estimated slides: {
                    3 + // Base slides
                    (formData.include_methods ? 2 : 0) +
                    (formData.include_results ? 3 + (job.dataset_type === 'single_cell' ? 1 : 0) : 0) +
                    (formData.include_discussion ? 2 : 0)
                  }
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="font-semibold text-blue-900 mb-3">💡 What's Included</h3>
                <div className="space-y-2 text-sm text-blue-800">
                  <p>• AI-generated slide content based on your results</p>
                  <p>• Scientific illustrations and charts</p>
                  <p>• Statistical summaries and key findings</p>
                  <p>• Pathway enrichment visualizations</p>
                  {job.dataset_type === 'single_cell' && <p>• Cell clustering and annotation plots</p>}
                  {job.user_hypothesis && <p>• Hypothesis-driven interpretation</p>}
                  <p>• Editable presentation format</p>
                  <p>• Export to PDF/PowerPoint</p>
                </div>
              </div>

              {job.visualization_image && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">📊 Current Visualization</h3>
                  <img
                    src={job.visualization_image}
                    alt="Analysis visualization"
                    className="w-full h-auto rounded-lg border border-gray-200"
                  />
                </div>
              )}

              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h3 className="font-semibold text-green-900 mb-3">📈 Analysis Summary</h3>
                <div className="space-y-2 text-sm text-green-800">
                  {job.num_samples > 0 && <p>• {job.num_samples} samples analyzed</p>}
                  {job.genes_quantified > 0 && <p>• {job.genes_quantified.toLocaleString()} genes quantified</p>}
                  {job.significant_genes > 0 && <p>• {job.significant_genes.toLocaleString()} differentially expressed genes</p>}
                  {job.enriched_pathways > 0 && <p>• {job.enriched_pathways} enriched pathways identified</p>}
                  {job.cells_detected > 0 && <p>• {job.cells_detected.toLocaleString()} cells detected</p>}
                  {job.cell_clusters > 0 && <p>• {job.cell_clusters} cell clusters identified</p>}
                  {job.duration_minutes > 0 && <p>• Analysis completed in {job.duration_minutes} minutes</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RNASeqPresentationCreate;