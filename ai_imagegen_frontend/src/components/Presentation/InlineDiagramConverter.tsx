import React, { useState, useEffect, useRef } from 'react';
import { 
  FiBarChart, FiPieChart, FiTrendingUp, FiGitBranch, FiUsers, FiClock, 
  FiTarget, FiMap, FiLayers, FiZap, FiX, FiCheck, FiRefreshCw,
  FiArrowRight, FiEye, FiEdit3
} from 'react-icons/fi';
import { toast } from 'react-toastify';

interface DiagramSuggestion {
  type: string;
  icon: React.ComponentType<any>;
  label: string;
  confidence: number;
  reason: string;
  preview?: string;
}

interface InlineDiagramConverterProps {
  selectedText: string;
  position: { x: number; y: number };
  onConvert: (diagramType: string, prompt: string, insertAtPosition?: number) => Promise<void>;
  onClose: () => void;
  isVisible: boolean;
  sectionId?: string;
}

const InlineDiagramConverter: React.FC<InlineDiagramConverterProps> = ({
  selectedText,
  position,
  onConvert,
  onClose,
  isVisible,
  sectionId
}) => {
  const [suggestions, setSuggestions] = useState<DiagramSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<DiagramSuggestion | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const diagramTypes = {
    'process_flow': { icon: FiGitBranch, label: 'Process Flow', color: 'blue' },
    'timeline': { icon: FiClock, label: 'Timeline', color: 'green' },
    'comparison': { icon: FiBarChart, label: 'Comparison', color: 'purple' },
    'hierarchy': { icon: FiUsers, label: 'Hierarchy', color: 'orange' },
    'data_viz': { icon: FiPieChart, label: 'Data Chart', color: 'red' },
    'concept_map': { icon: FiMap, label: 'Concept Map', color: 'indigo' },
    'venn_diagram': { icon: FiTarget, label: 'Venn Diagram', color: 'pink' },
    'trend_chart': { icon: FiTrendingUp, label: 'Trend Chart', color: 'cyan' }
  };

  // Analyze text content to generate contextual suggestions
  const analyzeContent = async (text: string): Promise<DiagramSuggestion[]> => {
    const lowerText = text.toLowerCase();
    const suggestions: DiagramSuggestion[] = [];

    // Pattern matching for different diagram types
    const patterns = {
      process_flow: {
        keywords: ['step', 'process', 'workflow', 'procedure', 'method', 'algorithm', 'then', 'next', 'after', 'before'],
        patterns: /\b(first|second|third|step \d+|phase \d+)\b/gi,
        weight: 1.5
      },
      timeline: {
        keywords: ['timeline', 'history', 'chronological', 'date', 'year', 'month', 'period', 'era'],
        patterns: /\b(\d{4}|january|february|march|april|may|june|july|august|september|october|november|december|\d+\s*(years?|months?|days?))\b/gi,
        weight: 2.0
      },
      comparison: {
        keywords: ['compare', 'versus', 'vs', 'difference', 'contrast', 'better', 'worse', 'advantage', 'disadvantage'],
        patterns: /\b(vs\.?|versus|compared to|in contrast|on the other hand)\b/gi,
        weight: 1.8
      },
      hierarchy: {
        keywords: ['organization', 'structure', 'hierarchy', 'management', 'reporting', 'team', 'department', 'level'],
        patterns: /\b(ceo|manager|director|supervisor|reports to|under)\b/gi,
        weight: 1.6
      },
      data_viz: {
        keywords: ['data', 'statistics', 'percentage', 'number', 'count', 'total', 'average', 'median'],
        patterns: /\b(\d+\.?\d*%|\d+\s*(users?|customers?|sales?|revenue|profit))\b/gi,
        weight: 2.2
      },
      concept_map: {
        keywords: ['concept', 'idea', 'relationship', 'connected', 'related', 'association', 'link'],
        patterns: /\b(relates to|connected to|associated with|linked to)\b/gi,
        weight: 1.4
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
        score += patternMatches.length * 0.5;
      }
      
      // Apply weight
      score *= config.weight;
      
      if (score > 0) {
        const diagramInfo = diagramTypes[type as keyof typeof diagramTypes];
        const confidence = Math.min(score / 5, 1); // Normalize to 0-1
        
        suggestions.push({
          type,
          icon: diagramInfo.icon,
          label: diagramInfo.label,
          confidence,
          reason: generateReason(type, patternMatches?.length || 0, config.keywords.filter(k => lowerText.includes(k)).length)
        });
      }
    });

    // Sort by confidence and return top 4
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 4);
  };

  const generateReason = (type: string, patternMatches: number, keywordMatches: number): string => {
    const reasons = {
      process_flow: `Detected ${keywordMatches} process keywords and ${patternMatches} sequential indicators`,
      timeline: `Found ${patternMatches} date/time references and ${keywordMatches} chronological terms`,
      comparison: `Identified ${keywordMatches} comparison words and ${patternMatches} comparative phrases`,
      hierarchy: `Detected ${keywordMatches} organizational terms and ${patternMatches} structural indicators`,
      data_viz: `Found ${patternMatches} numerical data points and ${keywordMatches} statistical terms`,
      concept_map: `Identified ${keywordMatches} relationship terms and ${patternMatches} connection phrases`
    };
    
    return reasons[type as keyof typeof reasons] || `Detected relevant content patterns`;
  };

  useEffect(() => {
    if (selectedText && isVisible) {
      setIsAnalyzing(true);
      analyzeContent(selectedText).then(results => {
        setSuggestions(results);
        if (results.length > 0) {
          setSelectedSuggestion(results[0]);
        }
        setIsAnalyzing(false);
      });
    }
  }, [selectedText, isVisible]);

  const handleConvert = async (suggestion: DiagramSuggestion, customPrompt?: string) => {
    setIsConverting(true);
    try {
      const prompt = customPrompt || `Create a ${suggestion.label.toLowerCase()} diagram based on this content: "${selectedText}". Focus on visual clarity and professional design.`;
      
      await onConvert(suggestion.type, prompt);
      toast.success(`${suggestion.label} diagram created successfully!`);
      onClose();
    } catch (error) {
      toast.error('Failed to create diagram');
    } finally {
      setIsConverting(false);
    }
  };

  const handleCustomConvert = async () => {
    if (!customPrompt.trim() || !selectedSuggestion) return;
    await handleConvert(selectedSuggestion, customPrompt);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-20 z-40"
        onClick={onClose}
      />
      
      {/* Popover */}
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
              <FiZap className="text-purple-600" size={20} />
              <h3 className="font-semibold text-gray-900">Create Diagram</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiX size={16} />
            </button>
          </div>
          
          {/* Selected Text Preview */}
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-600 mb-1">Selected Content</p>
            <p className="text-sm text-gray-800 line-clamp-3">
              {selectedText.length > 150 ? `${selectedText.substring(0, 150)}...` : selectedText}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {isAnalyzing ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3">
                <FiRefreshCw className="animate-spin text-blue-600" size={20} />
                <span className="text-gray-600">Analyzing content...</span>
              </div>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-8">
              <FiLayers className="mx-auto text-gray-400 mb-3" size={32} />
              <p className="text-gray-600 mb-2">No specific diagram suggestions</p>
              <p className="text-sm text-gray-500">Try selecting more descriptive content or use custom prompt</p>
            </div>
          ) : (
            <>
              {/* AI Suggestions */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <FiZap className="text-yellow-500" size={14} />
                  AI Suggestions
                </h4>
                
                <div className="space-y-2">
                  {suggestions.map((suggestion, index) => {
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
                                handleConvert(suggestion);
                              }}
                              disabled={isConverting}
                              className={`w-full bg-${colorClass}-600 hover:bg-${colorClass}-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2`}
                            >
                              {isConverting ? (
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
              </div>

              {/* Custom Prompt */}
              <div className="border-t border-gray-100 pt-4">
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
                      onClick={handleCustomConvert}
                      disabled={!customPrompt.trim() || !selectedSuggestion || isConverting}
                      className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                    >
                      {isConverting ? (
                        <>
                          <FiRefreshCw className="animate-spin" size={14} />
                          Creating Custom Diagram...
                        </>
                      ) : (
                        <>
                          <FiZap size={14} />
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
};

export default InlineDiagramConverter;