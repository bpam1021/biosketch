import React, { useState, useRef, useEffect } from 'react';
import { Document, DocumentSection } from '../../types/Presentation';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  FiPlus, FiTrash2, FiMove, FiType, FiImage, FiList, 
  FiBarChart, FiCode, FiTable, FiWind, FiSave, FiDownload,
  FiBold, FiItalic, FiUnderline, FiAlignLeft, FiAlignCenter, FiAlignRight
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { FileText } from 'lucide-react';

interface DocumentEditorProps {
  document: Document;
  onUpdate: (document: Document) => void;
  onSave: () => void;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({ document, onUpdate, onSave }) => {
  const [sections, setSections] = useState<DocumentSection[]>(document.sections || []);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const sectionTypes = [
    { type: 'heading', icon: FiType, label: 'Heading', description: 'Add a section heading' },
    { type: 'paragraph', icon: FiType, label: 'Paragraph', description: 'Add text content' },
    { type: 'list', icon: FiList, label: 'List', description: 'Bulleted or numbered list' },
    { type: 'image', icon: FiImage, label: 'Image', description: 'Insert an image' },
    { type: 'diagram', icon: FiBarChart, label: 'Diagram', description: 'AI-generated diagram' },
    { type: 'table', icon: FiTable, label: 'Table', description: 'Data table' },
    { type: 'code', icon: FiCode, label: 'Code Block', description: 'Code snippet' },
  ];

  useEffect(() => {
    setSections(document.sections || []);
  }, [document.sections]);

  const addSection = (type: DocumentSection['section_type']) => {
    const newSection: DocumentSection = {
      id: Date.now(),
      document_id: document.id,
      section_type: type,
      content: getDefaultContent(type),
      order: sections.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedSections = [...sections, newSection];
    setSections(updatedSections);
    onUpdate({ ...document, sections: updatedSections });
    setShowAddMenu(false);
  };

  const getDefaultContent = (type: DocumentSection['section_type']): string => {
    switch (type) {
      case 'heading': return 'New Heading';
      case 'paragraph': return 'Enter your content here...';
      case 'list': return '• First item\n• Second item\n• Third item';
      case 'code': return '// Your code here\nconsole.log("Hello World");';
      case 'table': return 'Column 1|Column 2|Column 3\nRow 1|Data|Data\nRow 2|Data|Data';
      default: return '';
    }
  };

  const updateSection = (id: number, field: keyof DocumentSection, value: any) => {
    const updatedSections = sections.map(section =>
      section.id === id 
        ? { ...section, [field]: value, updated_at: new Date().toISOString() }
        : section
    );
    setSections(updatedSections);
    onUpdate({ ...document, sections: updatedSections });
  };

  const deleteSection = (id: number) => {
    const updatedSections = sections.filter(section => section.id !== id);
    setSections(updatedSections);
    onUpdate({ ...document, sections: updatedSections });
  };

  const reorderSections = (startIndex: number, endIndex: number) => {
    const result = Array.from(sections);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    
    const updatedSections = result.map((section, index) => ({
      ...section,
      order: index,
      updated_at: new Date().toISOString(),
    }));
    
    setSections(updatedSections);
    onUpdate({ ...document, sections: updatedSections });
  };

  const generateAIContent = async (sectionId: number) => {
    setIsGeneratingContent(true);
    try {
      // Simulate AI content generation
      const section = sections.find(s => s.id === sectionId);
      if (!section) return;

      // This would call your AI API
      const aiContent = await simulateAIContentGeneration(section.section_type, document.original_prompt);
      updateSection(sectionId, 'content', aiContent);
      toast.success('AI content generated successfully!');
    } catch (error) {
      toast.error('Failed to generate AI content');
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const simulateAIContentGeneration = async (type: string, prompt: string): Promise<string> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    switch (type) {
      case 'heading':
        return `${prompt.split(' ').slice(0, 3).join(' ')} Analysis`;
      case 'paragraph':
        return `This section provides comprehensive analysis of ${prompt.toLowerCase()}. The research demonstrates significant findings that contribute to our understanding of the subject matter. Through detailed examination and methodological approaches, we can observe patterns and draw meaningful conclusions.`;
      case 'list':
        return `• Key finding from ${prompt}\n• Methodological approach\n• Statistical significance\n• Clinical implications\n• Future research directions`;
      default:
        return `Generated content for ${type} based on: ${prompt}`;
    }
  };

  const formatText = (sectionId: number, format: 'bold' | 'italic' | 'underline') => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const currentFormatting = section.formatting || {};
    updateSection(sectionId, 'formatting', {
      ...currentFormatting,
      [format]: !currentFormatting[format]
    });
  };

  const alignText = (sectionId: number, alignment: 'left' | 'center' | 'right' | 'justify') => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const currentFormatting = section.formatting || {};
    updateSection(sectionId, 'formatting', {
      ...currentFormatting,
      textAlign: alignment
    });
  };

  const renderSection = (section: DocumentSection) => {
    const formatting = section.formatting || {};
    const style = {
      fontSize: formatting.fontSize ? `${formatting.fontSize}px` : undefined,
      fontFamily: formatting.fontFamily,
      color: formatting.color,
      backgroundColor: formatting.backgroundColor,
      textAlign: formatting.textAlign as any,
      fontWeight: formatting.bold ? 'bold' : 'normal',
      fontStyle: formatting.italic ? 'italic' : 'normal',
      textDecoration: formatting.underline ? 'underline' : 'none',
    };

    switch (section.section_type) {
      case 'heading':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <select
                value={formatting.fontSize || 24}
                onChange={(e) => updateSection(section.id, 'formatting', {
                  ...formatting,
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

      case 'paragraph':
        return (
          <div className="space-y-2">
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

      case 'list':
        return (
          <div className="space-y-2">
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

      case 'image':
        return (
          <div className="space-y-2">
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
          </div>
        );

      case 'table':
        return (
          <div className="space-y-2">
            <textarea
              value={section.content}
              onChange={(e) => updateSection(section.id, 'content', e.target.value)}
              rows={6}
              className="w-full border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm"
              placeholder="Column 1|Column 2|Column 3&#10;Row 1|Data|Data&#10;Row 2|Data|Data"
            />
            <div className="text-xs text-gray-500">Use | to separate columns and new lines for rows</div>
          </div>
        );

      case 'code':
        return (
          <textarea
            value={section.content}
            onChange={(e) => updateSection(section.id, 'content', e.target.value)}
            rows={8}
            className="w-full border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm bg-gray-900 text-green-400"
            placeholder="// Enter your code here..."
          />
        );

      default:
        return (
          <textarea
            value={section.content}
            onChange={(e) => updateSection(section.id, 'content', e.target.value)}
            rows={4}
            className="w-full border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Enter content..."
          />
        );
    }
  };

  const renderFormattingButtons = (sectionId: number) => {
    const section = sections.find(s => s.id === sectionId);
    const formatting = section?.formatting || {};

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

  return (
    <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <input
              type="text"
              value={document.title}
              onChange={(e) => onUpdate({ ...document, title: e.target.value })}
              className="text-xl font-bold border-none outline-none bg-transparent"
              placeholder="Document Title"
            />
            <p className="text-sm text-gray-600 mt-1">
              {document.template_style} • {document.page_layout?.replace('_', ' ')}
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
                        onClick={() => addSection(type as DocumentSection['section_type'])}
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
            
            <button
              onClick={onSave}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <FiSave size={16} />
              Save
            </button>
            
            <button
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
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
          maxWidth: document.page_layout === 'single_column' ? '800px' : '100%',
          margin: '0 auto',
          columnCount: document.page_layout === 'two_column' ? 2 : document.page_layout === 'three_column' ? 3 : 1,
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
                    draggableId={section.id.toString()}
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
                        <div className="absolute -left-12 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
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