import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiDownload, FiBarChart3, FiFileText, FiRefreshCw, FiEye } from 'react-icons/fi';
import Sidebar from '../../components/Sidebar';
import { 
  getRNASeqDataset, 
  getRNASeqResults, 
  getRNASeqAnalysisStatus,
  generateRNASeqVisualization 
} from '../../api/rnaseqApi';
import { RNASeqDataset, RNASeqAnalysisResult } from '../../types/RNASeq';

const RNASeqDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [dataset, setDataset] = useState<RNASeqDataset | null>(null);
  const [results, setResults] = useState<RNASeqAnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [generatingViz, setGeneratingViz] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'p_value' | 'log2_fold_change' | 'gene_name'>('p_value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      fetchDataset();
      fetchResults();
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

  const handleSort = (column: 'p_value' | 'log2_fold_change' | 'gene_name') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

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
                </div>
              </div>
              
              <div className="flex gap-3">
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
                        <FiBarChart3 size={16} />
                        Visualize
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
                              result.log2_fold_change > 0 ? 'text-red-600' : 'text-blue-600'
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
          {dataset.status === 'processing' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Analysis in Progress</h3>
              <p className="text-blue-700">Your RNA-seq data is being processed. This may take several minutes.</p>
            </div>
          )}

          {/* Failed Status */}
          {dataset.status === 'failed' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Analysis Failed</h3>
              <p className="text-red-700">There was an error processing your data. Please check your file format and try again.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RNASeqDetail;