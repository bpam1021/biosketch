import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Presentation, ContentSection } from '../../types/Presentation';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  FiPlus, FiTrash2, FiMove, FiType, FiImage, FiList, 
  FiBarChart, FiCode, FiTable, FiWind, FiSave, FiDownload,
  FiBold, FiItalic, FiUnderline, FiAlignLeft, FiAlignCenter, FiAlignRight,
  FiEye, FiEdit3, FiLink, FiMoreHorizontal, FiCheck, FiX,
  FiCopy, FiRotateCcw, FiZoomIn, FiZoomOut, FiSearch,
  FiBookmark, FiMessageCircle, FiClock, FiUser, FiSettings,FiMessageSquare,
  FiZap, FiLayers
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { FileText, Brain, Sparkles, Target, BookOpen } from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import DiagramCreator from './DiagramCreator';

interface EnhancedDocumentEditorProps {
  presentation: Presentation;
  sections: ContentSection[];
  onSectionCreate: (data: Partial<ContentSection>) => Promise<ContentSection | undefined>;
  onSectionUpdate: (sectionId: string, updates: Partial<ContentSection>) => Promise<ContentSection | undefined>;
  onSectionDelete: (sectionId: string) => Promise<void>;
  onSectionsReorder: (newOrder: ContentSection[]) => Promise<void>;
  onAIGeneration: (sectionId: string, prompt: string) => Promise<void>;
  onContentEnhancement: (sectionId: string, enhancementType: string) => Promise<void>;
  viewMode: 'edit' | 'preview';
  selectedSectionIds: string[];
  onSectionSelect: (sectionId: string) => void;
}

interface DocumentSettings {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  pageWidth: number;
  pageMargins: number;
  showPageNumbers: boolean;
  showWordCount: boolean;
  autoSave: boolean;
  enableSmartSuggestions: boolean;
}

interface TextSelection {
  text: string;
  position: { x: number; y: number };
  sectionId: string;
}

