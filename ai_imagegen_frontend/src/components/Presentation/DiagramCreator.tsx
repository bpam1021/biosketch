import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  FiBarChart, FiPieChart, FiTrendingUp, FiGitBranch, FiUsers,
  FiClock, FiTarget, FiLayers, FiZap, FiRefreshCw, FiDownload,
  FiEdit3, FiCheck, FiX
} from 'react-icons/fi';
import { 
  ChartTemplate, 
  DiagramElement, 
  ContentSection,
  ChartSuggestionRequest
} from '../../types/Presentation';
import { 
  listChartTemplates, 
  createDiagram, 
  updateDiagram,
  suggestCharts,
  regenerateDiagram
} from '../../api/presentationApi';

interface DiagramCreatorProps {
  presentationId: string;
  section: ContentSection;
  onDiagramCreated: (diagram: DiagramElement) => void;
  onClose: () => void;
}

const DiagramCreator: React.FC<DiagramCreatorProps> = ({
  presentationId,
  section,
  onDiagramCreated,
  onClose
}) => {
  const [chartTemplates, setChartTemplates] = useState<ChartTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ChartTemplate | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [activeTab, setActiveTab] = useState<'suggestions' | 'templates' | 'custom'>('suggestions');

  useEffect(() => {
    loadChartTemplates();
    generateSuggestions();
  }, []);

  const loadChartTemplates = async () => {
    try {
      const templates = await listChartTemplates();
      setChartTemplates(templates);
    } catch (error) {
      console.error('Failed to load chart templates:', error);
    }
  };

  const generateSuggestions = async () => {
    if (!section.content.trim()) return;

    try {
      setLoadingSuggestions(true);
      const suggestionRequest: ChartSuggestionRequest = {
        content_text: section.content,
        current_section_type: section.section_type
      };
      
      const result = await suggestCharts(suggestionRequest);
      setSuggestions(result.suggestions || []);
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      toast.error('Failed to generate chart suggestions');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const createDiagramFromTemplate = async (template: ChartTemplate, customPrompt?: string) => {
    try {
      setIsGenerating(true);
      
      const diagramData = {
        chart_template: template.id,
        title: `${template.name} for ${section.title}`,
        chart_type: template.chart_type,
        content_text: section.content,
        generation_prompt: customPrompt || `Create a ${template.name} based on: ${section.content}`,
        position_x: 0,
        position_y: 0,
        width: 400,
        height: 300
      };

      const diagram = await createDiagram(presentationId, section.id, diagramData);
      onDiagramCreated(diagram);
      toast.success('Diagram created successfully!');
      onClose();
    } catch (error) {
      console.error('Failed to create diagram:', error);
      toast.error('Failed to create diagram');
    } finally {
      setIsGenerating(false);
    }
  };

  const createCustomDiagram = async () => {
    if (!customPrompt.trim()) {
      toast.warning('Please enter a description for your diagram');
      return;
    }

    try {
      setIsGenerating(true);
      
      const diagramData = {
        title: 'Custom Diagram',
        chart_type: 'auto_detect',
        content_text: section.content,
        generation_prompt: customPrompt,
        position_x: 0,
        position_y: 0,
        width: 400,
        height: 300
      };

      const diagram = await createDiagram(presentationId, section.id, diagramData);
      onDiagramCreated(diagram);
      toast.success('Custom diagram created successfully!');
      onClose();
    } catch (error) {
      console.error('Failed to create custom diagram:', error);
      toast.error('Failed to create custom diagram');
    } finally {
      setIsGenerating(false);
    }
  };

  const getChartIcon = (chartType: string) => {
    switch (chartType) {
      case 'bar_chart': return FiBarChart;
      case 'pie_chart': return FiPieChart;
      case 'line_chart': return FiTrendingUp;
      case 'flowchart': return FiGitBranch;
      case 'org_chart': return FiUsers;
      case 'timeline': return FiClock;
      case 'process_diagram': return FiTarget;
      default: return FiLayers;
    }
  };

  const getChartTypeLabel = (chartType: string) => {
    return chartType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Create Diagram</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            >
              ×
            </button>
          </div>
          
          <p className="text-gray-600 mt-2">
            Generate charts and diagrams based on your content: "{section.title}"
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('suggestions')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'suggestions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FiZap size={16} className="inline mr-2" />
              AI Suggestions
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'templates'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FiLayers size={16} className="inline mr-2" />
              Templates ({chartTemplates.length})
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'custom'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FiEdit3 size={16} className="inline mr-2" />
              Custom
            </button>
          </nav>
        </div>

        <div className="p-6 max-h-96 overflow-y-auto">
          {/* AI Suggestions Tab */}
          {activeTab === 'suggestions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Recommended Charts</h3>
                <button
                  onClick={generateSuggestions}
                  disabled={loadingSuggestions}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                >
                  <FiRefreshCw size={14} className={loadingSuggestions ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>

              {loadingSuggestions ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : suggestions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FiTarget className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                  <p>No suggestions available for this content</p>
                  <p className="text-sm">Try the Templates tab or create a custom diagram</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suggestions.map((suggestion, index) => {
                    const IconComponent = getChartIcon(suggestion.chart_type);
                    const matchingTemplate = chartTemplates.find(t => t.chart_type === suggestion.chart_type);
                    
                    return (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <IconComponent size={20} className="text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-1">
                              {getChartTypeLabel(suggestion.chart_type)}
                            </h4>
                            <p className="text-sm text-gray-600 mb-2">{suggestion.reason}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                                {Math.round(suggestion.confidence * 100)}% match
                              </span>
                              <button
                                onClick={() => matchingTemplate && createDiagramFromTemplate(matchingTemplate)}
                                disabled={!matchingTemplate || isGenerating}
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
                              >
                                {isGenerating ? 'Creating...' : 'Create'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Chart Templates</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {chartTemplates.map((template) => {
                  const IconComponent = getChartIcon(template.chart_type);
                  
                  return (
                    <div
                      key={template.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedTemplate?.id === template.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <IconComponent size={20} className="text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900 text-sm truncate">
                              {template.name}
                            </h4>
                            {template.is_premium && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                                Pro
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                            {template.description}
                          </p>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {template.category}
                          </span>
                        </div>
                      </div>
                      
                      {selectedTemplate?.id === template.id && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <button
                            onClick={() => createDiagramFromTemplate(template)}
                            disabled={isGenerating}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-2 rounded text-sm font-medium"
                          >
                            {isGenerating ? 'Creating...' : 'Create Diagram'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Tab */}
          {activeTab === 'custom' && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Custom Diagram</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Describe the diagram you want to create
                  </label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="e.g., Create a flowchart showing the product development process with 5 stages..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Tips for better diagrams:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Be specific about the type of diagram (flowchart, timeline, org chart, etc.)</li>
                    <li>• Mention the number of elements or steps</li>
                    <li>• Include any specific relationships or connections</li>
                    <li>• Specify colors or styling preferences if needed</li>
                  </ul>
                </div>

                <button
                  onClick={createCustomDiagram}
                  disabled={!customPrompt.trim() || isGenerating}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-medium"
                >
                  {isGenerating ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating Custom Diagram...
                    </span>
                  ) : (
                    'Create Custom Diagram'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiagramCreator;