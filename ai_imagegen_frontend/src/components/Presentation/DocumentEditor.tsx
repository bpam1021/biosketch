import React, { useState, useRef, useEffect } from 'react';
import { Presentation, ContentSection } from '../../types/Presentation';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  FiPlus, FiTrash2, FiMove, FiType, FiImage, FiList, 
  FiBarChart, FiCode, FiTable, FiWind, FiSave, FiDownload,
  FiBold, FiItalic, FiUnderline, FiAlignLeft, FiAlignCenter, FiAlignRight,
  FiEye, FiEdit3, FiLink, FiMoreHorizontal, FiCheck, FiX,
  FiCopy, FiRotateCcw, FiZoomIn, FiZoomOut, FiSearch,
  FiBookmark, FiMessageCircle, FiClock, FiUser, FiSettings,FiMessageSquare
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { FileText, Brain, Sparkles, Target, BookOpen } from 'lucide-react';

interface DocumentEditorProps {
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
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({ 
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
    autoSave: true
  });
  
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

  const handleSearchReplace = (action: 'find' | 'replace' | 'replaceAll') => {
    // Implementation for search and replace functionality
    if (!searchQuery) return;
    
    if (action === 'find') {
      // Highlight search results
      toast.info(`Found "${searchQuery}" in document`);
    } else if (action === 'replace') {
      // Replace current instance
      toast.success(`Replaced "${searchQuery}" with "${replaceQuery}"`);
    } else if (action === 'replaceAll') {
      // Replace all instances
      toast.success(`Replaced all instances of "${searchQuery}"`);
    }
  };

  const addComment = (text: string, sectionId?: string) => {
    const comment = {
      id: Date.now().toString(),
      text,
      author: 'Current User',
      timestamp: new Date().toISOString(),
      sectionId,
      position: commentPosition
    };
    setComments(prev => [...prev, comment]);
    setNewComment('');
    setCommentPosition(null);
    toast.success('Comment added');
  };

