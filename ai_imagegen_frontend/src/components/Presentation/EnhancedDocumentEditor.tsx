import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  FiType, FiImage, FiBarChart, FiTable, FiCode, FiList,
  FiSave, FiDownload, FiShare2, FiEye, FiEdit3, FiSettings,
  FiBold, FiItalic, FiUnderline, FiAlignLeft, FiAlignCenter, FiAlignRight,
  FiMove, FiZap, FiLayers
} from 'react-icons/fi';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'react-toastify';
import SectionEditor from './SectionEditor';
import ContentImportPanel from './ContentImportPanel';
import { SectionData, ConversionOptions } from '../../types/Presentation';

interface EnhancedDocumentEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  onSave: () => void;
  presentationId?: number;
  userImages?: string[];
  userDiagrams?: any[];
  isReadOnly?: boolean;
}

interface ContentBlock {
  id: string;
  type: 'text' | 'image' | 'diagram' | 'table' | 'code' | 'quote' | 'list';
  content: any;
  position: { x: number; y: number };
  styling: Record<string, any>;
}

const EnhancedDocumentEditor: React.FC<EnhancedDocumentEditorProps> = ({
  content,
  onContentChange,
  onSave,
  presentationId,
  userImages = [],
  userDiagrams = [],
  isReadOnly = false
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [selectedText, setSelectedText] = useState('');
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [showSectionEditor, setShowSectionEditor] = useState(false);
  const [viewMode, setViewMode] = useState<'rich' | 'sections'>('rich');
  const [documentSettings, setDocumentSettings] = useState({
    fontSize: 14,
    fontFamily: 'Arial',
    lineHeight: 1.6,
    theme: 'default',
    pageSize: 'A4',
    margins: { top: 20, right: 20, bottom: 20, left: 20 }
  });

  // Parse content into sections
  useEffect(() => {
    if (content && viewMode === 'sections') {
      parseContentIntoSections();
    }
  }, [content, viewMode]);

  const parseContentIntoSections = () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const elements = doc.body.children;
    
    const parsedSections: SectionData[] = [];
    
    Array.from(elements).forEach((element, index) => {
      const tagName = element.tagName.toLowerCase();
      let type: SectionData['type'] = 'paragraph';
      let level = undefined;
      
      if (tagName.match(/^h[1-6]$/)) {
        type = 'heading';
        level = parseInt(tagName.charAt(1));
      } else if (tagName === 'ul' || tagName === 'ol') {
        type = 'list';
      } else if (tagName === 'table') {
        type = 'table';
      } else if (tagName === 'img') {
        type = 'image';
      }
      
      parsedSections.push({
        id: `section_${index}`,
        title: type === 'heading' ? element.textContent || '' : `Section ${index + 1}`,
        content: element.outerHTML,
        type,
        level,
        order: index,
        metadata: {
          originalTag: tagName,
          className: element.className
        }
      });
    });
    
    setSections(parsedSections);
  };

  const handleSectionsChange = (updatedSections: SectionData[]) => {
    setSections(updatedSections);
    
    // Convert sections back to HTML
    const htmlContent = updatedSections
      .sort((a, b) => a.order - b.order)
      .map(section => section.content)
      .join('\n');
    
    onContentChange(htmlContent);
  };

  const handleSectionConvert = (sectionId: string, diagramElement: any) => {
    const updatedSections = sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          type: 'diagram' as const,
          content: `<div class="diagram-container" data-diagram-id="${diagramElement.id}">
            <img src="${diagramElement.preview_url}" alt="${diagramElement.name}" class="w-full h-auto rounded-lg" />
            <div class="text-center text-sm text-gray-600 mt-2">${diagramElement.name}</div>
          </div>`,
          metadata: {
            ...section.metadata,
            diagramData: diagramElement
          }
        };
      }
      return section;
    });
    
    setSections(updatedSections);
    handleSectionsChange(updatedSections);
  };
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const editorRect = editorRef.current?.getBoundingClientRect();
      
      if (editorRect && rect.width > 0) {
        setSelectedText(selection.toString());
        setToolbarPosition({
          x: rect.left - editorRect.left + rect.width / 2,
          y: rect.top - editorRect.top - 50
        });
        setShowToolbar(true);
      }
    } else {
      setShowToolbar(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', handleTextSelection);
    return () => document.removeEventListener('selectionchange', handleTextSelection);
  }, [handleTextSelection]);

  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onContentChange(editorRef.current.innerHTML);
    }
  };

  const insertContentBlock = (type: string) => {
    const newBlock: ContentBlock = {
      id: `block_${Date.now()}`,
      type: type as any,
      content: getDefaultContent(type),
      position: { x: 0, y: 0 },
      styling: {}
    };

    setContentBlocks(prev => [...prev, newBlock]);
    insertBlockIntoEditor(newBlock);
    setShowInsertMenu(false);
  };

  const getDefaultContent = (type: string) => {
    switch (type) {
      case 'table':
        return {
          rows: 3,
          cols: 3,
          data: Array(3).fill(null).map(() => Array(3).fill(''))
        };
      case 'code':
        return {
          language: 'javascript',
          code: '// Your code here'
        };
      case 'quote':
        return {
          text: 'Your quote here',
          author: 'Author name'
        };
      case 'list':
        return {
          type: 'bullet',
          items: ['Item 1', 'Item 2', 'Item 3']
        };
      case 'image':
        return {
          src: '',
          alt: 'Image description',
          caption: ''
        };
      case 'diagram':
        return {
          type: 'flowchart',
          data: {}
        };
      default:
        return {};
    }
  };

  const insertBlockIntoEditor = (block: ContentBlock) => {
    if (!editorRef.current) return;

    const blockElement = createBlockElement(block);
    const selection = window.getSelection();
    
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(blockElement);
    } else {
      editorRef.current.appendChild(blockElement);
    }
    
    onContentChange(editorRef.current.innerHTML);
  };

  const createBlockElement = (block: ContentBlock): HTMLElement => {
    const container = document.createElement('div');
    container.className = 'content-block';
    container.setAttribute('data-block-id', block.id);
    container.setAttribute('data-block-type', block.type);

    switch (block.type) {
      case 'table':
        container.innerHTML = createTableHTML(block.content);
        break;
      case 'code':
        container.innerHTML = `
          <div class="code-block bg-gray-100 border border-gray-300 rounded-lg p-4 my-4">
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm text-gray-600">Language: ${block.content.language}</span>
              <button class="text-blue-600 hover:text-blue-800 text-sm">Edit Code</button>
            </div>
            <pre class="text-sm"><code>${block.content.code}</code></pre>
          </div>
        `;
        break;
      case 'quote':
        container.innerHTML = `
          <blockquote class="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50">
            <p class="text-lg italic text-gray-700">"${block.content.text}"</p>
            <footer class="text-sm text-gray-600 mt-2">— ${block.content.author}</footer>
          </blockquote>
        `;
        break;
      case 'list':
        const listType = block.content.type === 'bullet' ? 'ul' : 'ol';
        const items = block.content.items.map((item: string) => `<li>${item}</li>`).join('');
        container.innerHTML = `<${listType} class="my-4 pl-6">${items}</${listType}>`;
        break;
      case 'image':
        if (block.content.src) {
          container.innerHTML = `
            <figure class="my-6 text-center">
              <img src="${block.content.src}" alt="${block.content.alt}" class="max-w-full h-auto rounded-lg shadow-md mx-auto" />
              ${block.content.caption ? `<figcaption class="text-sm text-gray-600 mt-2">${block.content.caption}</figcaption>` : ''}
            </figure>
          `;
        }
        break;
      default:
        container.innerHTML = `<div class="my-4 p-4 border border-dashed border-gray-300 rounded">${block.type} block</div>`;
    }

    return container;
  };

  const createTableHTML = (tableData: any): string => {
    const { rows, cols, data } = tableData;
    let html = '<table class="w-full border-collapse border border-gray-300 my-4">';
    
    for (let i = 0; i < rows; i++) {
      html += '<tr>';
      for (let j = 0; j < cols; j++) {
        const cellContent = data[i]?.[j] || '';
        const cellType = i === 0 ? 'th' : 'td';
        html += `<${cellType} class="border border-gray-300 px-3 py-2 ${i === 0 ? 'bg-gray-100 font-semibold' : ''}">${cellContent}</${cellType}>`;
      }
      html += '</tr>';
    }
    
    html += '</table>';
    return html;
  };

  const insertUserImage = (imageUrl: string) => {
    const imageBlock: ContentBlock = {
      id: `img_${Date.now()}`,
      type: 'image',
      content: {
        src: imageUrl,
        alt: 'User generated image',
        caption: 'Generated image from your collection'
      },
      position: { x: 0, y: 0 },
      styling: {}
    };

    insertBlockIntoEditor(imageBlock);
    setShowInsertMenu(false);
  };

  const insertUserDiagram = (diagram: any) => {
    const diagramBlock: ContentBlock = {
      id: `diagram_${Date.now()}`,
      type: 'diagram',
      content: diagram,
      position: { x: 0, y: 0 },
      styling: {}
    };

    insertBlockIntoEditor(diagramBlock);
    setShowInsertMenu(false);
  };

  const exportDocument = (format: 'pdf' | 'docx' | 'html') => {
    // Implementation for document export
    toast.success(`Exporting document as ${format.toUpperCase()}...`);
  };

  return (
  <div className="relative w-full h-full bg-white">
    {/* Enhanced Toolbar */}
    <div className="border-b border-gray-200 p-4 bg-gray-50 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('rich')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'rich' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
            >
              <FiEdit3 className="inline mr-1" size={14} />
              Rich Editor
            </button>
            <button
              onClick={() => setViewMode('sections')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'sections' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
            >
              <FiLayers className="inline mr-1" size={14} />
              Section Editor
            </button>
          </div>

          {/* Text Formatting */}
          <div className="flex items-center gap-2 border-r border-gray-300 pr-4">
            <button onClick={() => formatText('bold')} className="p-2 rounded hover:bg-gray-200 transition-colors" title="Bold">
              <FiBold />
            </button>
            <button onClick={() => formatText('italic')} className="p-2 rounded hover:bg-gray-200 transition-colors" title="Italic">
              <FiItalic />
            </button>
            <button onClick={() => formatText('underline')} className="p-2 rounded hover:bg-gray-200 transition-colors" title="Underline">
              <FiUnderline />
            </button>
          </div>

          {/* Alignment */}
          <div className="flex items-center gap-2 border-r border-gray-300 pr-4">
            <button onClick={() => formatText('justifyLeft')} className="p-2 rounded hover:bg-gray-200 transition-colors" title="Align Left">
              <FiAlignLeft />
            </button>
            <button onClick={() => formatText('justifyCenter')} className="p-2 rounded hover:bg-gray-200 transition-colors" title="Align Center">
              <FiAlignCenter />
            </button>
            <button onClick={() => formatText('justifyRight')} className="p-2 rounded hover:bg-gray-200 transition-colors" title="Align Right">
              <FiAlignRight />
            </button>
          </div>

          {/* Font Settings */}
          <div className="flex items-center gap-2 border-r border-gray-300 pr-4">
            <select
              value={documentSettings.fontFamily}
              onChange={(e) => {
                setDocumentSettings(prev => ({ ...prev, fontFamily: e.target.value }));
                formatText('fontName', e.target.value);
              }}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Georgia">Georgia</option>
              <option value="Courier New">Courier New</option>
            </select>
            <select
              value={documentSettings.fontSize}
              onChange={(e) => {
                setDocumentSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) }));
                formatText('fontSize', e.target.value);
              }}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              {[10, 12, 14, 16, 18, 20, 24, 28, 32].map(size => (
                <option key={size} value={size}>{size}px</option>
              ))}
            </select>
          </div>

          {/* Insert Menu */}
          <div className="relative">
            <button
              onClick={() => setShowInsertMenu(!showInsertMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Insert
            </button>
            {showInsertMenu && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                <div className="p-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => insertContentBlock('table')} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded text-sm">
                      <FiTable /> Table
                    </button>
                    <button onClick={() => insertContentBlock('code')} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded text-sm">
                      <FiCode /> Code
                    </button>
                    <button onClick={() => insertContentBlock('quote')} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded text-sm">
                      <FiType /> Quote
                    </button>
                    <button onClick={() => insertContentBlock('list')} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded text-sm">
                      <FiList /> List
                    </button>
                    <button onClick={() => setShowImportPanel(true)} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded text-sm">
                      <FiImage /> Import Content
                    </button>
                    <button onClick={() => setShowSectionEditor(true)} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded text-sm">
                      <FiMove /> Manage Sections
                    </button>
                  </div>

                  {userImages.length > 0 && (
                    <div className="mt-4 border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Your Images</h4>
                      <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                        {userImages.slice(0, 9).map((imageUrl, index) => (
                          <button key={index} onClick={() => insertUserImage(imageUrl)} className="aspect-square rounded overflow-hidden hover:ring-2 hover:ring-blue-500">
                            <img src={imageUrl} alt={`User image ${index + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                      {userImages.length > 9 && (
                        <p className="text-xs text-gray-500 mt-1">
                          +{userImages.length - 9} more images available
                        </p>
                      )}
                    </div>
                  )}

                  {userDiagrams.length > 0 && (
                    <div className="mt-4 border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Your Diagrams</h4>
                      <div className="space-y-1">
                        {userDiagrams.slice(0, 5).map((diagram, index) => (
                          <button key={index} onClick={() => insertUserDiagram(diagram)} className="w-full text-left p-2 hover:bg-gray-100 rounded text-sm">
                            <FiBarChart className="inline mr-2" />
                            {diagram.name || `Diagram ${index + 1}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Document Actions */}
        <div className="flex items-center gap-2">
          <button onClick={() => setShowImportPanel(true)} className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors">
            <FiImage size={16} /> Import
          </button>
          <button onClick={() => setDocumentSettings(prev => ({ ...prev, theme: prev.theme === 'default' ? 'dark' : 'default' }))} className="p-2 rounded hover:bg-gray-200 transition-colors" title="Toggle Theme">
            <FiSettings />
          </button>
          <button onClick={onSave} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors">
            <FiSave size={16} /> Save
          </button>
          <div className="relative group">
            <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
              <FiDownload size={16} /> Export
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <div className="p-2">
                <button onClick={() => exportDocument('pdf')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded">
                  Export as PDF
                </button>
                <button onClick={() => exportDocument('docx')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded">
                  Export as Word
                </button>
                <button onClick={() => exportDocument('html')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded">
                  Export as HTML
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

};

export default EnhancedDocumentEditor;