import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  FiFileText, FiList, FiZap, FiEye, FiSearch, FiSettings, FiSave,
  FiDownload, FiShare2, FiMoreHorizontal, FiNavigation, FiBookmark,
  FiType, FiImage, FiBarChart, FiMove, FiEdit3, FiTarget
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import RichTextEditor from './RichTextEditor';
import DiagramCreator from './DiagramCreator';
import { ExportModal } from './ExportModal';
import { Presentation, ContentSection, DiagramElement, ExportRequest } from '../../types/Presentation';

interface DocumentOutlineNode {
  id: string;
  type: 'heading' | 'paragraph' | 'list' | 'table' | 'diagram';
  level: number; // For headings: 1-6, for others: 0
  text: string;
  startIndex: number;
  endIndex: number;
  children?: DocumentOutlineNode[];
  element?: HTMLElement;
}

interface TextSelection {
  text: string;
  position: { x: number; y: number };
  range: Range | null;
  node?: DocumentOutlineNode;
}

interface UnifiedDocumentEditorProps {
  presentation: Presentation;
  onPresentationUpdate: (updates: Partial<Presentation>) => Promise<Presentation | undefined>;
  onDiagramCreate: (diagram: Partial<DiagramElement>) => Promise<DiagramElement | undefined>;
  viewMode: 'edit' | 'preview';
}