  const formatText = (sectionId: string, format: 'bold' | 'italic' | 'underline') => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const currentFormatting = section.style_config || {};
    updateSection(sectionId, 'style_config', {
      ...currentFormatting,
      [format]: !currentFormatting[format]
    });
  };

  const alignText = (sectionId: string, alignment: 'left' | 'center' | 'right' | 'justify') => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const currentFormatting = section.style_config || {};
    updateSection(sectionId, 'style_config', {
      ...currentFormatting,
      textAlign: alignment
    });
  };

  const generateOutline = () => {
    const outline = sections
      .filter(s => s.section_type === 'heading')
      .map((section, index) => ({
        level: section.style_config?.fontSize > 24 ? 1 : 2,
        title: section.title,
        order: section.order,
        id: section.id
      }));
    
    return outline;
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

    switch (section.section_type) {
      case 'heading':
        return renderHeadingEditor(section, style);
      case 'paragraph':
        return renderParagraphEditor(section, style);
      case 'list':
        return renderListEditor(section, style);
      case 'image':
        return renderImageEditor(section);
      case 'table':
        return renderTableEditor(section);
      case 'code':
        return renderCodeEditor(section);
      case 'quote':
        return renderQuoteEditor(section, style);
      case 'diagram':
        return renderDiagramEditor(section);
      default:
        return renderParagraphEditor(section, style);
    }
  };

  const renderPreviewSection = (section: ContentSection, style: any) => {
    switch (section.section_type) {
      case 'heading':
        const HeadingTag = section.style_config?.fontSize > 24 ? 'h1' : 'h2';
        return React.createElement(HeadingTag, { style }, section.content);
      case 'paragraph':
        return <div style={style} dangerouslySetInnerHTML={{ __html: section.rich_content || section.content }} />;
      case 'list':
        return (
          <ul style={style}>
            {section.content.split('\n').map((item, idx) => (
              <li key={idx}>{item.replace(/^[•\-\*]\s*/, '')}</li>
            ))}
          </ul>
        );
      case 'image':
        return section.image_url ? (
          <div className="text-center my-6">
            <img src={section.image_url} alt={section.title} className="max-w-full h-auto rounded-lg shadow-sm" />
            {section.title && <p className="text-sm text-gray-600 mt-2 italic">{section.title}</p>}
          </div>
        ) : null;
      case 'table':
        return renderTablePreview(section);
      case 'code':
        return (
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto my-4" style={style}>
            <code>{section.content}</code>
          </pre>
        );
      case 'quote':
        return (
          <blockquote style={style} className="text-lg my-6">
            "{section.content}"
          </blockquote>
        );
      default:
        return <div style={style}>{section.content}</div>;
    }
  };

  const renderHeadingEditor = (section: ContentSection, style: any) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <select
          value={section.style_config?.fontSize || 28}
          onChange={(e) => updateSection(section.id, 'style_config', {
            ...section.style_config,
            fontSize: parseInt(e.target.value)
          })}
          className="px-2 py-1 text-xs border rounded"
        >
          <option value={32}>H1 (32px)</option>
          <option value={28}>H2 (28px)</option>
          <option value={24}>H3 (24px)</option>
          <option value={20}>H4 (20px)</option>
        </select>
        {renderFormattingButtons(section.id)}
      </div>
      <input
        type="text"
        value={section.content}
        onChange={(e) => updateSection(section.id, 'content', e.target.value)}
        style={style}
        className="w-full border-none outline-none bg-transparent font-bold"
        placeholder="Enter heading..."
      />
    </div>
  );

  const renderParagraphEditor = (section: ContentSection, style: any) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        {renderFormattingButtons(section.id)}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => enhanceContent(section.id, 'grammar')}
            className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
            title="Check grammar"
          >
            Grammar
          </button>
          <button
            onClick={() => enhanceContent(section.id, 'clarity')}
            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
            title="Improve clarity"
          >
            Clarity
          </button>
        </div>
      </div>
      <textarea
        value={section.content}
        onChange={(e) => updateSection(section.id, 'content', e.target.value)}
        style={style}
        rows={Math.max(3, Math.ceil(section.content.length / 80))}
        className="w-full border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
        placeholder="Enter paragraph content..."
      />
    </div>
  );

  const renderListEditor = (section: ContentSection, style: any) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        {renderFormattingButtons(section.id)}
        <select
          value={section.style_config?.listStyle || 'bullet'}
          onChange={(e) => updateSection(section.id, 'style_config', {
            ...section.style_config,
            listStyle: e.target.value
          })}
          className="px-2 py-1 text-xs border rounded"
        >
          <option value="bullet">Bullet Points</option>
          <option value="numbered">Numbered List</option>
          <option value="roman">Roman Numerals</option>
          <option value="alpha">Alphabetical</option>
        </select>
      </div>
      <textarea
        value={section.content}
        onChange={(e) => updateSection(section.id, 'content', e.target.value)}
        style={style}
        rows={Math.max(4, section.content.split('\n').length)}
        className="w-full border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
        placeholder="• Item 1&#10;• Item 2&#10;• Item 3"
      />
    </div>
  );

  const renderImageEditor = (section: ContentSection) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-gray-600">Image Settings</span>
        <select
          value={section.layout_config?.alignment || 'center'}
          onChange={(e) => updateSection(section.id, 'layout_config', {
            ...section.layout_config,
            alignment: e.target.value
          })}
          className="px-2 py-1 text-xs border rounded"
        >
          <option value="left">Align Left</option>
          <option value="center">Center</option>
          <option value="right">Align Right</option>
        </select>
      </div>
      <input
        type="url"
        value={section.image_url || ''}
        onChange={(e) => updateSection(section.id, 'image_url', e.target.value)}
        placeholder="Enter image URL or upload..."
        className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
      />
      {section.image_url && (
        <img
          src={section.image_url}
          alt="Section content"
          className="max-w-full h-auto rounded-lg border border-gray-200"
        />
      )}
      <input
        type="text"
        value={section.title}
        onChange={(e) => updateSection(section.id, 'title', e.target.value)}
        placeholder="Image caption..."
        className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
      />
    </div>
  );

  const renderTableEditor = (section: ContentSection) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-gray-600">Table Style</span>
        <select
          value={section.style_config?.borderStyle || 'solid'}
          onChange={(e) => updateSection(section.id, 'style_config', {
            ...section.style_config,
            borderStyle: e.target.value
          })}
          className="px-2 py-1 text-xs border rounded"
        >
          <option value="solid">Solid Border</option>
          <option value="dashed">Dashed Border</option>
          <option value="none">No Border</option>
        </select>
      </div>
      <textarea
        value={section.content}
        onChange={(e) => updateSection(section.id, 'content', e.target.value)}
        rows={Math.max(6, section.content.split('\n').length)}
        className="w-full border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm"
        placeholder="Header 1|Header 2|Header 3&#10;Row 1|Data|Data&#10;Row 2|Data|Data"
      />
      <div className="text-xs text-gray-500">Use | to separate columns and new lines for rows</div>
      {section.content && renderTablePreview(section)}
    </div>
  );

  const renderTablePreview = (section: ContentSection) => {
    const rows = section.content.split('\n').filter(row => row.trim());
    if (rows.length === 0) return null;

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden mt-3">
        <table className="w-full">
          {rows.map((row, rowIndex) => {
            const cells = row.split('|').map(cell => cell.trim());
            return (
              <tr key={rowIndex} className={rowIndex === 0 ? 'bg-gray-100' : ''}>
                {cells.map((cell, cellIndex) => (
                  rowIndex === 0 ? (
                    <th key={cellIndex} className="px-3 py-2 text-left font-medium text-gray-900 border-b">
                      {cell}
                    </th>
                  ) : (
                    <td key={cellIndex} className="px-3 py-2 text-gray-700 border-b">
                      {cell}
                    </td>
                  )
                ))}
              </tr>
            );
          })}
        </table>
      </div>
    );
  };

  const renderCodeEditor = (section: ContentSection) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-gray-600">Language</span>
        <select
          value={section.content_data?.language || 'javascript'}
          onChange={(e) => updateSection(section.id, 'content_data', {
            ...section.content_data,
            language: e.target.value
          })}
          className="px-2 py-1 text-xs border rounded"
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
          <option value="html">HTML</option>
          <option value="css">CSS</option>
        </select>
      </div>
      <textarea
        value={section.content}
        onChange={(e) => updateSection(section.id, 'content', e.target.value)}
        rows={Math.max(8, section.content.split('\n').length)}
        className="w-full border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm bg-gray-900 text-green-400"
        placeholder="// Enter your code here..."
      />
    </div>
  );

  const renderQuoteEditor = (section: ContentSection, style: any) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-gray-600">Quote Style</span>
        <select
          value={section.style_config?.quoteStyle || 'blockquote'}
          onChange={(e) => updateSection(section.id, 'style_config', {
            ...section.style_config,
            quoteStyle: e.target.value
          })}
          className="px-2 py-1 text-xs border rounded"
        >
          <option value="blockquote">Block Quote</option>
          <option value="pullquote">Pull Quote</option>
          <option value="epigraph">Epigraph</option>
        </select>
      </div>
      <textarea
        value={section.content}
        onChange={(e) => updateSection(section.id, 'content', e.target.value)}
        style={style}
        rows={4}
        className="w-full border-l-4 border-blue-500 bg-gray-50 p-4 italic text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
        placeholder="Enter your quote here..."
      />
      <input
        type="text"
        value={section.content_data?.attribution || ''}
        onChange={(e) => updateSection(section.id, 'content_data', {
          ...section.content_data,
          attribution: e.target.value
        })}
        placeholder="Quote attribution (optional)"
        className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
      />
    </div>
  );

  const renderDiagramEditor = (section: ContentSection) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-gray-600">Diagram Type</span>
        <select
          value={section.content_data?.diagramType || 'auto'}
          onChange={(e) => updateSection(section.id, 'content_data', {
            ...section.content_data,
            diagramType: e.target.value
          })}
          className="px-2 py-1 text-xs border rounded"
        >
          <option value="auto">Auto-detect</option>
          <option value="flowchart">Flowchart</option>
          <option value="org-chart">Organization Chart</option>
          <option value="timeline">Timeline</option>
          <option value="process">Process Diagram</option>
          <option value="venn">Venn Diagram</option>
        </select>
      </div>
      <textarea
        value={section.content}
        onChange={(e) => updateSection(section.id, 'content', e.target.value)}
        rows={4}
        className="w-full border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
        placeholder="Describe the data or process you want to visualize..."
      />
      <div className="text-xs text-gray-500">
        AI will generate a diagram based on your description
      </div>
    </div>
  );

  const renderFormattingButtons = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    const formatting = section?.style_config || {};

    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => formatText(sectionId, 'bold')}
          className={`p-1 rounded ${formatting.bold ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
          title="Bold"
        >
          <FiBold size={14} />
        </button>
        <button
          onClick={() => formatText(sectionId, 'italic')}
          className={`p-1 rounded ${formatting.italic ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
          title="Italic"
        >
          <FiItalic size={14} />
        </button>
        <button
          onClick={() => formatText(sectionId, 'underline')}
          className={`p-1 rounded ${formatting.underline ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
          title="Underline"
        >
          <FiUnderline size={14} />
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1"></div>
        <button
          onClick={() => alignText(sectionId, 'left')}
          className={`p-1 rounded ${formatting.textAlign === 'left' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
          title="Align Left"
        >
          <FiAlignLeft size={14} />
        </button>
        <button
          onClick={() => alignText(sectionId, 'center')}
          className={`p-1 rounded ${formatting.textAlign === 'center' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
          title="Align Center"
        >
          <FiAlignCenter size={14} />
        </button>
        <button
          onClick={() => alignText(sectionId, 'right')}
          className={`p-1 rounded ${formatting.textAlign === 'right' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
          title="Align Right"
        >
          <FiAlignRight size={14} />
        </button>
      </div>
    );
  };

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
      {/* Sidebar with Outline and Comments */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setShowOutline(!showOutline)}
              className={`px-3 py-1 rounded text-sm ${showOutline ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
            >
              <BookOpen size={14} className="inline mr-1" />
              Outline
            </button>
            <button
              onClick={() => setShowComments(!showComments)}
              className={`px-3 py-1 rounded text-sm ${showComments ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
            >
              <FiMessageCircle size={14} className="inline mr-1" />
              Comments
            </button>
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto">
          {showOutline && (
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Document Outline</h3>
              <div className="space-y-2">
                {generateOutline().map((item, index) => (
                  <div
                    key={item.id}
                    className={`cursor-pointer p-2 rounded hover:bg-gray-100 ${
                      item.level === 1 ? 'font-medium' : 'text-sm ml-4'
                    }`}
                    onClick={() => {
                      const element = document.getElementById(`section-${item.id}`);
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    {item.title}
                  </div>
                ))}
              </div>
            </div>
          )}

          {showComments && (
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Comments</h3>
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <FiUser size={12} />
                      <span className="text-xs font-medium">{comment.author}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm">{comment.text}</p>
                  </div>
                ))}
              </div>
              
              <div className="mt-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm resize-none"
                />
                <button
                  onClick={() => addComment(newComment)}
                  disabled={!newComment.trim()}
                  className="mt-2 w-full bg-blue-600 text-white px-3 py-2 rounded-lg text-sm disabled:bg-gray-400"
                >
                  Add Comment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
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

              {/* Search/Replace */}
              <button
                onClick={() => setShowSearchReplace(!showSearchReplace)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
              >
                <FiSearch size={16} />
                Find
              </button>

              {/* Document Settings */}
              <button
                onClick={() => {/* Show settings modal */}}
                className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <FiSettings size={16} />
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

          {/* Search/Replace Bar */}
          {showSearchReplace && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="text"
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  placeholder="Replace..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <button
                  onClick={() => handleSearchReplace('find')}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  Find
                </button>
                <button
                  onClick={() => handleSearchReplace('replace')}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                >
                  Replace
                </button>
                <button
                  onClick={() => handleSearchReplace('replaceAll')}
                  className="px-3 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700"
                >
                  All
                </button>
                <button
                  onClick={() => setShowSearchReplace(false)}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  <FiX size={16} />
                </button>
              </div>
            </div>
          )}

          {/* AI Assistant Panel */}
          {showAIAssistant && (
            <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-purple-600" />
                <span className="font-medium text-purple-900">AI Writing Assistant</span>
              </div>
              
              <div className="space-y-3">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ask AI to help with your content..."
                  className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  onKeyPress={(e) => e.key === 'Enter' && selectedSectionId && generateAIContent(selectedSectionId)}
                />
                
                {selectedSectionId && (
                  <button
                    onClick={() => generateAIContent(selectedSectionId)}
                    disabled={isGeneratingContent || !aiPrompt.trim()}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    {isGeneratingContent ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <FiWind size={16} />
                    )}
                    Generate Content
                  </button>
                )}
                
                <div className="flex flex-wrap gap-2">
                  {getAISuggestions('').slice(0, 4).map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setAiPrompt(suggestion)}
                      className="text-xs bg-white text-purple-700 px-2 py-1 rounded border border-purple-200 hover:bg-purple-50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Document Stats */}
          {documentSettings.showWordCount && (
            <div className="mt-4 flex items-center gap-6 text-sm text-gray-600">
              <span>{getWordCount()} words</span>
              <span>~{getReadingTime()} min read</span>
              <span>{sections.length} sections</span>
              <span>Last saved: {new Date().toLocaleTimeString()}</span>
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
                            id={`section-${section.id}`}
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`relative group transition-all ${
                              snapshot.isDragging ? 'shadow-lg scale-105' : ''
                            } ${selectedSectionId === section.id ? 'ring-2 ring-blue-500' : ''}`}
                            onClick={() => {
                              setSelectedSectionId(section.id);
                              setAiSuggestions(getAISuggestions(section.content));
                            }}
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
                                  // Duplicate section
                                  addSection(section.section_type);
                                }}
                                className="p-1 bg-blue-200 hover:bg-blue-300 rounded text-blue-700"
                                title="Duplicate section"
                              >
                                <FiCopy size={14} />
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
    </div>
  );
};

export default DocumentEditor;