import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  FiEdit3, FiZap, FiEye, FiSave, FiType, FiList, FiBarChart, 
  FiImage, FiMoreHorizontal, FiCheck, FiX, FiPlus, FiChevronDown, FiChevronRight
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import DiagramCreator from './DiagramCreator';
import { Presentation, DiagramElement } from '../../types/Presentation';

interface DocumentSection {
  id: string;
  type: 'heading' | 'paragraph' | 'list' | 'table' | 'diagram';
  level?: number; // For headings: 1-6
  content: string;
  rawHtml: string;
  startIndex: number;
  endIndex: number;
  element?: HTMLElement;
  children?: DocumentSection[]; // For tree structure
}

interface CustomDocumentEditorProps {
  presentation: Presentation;
  onPresentationUpdate: (updates: Partial<Presentation>) => Promise<Presentation | undefined>;
  onDiagramCreate: (diagram: Partial<DiagramElement>) => Promise<DiagramElement | undefined>;
  viewMode: 'edit' | 'preview';
}

const CustomDocumentEditor: React.FC<CustomDocumentEditorProps> = ({
  presentation,
  onPresentationUpdate,
  onDiagramCreate,
  viewMode
}) => {
  const [sections, setSections] = useState<DocumentSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<DocumentSection | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  
  // Diagram conversion
  const [showDiagramCreator, setShowDiagramCreator] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');
  
  // Editor state
  const [isLoading, setIsLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [editContent, setEditContent] = useState<string>('');

  // Parse HTML content into structured sections with tree hierarchy
  const parseContent = useCallback((html: string): DocumentSection[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const flatSections: DocumentSection[] = [];
    let sectionId = 1;

    const processElement = (element: Element) => {
      const tagName = element.tagName.toLowerCase();
      
      if (tagName.match(/^h[1-6]$/)) {
        flatSections.push({
          id: `section-${sectionId++}`,
          type: 'heading',
          level: parseInt(tagName.charAt(1)),
          content: element.textContent || '',
          rawHtml: element.outerHTML,
          startIndex: 0,
          endIndex: 0
        });
      } else if (tagName === 'p' && element.textContent?.trim()) {
        flatSections.push({
          id: `section-${sectionId++}`,
          type: 'paragraph',
          content: element.textContent || '',
          rawHtml: element.outerHTML,
          startIndex: 0,
          endIndex: 0
        });
      } else if (tagName === 'ul' || tagName === 'ol') {
        const listItems = Array.from(element.querySelectorAll('li')).map(li => li.textContent).join(', ');
        flatSections.push({
          id: `section-${sectionId++}`,
          type: 'list',
          content: listItems,
          rawHtml: element.outerHTML,
          startIndex: 0,
          endIndex: 0
        });
      } else if (tagName === 'table') {
        const rows = element.querySelectorAll('tr').length;
        const cols = element.querySelector('tr')?.querySelectorAll('td, th').length || 0;
        flatSections.push({
          id: `section-${sectionId++}`,
          type: 'table',
          content: `Table (${rows}×${cols})`,
          rawHtml: element.outerHTML,
          startIndex: 0,
          endIndex: 0
        });
      } else if (tagName === 'div' && element.className.includes('diagram-container')) {
        flatSections.push({
          id: `section-${sectionId++}`,
          type: 'diagram',
          content: element.querySelector('h4')?.textContent || 'Diagram',
          rawHtml: element.outerHTML,
          startIndex: 0,
          endIndex: 0
        });
      }
    };

    // Process all elements
    Array.from(doc.body.children).forEach(processElement);
    
    // Build tree structure based on heading hierarchy
    const buildTree = (sections: DocumentSection[]): DocumentSection[] => {
      const result: DocumentSection[] = [];
      const stack: DocumentSection[] = [];
      
      sections.forEach((section) => {
        if (section.type === 'heading') {
          // Find the correct parent level
          while (stack.length > 0 && stack[stack.length - 1].level! >= section.level!) {
            stack.pop();
          }
          
          // Initialize children array for headings
          section.children = [];
          
          if (stack.length === 0) {
            result.push(section);
          } else {
            if (!stack[stack.length - 1].children) {
              stack[stack.length - 1].children = [];
            }
            stack[stack.length - 1].children!.push(section);
          }
          
          stack.push(section);
        } else {
          // Non-heading elements go under the current heading
          if (stack.length > 0) {
            if (!stack[stack.length - 1].children) {
              stack[stack.length - 1].children = [];
            }
            stack[stack.length - 1].children!.push(section);
          } else {
            result.push(section);
          }
        }
      });
      
      return result;
    };
    
    return buildTree(flatSections);
  }, []);

  // Initialize sections from presentation content
  useEffect(() => {
    if (presentation.content) {
      const parsedSections = parseContent(presentation.content);
      setSections(parsedSections);
    }
  }, [presentation.content, parseContent]);

  // Handle section selection from outline
  const handleSectionSelect = (section: DocumentSection) => {
    setSelectedSection(section);
    
    // Scroll to section in content
    const element = document.getElementById(`content-${section.id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Handle inline editing
  const startEditing = (sectionId: string, currentContent: string) => {
    setEditingSection(sectionId);
    setEditContent(currentContent);
  };

  // Helper function to find section in tree structure
  const findSectionInTree = (sections: DocumentSection[], sectionId: string): DocumentSection | null => {
    for (const section of sections) {
      if (section.id === sectionId) {
        return section;
      }
      if (section.children) {
        const found = findSectionInTree(section.children, sectionId);
        if (found) return found;
      }
    }
    return null;
  };

  // Helper function to flatten tree to get all sections for HTML rebuilding
  const flattenSections = (sections: DocumentSection[]): DocumentSection[] => {
    const result: DocumentSection[] = [];
    for (const section of sections) {
      result.push(section);
      if (section.children) {
        result.push(...flattenSections(section.children));
      }
    }
    return result;
  };

  const saveEdit = async (sectionId: string) => {
    const section = findSectionInTree(sections, sectionId);
    if (!section) return;
    
    // Update the section content
    section.content = editContent;
    
    // Update the raw HTML based on section type
    if (section.type === 'heading') {
      section.rawHtml = `<h${section.level}>${editContent}</h${section.level}>`;
    } else if (section.type === 'paragraph') {
      section.rawHtml = `<p>${editContent}</p>`;
    } else if (section.type === 'list') {
      section.rawHtml = `<ul><li>${editContent}</li></ul>`;
    } else {
      // For other types, wrap in appropriate tags
      section.rawHtml = `<div>${editContent}</div>`;
    }
    
    // Force re-render by creating new sections array
    setSections([...sections]);
    setEditingSection(null);
    
    // Rebuild HTML and save - flatten tree to get all sections in order
    const allSections = flattenSections(sections);
    const updatedHtml = allSections.map(s => s.rawHtml).join('\n');
    await onPresentationUpdate({ content: updatedHtml });
    
    toast.success('Section updated successfully');
  };

  const cancelEdit = () => {
    setEditingSection(null);
    setEditContent('');
  };

  // Handle text selection for diagram conversion
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().trim().length > 10) {
      setSelectedText(selection.toString().trim());
      setShowDiagramCreator(true);
    }
  };

  // Handle diagram creation
  const handleDiagramCreated = async (diagram: DiagramElement) => {
    if (selectedSection) {
      try {
        const createdDiagram = await onDiagramCreate(diagram);
        if (createdDiagram) {
          // Add diagram section after the selected section
          const diagramHtml = `
            <div class="diagram-container" data-diagram-id="${createdDiagram.id}">
              <h4>${createdDiagram.title}</h4>
              ${createdDiagram.image_url ? `<img src="${createdDiagram.image_url}" alt="${createdDiagram.title}" />` : '<p>Diagram will be generated here</p>'}
            </div>
          `;
          
          const sectionIndex = sections.findIndex(s => s.id === selectedSection.id);
          const updatedSections = [...sections];
          
          // Insert diagram section
          updatedSections.splice(sectionIndex + 1, 0, {
            id: `section-diagram-${Date.now()}`,
            type: 'diagram',
            content: createdDiagram.title || 'New Diagram',
            rawHtml: diagramHtml,
            startIndex: 0,
            endIndex: 0
          });
          
          setSections(updatedSections);
          
          // Update presentation content
          const updatedHtml = updatedSections.map(s => s.rawHtml).join('\n');
          await onPresentationUpdate({ content: updatedHtml });
          
          toast.success('Diagram created and inserted successfully!');
        }
      } catch (error) {
        toast.error('Failed to create diagram');
      }
    }
    
    setShowDiagramCreator(false);
    setSelectedText('');
  };

  // Tree expansion state
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Toggle node expansion
  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  // Get section icon
  const getSectionIcon = (type: string, level?: number) => {
    switch (type) {
      case 'heading': return <FiType className="text-blue-600" />;
      case 'paragraph': return <FiEdit3 className="text-gray-600" />;
      case 'list': return <FiList className="text-green-600" />;
      case 'table': return <FiBarChart className="text-purple-600" />;
      case 'diagram': return <FiImage className="text-orange-600" />;
      default: return <FiEdit3 className="text-gray-600" />;
    }
  };

  // Tree Section Component
  const TreeSection: React.FC<{
    section: DocumentSection;
    depth: number;
    onSelect: (section: DocumentSection) => void;
    onHover: (id: string | null) => void;
    onConvertToDiagram: (section: DocumentSection) => void;
    selectedId: string | null;
    hoveredId: string | null;
  }> = ({ section, depth, onSelect, onHover, onConvertToDiagram, selectedId, hoveredId }) => {
    const hasChildren = section.children && section.children.length > 0;
    const isExpanded = expandedNodes.has(section.id);
    const isSelected = selectedId === section.id;
    const isHovered = hoveredId === section.id;

    return (
      <>
        <div
          className={`group cursor-pointer hover:bg-blue-50 transition-colors ${
            isSelected ? 'bg-blue-50 border-r-4 border-r-blue-500' : ''
          } ${isHovered ? 'bg-gray-50' : ''}`}
          onClick={() => onSelect(section)}
          onMouseEnter={() => onHover(section.id)}
          onMouseLeave={() => onHover(null)}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          <div className="flex items-start gap-2 py-2 pr-3">
            {/* Expand/Collapse Button */}
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNodeExpansion(section.id);
                }}
                className="p-0.5 hover:bg-gray-200 rounded flex-shrink-0 mt-0.5"
              >
                {isExpanded ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
              </button>
            )}
            {!hasChildren && <div className="w-4 flex-shrink-0" />}
            
            {/* Section Icon */}
            <div className="mt-0.5 flex-shrink-0">
              {getSectionIcon(section.type, section.level)}
            </div>
            
            {/* Section Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className={`text-sm truncate ${
                  section.type === 'heading' ? 'font-medium text-gray-900' : 'text-gray-700'
                }`}>
                  {section.type === 'heading' && section.level ? `H${section.level}: ` : ''}
                  {section.content.length > 40 ? section.content.substring(0, 40) + '...' : section.content}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onConvertToDiagram(section);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-purple-100 rounded text-purple-600 flex-shrink-0"
                  title="Convert to diagram"
                >
                  <FiZap size={12} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 capitalize">
                {section.type}
                {section.type === 'heading' && section.level ? ` (Level ${section.level})` : ''}
                {hasChildren && ` • ${section.children!.length} item${section.children!.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
        </div>
        
        {/* Children */}
        {hasChildren && isExpanded && section.children!.map((child) => (
          <TreeSection
            key={child.id}
            section={child}
            depth={depth + 1}
            onSelect={onSelect}
            onHover={onHover}
            onConvertToDiagram={onConvertToDiagram}
            selectedId={selectedId}
            hoveredId={hoveredId}
          />
        ))}
      </>
    );
  };

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Document Outline Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <FiList size={18} />
            Document Outline
          </h3>
          <p className="text-sm text-gray-500 mt-1">{sections.length} sections</p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {sections.map((section) => (
            <TreeSection
              key={section.id}
              section={section}
              depth={0}
              onSelect={handleSectionSelect}
              onHover={setHoveredSection}
              onConvertToDiagram={(section) => {
                setSelectedSection(section);
                setShowDiagramCreator(true);
              }}
              selectedId={selectedSection?.id || null}
              hoveredId={hoveredSection}
            />
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">{presentation.title}</h1>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {viewMode === 'edit' ? 'Editing' : 'Preview'} • {sections.length} sections
              </span>
            </div>
          </div>
        </div>

        {/* Document Content */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto p-8 bg-gray-50"
          onMouseUp={handleTextSelection}
        >
          <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8">
            {flattenSections(sections).map((section) => (
              <div
                key={section.id}
                id={`content-${section.id}`}
                className={`group relative mb-6 ${
                  hoveredSection === section.id ? 'bg-blue-50 rounded-lg p-2 -m-2' : ''
                } ${selectedSection?.id === section.id ? 'ring-2 ring-blue-500 ring-opacity-50 rounded-lg p-2 -m-2' : ''}`}
                onMouseEnter={() => setHoveredSection(section.id)}
                onMouseLeave={() => setHoveredSection(null)}
              >
                {/* Edit Controls */}
                {viewMode === 'edit' && hoveredSection === section.id && (
                  <div className="absolute -left-12 top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEditing(section.id, section.content)}
                      className="p-1 bg-white rounded shadow-sm border border-gray-200 hover:bg-gray-50"
                      title="Edit section"
                    >
                      <FiEdit3 size={12} />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSection(section);
                        setShowDiagramCreator(true);
                      }}
                      className="p-1 bg-white rounded shadow-sm border border-gray-200 hover:bg-purple-50 text-purple-600"
                      title="Convert to diagram"
                    >
                      <FiZap size={12} />
                    </button>
                  </div>
                )}

                {/* Section Content */}
                {editingSection === section.id ? (
                  <div className="space-y-3">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                      rows={Math.min(10, Math.max(3, editContent.split('\n').length))}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(section.id)}
                        className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      >
                        <FiCheck size={12} />
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex items-center gap-2 px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                      >
                        <FiX size={12} />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    dangerouslySetInnerHTML={{ __html: section.rawHtml }}
                    className="prose prose-sm max-w-none"
                  />
                )}
              </div>
            ))}

            {sections.length === 0 && (
              <div className="text-center py-12">
                <FiEdit3 className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No content yet</h3>
                <p className="text-gray-600 mb-4">Generate content using AI or start writing manually</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Diagram Creator Modal */}
      {showDiagramCreator && (
        <DiagramCreator
          presentationId={presentation.id}
          section={selectedSection || undefined}
          selectedText={selectedText || selectedSection?.content || ''}
          position={{ x: window.innerWidth / 2, y: window.innerHeight / 2 }}
          onDiagramCreated={handleDiagramCreated}
          onClose={() => {
            setShowDiagramCreator(false);
            setSelectedText('');
          }}
          mode="modal"
          isVisible={true}
        />
      )}
    </div>
  );
};

export default CustomDocumentEditor;