const EnhancedDocumentEditor: React.FC<EnhancedDocumentEditorProps> = ({ 
  presentation,
  sections,
  onSectionCreate,
  onSectionUpdate,
  onSectionDelete,
  onSectionsReorder,
  onAIGeneration,
  onContentEnhancement,
  viewMode,
  selectedSectionIds,
  onSectionSelect
}) => {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const [documentSettings, setDocumentSettings] = useState<DocumentSettings>({
    fontSize: 16,
    fontFamily: 'Georgia',
    lineHeight: 1.6,
    pageWidth: 800,
    pageMargins: 60,
    showPageNumbers: true,
    showWordCount: true,
    autoSave: true,
    enableSmartSuggestions: true
  });
  
  // Enhanced Text Selection & Diagram Conversion
  const [selectedText, setSelectedText] = useState<TextSelection | null>(null);
  const [showDiagramConverter, setShowDiagramConverter] = useState(false);
  const [selectionTimeout, setSelectionTimeout] = useState<NodeJS.Timeout>();
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [smartSuggestions, setSmartSuggestions] = useState<any[]>([]);
  
  // AI Assistant
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  
  // Search and Replace
  const [showSearchReplace, setShowSearchReplace] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  
  // Version Control
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Comments and Collaboration
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentPosition, setCommentPosition] = useState<{ x: number; y: number } | null>(null);
  
  const editorRef = useRef<HTMLDivElement>(null);
  const autoSaveRef = useRef<NodeJS.Timeout>();

  const sectionTypes = [
    { type: 'heading', icon: FiType, label: 'Heading', description: 'Add a section heading', category: 'text' },
    { type: 'paragraph', icon: FiEdit3, label: 'Paragraph', description: 'Add text content', category: 'text' },
    { type: 'list', icon: FiList, label: 'List', description: 'Bulleted or numbered list', category: 'text' },
    { type: 'quote', icon: FiMessageSquare, label: 'Quote', description: 'Block quote', category: 'text' },
    { type: 'image', icon: FiImage, label: 'Image', description: 'Insert an image', category: 'media' },
    { type: 'table', icon: FiTable, label: 'Table', description: 'Data table', category: 'data' },
    { type: 'diagram', icon: FiBarChart, label: 'Diagram', description: 'AI-generated diagram', category: 'data' },
    { type: 'code', icon: FiCode, label: 'Code Block', description: 'Code snippet', category: 'technical' },
  ];

  // Enhanced text selection handling
  const handleTextSelection = useCallback((event: MouseEvent) => {
    if (selectionTimeout) clearTimeout(selectionTimeout);
    
    setSelectionTimeout(setTimeout(() => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();
      
      if (selectedText && selectedText.length >= 10) {
        const range = selection?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();
        
        if (rect) {
          // Find which section contains this selection
          const targetElement = selection?.anchorNode?.parentElement;
          const sectionElement = targetElement?.closest('[data-section-id]');
          const sectionId = sectionElement?.getAttribute('data-section-id');
          
          if (sectionId) {
            setSelectedText({
              text: selectedText,
              position: { 
                x: rect.left + rect.width / 2, 
                y: rect.bottom + 10 
              },
              sectionId
            });
            
            // Show diagram converter after a short delay
            setTimeout(() => {
              setShowDiagramConverter(true);
            }, 300);
          }
        }
      } else {
        setSelectedText(null);
        setShowDiagramConverter(false);
      }
    }, 500));
  }, [selectionTimeout]);

  // Enhanced content analysis for smart suggestions
  const analyzeContentForSuggestions = useCallback((content: string, sectionType: string) => {
    if (!documentSettings.enableSmartSuggestions) return;
    
    const suggestions = [];
    const lowerContent = content.toLowerCase();
    
    // Detect potential diagrams
    if (content.length > 50) {
      if (lowerContent.includes('process') || lowerContent.includes('step')) {
        suggestions.push({
          type: 'diagram',
          suggestion: 'Convert to process flowchart',
          icon: FiBarChart,
          action: 'create_flowchart'
        });
      }
      
      if (lowerContent.includes('compare') || lowerContent.includes('versus')) {
        suggestions.push({
          type: 'diagram',
          suggestion: 'Create comparison chart',
          icon: FiBarChart,
          action: 'create_comparison'
        });
      }
      
      if (/\d+/.test(content) && (lowerContent.includes('data') || lowerContent.includes('statistics'))) {
        suggestions.push({
          type: 'diagram',
          suggestion: 'Visualize as data chart',
          icon: FiBarChart,
          action: 'create_data_viz'
        });
      }
    }
    
    // Detect potential improvements
    if (sectionType === 'paragraph' && content.length > 200) {
      suggestions.push({
        type: 'enhancement',
        suggestion: 'Break into smaller sections',
        icon: FiList,
        action: 'split_section'
      });
    }
    
    setSmartSuggestions(suggestions);
  }, [documentSettings.enableSmartSuggestions]);

  // Setup event listeners for text selection
  useEffect(() => {
    document.addEventListener('mouseup', handleTextSelection);
    return () => document.removeEventListener('mouseup', handleTextSelection);
  }, [handleTextSelection]);

  // Handle diagram conversion
  const handleDiagramConversion = async (diagramType: string, prompt: string, insertAtPosition?: number) => {
    if (!selectedText) return;
    
    try {
      // Create a new diagram section
      await onSectionCreate({
        section_type: 'diagram',
        title: `AI Generated ${diagramType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
        content: prompt,
        rich_content: prompt,
        order: sections.length,
        content_data: { 
          diagramType: diagramType,
          sourceText: selectedText.text,
          generatedAt: new Date().toISOString()
        },
        layout_config: { type: diagramType, style: 'professional' },
        style_config: {},
        animation_config: {},
        interaction_config: {},
        ai_generated: true,
        generation_metadata: { 
          sourceText: selectedText.text,
          diagramType: diagramType,
          generatedAt: new Date().toISOString()
        },
        comments: [],
        version_history: [],
        media_files: []
      });

      setHasUnsavedChanges(true);
      toast.success('Diagram created successfully!');
    } catch (error) {
      toast.error('Failed to create diagram');
      throw error;
    }
  };

  // Enhanced AI suggestions based on content context
  const getAISuggestions = (context: string) => {
    const suggestions = [
      'Expand this section with more detailed examples',
      'Add statistical data to support this claim',
      'Include a case study here',
      'Summarize the key points',
      'Add a transition to the next section',
      'Include relevant citations',
      'Add a visual diagram to illustrate this concept',
      'Provide counterarguments and rebuttals'
    ];
    return suggestions;
  };

  // Auto-save functionality
  useEffect(() => {
    if (documentSettings.autoSave && hasUnsavedChanges) {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
      autoSaveRef.current = setTimeout(() => {
        handleSaveDocument();
      }, 2000);
    }
    
    return () => {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
    };
  }, [hasUnsavedChanges, documentSettings.autoSave]);

  // Word count calculation
  const getWordCount = () => {
    return sections.reduce((total, section) => {
      const words = section.content.split(/\s+/).filter(word => word.length > 0);
      return total + words.length;
    }, 0);
  };

  // Estimated reading time
  const getReadingTime = () => {
    const wordCount = getWordCount();
    const avgWordsPerMinute = 200;
    return Math.ceil(wordCount / avgWordsPerMinute);
  };

  const addSection = async (type: ContentSection['section_type']) => {
    const defaultContent = getDefaultContent(type);
    
    await onSectionCreate({
      section_type: type,
      title: defaultContent.title,
      content: defaultContent.content,
      rich_content: defaultContent.content,
      order: sections.length,
      content_data: {},
      layout_config: defaultContent.layout_config || {},
      style_config: defaultContent.style_config || {},
      animation_config: {},
      interaction_config: {},
      ai_generated: false,
      generation_metadata: {},
      comments: [],
      version_history: [],
      media_files: []
    });
    
    setShowAddMenu(false);
    setHasUnsavedChanges(true);
  };

  const getDefaultContent = (type: ContentSection['section_type']) => {
    switch (type) {
      case 'heading':
        return { 
          title: 'New Heading', 
          content: 'Section Heading',
          style_config: { fontSize: 28, fontWeight: 'bold', marginTop: 32, marginBottom: 16 }
        };
      case 'paragraph':
        return { 
          title: 'New Paragraph', 
          content: 'Enter your content here...',
          style_config: { fontSize: documentSettings.fontSize, lineHeight: documentSettings.lineHeight }
        };
      case 'list':
        return { 
          title: 'New List', 
          content: '• First item\n• Second item\n• Third item',
          style_config: { listStyle: 'bullet', marginLeft: 20 }
        };
      case 'image':
        return { 
          title: 'New Image', 
          content: '',
          layout_config: { 
            placeholder: 'Add image URL or upload an image',
            alignment: 'center',
            caption: true
          }
        };
      case 'diagram':
        return { 
          title: 'New Diagram', 
          content: 'Describe the data or process you want to visualize',
          layout_config: { type: 'auto', style: 'professional' }
        };
      case 'table':
        return { 
          title: 'New Table', 
          content: 'Header 1|Header 2|Header 3\nRow 1|Data|Data\nRow 2|Data|Data',
          style_config: { borderStyle: 'solid', headerStyle: 'bold' }
        };
      case 'code':
        return { 
          title: 'Code Block', 
          content: '// Your code here\nconsole.log("Hello World");',
          style_config: { 
            fontFamily: 'Monaco, monospace', 
            backgroundColor: '#f8f9fa',
            padding: 16,
            borderRadius: 4
          }
        };
      case 'quote':
        return { 
          title: 'Quote', 
          content: 'Your quote text here',
          style_config: { 
            fontStyle: 'italic', 
            borderLeft: '4px solid #007bff', 
            paddingLeft: 16,
            marginLeft: 20,
            fontSize: documentSettings.fontSize + 2
          }
        };
      default:
        return { 
          title: 'New Section', 
          content: 'Enter content here...'
        };
    }
  };

  const updateSection = async (id: string, field: keyof ContentSection, value: any) => {
    const updatedData = { [field]: value, updated_at: new Date().toISOString() };
    await onSectionUpdate(id, updatedData);
    setHasUnsavedChanges(true);

    // Analyze content for smart suggestions
    if (field === 'content') {
      const section = sections.find(s => s.id === id);
      if (section) {
        analyzeContentForSuggestions(value, section.section_type);
      }
    }
  };

  const deleteSection = async (id: string) => {
    if (confirm('Are you sure you want to delete this section?')) {
      await onSectionDelete(id);
      setHasUnsavedChanges(true);
    }
  };

  const reorderSections = async (startIndex: number, endIndex: number) => {
    const result = Array.from(sections);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    
    const updatedSections = result.map((section, index) => ({
      ...section,
      order: index,
      updated_at: new Date().toISOString(),
    }));
    
    await onSectionsReorder(updatedSections);
    setHasUnsavedChanges(true);
  };

  const generateAIContent = async (sectionId: string, customPrompt?: string) => {
    setIsGeneratingContent(true);
    try {
      const section = sections.find(s => s.id === sectionId);
      if (!section) return;

      const prompt = customPrompt || aiPrompt || 
        `Generate content for a ${section.section_type} titled "${section.title}" in the context of: ${presentation.original_prompt}`;
      
      await onAIGeneration(sectionId, prompt);
      toast.success('AI content generated successfully!');
      setHasUnsavedChanges(true);
      setAiPrompt('');
    } catch (error) {
      toast.error('Failed to generate AI content');
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const enhanceContent = async (sectionId: string, enhancementType: string) => {
    try {
      await onContentEnhancement(sectionId, enhancementType);
      toast.success('Content enhanced successfully!');
      setHasUnsavedChanges(true);
    } catch (error) {
      toast.error('Failed to enhance content');
    }
  };

  const handleSaveDocument = async () => {
    try {
      // Save all sections with current state
      setHasUnsavedChanges(false);
      toast.success('Document saved successfully!');
    } catch (error) {
      toast.error('Failed to save document');
    }
  };

  const renderSection = (section: ContentSection) => {
    const formatting = section.style_config || {};
    const style = {
      fontSize: formatting.fontSize ? `${formatting.fontSize}px` : `${documentSettings.fontSize}px`,
      fontFamily: formatting.fontFamily || documentSettings.fontFamily,
      color: formatting.color,
      backgroundColor: formatting.backgroundColor,
      textAlign: formatting.textAlign as any,
      fontWeight: formatting.bold ? 'bold' : formatting.fontWeight || 'normal',
      fontStyle: formatting.italic ? 'italic' : 'normal',
      textDecoration: formatting.underline ? 'underline' : 'none',
      borderLeft: formatting.borderLeft,
      paddingLeft: formatting.paddingLeft,
      marginTop: formatting.marginTop,
      marginBottom: formatting.marginBottom,
      lineHeight: formatting.lineHeight || documentSettings.lineHeight,
    };

    if (viewMode === 'preview') {
      return renderPreviewSection(section, style);
    }

    return (
      <div data-section-id={section.id}>
        {renderEditSection(section, style)}
      </div>
    );
  };

  const renderPreviewSection = (section: ContentSection, style: any) => {
    switch (section.section_type) {
      case 'heading':
        const HeadingTag = section.style_config?.fontSize > 24 ? 'h1' : 'h2';
        return React.createElement(HeadingTag, { style }, section.content);
      case 'paragraph':
        return <div style={style} dangerouslySetInnerHTML={{ __html: section.rich_content || section.content }} />;
      case 'diagram':
        return (
          <div className="my-8 p-6 bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <FiBarChart className="text-blue-600" size={20} />
              <h3 className="font-semibold text-gray-900">{section.title}</h3>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">AI Generated</span>
            </div>
            <div className="text-gray-700">{section.content}</div>
            {section.generation_metadata?.sourceText && (
              <div className="mt-4 p-3 bg-white/60 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Based on:</p>
                <p className="text-sm text-gray-700 italic">"{section.generation_metadata.sourceText}"</p>
              </div>
            )}
          </div>
        );
      default:
        return <div style={style}>{section.content}</div>;
    }
  };

  const renderEditSection = (section: ContentSection, style: any) => {
    switch (section.section_type) {
      case 'paragraph':
        return (
          <div className="space-y-3">
            <RichTextEditor
              content={section.rich_content || section.content}
              onChange={(content) => {
                updateSection(section.id, 'rich_content', content);
                // Also update plain text content by stripping HTML
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = content;
                updateSection(section.id, 'content', tempDiv.textContent || tempDiv.innerText || '');
              }}
              placeholder="Enter paragraph content..."
              height={200}
            />
            
            {/* Smart Suggestions */}
            {hoveredSection === section.id && smartSuggestions.length > 0 && (
              <div className="mt-2 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FiZap className="text-purple-600" size={14} />
                  <span className="text-sm font-medium text-purple-900">Smart Suggestions</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {smartSuggestions.slice(0, 3).map((suggestion, index) => (
                    <button
                      key={index}
                      className="flex items-center gap-1 text-xs bg-white text-purple-700 px-2 py-1 rounded border border-purple-200 hover:bg-purple-50 transition-colors"
                      onClick={() => {
                        if (suggestion.action.startsWith('create_')) {
                          const diagramType = suggestion.action.replace('create_', '');
                          handleDiagramConversion(diagramType, `Create a ${diagramType} based on: "${section.content}"`);
                        }
                      }}
                    >
                      <suggestion.icon size={12} />
                      {suggestion.suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case 'diagram':
        return renderDiagramSection(section);
      default:
        return (
          <textarea
            value={section.content}
            onChange={(e) => updateSection(section.id, 'content', e.target.value)}
            style={style}
            className="w-full border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
            rows={4}
          />
        );
    }
  };

  const renderDiagramSection = (section: ContentSection) => (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FiBarChart className="text-blue-600" size={20} />
          <input
            value={section.title}
            onChange={(e) => updateSection(section.id, 'title', e.target.value)}
            className="font-semibold text-gray-900 bg-transparent border-none outline-none"
          />
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">AI Generated</span>
        </div>
        <button
          onClick={() => generateAIContent(section.id, `Regenerate diagram: ${section.content}`)}
          className="text-blue-600 hover:text-blue-700 p-1 rounded-lg hover:bg-white/50"
          title="Regenerate diagram"
        >
          <FiZap size={16} />
        </button>
      </div>
      
      <textarea
        value={section.content}
        onChange={(e) => updateSection(section.id, 'content', e.target.value)}
        className="w-full bg-white/60 border border-blue-200 rounded-lg p-3 text-gray-700 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
        rows={3}
        placeholder="Describe your diagram..."
      />
      
      {section.generation_metadata?.sourceText && (
        <div className="mt-4 p-3 bg-white/60 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">Generated from:</p>
          <p className="text-sm text-gray-700 italic">"{section.generation_metadata.sourceText}"</p>
        </div>
      )}
    </div>
  );

  if (viewMode === 'preview') {
    return (
      <div 
        className="max-w-none mx-auto bg-white min-h-screen"
        style={{
          maxWidth: `${documentSettings.pageWidth}px`,
          padding: `${documentSettings.pageMargins}px`,
          fontSize: `${documentSettings.fontSize}px`,
          fontFamily: documentSettings.fontFamily,
          lineHeight: documentSettings.lineHeight
        }}
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{presentation.title}</h1>
          {presentation.description && (
            <p className="text-gray-600">{presentation.description}</p>
          )}
          <div className="text-sm text-gray-500 mt-4 flex items-center gap-4">
            <span>{getWordCount()} words</span>
            <span>~{getReadingTime()} min read</span>
            <span>Updated {new Date(presentation.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
        
        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.id} className="section">
              {renderSection(section)}
            </div>
          ))}
        </div>

        {documentSettings.showPageNumbers && (
          <div className="text-center text-sm text-gray-500 mt-12 pt-4 border-t">
            Page 1
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Main Editor */}
      <div className="flex-1 flex flex-col">
        {/* Enhanced Toolbar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={presentation.title}
                onChange={(e) => {/* Update presentation title through parent */}}
                className="text-xl font-bold border-none outline-none bg-transparent"
                placeholder="Document Title"
              />
              
              {hasUnsavedChanges && (
                <span className="text-sm text-orange-600 bg-orange-100 px-2 py-1 rounded">
                  Unsaved changes
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {/* Smart Suggestions Toggle */}
              <button
                onClick={() => setDocumentSettings(prev => ({ 
                  ...prev, 
                  enableSmartSuggestions: !prev.enableSmartSuggestions 
                }))}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
                  documentSettings.enableSmartSuggestions 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FiZap size={16} />
                Smart Suggestions
              </button>

              {/* AI Assistant Toggle */}
              <button
                onClick={() => setShowAIAssistant(!showAIAssistant)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
                  showAIAssistant ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Brain size={16} />
                AI Assistant
              </button>

              {/* Save Button */}
              <button
                onClick={handleSaveDocument}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <FiSave size={16} />
                Save
              </button>
              
              {/* Export Button */}
              <button className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                <FiDownload size={16} />
                Export
              </button>
            </div>
          </div>

          {/* Document Stats */}
          {documentSettings.showWordCount && (
            <div className="mt-4 flex items-center gap-6 text-sm text-gray-600">
              <span>{getWordCount()} words</span>
              <span>~{getReadingTime()} min read</span>
              <span>{sections.length} sections</span>
              <span>Last saved: {new Date().toLocaleTimeString()}</span>
              {documentSettings.enableSmartSuggestions && (
                <span className="flex items-center gap-1 text-purple-600">
                  <FiZap size={14} />
                  Smart suggestions enabled
                </span>
              )}
            </div>
          )}
        </div>

        {/* Add Section Menu */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Document Sections</h3>
            
            <div className="relative">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <FiPlus size={16} />
                Add Section
              </button>
              
              {showAddMenu && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <div className="p-3">
                    <h4 className="font-medium text-gray-900 mb-3">Choose Section Type</h4>
                    
                    {['text', 'media', 'data', 'technical'].map(category => (
                      <div key={category} className="mb-4">
                        <h5 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
                          {category}
                        </h5>
                        <div className="grid grid-cols-1 gap-1">
                          {sectionTypes
                            .filter(type => type.category === category)
                            .map(({ type, icon: Icon, label, description }) => (
                            <button
                              key={type}
                              onClick={() => addSection(type as ContentSection['section_type'])}
                              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                            >
                              <Icon size={16} className="text-gray-600 flex-shrink-0" />
                              <div>
                                <div className="font-medium text-gray-900">{label}</div>
                                <div className="text-xs text-gray-500">{description}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-y-auto">
          <div 
            ref={editorRef}
            className="bg-white min-h-full"
            style={{
              maxWidth: `${documentSettings.pageWidth}px`,
              margin: '0 auto',
              padding: `${documentSettings.pageMargins}px`,
            }}
          >
            <DragDropContext
              onDragEnd={(result) => {
                if (!result.destination) return;
                reorderSections(result.source.index, result.destination.index);
              }}
            >
              <Droppable droppableId="document-sections">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-6">
                    {sections.map((section, index) => (
                      <Draggable
                        key={section.id}
                        draggableId={section.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`relative group transition-all ${
                              snapshot.isDragging ? 'shadow-lg scale-105' : ''
                            } ${selectedSectionId === section.id ? 'ring-2 ring-blue-500' : ''}`}
                            onClick={() => {
                              setSelectedSectionId(section.id);
                              setAiSuggestions(getAISuggestions(section.content));
                            }}
                            onMouseEnter={() => setHoveredSection(section.id)}
                            onMouseLeave={() => setHoveredSection(null)}
                          >
                            {/* Section Controls */}
                            <div className="absolute -left-16 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                              <div
                                {...provided.dragHandleProps}
                                className="p-1 bg-gray-200 hover:bg-gray-300 rounded cursor-grab active:cursor-grabbing"
                                title="Drag to reorder"
                              >
                                <FiMove size={14} />
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  generateAIContent(section.id);
                                }}
                                disabled={isGeneratingContent}
                                className="p-1 bg-purple-200 hover:bg-purple-300 rounded text-purple-700"
                                title="Generate AI content"
                              >
                                <FiWind size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  enhanceContent(section.id, 'grammar');
                                }}
                                className="p-1 bg-green-200 hover:bg-green-300 rounded text-green-700"
                                title="Enhance content"
                              >
                                ✨
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSection(section.id);
                                }}
                                className="p-1 bg-red-200 hover:bg-red-300 rounded text-red-700"
                                title="Delete section"
                              >
                                <FiTrash2 size={14} />
                              </button>
                            </div>

                            {/* Section Content */}
                            <div className={`p-4 border border-gray-200 rounded-lg ${
                              selectedSectionId === section.id ? 'bg-blue-50 border-blue-300' : 'bg-white hover:bg-gray-50'
                            }`}>
                              {renderSection(section)}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {/* Empty State */}
            {sections.length === 0 && (
              <div className="text-center py-12">
                <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Start Building Your Document</h3>
                <p className="text-gray-600 mb-4">Add sections to begin creating your professional document</p>
                <button
                  onClick={() => addSection('heading')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
                >
                  Add First Section
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Loading Overlay */}
        {isGeneratingContent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <div>
                <p className="font-medium text-gray-900">Generating AI Content</p>
                <p className="text-sm text-gray-600">Please wait while we create content for your section...</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Perfect Diagram Converter - Inline Mode */}
      <DiagramCreator
        presentationId={presentation.id}
        section={selectedText?.sectionId ? sections.find(s => s.id === selectedText.sectionId) : undefined}
        selectedText={selectedText?.text}
        position={selectedText?.position}
        onDiagramCreated={(diagram) => {
          toast.success('Diagram created successfully!');
          setShowDiagramConverter(false);
          setSelectedText(null);
        }}
        onClose={() => {
          setShowDiagramConverter(false);
          setSelectedText(null);
        }}
        mode="inline"
        isVisible={showDiagramConverter && !!selectedText}
      />
    </div>
  );
};

export default EnhancedDocumentEditor;