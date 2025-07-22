import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiFileText, FiLoader } from 'react-icons/fi';
import Sidebar from '../../components/Sidebar';
import { getRNASeqDataset, createPresentationFromRNASeq } from '../../api/rnaseqApi';
import { RNASeqDataset } from '../../types/RNASeq';
import { useCredits } from '../../context/CreditsContext';

const RNASeqPresentationCreate = () => {
  const { id } = useParams<{ id: string }>();
  const [dataset, setDataset] = useState<RNASeqDataset | null>(null);
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
      fetchDataset();
    }
  }, [id]);

  useEffect(() => {
    if (credits === 0) {
      toast.info("You've run out of credits. Redirecting to subscription...");
      navigate("/subscribe");
    }
  }, [credits]);

  const fetchDataset = async () => {
    try {
      const response = await getRNASeqDataset(id!);
      setDataset(response.data);
      setFormData(prev => ({
        ...prev,
        title: `RNA-seq Analysis: ${response.data.name}`
      }));
    } catch (error) {
      toast.error('Failed to load dataset');
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
    
    if (!dataset) return;

    if (dataset.status !== 'completed') {
      toast.error('Analysis must be completed before creating presentation');
      return;
    }

    setCreating(true);
    
    try {
      const response = await createPresentationFromRNASeq({
        dataset_id: dataset.id,
        ...formData
      });
      
      toast.success('Presentation creation started! You will be redirected when ready.');
      fetchCredits();
      
      // Poll for completion and redirect
      setTimeout(() => {
        navigate('/presentation/create');
      }, 3000);
      
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
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                {/* Dataset Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Dataset: {dataset.name}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>Organism: {dataset.organism}</div>
                    <div>Analysis: {dataset.analysis_type}</div>
                    <div>Results: {dataset.results_count} genes</div>
                    <div>Status: <span className="text-green-600 font-medium">{dataset.status}</span></div>
                  </div>
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
                      <option value="low">Low (0.5 credits) - Basic slides</option>
                      <option value="medium">Medium (1.5 credits) - Enhanced visuals</option>
                      <option value="high">High (5 credits) - Premium quality</option>
                    </select>
                  </div>
                </div>

                {/* Content Options */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900">Content Sections</h2>
                  
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        name="include_methods"
                        checked={formData.include_methods}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-medium text-gray-900">Methods Section</span>
                        <p className="text-sm text-gray-600">Include methodology and analysis pipeline</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        name="include_results"
                        checked={formData.include_results}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-medium text-gray-900">Results Section</span>
                        <p className="text-sm text-gray-600">Include key findings and visualizations</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        name="include_discussion"
                        checked={formData.include_discussion}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-medium text-gray-900">Discussion Section</span>
                        <p className="text-sm text-gray-600">Include interpretation and conclusions</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => navigate(`/rnaseq/dataset/${dataset.id}`)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                  >
                    Back to Dataset
                  </button>
                  <button
                    type="submit"
                    disabled={creating || dataset.status !== 'completed'}
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
                <h3 className="font-semibold text-gray-900 mb-4">📋 Presentation Preview</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span>Title Slide</span>
                  </div>
                  {formData.include_methods && (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span>Methods & Pipeline</span>
                    </div>
                  )}
                  {formData.include_results && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                        <span>Differential Expression Results</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                        <span>Data Visualizations</span>
                      </div>
                    </>
                  )}
                  {formData.include_discussion && (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      <span>Discussion & Conclusions</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="font-semibold text-blue-900 mb-3">💡 What's Included</h3>
                <div className="space-y-2 text-sm text-blue-800">
                  <p>• AI-generated slide content</p>
                  <p>• Scientific illustrations</p>
                  <p>• Data visualizations</p>
                  <p>• Editable presentation format</p>
                  <p>• Export to PDF/PowerPoint</p>
                </div>
              </div>

              {dataset.visualization_image && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">📊 Current Visualization</h3>
                  <img
                    src={dataset.visualization_image}
                    alt="Dataset visualization"
                    className="w-full h-auto rounded-lg border border-gray-200"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RNASeqPresentationCreate;