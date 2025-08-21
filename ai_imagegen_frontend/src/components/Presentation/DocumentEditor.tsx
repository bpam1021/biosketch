import React, { useState, useRef, useEffect } from 'react';
import { Presentation, ContentSection } from '../../types/Presentation';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  FiPlus, FiTrash2, FiMove, FiType, FiImage, FiList, 
  FiBarChart, FiCode, FiTable, FiWind, FiSave, FiDownload,
  FiBold, FiItalic, FiUnderline, FiAlignLeft, FiAlignCenter, FiAlignRight,
  FiEye, FiEdit3, FiQuote, FiLink
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { FileText } from 'lucide-react';

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
  const editorRef = useRef<HTMLDivElement>(null);

  const sectionTypes = [
    { type: 'heading', icon: FiType, label: 'Heading', description: 'Add a section heading' },
    { type: 'paragraph', icon: FiEdit3, label: 'Paragraph', description: 'Add text content' },
    { type: 'list', icon: FiList, label: 'List', description: 'Bulleted or numbered list' },
    { type: 'image', icon: FiImage, label: 'Image', description: 'Insert an image' },
    { type: 'diagram', icon: FiBarChart, label: 'Diagram', description: 'AI-generated diagram' },
    { type: 'table', icon: FiTable, label: 'Table', description: 'Data table' },
    { type: 'code', icon: FiCode, label: 'Code Block', description: 'Code snippet' },
    { type: 'quote', icon: FiQuote, label: 'Quote', description: 'Block quote' },
  ];

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
  };

  const getDefaultContent = (type: ContentSection['section_type']) => {
    switch (type) {
      case 'heading':
        return { 
          title: 'New Heading', 
          content: 'Section Heading',
          style_config: { fontSize: 28, fontWeight: 'bold' }
        };
      case 'paragraph':
        return { 
          title: 'New Paragraph', 
          content: 'Enter your content here...'
        };
      case 'list':
        return { 
          title: 'New List', 
          content: '• First item\n• Second item\n• Third item'
        };
      case 'image':
        return { 
          title: 'New Image', 
          content: '',
          layout_config: { placeholder: 'Add image URL or upload an image' }
        };
      case 'diagram':
        return { 
          title: 'New Diagram', 
          content: 'Describe the data or process you want to visualize'
        };
      case 'table':
        return { 
          title: 'New Table', 
          content: 'Column 1|Column 2|Column 3\nRow 1|Data|Data\nRow 2|Data|Data'
        };
      case 'code':
        return { 
          title: 'Code Block', 
          content: '// Your code here\nconsole.log("Hello World");',
          style_config: { fontFamily: 'monospace', backgroundColor: '#f8f9fa' }
        };
      case 'quote':
        return { 
          title: 'Quote', 
          content: 'Your quote text here',
          style_config: { fontStyle: 'italic', borderLeft: '4px solid #007bff', paddingLeft: '16px' }
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
  };

  const deleteSection = async (id: string) => {
    if (confirm('Are you sure you want to delete this section?')) {
      await onSectionDelete(id);
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
  };

  const generateAIContent = async (sectionId: string) => {
    setIsGeneratingContent(true);
    try {
      const section = sections.find(s => s.id === sectionId);
      if (!section) return;

      const prompt = `Generate content for a ${section.section_type} titled "${section.title}" in the context of: ${presentation.original_prompt}`;
      await onAIGeneration(sectionId, prompt);
      toast.success('AI content generated successfully!');
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
    } catch (error) {
      toast.error('Failed to enhance content');
    }
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

  const renderSection = (section: ContentSection) => {
    const formatting = section.style_config || {};
    const style = {
      fontSize: formatting.fontSize ? `${formatting.fontSize}px` : undefined,
      fontFamily: formatting.fontFamily,
      color: formatting.color,
      backgroundColor: formatting.backgroundColor,
      textAlign: formatting.textAlign as any,
      fontWeight: formatting.bold ? 'bold' : 'normal',
      fontStyle: formatting.italic ? 'italic' : 'normal',
      textDecoration: formatting.underline ? 'underline' : 'none',
      borderLeft: formatting.borderLeft,
      paddingLeft: formatting.paddingLeft,
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
        return <h1 style={style}>{section.content}</h1>;
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
          <div className="text-center">
            <img src={section.image_url} alt={section.title} className="max-w-full h-auto rounded-lg" />
            {section.title && <p className="text-sm text-gray-600 mt-2">{section.title}</p>}
          </div>
        ) : null;
      case 'table':
        return renderTablePreview(section);
      case 'code':
        return (
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
            <code>{section.content}</code>
          </pre>
        );
      case 'quote':
        return (
          <blockquote style={style} className="text-lg italic">
            {section.content}
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
      </div>
      <textarea
        value={section.content}
        onChange={(e) => updateSection(section.id, 'content', e.target.value)}
        style={style}
        rows={6}
        className="w-full border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
        placeholder="Enter paragraph content..."
      />
    </div>
  );

  const renderListEditor = (section: ContentSection, style: any) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        {renderFormattingButtons(section.id)}
      </div>
      <textarea
        value={section.content}
        onChange={(e) => updateSection(section.id, 'content', e.target.value)}
        style={style}
        rows={4}
        className="w-full border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
        placeholder="• Item 1&#10;• Item 2&#10;• Item 3"
      />
    </div>
  );

  const renderImageEditor = (section: ContentSection) => (
    <div className="space-y-3">
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
      <textarea
        value={section.content}
        onChange={(e) => updateSection(section.id, 'content', e.target.value)}
        rows={6}
        className="w-full border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm"
        placeholder="Column 1|Column 2|Column 3&#10;Row 1|Data|Data&#10;Row 2|Data|Data"
      />
      <div className="text-xs text-gray-500">Use | to separate columns and new lines for rows</div>
      {section.content && renderTablePreview(section)}
    </div>
  );

  const renderTablePreview = (section: ContentSection) => {
    const rows = section.content.split('\n').filter(row => row.trim());
    if (rows.length === 0) return null;

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
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
    <textarea
      value={section.content}
      onChange={(e) => updateSection(section.id, 'content', e.target.value)}
      rows={8}
      className="w-full border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm bg-gray-900 text-green-400"
      placeholder="// Enter your code here..."
    />
  );

  const renderQuoteEditor = (section: ContentSection, style: any) => (
    <textarea
      value={section.content}
      onChange={(e) => updateSection(section.id, 'content', e.target.value)}
      style={style}
      rows={4}
      className="w-full border-l-4 border-blue-500 bg-gray-50 p-4 italic text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
      placeholder="Enter your quote here..."
    />
  );

  const renderDiagramEditor = (section: ContentSection) => (
    <div className="space-y-3">
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
      <div className="max-w-4xl mx-auto p-8 bg-white min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{presentation.title}</h1>
          {presentation.description && (
            <p className="text-gray-600">{presentation.description}</p>
          )}
        </div>
        
        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.id} className="section">
              {renderSection(section)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <input
              type="text"
              value={presentation.title}
              onChange={(e) => {/* Update presentation title through parent */}}
              className="text-2xl font-bold border-none outline-none bg-transparent"
              placeholder="Document Title"
            />
            <p className="text-sm text-gray-600 mt-1">
              {presentation.document_settings?.template_style} • {presentation.page_layout?.replace('_', ' ')}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <FiPlus size={16} />
                Add Section
              </button>
              
              {showAddMenu && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <div className="p-2">
                    {sectionTypes.map(({ type, icon: Icon, label, description }) => (
                      <button
                        key={type}
                        onClick={() => addSection(type as ContentSection['section_type'])}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                      >
                        <Icon size={16} className="text-gray-600" />
                        <div>
                          <div className="font-medium text-gray-900">{label}</div>
                          <div className="text-xs text-gray-500">{description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <button className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              <FiSave size={16} />
              Save
            </button>
            
            <button className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              <FiDownload size={16} />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Document Content */}
      <div 
        ref={editorRef}
        className="p-8 min-h-screen bg-white"
        style={{
          maxWidth: presentation.page_layout === 'single_column' ? '800px' : '100%',
          margin: '0 auto',
          columnCount: presentation.page_layout === 'two_column' ? 2 : presentation.page_layout === 'three_column' ? 3 : 1,
          columnGap: '2rem',
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
                        onClick={() => setSelectedSectionId(section.id)}
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
                          selectedSectionId === section.id ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                        }`}>
                          {section.section_type === 'heading' && (
                            <div className="text-gray-500 text-xs mb-2 flex items-center gap-1">
                              <FiType size={12} />
                              Heading
                            </div>
                          )}
                          
                          {renderSection(section)}
                          
                          {section.section_type === 'image' && !section.image_url && (
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                              <FiImage className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                              <p className="text-gray-500">Add image URL above or upload an image</p>
                            </div>
                          )}
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
  );
};

export default DocumentEditor;