const UnifiedDocumentEditor: React.FC<UnifiedDocumentEditorProps> = ({
  presentation,
  onPresentationUpdate,
  onDiagramCreate,
  viewMode
}) => {
  // Document state - prioritize rich content from new backend structure
  const [content, setContent] = useState(
    presentation.document_content || 
    presentation.description || 
    '<h1>Professional Document</h1><p>Start writing your professional document here...</p>'
  );
  const [outline, setOutline] = useState<DocumentOutlineNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<DocumentOutlineNode | null>(null);
  const [showOutline, setShowOutline] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  // Text selection and diagram conversion
  const [selectedText, setSelectedText] = useState<TextSelection | null>(null);
  const [showDiagramCreator, setShowDiagramCreator] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Editor settings
  const [documentSettings, setDocumentSettings] = useState({
    fontSize: 16,
    fontFamily: 'Georgia, serif',
    lineHeight: 1.6,
    pageWidth: 800,
    pageMargins: 60,
    showPageNumbers: true,
    showWordCount: true,
    autoSave: true
  });

  // References
  const editorRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<any>(null);

  // Generate HTML for diagram insertion
  const generateDiagramHtml = useCallback((diagram: DiagramElement): string => {
    // Create a diagram placeholder or embed based on diagram type
    const diagramType = diagram.chart_type || 'unknown';
    const diagramId = diagram.id || 'new-diagram';
    
    return `
      <div class="diagram-container" data-diagram-id="${diagramId}" style="margin: 20px 0; padding: 16px; border: 2px dashed #e5e7eb; border-radius: 8px; text-align: center; background-color: #f9fafb;">
        <div class="diagram-header" style="margin-bottom: 12px;">
          <h4 style="margin: 0; font-size: 16px; font-weight: 600; color: #374151;">${diagram.title || 'AI Generated Diagram'}</h4>
          <p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280;">Type: ${diagramType}</p>
        </div>
        
        ${diagram.image_url ? `
          <img src="${diagram.image_url}" 
               alt="${diagram.title || 'Generated diagram'}" 
               style="max-width: 100%; height: auto; border-radius: 4px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);" />
        ` : `
          <div style="padding: 40px; background-color: #ffffff; border-radius: 4px; border: 1px solid #d1d5db;">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" style="margin: 0 auto 12px;">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Diagram will be generated here</p>
          </div>
        `}
        
        ${diagram.description ? `
          <p style="margin: 12px 0 0 0; font-size: 14px; color: #4b5563; font-style: italic;">${diagram.description}</p>
        ` : ''}
      </div>
    `;
  }, []);

  // Parse document content and create outline
  const parseDocumentOutline = useCallback((html: string): DocumentOutlineNode[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const nodes: DocumentOutlineNode[] = [];
    let nodeId = 1;

    const traverse = (element: Element, parentLevel = 0): DocumentOutlineNode[] => {
      const children: DocumentOutlineNode[] = [];

      Array.from(element.children).forEach((child) => {
        const tagName = child.tagName.toLowerCase();
        let node: DocumentOutlineNode | null = null;

        // Headings
        if (tagName.match(/^h[1-6]$/)) {
          const level = parseInt(tagName.charAt(1));
          node = {
            id: `node-${nodeId++}`,
            type: 'heading',
            level,
            text: child.textContent || '',
            startIndex: 0,
            endIndex: 0,
            children: []
          };
        }
        // Paragraphs
        else if (tagName === 'p' && child.textContent?.trim()) {
          node = {
            id: `node-${nodeId++}`,
            type: 'paragraph',
            level: 0,
            text: child.textContent.substring(0, 100) + (child.textContent.length > 100 ? '...' : ''),
            startIndex: 0,
            endIndex: 0
          };
        }
        // Lists
        else if (tagName === 'ul' || tagName === 'ol') {
          const listItems = Array.from(child.querySelectorAll('li')).map(li => li.textContent).join(', ');
          node = {
            id: `node-${nodeId++}`,
            type: 'list',
            level: 0,
            text: `${tagName.toUpperCase()}: ${listItems.substring(0, 80)}${listItems.length > 80 ? '...' : ''}`,
            startIndex: 0,
            endIndex: 0
          };
        }
        // Tables
        else if (tagName === 'table') {
          const rows = child.querySelectorAll('tr').length;
          const cols = child.querySelector('tr')?.querySelectorAll('td, th').length || 0;
          node = {
            id: `node-${nodeId++}`,
            type: 'table',
            level: 0,
            text: `Table (${rows}x${cols})`,
            startIndex: 0,
            endIndex: 0
          };
        }

        if (node) {
          // Recursively process children for headings
          if (node.type === 'heading') {
            node.children = traverse(child, node.level);
          }
          children.push(node);
        } else {
          // Continue traversing children for non-matching elements
          children.push(...traverse(child, parentLevel));
        }
      });

      return children;
    };

    return traverse(doc.body);
  }, []);

  // Handle text selection
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setSelectedText(null);
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 10) {
      setSelectedText(null);
      return;
    }

    // Get selection position
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    setSelectedText({
      text,
      position: {
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      },
      range: range.cloneRange()
    });
  }, []);

  // Handle content change
  const handleContentChange = useCallback(async (newContent: string) => {
    setContent(newContent);
    
    // Parse outline
    const newOutline = parseDocumentOutline(newContent);
    setOutline(newOutline);
    
    // Auto-save if enabled - update both fields for new backend structure
    if (documentSettings.autoSave) {
      await onPresentationUpdate({ 
        description: newContent,
        document_content: newContent 
      });
    }
  }, [parseDocumentOutline, documentSettings.autoSave, onPresentationUpdate]);

  // Handle outline node click
  const handleOutlineNodeClick = (node: DocumentOutlineNode) => {
    setSelectedNode(node);
    
    // Scroll to content (would need to implement content positioning)
    if (node.element) {
      node.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Handle diagram creation
  const handleDiagramCreated = async (diagram: DiagramElement) => {
    if (selectedText && selectedText.range) {
      try {
        // Replace the selected text with the diagram HTML
        const diagramHtml = generateDiagramHtml(diagram);
        
        // Replace the selected text with the diagram
        const selection = window.getSelection();
        if (selection && selectedText.range) {
          // Clear the selection
          selectedText.range.deleteContents();
          
          // Create a temporary div to hold the HTML
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = diagramHtml;
          
          // Insert the new content
          const fragment = document.createDocumentFragment();
          while (tempDiv.firstChild) {
            fragment.appendChild(tempDiv.firstChild);
          }
          selectedText.range.insertNode(fragment);
          
          // Clear the selection to avoid conflicts
          if (selection) {
            selection.removeAllRanges();
          }
          
          // For TinyMCE integration, we need to trigger content update
          // Get updated content from the editor
          setTimeout(() => {
            if (contentRef.current && typeof contentRef.current.getContent === 'function') {
              const updatedContent = contentRef.current.getContent();
              setContent(updatedContent);
              
              // Update the presentation
              onPresentationUpdate({ 
                description: updatedContent,
                document_content: updatedContent 
              });
            }
          }, 100);
          
          toast.success('Text replaced with diagram successfully!');
        }
      } catch (error) {
        console.error('Error replacing text with diagram:', error);
        toast.error('Failed to replace text with diagram');
      }
    } else {
      // If no text selected, just append the diagram to the end
      const diagramHtml = generateDiagramHtml(diagram);
      const updatedContent = content + '\n\n' + diagramHtml;
      setContent(updatedContent);
      
      await onPresentationUpdate({ 
        description: updatedContent,
        document_content: updatedContent 
      });
      
      toast.success('Diagram added to document successfully!');
    }
    
    setShowDiagramCreator(false);
    setSelectedText(null);
  };

  // Generate AI suggestions based on selected text
  const generateTextSuggestions = useCallback((text: string) => {
    // This would connect to your AI API
    const suggestions = [
      'Convert to flowchart diagram',
      'Create comparison table',
      'Generate timeline',
      'Build process diagram'
    ];
    return suggestions;
  }, []);

  // Toolbar actions
  const handleExport = () => {
    // Implementation for document export
    toast.info('Export functionality coming soon');
  };

  const handleSave = async () => {
    setIsGenerating(true);
    try {
      await onPresentationUpdate({ 
        description: content,
        document_content: content 
      });
      toast.success('Document saved successfully');
    } catch (error) {
      toast.error('Failed to save document');
    } finally {
      setIsGenerating(false);
    }
  };

  // Initialize content and outline
  useEffect(() => {
    if (presentation.description && presentation.description !== content) {
      setContent(presentation.description);
      setOutline(parseDocumentOutline(presentation.description));
    }
  }, [presentation.description, content, parseDocumentOutline]);

  // Set up text selection listener
  useEffect(() => {
    const handleSelectionChange = () => {
      setTimeout(handleTextSelection, 100);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [handleTextSelection]);

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Document Outline Sidebar */}
      {showOutline && (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <FiList size={18} />
                Document Outline
              </h3>
              <button
                onClick={() => setShowOutline(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <FiEye size={16} />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {outline.length === 0 ? (
              <div className="text-center py-8">
                <FiFileText className="mx-auto text-gray-400 mb-3" size={32} />
                <p className="text-gray-600">No outline available</p>
                <p className="text-sm text-gray-500">Start writing to see document structure</p>
              </div>
            ) : (
              <div className="space-y-1">
                {outline.map((node) => (
                  <OutlineNode
                    key={node.id}
                    node={node}
                    selectedNode={selectedNode}
                    onNodeClick={handleOutlineNodeClick}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900">{presentation.title}</h1>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowOutline(!showOutline)}
                  className={`p-2 rounded-lg transition-colors ${
                    showOutline ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title="Toggle Outline"
                >
                  <FiList size={18} />
                </button>
                
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-2 rounded-lg transition-colors ${
                    showSettings ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title="Settings"
                >
                  <FiSettings size={18} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium"
              >
                <FiSave size={16} />
                {isGenerating ? 'Saving...' : 'Save'}
              </button>
              
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium"
              >
                <FiDownload size={16} />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Document Editor */}
        <div 
          className="flex-1 overflow-auto bg-gray-100 p-8"
          ref={editorRef}
          style={{ fontSize: documentSettings.fontSize }}
        >
          <div 
            className="mx-auto bg-white rounded-lg shadow-sm"
            style={{
              maxWidth: documentSettings.pageWidth,
              padding: documentSettings.pageMargins,
              fontFamily: documentSettings.fontFamily,
              lineHeight: documentSettings.lineHeight
            }}
          >
            <RichTextEditor
              ref={contentRef}
              content={content}
              onChange={handleContentChange}
              placeholder="Start writing your document..."
              height={600}
              readOnly={viewMode === 'preview'}
            />
          </div>
        </div>

        {/* Word Count & Status Bar */}
        {documentSettings.showWordCount && (
          <div className="bg-white border-t border-gray-200 px-4 py-2 text-sm text-gray-600">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <span>Words: {content.replace(/<[^>]*>/g, '').split(/\s+/).filter(word => word.length > 0).length}</span>
                <span>Characters: {content.replace(/<[^>]*>/g, '').length}</span>
              </div>
              {selectedText && (
                <div className="flex items-center gap-2 text-blue-600">
                  <FiTarget size={14} />
                  <span>Selected: {selectedText.text.length} chars</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Text Selection Popup */}
      {selectedText && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-2"
          style={{
            left: Math.min(selectedText.position.x - 100, window.innerWidth - 220),
            top: Math.max(selectedText.position.y - 60, 10)
          }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDiagramCreator(true)}
              className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium"
            >
              <FiZap size={14} />
              Create Diagram
            </button>
            <button
              onClick={() => setSelectedText(null)}
              className="p-2 hover:bg-gray-100 rounded-md text-gray-500"
            >
              <FiEdit3 size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Diagram Creator */}
      {showDiagramCreator && selectedText && (
        <DiagramCreator
          presentationId={presentation.id}
          selectedText={selectedText.text}
          position={selectedText.position}
          onDiagramCreated={handleDiagramCreated}
          onClose={() => {
            setShowDiagramCreator(false);
            setSelectedText(null);
          }}
          mode="inline"
          isVisible={true}
        />
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Document Settings</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
                <input
                  type="range"
                  min="12"
                  max="24"
                  value={documentSettings.fontSize}
                  onChange={(e) => setDocumentSettings(prev => ({ ...prev, fontSize: Number(e.target.value) }))}
                  className="w-full"
                />
                <span className="text-sm text-gray-500">{documentSettings.fontSize}px</span>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Font Family</label>
                <select
                  value={documentSettings.fontFamily}
                  onChange={(e) => setDocumentSettings(prev => ({ ...prev, fontFamily: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="Georgia, serif">Georgia</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="Times New Roman, serif">Times New Roman</option>
                  <option value="Inter, sans-serif">Inter</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Show Word Count</span>
                <input
                  type="checkbox"
                  checked={documentSettings.showWordCount}
                  onChange={(e) => setDocumentSettings(prev => ({ ...prev, showWordCount: e.target.checked }))}
                  className="rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Auto Save</span>
                <input
                  type="checkbox"
                  checked={documentSettings.autoSave}
                  onChange={(e) => setDocumentSettings(prev => ({ ...prev, autoSave: e.target.checked }))}
                  className="rounded"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Outline Node Component
interface OutlineNodeProps {
  node: DocumentOutlineNode;
  selectedNode: DocumentOutlineNode | null;
  onNodeClick: (node: DocumentOutlineNode) => void;
  depth?: number;
}

const OutlineNode: React.FC<OutlineNodeProps> = ({ node, selectedNode, onNodeClick, depth = 0 }) => {
  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'heading': return FiType;
      case 'paragraph': return FiFileText;
      case 'list': return FiList;
      case 'table': return FiBarChart;
      case 'diagram': return FiZap;
      default: return FiFileText;
    }
  };

  const Icon = getNodeIcon(node.type);
  const isSelected = selectedNode?.id === node.id;

  return (
    <div>
      <button
        onClick={() => onNodeClick(node)}
        className={`w-full text-left p-2 rounded-md hover:bg-gray-50 transition-colors ${
          isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : ''
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        <div className="flex items-center gap-2">
          <Icon size={14} className={`${
            node.type === 'heading' ? 'text-blue-600' :
            node.type === 'list' ? 'text-green-600' :
            node.type === 'table' ? 'text-purple-600' :
            'text-gray-600'
          }`} />
          <span className={`text-sm truncate ${
            node.type === 'heading' ? `font-${node.level <= 2 ? 'semibold' : 'medium'}` : ''
          }`}>
            {node.text}
          </span>
        </div>
      </button>
      
      {node.children && node.children.map((child) => (
        <OutlineNode
          key={child.id}
          node={child}
          selectedNode={selectedNode}
          onNodeClick={onNodeClick}
          depth={depth + 1}
        />
      ))}
    </div>
  );
};

export default UnifiedDocumentEditor;