import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { 
  FiBarChart, FiPieChart, FiTrendingUp, FiGitBranch, FiUsers,
  FiClock, FiTarget, FiLayers, FiZap, FiRefreshCw, FiDownload,
  FiEdit3, FiCheck, FiX, FiWand2, FiMap, FiArrowRight, FiMove
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

interface SmartSuggestion {
  type: string;
  icon: React.ComponentType<any>;
  label: string;
  confidence: number;
  reason: string;
  chart_type: string;
  template_id?: string;
}

interface DiagramCreatorProps {
  presentationId: string;
  section?: ContentSection;
  selectedText?: string;
  position?: { x: number; y: number };
  onDiagramCreated: (diagram: DiagramElement) => void;
  onClose: () => void;
  mode?: 'modal' | 'inline';
  isVisible?: boolean;
}

const PerfectDiagramCreator: React.FC<DiagramCreatorProps> = ({
  presentationId,
  section,
  selectedText,
  position = { x: 0, y: 0 },
  onDiagramCreated,
  onClose,
  mode = 'modal',
  isVisible = true
}) => {
  // State Management
  const [chartTemplates, setChartTemplates] = useState<ChartTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ChartTemplate | null>(null);
  const [apiSuggestions, setApiSuggestions] = useState<any[]>([]);
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [activeTab, setActiveTab] = useState<'smart' | 'suggestions' | 'templates' | 'custom'>('smart');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SmartSuggestion | null>(null);
  
  const popoverRef = useRef<HTMLDivElement>(null);
  
  // Content to analyze - prioritize selectedText over section content
  const contentToAnalyze = selectedText || section?.content || '';
  const displayTitle = selectedText ? 'Selected Text' : section?.title || 'Content';

  // Enhanced diagram type mapping with more visual types
  const diagramTypes = {
    'process_flow': { icon: FiGitBranch, label: 'Process Flow', color: 'blue', chart_type: 'flowchart' },
    'timeline': { icon: FiClock, label: 'Timeline', color: 'green', chart_type: 'timeline' },
    'comparison': { icon: FiBarChart, label: 'Comparison', color: 'purple', chart_type: 'bar_chart' },
    'hierarchy': { icon: FiUsers, label: 'Hierarchy', color: 'orange', chart_type: 'org_chart' },
    'data_viz': { icon: FiPieChart, label: 'Data Chart', color: 'red', chart_type: 'pie_chart' },
    'concept_map': { icon: FiMap, label: 'Concept Map', color: 'indigo', chart_type: 'network_diagram' },
    'venn_diagram': { icon: FiTarget, label: 'Venn Diagram', color: 'pink', chart_type: 'venn_diagram' },
    'trend_chart': { icon: FiTrendingUp, label: 'Trend Chart', color: 'cyan', chart_type: 'line_chart' }
  };

  // Advanced content analysis for smart suggestions
  const analyzeContentSmartly = useCallback((text: string): SmartSuggestion[] => {
    if (!text || text.length < 10) return [];
    
    const lowerText = text.toLowerCase();
    const suggestions: SmartSuggestion[] = [];

    // Enhanced pattern matching with scoring
    const patterns = {
      process_flow: {
        keywords: ['step', 'process', 'workflow', 'procedure', 'method', 'algorithm', 'then', 'next', 'after', 'before', 'stage', 'phase'],
        patterns: /\b(first|second|third|step \d+|phase \d+|stage \d+|step-by-step|sequential)\b/gi,
        weight: 1.8,
        triggers: ['→', '->', 'then', 'next step', 'process']
      },
      timeline: {
        keywords: ['timeline', 'history', 'chronological', 'date', 'year', 'month', 'period', 'era', 'evolution', 'development'],
        patterns: /\b(\d{4}|january|february|march|april|may|june|july|august|september|october|november|december|\d+\s*(years?|months?|days?|ago)|since|until|from.*to)\b/gi,
        weight: 2.2,
        triggers: ['over time', 'from...to', 'since', 'chronology']
      },
      comparison: {
        keywords: ['compare', 'versus', 'vs', 'difference', 'contrast', 'better', 'worse', 'advantage', 'disadvantage', 'against', 'alternative'],
        patterns: /\b(vs\.?|versus|compared to|in contrast|on the other hand|while|whereas|however|but)\b/gi,
        weight: 1.9,
        triggers: ['vs', 'compared to', 'difference', 'pros and cons']
      },
      hierarchy: {
        keywords: ['organization', 'structure', 'hierarchy', 'management', 'reporting', 'team', 'department', 'level', 'rank', 'authority'],
        patterns: /\b(ceo|manager|director|supervisor|reports to|under|above|below|chain of command)\b/gi,
        weight: 1.7,
        triggers: ['org chart', 'reports to', 'hierarchy', 'structure']
      },
      data_viz: {
        keywords: ['data', 'statistics', 'percentage', 'number', 'count', 'total', 'average', 'median', 'analysis', 'metrics'],
        patterns: /\b(\d+\.?\d*%|\d+\s*(users?|customers?|sales?|revenue|profit|increase|decrease)|statistics|analytics)\b/gi,
        weight: 2.4,
        triggers: ['%', 'statistics', 'data shows', 'numbers']
      },
      concept_map: {
        keywords: ['concept', 'idea', 'relationship', 'connected', 'related', 'association', 'link', 'network', 'interconnected'],
        patterns: /\b(relates to|connected to|associated with|linked to|relationship between|network of)\b/gi,
        weight: 1.5,
        triggers: ['relationship', 'connected', 'network', 'related to']
      },
      venn_diagram: {
        keywords: ['overlap', 'common', 'shared', 'intersection', 'both', 'either', 'neither', 'categories', 'groups'],
        patterns: /\b(overlap|intersection|common.*between|shared.*among|both.*and|either.*or)\b/gi,
        weight: 1.6,
        triggers: ['overlap', 'common', 'intersection', 'both and']
      },
      trend_chart: {
        keywords: ['trend', 'growth', 'decline', 'increase', 'decrease', 'change', 'over time', 'progress', 'improvement'],
        patterns: /\b(trend|growing|declining|increasing|decreasing|rising|falling|over.*time|progress|improvement)\b/gi,
        weight: 1.7,
        triggers: ['trend', 'growth', 'over time', 'increasing']
      }
    };

    Object.entries(patterns).forEach(([type, config]) => {
      let score = 0;
      
      // Keyword matching
      config.keywords.forEach(keyword => {
        if (lowerText.includes(keyword)) {
          score += 1;
        }
      });
      
      // Pattern matching
      const patternMatches = text.match(config.patterns);
      if (patternMatches) {
        score += patternMatches.length * 0.8;
      }
      
      // Special trigger bonus
      config.triggers.forEach(trigger => {
        if (lowerText.includes(trigger)) {
          score += 1.5;
        }
      });
      
      // Apply weight and normalize
      score *= config.weight;
      const confidence = Math.min(score / 6, 1); // Normalize to 0-1
      
      if (confidence > 0.15) { // Lower threshold for more suggestions
        const diagramInfo = diagramTypes[type as keyof typeof diagramTypes];
        
        suggestions.push({
          type,
          icon: diagramInfo.icon,
          label: diagramInfo.label,
          confidence,
          reason: generateSmartReason(type, patternMatches?.length || 0, config.keywords.filter(k => lowerText.includes(k)).length),
          chart_type: diagramInfo.chart_type
        });
      }
    });

    // Sort by confidence and return top suggestions
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 4);
  }, []);

  const generateSmartReason = (type: string, patternMatches: number, keywordMatches: number): string => {
    const reasons = {
      process_flow: `Detected ${keywordMatches} process terms and ${patternMatches} sequential indicators - perfect for visualizing step-by-step workflows`,
      timeline: `Found ${patternMatches} temporal references and ${keywordMatches} chronological terms - ideal for showing events over time`,
      comparison: `Identified ${keywordMatches} comparison words and ${patternMatches} contrasting phrases - great for side-by-side analysis`,
      hierarchy: `Detected ${keywordMatches} organizational terms and ${patternMatches} structural indicators - perfect for showing relationships`,
      data_viz: `Found ${patternMatches} numerical data points and ${keywordMatches} statistical terms - ideal for data visualization`,
      concept_map: `Identified ${keywordMatches} relationship terms and ${patternMatches} connection phrases - great for mapping ideas`,
      venn_diagram: `Found ${keywordMatches} overlap terms and ${patternMatches} intersection indicators - perfect for showing commonalities`,
      trend_chart: `Detected ${keywordMatches} trend words and ${patternMatches} change indicators - ideal for showing progression`
    };
    
    return reasons[type as keyof typeof reasons] || `AI detected relevant content patterns (${Math.round((keywordMatches + patternMatches) * 10)}% match)`;
  };

  // Load templates and generate suggestions
  useEffect(() => {
    if (isVisible && contentToAnalyze) {
      loadChartTemplates();
      generateSmartSuggestions();
      generateAPISuggestions();
    }
  }, [isVisible, contentToAnalyze]);

  const loadChartTemplates = async () => {
    try {
      const templates = await listChartTemplates();
      setChartTemplates(templates);
    } catch (error) {
      console.error('Failed to load chart templates:', error);
    }
  };

  const generateSmartSuggestions = () => {
    const suggestions = analyzeContentSmartly(contentToAnalyze);
    setSmartSuggestions(suggestions);
    
    // Auto-select the best suggestion if we have any
    if (suggestions.length > 0) {
      setSelectedSuggestion(suggestions[0]);
    }
  };

  const generateAPISuggestions = async () => {
    if (!section?.content.trim()) return;

    try {
      setLoadingSuggestions(true);
      const suggestionRequest: ChartSuggestionRequest = {
        content_text: contentToAnalyze,
        current_section_type: section?.section_type
      };
      
      const result = await suggestCharts(suggestionRequest);
      setApiSuggestions(result.suggestions || []);
    } catch (error) {
      console.error('Failed to generate API suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Create diagram functions
  const createDiagramFromSuggestion = async (suggestion: SmartSuggestion, customPrompt?: string) => {
    try {
      setIsGenerating(true);
      
      // Find matching template
      const matchingTemplate = chartTemplates.find(t => t.chart_type === suggestion.chart_type);
      
      const diagramData = {
        chart_template: matchingTemplate?.id,
        title: `${suggestion.label}${selectedText ? ' - From Selection' : ''}`,
        chart_type: suggestion.chart_type,
        content_text: contentToAnalyze,
        generation_prompt: customPrompt || `Create a ${suggestion.label.toLowerCase()} based on: "${contentToAnalyze.substring(0, 200)}${contentToAnalyze.length > 200 ? '...' : ''}". Focus on visual clarity and professional design.`,
        position_x: 0,
        position_y: 0,
        width: 400,
        height: 300
      };

      const diagram = await createDiagram(presentationId, section?.id || '', diagramData);
      onDiagramCreated(diagram);
      toast.success(`${suggestion.label} created successfully!`);
      onClose();
    } catch (error) {
      console.error('Failed to create diagram:', error);
      toast.error('Failed to create diagram');
    } finally {
      setIsGenerating(false);
    }
  };

  const createDiagramFromTemplate = async (template: ChartTemplate, customPrompt?: string) => {
    try {
      setIsGenerating(true);
      
      const diagramData = {
        chart_template: template.id,
        title: `${template.name}${selectedText ? ' - From Selection' : ''}`,
        chart_type: template.chart_type,
        content_text: contentToAnalyze,
        generation_prompt: customPrompt || `Create a ${template.name} based on: ${contentToAnalyze}`,
        position_x: 0,
        position_y: 0,
        width: 400,
        height: 300
      };

      const diagram = await createDiagram(presentationId, section?.id || '', diagramData);
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
    if (!customPrompt.trim() || !selectedSuggestion) return;

    try {
      setIsGenerating(true);
      
      const diagramData = {
        title: 'Custom Diagram',
        chart_type: selectedSuggestion.chart_type,
        content_text: contentToAnalyze,
        generation_prompt: customPrompt,
        position_x: 0,
        position_y: 0,
        width: 400,
        height: 300
      };

      const diagram = await createDiagram(presentationId, section?.id || '', diagramData);
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

  // Utility functions
  const getChartIcon = (chartType: string) => {
    switch (chartType) {
      case 'bar_chart': return FiBarChart;
      case 'pie_chart': return FiPieChart;
      case 'line_chart': return FiTrendingUp;
      case 'flowchart': return FiGitBranch;
      case 'org_chart': return FiUsers;
      case 'timeline': return FiClock;
      case 'process_diagram': return FiTarget;
      case 'network_diagram': return FiMap;
      case 'venn_diagram': return FiTarget;
      default: return FiLayers;
    }
  };

  const getChartTypeLabel = (chartType: string) => {
    return chartType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (!isVisible) return null;

  // Inline Mode (Napkin.ai style)
  if (mode === 'inline') {
    return (
      <>
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-20 z-40"
          onClick={onClose}
        />
        
        {/* Inline Popover */}
        <div 
          ref={popoverRef}
          className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 w-96 max-w-[90vw]"
          style={{
            left: Math.min(position.x, window.innerWidth - 400),
            top: Math.min(position.y, window.innerHeight - 500),
            maxHeight: '80vh',
            overflowY: 'auto'
          }}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiWand2 className="text-purple-600" size={20} />
                <h3 className="font-semibold text-gray-900">Create Diagram</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX size={16} />
              </button>
            </div>
            
            {/* Content Preview */}
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-600 mb-1">{displayTitle}</p>
              <p className="text-sm text-gray-800 line-clamp-3">
                {contentToAnalyze.length > 150 ? `${contentToAnalyze.substring(0, 150)}...` : contentToAnalyze}
              </p>
            </div>
          </div>

          {/* Smart Suggestions */}
          <div className="p-4">
            {smartSuggestions.length === 0 ? (
              <div className="text-center py-8">
                <FiLayers className="mx-auto text-gray-400 mb-3" size={32} />
                <p className="text-gray-600 mb-2">No diagram suggestions</p>
                <p className="text-sm text-gray-500">Try selecting more descriptive content</p>
              </div>
            ) : (
              <>
                <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <FiZap className="text-yellow-500" size={14} />
                  Smart Suggestions
                </h4>
                
                <div className="space-y-2">
                  {smartSuggestions.map((suggestion, index) => {
                    const Icon = suggestion.icon;
                    const isSelected = selectedSuggestion?.type === suggestion.type;
                    const colorClass = diagramTypes[suggestion.type as keyof typeof diagramTypes]?.color || 'gray';
                    
                    return (
                      <button
                        key={suggestion.type}
                        onClick={() => setSelectedSuggestion(suggestion)}
                        className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                          isSelected 
                            ? `border-${colorClass}-500 bg-${colorClass}-50` 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg bg-${colorClass}-100`}>
                            <Icon 
                              size={16} 
                              className={`text-${colorClass}-600`}
                            />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-gray-900 text-sm">
                                {suggestion.label}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full bg-${colorClass}-100 text-${colorClass}-700`}>
                                {Math.round(suggestion.confidence * 100)}% match
                              </span>
                            </div>
                            
                            <p className="text-xs text-gray-600 leading-relaxed">
                              {suggestion.reason}
                            </p>
                          </div>
                        </div>
                        
                        {isSelected && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                createDiagramFromSuggestion(suggestion);
                              }}
                              disabled={isGenerating}
                              className={`w-full bg-${colorClass}-600 hover:bg-${colorClass}-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2`}
                            >
                              {isGenerating ? (
                                <>
                                  <FiRefreshCw className="animate-spin" size={14} />
                                  Creating...
                                </>
                              ) : (
                                <>
                                  <FiCheck size={14} />
                                  Create {suggestion.label}
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Prompt */}
                <div className="border-t border-gray-100 pt-4 mt-4">
                  <button
                    onClick={() => setShowCustomInput(!showCustomInput)}
                    className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FiEdit3 size={14} />
                      <span className="text-sm font-medium">Custom Instructions</span>
                    </div>
                    <FiArrowRight 
                      size={14} 
                      className={`transform transition-transform ${showCustomInput ? 'rotate-90' : ''}`}
                    />
                  </button>
                  
                  {showCustomInput && (
                    <div className="mt-3 space-y-3">
                      <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="Describe specific requirements for your diagram..."
                        rows={3}
                        className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                      />
                      
                      <button
                        onClick={createCustomDiagram}
                        disabled={!customPrompt.trim() || !selectedSuggestion || isGenerating}
                        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                      >
                        {isGenerating ? (
                          <>
                            <FiRefreshCw className="animate-spin" size={14} />
                            Creating Custom Diagram...
                          </>
                        ) : (
                          <>
                            <FiWand2 size={14} />
                            Create Custom Diagram
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </>
    );
  }

  // Modal Mode (Full featured)
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Perfect Diagram Creator</h2>
              <p className="text-gray-600 mt-1">
                Generate professional diagrams from your content: "{displayTitle}"
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            >
              ×
            </button>
          </div>
          
          {/* Content Preview */}
          {contentToAnalyze && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Analyzing Content:</p>
              <p className="text-sm text-gray-600 line-clamp-2">
                {contentToAnalyze.length > 300 ? `${contentToAnalyze.substring(0, 300)}...` : contentToAnalyze}
              </p>
            </div>
          )}
        </div>

        {/* Enhanced Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('smart')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'smart'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FiWand2 size={16} className="inline mr-2" />
              Smart AI ({smartSuggestions.length})
            </button>
            <button
              onClick={() => setActiveTab('suggestions')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'suggestions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FiZap size={16} className="inline mr-2" />
              API Suggestions ({apiSuggestions.length})
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'templates'
                  ? 'border-green-500 text-green-600'
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
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FiEdit3 size={16} className="inline mr-2" />
              Custom
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6 max-h-[500px] overflow-y-auto">
          {/* Smart AI Tab */}
          {activeTab === 'smart' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <FiWand2 className="text-purple-600" />
                  Smart AI Suggestions
                </h3>
                <button
                  onClick={generateSmartSuggestions}
                  className="flex items-center gap-2 text-purple-600 hover:text-purple-700 text-sm"
                >
                  <FiRefreshCw size={14} />
                  Refresh Analysis
                </button>
              </div>

              {smartSuggestions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FiTarget className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                  <p>No smart suggestions available</p>
                  <p className="text-sm">Try selecting more descriptive content or check other tabs</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {smartSuggestions.map((suggestion, index) => {
                    const Icon = suggestion.icon;
                    const colorClass = diagramTypes[suggestion.type as keyof typeof diagramTypes]?.color || 'gray';
                    
                    return (
                      <div
                        key={suggestion.type}
                        className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 bg-${colorClass}-100 rounded-lg`}>
                            <Icon size={20} className={`text-${colorClass}-600`} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-1">
                              {suggestion.label}
                            </h4>
                            <p className="text-sm text-gray-600 mb-2">{suggestion.reason}</p>
                            <div className="flex items-center justify-between">
                              <span className={`text-xs text-${colorClass}-600 bg-${colorClass}-100 px-2 py-1 rounded`}>
                                {Math.round(suggestion.confidence * 100)}% confidence
                              </span>
                              <button
                                onClick={() => createDiagramFromSuggestion(suggestion)}
                                disabled={isGenerating}
                                className={`text-${colorClass}-600 hover:text-${colorClass}-700 text-sm font-medium disabled:opacity-50`}
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

          {/* API Suggestions Tab */}
          {activeTab === 'suggestions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Backend AI Suggestions</h3>
                <button
                  onClick={generateAPISuggestions}
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
              ) : apiSuggestions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FiTarget className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                  <p>No API suggestions available</p>
                  <p className="text-sm">Check other tabs for more options</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {apiSuggestions.map((suggestion, index) => {
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
              <h3 className="font-medium text-gray-900">Professional Chart Templates</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {chartTemplates.map((template) => {
                  const IconComponent = getChartIcon(template.chart_type);
                  
                  return (
                    <div
                      key={template.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedTemplate?.id === template.id
                          ? 'border-green-500 bg-green-50'
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
                        <div className="mt-3 pt-3 border-t border-green-200">
                          <button
                            onClick={() => createDiagramFromTemplate(template)}
                            disabled={isGenerating}
                            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-3 py-2 rounded text-sm font-medium"
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
              <h3 className="font-medium text-gray-900">Custom Diagram Generator</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Describe your ideal diagram
                  </label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="e.g., Create a detailed flowchart showing the software development lifecycle with 8 stages, including feedback loops and decision points. Use professional colors and clear labels."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-medium text-orange-900 mb-2">💡 Pro Tips for Better Diagrams:</h4>
                  <ul className="text-sm text-orange-800 space-y-1">
                    <li>• Specify the exact type (flowchart, org chart, timeline, etc.)</li>
                    <li>• Mention number of elements, steps, or categories</li>
                    <li>• Include relationships and connections between elements</li>
                    <li>• Add style preferences (colors, layout, professional/casual)</li>
                    <li>• Describe the target audience or use case</li>
                  </ul>
                </div>

                <button
                  onClick={() => selectedSuggestion ? createCustomDiagram() : toast.warning('Please select a suggestion type first')}
                  disabled={!customPrompt.trim() || isGenerating}
                  className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <FiRefreshCw className="animate-spin" size={16} />
                      Creating Custom Diagram...
                    </>
                  ) : (
                    <>
                      <FiWand2 size={16} />
                      Create Custom Diagram
                    </>
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

export default PerfectDiagramCreator;