import React, { useState } from 'react';
import { FiBarChart, FiPieChart, FiTrendingUp, FiGitBranch, FiTarget, FiMap, FiUsers, FiClock, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';

interface ChartOption {
  type: string;
  icon: React.ComponentType<any>;
  label: string;
  description: string;
  category: 'data' | 'process' | 'hierarchy' | 'comparison' | 'timeline' | 'geographic';
  suitable: string[];
}

interface AIChartConverterProps {
  selectedText: string;
  onConvert: (chartType: string, prompt: string) => Promise<void>;
  onClose: () => void;
  isVisible: boolean;
}

const AIChartConverter: React.FC<AIChartConverterProps> = ({
  selectedText,
  onConvert,
  onClose,
  isVisible
}) => {
  const [selectedChartType, setSelectedChartType] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<ChartOption[]>([]);

  const chartOptions: ChartOption[] = [
    {
      type: 'bar_chart',
      icon: FiBarChart,
      label: 'Bar Chart',
      description: 'Compare quantities across categories',
      category: 'data',
      suitable: ['numbers', 'statistics', 'comparison', 'data', 'results']
    },
    {
      type: 'pie_chart',
      icon: FiPieChart,
      label: 'Pie Chart',
      description: 'Show parts of a whole or percentages',
      category: 'data',
      suitable: ['percentage', 'parts', 'distribution', 'share', 'proportion']
    },
    {
      type: 'line_chart',
      icon: FiTrendingUp,
      label: 'Line Chart',
      description: 'Display trends over time',
      category: 'data',
      suitable: ['time', 'trend', 'progress', 'growth', 'decline', 'over time']
    },
    {
      type: 'flowchart',
      icon: FiGitBranch,
      label: 'Flowchart',
      description: 'Map out processes and decision trees',
      category: 'process',
      suitable: ['process', 'steps', 'workflow', 'procedure', 'algorithm', 'decision']
    },
    {
      type: 'org_chart',
      icon: FiUsers,
      label: 'Organization Chart',
      description: 'Show hierarchical relationships',
      category: 'hierarchy',
      suitable: ['hierarchy', 'organization', 'structure', 'reporting', 'management']
    },
    {
      type: 'timeline',
      icon: FiClock,
      label: 'Timeline',
      description: 'Visualize events chronologically',
      category: 'timeline',
      suitable: ['timeline', 'chronological', 'history', 'events', 'milestones']
    },
    {
      type: 'venn_diagram',
      icon: FiTarget,
      label: 'Venn Diagram',
      description: 'Show relationships and overlaps',
      category: 'comparison',
      suitable: ['overlap', 'relationship', 'common', 'intersection', 'comparison']
    },
    {
      type: 'mind_map',
      icon: FiMap,
      label: 'Mind Map',
      description: 'Organize ideas and concepts',
      category: 'hierarchy',
      suitable: ['ideas', 'concepts', 'brainstorm', 'topics', 'relationships']
    }
  ];

  // Analyze text content to suggest appropriate chart types
  const analyzeContent = (text: string): ChartOption[] => {
    const lowerText = text.toLowerCase();
    const suggestions: { option: ChartOption; score: number }[] = [];

    chartOptions.forEach(option => {
      let score = 0;
      option.suitable.forEach(keyword => {
        if (lowerText.includes(keyword)) {
          score += 2;
        }
      });

      // Additional scoring based on text patterns
      if (option.type === 'bar_chart' || option.type === 'pie_chart') {
        // Look for numerical patterns
        const numberMatches = text.match(/\d+\.?\d*%?/g);
        if (numberMatches && numberMatches.length >= 2) score += 3;
      }

      if (option.type === 'timeline') {
        // Look for date patterns
        const datePatterns = /\d{4}|\b(january|february|march|april|may|june|july|august|september|october|november|december)\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/gi;
        if (datePatterns.test(text)) score += 3;
      }

      if (option.type === 'flowchart') {
        // Look for process keywords
        const processWords = /\b(step|then|next|first|second|third|after|before|finally)\b/gi;
        if (processWords.test(text)) score += 2;
      }

      if (score > 0) {
        suggestions.push({ option, score });
      }
    });

    // Sort by score and return top suggestions
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(s => s.option);
  };

  React.useEffect(() => {
    if (selectedText && isVisible) {
      const suggestions = analyzeContent(selectedText);
      setAnalysisResults(suggestions.length > 0 ? suggestions : chartOptions.slice(0, 4));
      
      // Auto-select the best suggestion
      if (suggestions.length > 0) {
        setSelectedChartType(suggestions[0].type);
      }
    }
  }, [selectedText, isVisible]);

  const handleConvert = async () => {
    if (!selectedChartType) return;

    setIsConverting(true);
    try {
      const chartOption = chartOptions.find(opt => opt.type === selectedChartType);
      const prompt = customPrompt || 
        `Create a ${chartOption?.label.toLowerCase()} based on this content: "${selectedText}". ${chartOption?.description}`;
      
      await onConvert(selectedChartType, prompt);
      toast.success(`${chartOption?.label} generated successfully!`);
      onClose();
    } catch (error) {
      toast.error('Failed to generate chart');
    } finally {
      setIsConverting(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI Chart & Diagram Generator</h2>
              <p className="text-gray-600 mt-1">Convert your text into visual representations</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Selected Text Preview */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Selected Content</h3>
            <div className="bg-gray-50 rounded-lg p-4 max-h-32 overflow-y-auto">
              <p className="text-sm text-gray-700">
                {selectedText.length > 500 
                  ? `${selectedText.substring(0, 500)}...` 
                  : selectedText}
              </p>
            </div>
          </div>

          {/* AI Suggestions */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              🤖 AI Recommended Charts
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {analysisResults.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.type}
                    onClick={() => setSelectedChartType(option.type)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedChartType === option.type
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Icon 
                      size={24} 
                      className={`mb-2 ${
                        selectedChartType === option.type ? 'text-blue-600' : 'text-gray-600'
                      }`} 
                    />
                    <div className="font-medium text-sm text-gray-900">{option.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* All Chart Types */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">All Available Charts</h3>
            <div className="space-y-3">
              {['data', 'process', 'hierarchy', 'comparison', 'timeline', 'geographic'].map(category => {
                const categoryCharts = chartOptions.filter(opt => opt.category === category);
                if (categoryCharts.length === 0) return null;

                return (
                  <div key={category}>
                    <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
                      {category.replace('_', ' ')} Charts
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {categoryCharts.map((option) => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.type}
                            onClick={() => setSelectedChartType(option.type)}
                            className={`p-3 rounded-lg border text-left transition-colors ${
                              selectedChartType === option.type
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Icon 
                                size={16} 
                                className={selectedChartType === option.type ? 'text-blue-600' : 'text-gray-600'} 
                              />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{option.label}</div>
                                <div className="text-xs text-gray-500">{option.description}</div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Prompt */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Custom Instructions (Optional)
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Add specific instructions for the AI to customize your chart..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {selectedChartType && (
                <span>
                  Selected: <strong>{chartOptions.find(opt => opt.type === selectedChartType)?.label}</strong>
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConvert}
                disabled={!selectedChartType || isConverting}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {isConverting ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <FiBarChart size={16} />
                )}
                Generate Chart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChartConverter;