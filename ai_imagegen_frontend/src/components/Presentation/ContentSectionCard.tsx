import React, { useState, useRef, useCallback } from 'react';
import { 
  FiEdit3, 
  FiTrash2, 
  FiCopy, 
  FiWind, 
  FiImage, 
  FiBarChart,
  FiType,
  FiList,
  FiCode,
  FiTable,
  FiVideo,
  FiMusic,
  FiSave,
  FiUpload,
  FiExternalLink,
  FiEye,
  FiEyeOff,
  FiMoreHorizontal,
  FiMessageCircle,
  FiClock,
  FiTrendingUp,
  FiCheck,
  FiX,
  FiRotateCcw,
  FiZap,
  FiTarget,
  FiBookOpen,
  FiSettings,
  FiLayers,
  FiMove,
  FiAlignLeft,
  FiAlignCenter,
  FiAlignRight,
  FiBold,
  FiItalic,
  FiUnderline,
  FiLink,
  FiRefreshCw,
  FiMessageSquare
} from "react-icons/fi";
import { toast } from "react-toastify";
import DiagramCreator from './DiagramCreator';
import { Presentation, ContentSection, DiagramElement, PresentationComment } from "../../types/Presentation";
import { 
  createDiagram, 
  uploadImage, 
  enhanceContent, 
  generateSectionContent,
  suggestCharts,
  createComment,
  listComments
} from "../../api/presentationApi";
import SlideCanvasEditor from "./SlideCanvasEditor";

interface ContentSectionCardProps {
  section: ContentSection;
  presentation: Presentation;
  onUpdate: (updates: Partial<ContentSection>) => Promise<ContentSection | undefined>;
  onDelete: () => Promise<void>;
  onDuplicate: () => Promise<void>;
  onAIGeneration: (prompt: string) => Promise<void>;
  isSelected: boolean;
  onSelect: () => void;
  viewMode: 'edit' | 'preview';
}

interface AIAssistantState {
  isOpen: boolean;
  suggestions: string[];
  isGenerating: boolean;
  activePrompt: string;
}

interface CommentState {
  showComments: boolean;
  comments: PresentationComment[];
  newComment: string;
  isSubmittingComment: boolean;
}

const ContentSectionCard: React.FC<ContentSectionCardProps> = ({
  section,
  presentation,
  onUpdate,
  onDelete,
  onDuplicate,
  onAIGeneration,
  isSelected,
  onSelect,
  viewMode
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(section.title);
  const [content, setContent] = useState(section.content);
  const [richContent, setRichContent] = useState(section.rich_content);
  const [imageUrl, setImageUrl] = useState(section.image_url || '');
  const [isUploading, setIsUploading] = useState(false);
  const [showCanvasEditor, setShowCanvasEditor] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [showDiagramCreator, setShowDiagramCreator] = useState(false);

  // AI Assistant
  const [aiAssistant, setAiAssistant] = useState<AIAssistantState>({
    isOpen: false,
    suggestions: [],
    isGenerating: false,
    activePrompt: ''
  });
  
  // Comments
  const [commentState, setCommentState] = useState<CommentState>({
    showComments: false,
    comments: [],
    newComment: '',
    isSubmittingComment: false
  });
  
  // Content Enhancement
  const [enhancementOptions, setEnhancementOptions] = useState({
    grammar: false,
    clarity: false,
    tone: 'professional' as 'professional' | 'casual' | 'academic' | 'creative',
    length: 'maintain' as 'expand' | 'summarize' | 'maintain',
    targetAudience: 'general' as 'general' | 'technical' | 'academic' | 'business'
  });
  
  // Formatting state
  const [formatting, setFormatting] = useState({
    bold: false,
    italic: false,
    underline: false,
    alignment: 'left' as 'left' | 'center' | 'right' | 'justify',
    fontSize: 16,
    fontFamily: 'Inter',
    color: '#000000'
  });
  
  // Chart and diagram suggestions
  const [chartSuggestions, setChartSuggestions] = useState<any[]>([]);
  const [isLoadingChartSuggestions, setIsLoadingChartSuggestions] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const handleDiagramCreated = (diagram: DiagramElement) => {
    // Update section with new diagram
    onUpdate({
      diagrams: [...(section.diagrams || []), diagram]
    });
    setShowDiagramCreator(false);
  };

  // AI Suggestions based on section type and content
  const getAISuggestions = useCallback(() => {
    const suggestions = {
      heading: [
        'Make this heading more engaging',
        'Create multiple heading variations',
        'Optimize for SEO',
        'Add emotional appeal'
      ],
      paragraph: [
        'Expand with examples',
        'Add supporting statistics',
        'Include expert quotes',
        'Improve readability',
        'Add call-to-action',
        'Create bullet points summary'
      ],
      list: [
        'Convert to numbered list',
        'Add descriptions to items',
        'Prioritize by importance',
        'Add visual icons',
        'Group related items'
      ],
      image: [
        'Generate image description',
        'Create image variations',
        'Add image caption',
        'Optimize image alt text'
      ],
      diagram: [
        'Suggest chart types',
        'Create process diagram',
        'Generate infographic',
        'Add data visualization'
      ],
      table: [
        'Format as chart',
        'Add summary row',
        'Highlight key data',
        'Create comparison view'
      ],
      code: [
        'Add code comments',
        'Explain code logic',
        'Show alternative approaches',
        'Add error handling'
      ],
      quote: [
        'Find attribution',
        'Add context',
        'Find related quotes',
        'Improve formatting'
      ]
    };
    
    return suggestions[section.section_type as keyof typeof suggestions] || suggestions.paragraph;
  }, [section.section_type]);

  const getSectionIcon = () => {
    switch (section.section_type) {
      case 'heading': return FiType;
      case 'paragraph': return FiEdit3;
      case 'list': return FiList;
      case 'image': case 'image_slide': return FiImage;
      case 'diagram': case 'chart_slide': return FiBarChart;
      case 'table': return FiTable;
      case 'code': return FiCode;
      case 'quote': return FiMessageSquare;
      case 'video': return FiVideo;
      case 'audio': return FiMusic;
      default: return FiEdit3;
    }
  };

  const getSectionTypeName = () => {
    return section.section_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleSave = async () => {
    try {
      await onUpdate({
        title: title.trim(),
        content: content.trim(),
        rich_content: richContent.trim(),
        image_url: imageUrl.trim() || undefined,
        style_config: {
          ...section.style_config,
          ...formatting
        }
      });
      setIsEditing(false);
      toast.success("Section updated successfully!");
    } catch (err) {
      toast.error("Failed to update section.");
    }
  };

  const handleAIGenerate = async (customPrompt?: string) => {
    const prompt = customPrompt || aiAssistant.activePrompt || `Generate content for a ${section.section_type} with the title "${title}" based on: ${content}`;
    
    try {
      setAiAssistant(prev => ({ ...prev, isGenerating: true }));
      await onAIGeneration(prompt);
      toast.success("AI content generated!");
      setAiAssistant(prev => ({ ...prev, activePrompt: '', isOpen: false }));
    } catch (err) {
      toast.error("Failed to generate AI content.");
    } finally {
      setAiAssistant(prev => ({ ...prev, isGenerating: false }));
    }
  };

  const handleContentEnhancement = async (enhancementType: string) => {
    try {
      const enhanced = await enhanceContent(presentation.id, section.id, {
        enhancement_type: enhancementType as any,
        target_audience: enhancementOptions.targetAudience,
        additional_instructions: enhancementOptions.tone
      });
      
      if (enhanced) {
        setContent(enhanced.content);
        setRichContent(enhanced.rich_content);
        toast.success("Content enhanced successfully!");
      }
    } catch (err) {
      toast.error("Failed to enhance content.");
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      setIsUploading(true);
      const result = await uploadImage(file);
      setImageUrl(result.url);
      await onUpdate({ image_url: result.url });
      toast.success("Image uploaded successfully!");
    } catch (err) {
      toast.error("Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleCanvasSave = async (canvasJson: string, dataUrl: string) => {
    try {
      await onUpdate({
        canvas_json: canvasJson,
        rendered_image: dataUrl
      });
      toast.success("Canvas saved successfully!");
    } catch (err) {
      toast.error("Failed to save canvas.");
    }
  };

  const generateChartSuggestions = async () => {
    if (!content.trim()) {
      toast.warning("Please add content first to get chart suggestions.");
      return;
    }

    try {
      setIsLoadingChartSuggestions(true);
      const suggestions = await suggestCharts({
        content_text: content,
        current_section_type: section.section_type
      });
      setChartSuggestions(suggestions.suggestions || []);
      toast.success("Chart suggestions generated!");
    } catch (err) {
      toast.error("Failed to generate chart suggestions.");
    } finally {
      setIsLoadingChartSuggestions(false);
    }
  };

  const createDiagramFromContent = async (chartType?: string) => {
    if (!content.trim()) {
      toast.warning("Please add content first to generate a diagram.");
      return;
    }

    try {
      await createDiagram(presentation.id, section.id, {
        title: `${chartType || 'Diagram'} for ${title}`,
        chart_type: chartType || 'bar_chart',
        content_text: content,
        generation_prompt: `Create a ${chartType || 'diagram'} based on: ${content}`,
        position_x: 0,
        position_y: 0,
        width: 400,
        height: 300
      });
      toast.success("Diagram created! Check the diagrams section.");
    } catch (err) {
      toast.error("Failed to create diagram.");
    }
  };

  const loadComments = async () => {
    try {
      const comments = await listComments(presentation.id);
      const sectionComments = comments.filter(c => c.content_section === section.id);
      setCommentState(prev => ({ ...prev, comments: sectionComments }));
    } catch (err) {
      console.error("Failed to load comments:", err);
    }
  };

  const addComment = async () => {
    if (!commentState.newComment.trim()) return;

    try {
      setCommentState(prev => ({ ...prev, isSubmittingComment: true }));
      const comment = await createComment(presentation.id, {
        content: commentState.newComment,
        content_section: section.id
      });
      
      setCommentState(prev => ({
        ...prev,
        comments: [...prev.comments, comment],
        newComment: '',
        isSubmittingComment: false
      }));
      toast.success("Comment added!");
    } catch (err) {
      toast.error("Failed to add comment.");
      setCommentState(prev => ({ ...prev, isSubmittingComment: false }));
    }
  };

  const applyFormatting = (formatType: 'bold' | 'italic' | 'underline', value?: any) => {
    setFormatting(prev => ({
      ...prev,
      [formatType]: typeof value !== 'undefined' ? value : !prev[formatType]
    }));
  };

  const insertAtCursor = (text: string) => {
    if (!contentRef.current) return;
    
    const start = contentRef.current.selectionStart;
    const end = contentRef.current.selectionEnd;
    const newContent = content.substring(0, start) + text + content.substring(end);
    
    setContent(newContent);
    
    // Reset cursor position
    setTimeout(() => {
      if (contentRef.current) {
        contentRef.current.focus();
        contentRef.current.setSelectionRange(start + text.length, start + text.length);
      }
    }, 0);
  };

  const renderFormattingToolbar = () => (
    <div className="flex items-center gap-1 p-2 bg-gray-50 border-b border-gray-200">
      <button
        onClick={() => applyFormatting('bold')}
        className={`p-1 rounded ${formatting.bold ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
        title="Bold"
      >
        <FiBold size={14} />
      </button>
      <button
        onClick={() => applyFormatting('italic')}
        className={`p-1 rounded ${formatting.italic ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
        title="Italic"
      >
        <FiItalic size={14} />
      </button>
      <button
        onClick={() => applyFormatting('underline')}
        className={`p-1 rounded ${formatting.underline ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
        title="Underline"
      >
        <FiUnderline size={14} />
      </button>
      
      <div className="w-px h-4 bg-gray-300 mx-1"></div>
      
      <button
        onClick={() => setFormatting(prev => ({ ...prev, alignment: 'left' }))}
        className={`p-1 rounded ${formatting.alignment === 'left' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
        title="Align Left"
      >
        <FiAlignLeft size={14} />
      </button>
      <button
        onClick={() => setFormatting(prev => ({ ...prev, alignment: 'center' }))}
        className={`p-1 rounded ${formatting.alignment === 'center' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
        title="Align Center"
      >
        <FiAlignCenter size={14} />
      </button>
      <button
        onClick={() => setFormatting(prev => ({ ...prev, alignment: 'right' }))}
        className={`p-1 rounded ${formatting.alignment === 'right' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
        title="Align Right"
      >
        <FiAlignRight size={14} />
      </button>
      
      <div className="w-px h-4 bg-gray-300 mx-1"></div>
      
      <input
        type="color"
        value={formatting.color}
        onChange={(e) => setFormatting(prev => ({ ...prev, color: e.target.value }))}
        className="w-6 h-6 border border-gray-300 rounded cursor-pointer"
        title="Text Color"
      />
      
      <select
        value={formatting.fontSize}
        onChange={(e) => setFormatting(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
        className="px-2 py-1 text-xs border border-gray-300 rounded"
      >
        <option value={12}>12px</option>
        <option value={14}>14px</option>
        <option value={16}>16px</option>
        <option value={18}>18px</option>
        <option value={20}>20px</option>
        <option value={24}>24px</option>
        <option value={32}>32px</option>
      </select>
    </div>
  );

  const renderSectionContent = () => {
    if (viewMode === 'preview') {
      return renderPreviewContent();
    }

    switch (section.section_type) {
      case 'heading':
        return renderHeadingEditor();
      case 'paragraph':
      case 'content_slide':
      case 'title_slide':
        return renderTextEditor();
      case 'list':
        return renderListEditor();
      case 'image':
      case 'image_slide':
        return renderImageEditor();
      case 'table':
        return renderTableEditor();
      case 'code':
        return renderCodeEditor();
      case 'quote':
        return renderQuoteEditor();
      case 'diagram':
      case 'chart_slide':
        return renderDiagramEditor();
      case 'video':
        return renderVideoEditor();
      case 'audio':
        return renderAudioEditor();
      default:
        return renderTextEditor();
    }
  };

  const renderPreviewContent = () => {
    const IconComponent = getSectionIcon();
    
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <IconComponent size={16} className="text-gray-500" />
          <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">
            {getSectionTypeName()}
          </span>
        </div>
        
        <h3 className="text-xl font-semibold text-gray-900" style={{
          fontWeight: formatting.bold ? 'bold' : 'normal',
          fontStyle: formatting.italic ? 'italic' : 'normal',
          textDecoration: formatting.underline ? 'underline' : 'none',
          textAlign: formatting.alignment,
          fontSize: `${formatting.fontSize}px`,
          color: formatting.color
        }}>
          {section.title}
        </h3>
        
        {section.image_url && (
          <img 
            src={section.image_url} 
            alt={section.title}
            className="w-full max-w-md rounded-lg border border-gray-200"
          />
        )}
        
        <div 
          className="prose max-w-none"
          style={{
            textAlign: formatting.alignment,
            fontSize: `${formatting.fontSize}px`,
            color: formatting.color
          }}
          dangerouslySetInnerHTML={{ __html: section.rich_content || section.content }}
        />
        
        {section.diagrams && section.diagrams.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Diagrams</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.diagrams.map((diagram) => (
                <div key={diagram.id} className="border border-gray-200 rounded-lg p-4">
                  <h5 className="font-medium mb-2">{diagram.title}</h5>
                  {diagram.rendered_image_url && (
                    <img 
                      src={diagram.rendered_image_url} 
                      alt={diagram.title}
                      className="w-full rounded-lg"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderHeadingEditor = () => (
    <div className="space-y-4">
      {renderFormattingToolbar()}
      
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full text-2xl font-bold border-none outline-none bg-transparent focus:ring-0"
        placeholder="Enter heading..."
        style={{ 
          fontSize: formatting.fontSize,
          fontWeight: formatting.bold ? 'bold' : 'normal',
          fontStyle: formatting.italic ? 'italic' : 'normal',
          textDecoration: formatting.underline ? 'underline' : 'none',
          textAlign: formatting.alignment,
          color: formatting.color
        }}
      />
      
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-600">Heading Level:</label>
        <select
          value={formatting.fontSize}
          onChange={(e) => setFormatting(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
          className="px-3 py-1 border border-gray-300 rounded text-sm"
        >
          <option value={32}>H1 (32px)</option>
          <option value={28}>H2 (28px)</option>
          <option value={24}>H3 (24px)</option>
          <option value={20}>H4 (20px)</option>
          <option value={18}>H5 (18px)</option>
          <option value={16}>H6 (16px)</option>
        </select>
      </div>
    </div>
  );

  const renderTextEditor = () => (
    <div className="space-y-4">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full text-xl font-semibold border-none outline-none bg-transparent focus:ring-0"
        placeholder="Section title..."
      />
      
      {renderFormattingToolbar()}
      
      <div className="relative">
        <textarea
          ref={contentRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          className="w-full border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="Enter your content here..."
          style={{
            fontWeight: formatting.bold ? 'bold' : 'normal',
            fontStyle: formatting.italic ? 'italic' : 'normal',
            textDecoration: formatting.underline ? 'underline' : 'none',
            textAlign: formatting.alignment,
            fontSize: `${formatting.fontSize}px`,
            color: formatting.color
          }}
        />
        
        {/* Quick Insert Options */}
        <div className="absolute bottom-2 right-2 flex gap-1">
          <button
            onClick={() => insertAtCursor('**bold text**')}
            className="p-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50"
            title="Insert bold text"
          >
            <FiBold size={12} />
          </button>
          <button
            onClick={() => insertAtCursor('[link text](URL)')}
            className="p-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50"
            title="Insert link"
          >
            <FiLink size={12} />
          </button>
        </div>
      </div>
      
      {/* Content Enhancement Options */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleContentEnhancement('grammar')}
          className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors"
        >
          <FiCheck size={12} className="inline mr-1" />
          Grammar Check
        </button>
        <button
          onClick={() => handleContentEnhancement('clarity')}
          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
        >
          <FiTrendingUp size={12} className="inline mr-1" />
          Improve Clarity
        </button>
        <button
          onClick={() => handleContentEnhancement('expand')}
          className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 transition-colors"
        >
          <FiZap size={12} className="inline mr-1" />
          Expand Content
        </button>
      </div>
    </div>
  );

  const renderListEditor = () => (
    <div className="space-y-4">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full text-xl font-semibold border-none outline-none bg-transparent focus:ring-0"
        placeholder="List title..."
      />
      
      <div className="flex items-center gap-4 mb-2">
        <label className="text-sm font-medium text-gray-600">List Type:</label>
        <select
          value={section.style_config?.listType || 'bullet'}
          onChange={(e) => onUpdate({ 
            style_config: { 
              ...section.style_config, 
              listType: e.target.value 
            }
          })}
          className="px-3 py-1 border border-gray-300 rounded text-sm"
        >
          <option value="bullet">Bullet Points (•)</option>
          <option value="numbered">Numbered List (1.)</option>
          <option value="roman">Roman Numerals (i.)</option>
          <option value="alpha">Alphabetical (a.)</option>
          <option value="dash">Dashes (-)</option>
          <option value="arrow">Arrows (→)</option>
        </select>
      </div>
      
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={6}
        className="w-full border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
        placeholder="• Item 1&#10;• Item 2&#10;• Item 3"
      />
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => insertAtCursor('• ')}
          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
        >
          Add Bullet
        </button>
        <button
          onClick={() => {
            const lines = content.split('\n');
            const numberedLines = lines.map((line, index) => {
              const cleanLine = line.replace(/^[•\-\*\d\.]\s*/, '');
              return `${index + 1}. ${cleanLine}`;
            });
            setContent(numberedLines.join('\n'));
          }}
          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
        >
          Convert to Numbered
        </button>
      </div>
    </div>
  );

  const renderImageEditor = () => (
    <div className="space-y-4">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full text-xl font-semibold border-none outline-none bg-transparent focus:ring-0"
        placeholder="Image title..."
      />
      
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Enter image URL..."
            className="flex-1 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <FiUpload size={16} />
            )}
          </button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        
        {imageUrl && (
          <div className="relative">
            <img 
              src={imageUrl} 
              alt={title}
              className="max-w-full h-auto rounded-lg border border-gray-200"
              onError={() => toast.error("Failed to load image")}
            />
            
            {/* Image overlay controls */}
            <div className="absolute top-2 right-2 flex gap-1">
              <button
                onClick={() => setImageUrl('')}
                className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                title="Remove image"
              >
                <FiX size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Image Alignment</label>
          <select
            value={section.layout_config?.alignment || 'center'}
            onChange={(e) => onUpdate({ 
              layout_config: { 
                ...section.layout_config, 
                alignment: e.target.value 
              }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
            <option value="full">Full Width</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Image Size</label>
          <select
            value={section.layout_config?.size || 'medium'}
            onChange={(e) => onUpdate({ 
              layout_config: { 
                ...section.layout_config, 
                size: e.target.value 
              }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
            <option value="original">Original Size</option>
          </select>
        </div>
      </div>
      
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        className="w-full border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
        placeholder="Image description or caption..."
      />
    </div>
  );

  const renderTableEditor = () => (
    <div className="space-y-4">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full text-xl font-semibold border-none outline-none bg-transparent focus:ring-0"
        placeholder="Table title..."
      />
      
      <div className="flex items-center gap-4 mb-2">
        <label className="text-sm font-medium text-gray-600">Table Style:</label>
        <select
          value={section.style_config?.tableStyle || 'default'}
          onChange={(e) => onUpdate({ 
            style_config: { 
              ...section.style_config, 
              tableStyle: e.target.value 
            }
          })}
          className="px-3 py-1 border border-gray-300 rounded text-sm"
        >
          <option value="default">Default</option>
          <option value="striped">Striped Rows</option>
          <option value="bordered">All Borders</option>
          <option value="minimal">Minimal</option>
          <option value="modern">Modern</option>
        </select>
      </div>
      
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={8}
        className="w-full border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm"
        placeholder="Header 1|Header 2|Header 3&#10;Row 1|Data|Data&#10;Row 2|Data|Data"
      />
      
      <div className="text-xs text-gray-500 flex items-center justify-between">
        <span>Use | to separate columns and new lines for rows</span>
        <button
          onClick={() => {
            const rows = content.split('\n');
            const maxCols = Math.max(...rows.map(row => row.split('|').length));
            const newRow = Array(maxCols).fill('New Data').join('|');
            setContent(content + '\n' + newRow);
          }}
          className="text-blue-600 hover:text-blue-700"
        >
          Add Row
        </button>
      </div>
      
      {/* Table preview */}
      {content && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="text-sm font-medium text-gray-700 mb-2">Preview:</div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              {content.split('\n').map((row, rowIndex) => {
                const cells = row.split('|');
                return (
                  <tr key={rowIndex} className={rowIndex === 0 ? 'bg-gray-100' : rowIndex % 2 === 1 ? 'bg-gray-50' : ''}>
                    {cells.map((cell, cellIndex) => (
                      rowIndex === 0 ? (
                        <th key={cellIndex} className="px-3 py-2 text-left font-medium text-gray-900">
                          {cell.trim()}
                        </th>
                      ) : (
                        <td key={cellIndex} className="px-3 py-2 text-gray-700">
                          {cell.trim()}
                        </td>
                      )
                    ))}
                  </tr>
                );
              })}
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const renderCodeEditor = () => (
    <div className="space-y-4">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full text-xl font-semibold border-none outline-none bg-transparent focus:ring-0"
        placeholder="Code block title..."
      />
      
      <div className="flex items-center gap-4 mb-2">
        <label className="text-sm font-medium text-gray-600">Language:</label>
        <select
          value={section.content_data?.language || 'javascript'}
          onChange={(e) => onUpdate({ 
            content_data: { 
              ...section.content_data, 
              language: e.target.value 
            }
          })}
          className="px-3 py-1 border border-gray-300 rounded text-sm"
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
          <option value="html">HTML</option>
          <option value="css">CSS</option>
          <option value="sql">SQL</option>
          <option value="bash">Bash</option>
          <option value="json">JSON</option>
          <option value="yaml">YAML</option>
        </select>
      </div>
      
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={10}
        className="w-full border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm bg-gray-900 text-green-400"
        placeholder="// Enter your code here..."
      />
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleContentEnhancement('format')}
          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
        >
          Format Code
        </button>
        <button
          onClick={() => insertAtCursor('// TODO: ')}
          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
        >
          Add Comment
        </button>
      </div>
    </div>
  );

  const renderQuoteEditor = () => (
    <div className="space-y-4">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full text-xl font-semibold border-none outline-none bg-transparent focus:ring-0"
        placeholder="Quote title..."
      />
      
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        className="w-full border-l-4 border-blue-500 bg-gray-50 p-4 italic text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
        placeholder="Enter your quote here..."
      />
      
      <input
        type="text"
        value={section.content_data?.attribution || ''}
        onChange={(e) => onUpdate({ 
          content_data: { 
            ...section.content_data, 
            attribution: e.target.value 
          }
        })}
        placeholder="Quote attribution (e.g., - Albert Einstein)"
        className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
      />
      
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-600">Quote Style:</label>
        <select
          value={section.style_config?.quoteStyle || 'blockquote'}
          onChange={(e) => onUpdate({ 
            style_config: { 
              ...section.style_config, 
              quoteStyle: e.target.value 
            }
          })}
          className="px-3 py-1 border border-gray-300 rounded text-sm"
        >
          <option value="blockquote">Block Quote</option>
          <option value="pullquote">Pull Quote</option>
          <option value="testimonial">Testimonial</option>
          <option value="epigraph">Epigraph</option>
        </select>
      </div>
    </div>
  );

  const renderDiagramEditor = () => (
    <div className="space-y-4">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full text-xl font-semibold border-none outline-none bg-transparent focus:ring-0"
        placeholder="Diagram title..."
      />
      
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        className="w-full border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
        placeholder="Describe the data or process you want to visualize..."
      />
      
      <div className="flex items-center gap-2">
        <button
          onClick={generateChartSuggestions}
          disabled={isLoadingChartSuggestions}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          {isLoadingChartSuggestions ? (
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <FiTarget size={16} />
          )}
          Get Chart Suggestions
        </button>
        
        <button
          onClick={() => createDiagramFromContent()}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
        >
          <FiBarChart size={16} />
          Create Diagram
        </button>
      </div>
      
      {/* Chart Suggestions */}
      {chartSuggestions.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Suggested Chart Types:</h4>
          <div className="grid grid-cols-2 gap-2">
            {chartSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => createDiagramFromContent(suggestion.chart_type)}
                className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
              >
                <div className="font-medium text-sm">{suggestion.chart_type.replace('_', ' ').toUpperCase()}</div>
                <div className="text-xs text-gray-600 mt-1">{suggestion.reason}</div>
                <div className="text-xs text-blue-600 mt-1">Confidence: {Math.round(suggestion.confidence * 100)}%</div>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Show existing diagrams */}
      {section.diagrams && section.diagrams.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Existing Diagrams</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {section.diagrams.map((diagram) => (
              <div key={diagram.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium">{diagram.title}</h5>
                  <button
                    onClick={() => {/* Regenerate diagram */}}
                    className="p-1 text-gray-500 hover:text-gray-700"
                    title="Regenerate"
                  >
                    <FiRefreshCw size={14} />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-2">{diagram.chart_type}</p>
                {diagram.rendered_image_url && (
                  <img 
                    src={diagram.rendered_image_url} 
                    alt={diagram.title}
                    className="w-full rounded-lg"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderVideoEditor = () => (
    <div className="space-y-4">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full text-xl font-semibold border-none outline-none bg-transparent focus:ring-0"
        placeholder="Video title..."
      />
      
      <input
        type="url"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="Enter video URL (YouTube, Vimeo, etc.)..."
        className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
      />
      
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        className="w-full border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
        placeholder="Video description..."
      />
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Video Size</label>
          <select
            value={section.layout_config?.videoSize || 'medium'}
            onChange={(e) => onUpdate({ 
              layout_config: { 
                ...section.layout_config, 
                videoSize: e.target.value 
              }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="small">Small (400px)</option>
            <option value="medium">Medium (600px)</option>
            <option value="large">Large (800px)</option>
            <option value="full">Full Width</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Auto Play</label>
          <select
            value={section.content_data?.autoplay ? 'true' : 'false'}
            onChange={(e) => onUpdate({ 
              content_data: { 
                ...section.content_data, 
                autoplay: e.target.value === 'true' 
              }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderAudioEditor = () => (
    <div className="space-y-4">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full text-xl font-semibold border-none outline-none bg-transparent focus:ring-0"
        placeholder="Audio title..."
      />
      
      <input
        type="url"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="Enter audio URL..."
        className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
      />
      
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        className="w-full border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
        placeholder="Audio description..."
      />
      
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={section.content_data?.showControls !== false}
          onChange={(e) => onUpdate({ 
            content_data: { 
              ...section.content_data, 
              showControls: e.target.checked 
            }
          })}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label className="text-sm text-gray-700">Show audio controls</label>
      </div>
    </div>
  );

  const IconComponent = getSectionIcon();

  return (
    <div className="w-full">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <IconComponent size={18} className="text-gray-600" />
          <span className="text-sm text-gray-500 uppercase tracking-wide font-medium">
            {getSectionTypeName()}
          </span>
          {section.ai_generated && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
              AI Generated
            </span>
          )}
          {section.comments_count > 0 && (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
              {section.comments_count} comment{section.comments_count !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        
        {viewMode === 'edit' && (
          <div className="flex items-center gap-2">
            
            {/* AI Assistant */}
            <button
              onClick={() => setAiAssistant(prev => ({ ...prev, isOpen: !prev.isOpen, suggestions: getAISuggestions() }))}
              disabled={aiAssistant.isGenerating}
              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
              title="AI Assistant"
            >
              {aiAssistant.isGenerating ? (
                <div className="animate-spin w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full" />
              ) : (
                <FiWind size={16} />
              )}
            </button>
            
            {/* Comments */}
            <button
              onClick={() => {
                setCommentState(prev => ({ ...prev, showComments: !prev.showComments }));
                if (!commentState.showComments) {
                  loadComments();
                }
              }}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Comments"
            >
              <FiMessageCircle size={16} />
            </button>
            
            {/* Canvas Editor for slide types */}
            {(section.section_type.includes('slide') || presentation.presentation_type === 'slide') && (
              <button
                onClick={() => setShowCanvasEditor(!showCanvasEditor)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Canvas Editor"
              >
                {showCanvasEditor ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            )}
            
            {/* More Options */}
            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="More Options"
            >
              <FiMoreHorizontal size={16} />
            </button>
            
            <button
              onClick={onDuplicate}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Duplicate"
            >
              <FiCopy size={16} />
            </button>
            
            <button
              onClick={handleSave}
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Save"
            >
              <FiSave size={16} />
            </button>
            
            <button
              onClick={onDelete}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <FiTrash2 size={16} />
            </button>
          </div>
        )}
      </div>
      
      {/* AI Assistant Panel */}
      {aiAssistant.isOpen && viewMode === 'edit' && (
        <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <FiWind className="text-purple-600" />
            <span className="font-medium text-purple-900">AI Assistant</span>
            {section.section_type === 'diagram' && (
              <button
                onClick={() => setShowDiagramCreator(true)}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
              >
                <FiBarChart size={14} />
                Create Diagram
              </button>
            )}
          </div>
          
          <div className="space-y-3">
            <input
              type="text"
              value={aiAssistant.activePrompt}
              onChange={(e) => setAiAssistant(prev => ({ ...prev, activePrompt: e.target.value }))}
              placeholder="Ask AI to help with this section..."
              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
              onKeyPress={(e) => e.key === 'Enter' && handleAIGenerate()}
            />
            
            <div className="flex flex-wrap gap-2">
              {aiAssistant.suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleAIGenerate(suggestion)}
                  className="text-xs bg-white text-purple-700 px-2 py-1 rounded border border-purple-200 hover:bg-purple-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => handleAIGenerate()}
              disabled={aiAssistant.isGenerating || !aiAssistant.activePrompt.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {aiAssistant.isGenerating ? 'Generating...' : 'Generate Content'}
            </button>
          </div>
        </div>
      )}
      
      {/* Comments Panel */}
      {commentState.showComments && viewMode === 'edit' && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <FiMessageCircle className="text-yellow-600" />
            <span className="font-medium text-yellow-900">Comments</span>
          </div>
          
          <div className="space-y-3">
            {commentState.comments.map((comment) => (
              <div key={comment.id} className="p-3 bg-white border border-yellow-200 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{comment.author_name}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm">{comment.content}</p>
              </div>
            ))}
            
            <div className="flex gap-2">
              <input
                type="text"
                value={commentState.newComment}
                onChange={(e) => setCommentState(prev => ({ ...prev, newComment: e.target.value }))}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 border border-yellow-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500"
                onKeyPress={(e) => e.key === 'Enter' && addComment()}
              />
              <button
                onClick={addComment}
                disabled={commentState.isSubmittingComment || !commentState.newComment.trim()}
                className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Section Content */}
      <div className="space-y-4">
        {renderSectionContent()}
        
        {/* Canvas Editor for slide types */}
        {showCanvasEditor && (section.section_type.includes('slide') || presentation.presentation_type === 'slide') && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="font-medium text-gray-900 mb-3">Canvas Editor</h4>
            <SlideCanvasEditor
              slide={{
                id: parseInt(section.id),
                presentation: parseInt(presentation.id),
                order: section.order,
                title: section.title,
                description: section.content,
                image_prompt: section.image_prompt || '',
                image_url: section.image_url || '',
                canvas_json: section.canvas_json || '',
                created_at: section.created_at
              }}
              onCanvasSave={handleCanvasSave}
            />
          </div>
        )}
        
        {/* Advanced Options */}
        {showAdvancedOptions && viewMode === 'edit' && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="font-medium text-gray-900 mb-3">Advanced Options</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section ID</label>
                <input
                  type="text"
                  value={section.id}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                <input
                  type="number"
                  value={section.order}
                  onChange={(e) => onUpdate({ order: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                <input
                  type="text"
                  value={new Date(section.created_at).toLocaleString()}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                <input
                  type="text"
                  value={new Date(section.updated_at).toLocaleString()}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {showDiagramCreator && (
        <DiagramCreator
          presentationId={presentation.id}
          section={section}
          onDiagramCreated={handleDiagramCreated}
          onClose={() => setShowDiagramCreator(false)}
        />
      )}
    </div>
    
  );
  
};

export default ContentSectionCard;