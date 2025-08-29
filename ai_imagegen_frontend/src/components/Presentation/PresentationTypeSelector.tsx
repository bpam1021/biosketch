import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiFileText, FiMonitor, FiChevronRight, FiBook, FiPlay, FiZap, FiLoader } from 'react-icons/fi';
import axios from 'axios';

interface PresentationTypeProps {
  onClose?: () => void;
}

interface DocumentTemplate {
  id: number;
  name: string;
  description: string;
}

interface SlideTheme {
  id: number;
  name: string;
  colors: Record<string, string>;
}

interface APITemplates {
  document_templates: DocumentTemplate[];
  slide_themes: SlideTheme[];
  slide_templates: any[];
}

const PresentationTypeSelector: React.FC<PresentationTypeProps> = ({ onClose }) => {
  const [selectedType, setSelectedType] = useState<'document' | 'slide' | null>(null);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');
  const [documentType, setDocumentType] = useState('business');
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<number | null>(null);
  const [templates, setTemplates] = useState<APITemplates | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Load templates when component mounts
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await axios.get('/api/v2/presentation-types/templates/');
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to load templates:', error);
      setError('Failed to load templates');
    }
  };

  const handleTypeSelect = (type: 'document' | 'slide') => {
    setSelectedType(type);
    setError(null);
  };

  const handleContinue = () => {
    if (selectedType === 'document') {
      setShowAIGenerator(true);
    } else if (selectedType === 'slide') {
      setShowAIGenerator(true);
    }
  };

  const handleManualCreate = () => {
    if (selectedType === 'document') {
      navigate('/document/new');
    } else if (selectedType === 'slide') {
      navigate('/slides/new');
    }
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      setError('Please enter a description for your presentation');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      let response: any;
      
      if (selectedType === 'document') {
        response = await axios.post('/api/v2/presentation-types/generate_document_ai/', {
          prompt: aiPrompt,
          document_type: documentType,
          template_id: selectedTemplate
        });
      } else if (selectedType === 'slide') {
        if (!selectedTheme) {
          setError('Please select a theme for your slide presentation');
          return;
        }

        response = await axios.post('/api/v2/presentation-types/generate_slides_ai/', {
          prompt: aiPrompt,
          theme_id: selectedTheme,
          slide_size: '16:9'
        });
      }

      if (response?.data?.task_id) {
        // Start polling for task completion
        pollTaskStatus(response.data.task_id, selectedType!);
      }
    } catch (error: any) {
      console.error('AI generation failed:', error);
      setError(error.response?.data?.error || 'AI generation failed. Please try again.');
      setIsGenerating(false);
    }
  };

  const pollTaskStatus = async (taskId: string, type: 'document' | 'slide') => {
    const maxAttempts = 60; // Poll for up to 5 minutes (60 * 5 seconds)
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const response = await axios.get(`/api/v2/presentation-types/check_generation_status/?task_id=${taskId}`);
        
        if (response.data.status === 'completed') {
          // Task completed successfully
          setIsGenerating(false);
          const result = response.data.result;
          
          if (type === 'document' && result.document_data) {
            navigate(`/document/${result.document_data.id}`, {
              state: {
                generatedDocument: result.document_data,
                aiAnalysis: result.ai_analysis
              }
            });
          } else if (type === 'slide' && result.presentation_data) {
            navigate(`/slides/${result.presentation_data.id}`, {
              state: {
                generatedPresentation: result.presentation_data,
                aiAnalysis: result.ai_analysis
              }
            });
          }
        } else if (response.data.status === 'failed') {
          // Task failed
          setIsGenerating(false);
          setError(response.data.error || 'AI generation failed. Please try again.');
        } else if (response.data.status === 'processing') {
          // Task still processing
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(checkStatus, 5000); // Check again in 5 seconds
          } else {
            setIsGenerating(false);
            setError('AI generation is taking too long. Please try again later.');
          }
        }
      } catch (error: any) {
        console.error('Status check failed:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000); // Retry in 5 seconds
        } else {
          setIsGenerating(false);
          setError('Unable to check generation status. Please try again.');
        }
      }
    };

    // Start checking status
    setTimeout(checkStatus, 2000); // Wait 2 seconds before first check
  };

  const presentationTypes = [
    {
      id: 'document',
      name: 'Document',
      description: 'Create professional documents like Microsoft Word',
      features: [
        'Chapter and section structure',
        'Professional formatting',
        'Table of contents',
        'Rich text editing',
        'Academic templates'
      ],
      icon: FiFileText,
      color: 'blue',
      preview: '/api/placeholder/400/300'
    },
    {
      id: 'slide',
      name: 'Slide Presentation',
      description: 'Create slide presentations like Microsoft PowerPoint',
      features: [
        'Professional themes',
        'Slide templates',
        'Zone-based layouts',
        'Transitions & animations',
        'Media integration'
      ],
      icon: FiMonitor,
      color: 'purple',
      preview: '/api/placeholder/400/300'
    }
  ];

  if (showAIGenerator) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <FiZap className={`${selectedType === 'document' ? 'text-blue-600' : 'text-purple-600'}`} />
                  AI-Powered {selectedType === 'document' ? 'Document' : 'Slide'} Generator
                </h2>
                <p className="text-gray-600 mt-1">
                  Describe what you want to create and AI will generate it for you
                </p>
              </div>
              <button
                onClick={() => setShowAIGenerator(false)}
                disabled={isGenerating}
                className="text-gray-400 hover:text-gray-600 text-2xl disabled:opacity-50"
              >
                ×
              </button>
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            <div className="space-y-6">
              {/* AI Prompt Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Describe your {selectedType === 'document' ? 'document' : 'presentation'}
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAIPrompt(e.target.value)}
                  placeholder={selectedType === 'document' 
                    ? "Example: Create a business proposal for cloud migration including cost analysis, timeline, and benefits"
                    : "Example: Create a marketing presentation for our new product launch with slides about features, benefits, and pricing"
                  }
                  rows={4}
                  disabled={isGenerating}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              {selectedType === 'document' && (
                <>
                  {/* Document Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Document Type
                    </label>
                    <select
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value)}
                      disabled={isGenerating}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    >
                      <option value="business">Business Report</option>
                      <option value="academic">Academic Paper</option>
                      <option value="technical">Technical Documentation</option>
                      <option value="proposal">Project Proposal</option>
                      <option value="research">Research Paper</option>
                    </select>
                  </div>

                  {/* Template Selection */}
                  {templates?.document_templates && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Template (Optional)
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setSelectedTemplate(null)}
                          disabled={isGenerating}
                          className={`p-3 text-left border rounded-lg transition-colors disabled:opacity-50 ${
                            selectedTemplate === null 
                              ? 'border-blue-500 bg-blue-50 text-blue-700' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-medium">Default</div>
                          <div className="text-sm text-gray-600">AI will choose optimal formatting</div>
                        </button>
                        {templates.document_templates.map((template) => (
                          <button
                            key={template.id}
                            onClick={() => setSelectedTemplate(template.id)}
                            disabled={isGenerating}
                            className={`p-3 text-left border rounded-lg transition-colors disabled:opacity-50 ${
                              selectedTemplate === template.id 
                                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="font-medium">{template.name}</div>
                            <div className="text-sm text-gray-600">{template.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {selectedType === 'slide' && templates?.slide_themes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theme Selection *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {templates.slide_themes.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => setSelectedTheme(theme.id)}
                        disabled={isGenerating}
                        className={`p-4 text-left border rounded-lg transition-colors disabled:opacity-50 ${
                          selectedTheme === theme.id 
                            ? 'border-purple-500 bg-purple-50 text-purple-700' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-6 h-6 rounded-full" 
                            style={{ backgroundColor: theme.colors?.primary || '#6366f1' }}
                          />
                          <div>
                            <div className="font-medium">{theme.name}</div>
                            <div className="text-sm text-gray-600">Professional theme</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-6 border-t border-gray-200 mt-6">
              <button
                onClick={handleManualCreate}
                disabled={isGenerating}
                className="text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Create manually instead
              </button>
              
              <button
                onClick={handleAIGenerate}
                disabled={isGenerating || !aiPrompt.trim()}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors
                  ${selectedType === 'document'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300'
                    : 'bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-300'
                  }
                `}
              >
                {isGenerating ? (
                  <>
                    <FiLoader className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FiZap className="w-4 h-4" />
                    Generate with AI
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FiBook className="text-blue-600" />
                Choose Presentation Type
              </h2>
              <p className="text-gray-600 mt-1">
                Select the type of presentation you want to create
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {presentationTypes.map((type) => {
              const IconComponent = type.icon;
              const isSelected = selectedType === type.id;
              
              return (
                <div
                  key={type.id}
                  onClick={() => handleTypeSelect(type.id as 'document' | 'slide')}
                  className={`
                    relative cursor-pointer rounded-xl border-2 transition-all duration-200 p-6
                    ${isSelected 
                      ? type.color === 'blue' 
                        ? 'border-blue-500 bg-blue-50 shadow-lg' 
                        : 'border-purple-500 bg-purple-50 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }
                  `}
                >
                  {isSelected && (
                    <div className={`absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center
                      ${type.color === 'blue' ? 'bg-blue-500' : 'bg-purple-500'}`}>
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg
                      ${type.color === 'blue' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                      <IconComponent className={`w-8 h-8
                        ${type.color === 'blue' ? 'text-blue-600' : 'text-purple-600'}`} />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {type.name}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {type.description}
                      </p>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-800">Key Features:</h4>
                        <ul className="space-y-1">
                          {type.features.map((feature, index) => (
                            <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                              <div className={`w-1.5 h-1.5 rounded-full
                                ${type.color === 'blue' ? 'bg-blue-400' : 'bg-purple-400'}`} />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center">
                      {type.id === 'document' ? (
                        <div className="w-full h-full bg-white border-2 border-gray-200 p-4 text-xs">
                          <div className="h-2 bg-gray-800 mb-2 w-3/4" />
                          <div className="h-1 bg-gray-400 mb-1 w-full" />
                          <div className="h-1 bg-gray-400 mb-1 w-5/6" />
                          <div className="h-1 bg-gray-400 mb-2 w-4/5" />
                          <div className="h-1.5 bg-gray-600 mb-1 w-2/3" />
                          <div className="h-1 bg-gray-400 mb-1 w-full" />
                          <div className="h-1 bg-gray-400 w-3/4" />
                        </div>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-600 p-4 text-white text-xs">
                          <div className="h-3 bg-white bg-opacity-90 mb-3 w-3/4 rounded" />
                          <div className="flex gap-2 mb-2">
                            <div className="w-12 h-8 bg-white bg-opacity-70 rounded" />
                            <div className="flex-1">
                              <div className="h-1 bg-white bg-opacity-70 mb-1 rounded" />
                              <div className="h-1 bg-white bg-opacity-70 rounded" />
                            </div>
                          </div>
                          <div className="h-1 bg-white bg-opacity-50 mb-1 w-full rounded" />
                          <div className="h-1 bg-white bg-opacity-50 w-4/5 rounded" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedType && (
            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FiPlay className="w-4 h-4" />
                {selectedType === 'document' ? 'Document' : 'Slide Presentation'} selected
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleManualCreate}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Create Manually
                </button>
                <button
                  onClick={handleContinue}
                  className={`
                    flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors
                    ${selectedType === 'document'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }
                  `}
                >
                  <FiZap className="w-4 h-4" />
                  Generate with AI
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PresentationTypeSelector;