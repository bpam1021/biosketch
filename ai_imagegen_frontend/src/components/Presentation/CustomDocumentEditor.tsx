import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  FiEdit3, FiZap, FiEye, FiSave, FiType, FiList, FiBarChart, 
  FiImage, FiMoreHorizontal, FiCheck, FiX, FiPlus
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

  // Parse HTML content into structured sections
  const parseContent = useCallback((html: string): DocumentSection[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const sections: DocumentSection[] = [];
    let sectionId = 1;

    const processElement = (element: Element) => {
      const tagName = element.tagName.toLowerCase();
      
      if (tagName.match(/^h[1-6]$/)) {
        sections.push({
          id: `section-${sectionId++}`,
          type: 'heading',
          level: parseInt(tagName.charAt(1)),
          content: element.textContent || '',
          rawHtml: element.outerHTML,
          startIndex: 0,
          endIndex: 0
        });
      } else if (tagName === 'p' && element.textContent?.trim()) {
        sections.push({
          id: `section-${sectionId++}`,
          type: 'paragraph',
          content: element.textContent || '',
          rawHtml: element.outerHTML,
          startIndex: 0,
          endIndex: 0
        });
      } else if (tagName === 'ul' || tagName === 'ol') {
        const listItems = Array.from(element.querySelectorAll('li')).map(li => li.textContent).join(', ');
        sections.push({
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
        sections.push({
          id: `section-${sectionId++}`,
          type: 'table',
          content: `Table (${rows}×${cols})`,
          rawHtml: element.outerHTML,
          startIndex: 0,
          endIndex: 0
        });
      } else if (tagName === 'div' && element.className.includes('diagram-container')) {
        sections.push({
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
    return sections;
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

  const saveEdit = async (sectionId: string) => {
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return;

    const updatedSections = [...sections];
    const section = updatedSections[sectionIndex];
    
    // Update the section content
    section.content = editContent;
    
    // Update the raw HTML based on section type
    if (section.type === 'heading') {
      section.rawHtml = `<h${section.level}>${editContent}</h${section.level}>`;
    } else if (section.type === 'paragraph') {
      section.rawHtml = `<p>${editContent}</p>`;
    }
    
    setSections(updatedSections);
    setEditingSection(null);
    
    // Rebuild HTML and save
    const updatedHtml = updatedSections.map(s => s.rawHtml).join('\n');
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
            <div
              key={section.id}
              className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${
                selectedSection?.id === section.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              } ${hoveredSection === section.id ? 'bg-gray-50' : ''}`}
              onClick={() => handleSectionSelect(section)}
              onMouseEnter={() => setHoveredSection(section.id)}
              onMouseLeave={() => setHoveredSection(null)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {getSectionIcon(section.type, section.level)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${
                      section.type === 'heading' ? 'font-medium text-gray-900' : 'text-gray-700'
                    }`}>
                      {section.type === 'heading' && section.level ? `H${section.level}: ` : ''}
                      {section.content.length > 50 ? section.content.substring(0, 50) + '...' : section.content}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSection(section);
                        setShowDiagramCreator(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-purple-100 rounded text-purple-600"
                      title="Convert to diagram"
                    >
                      <FiZap size={14} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 capitalize">
                    {section.type}
                    {section.type === 'heading' && section.level ? ` (Level ${section.level})` : ''}
                  </p>
                </div>
              </div>
            </div>
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
            {sections.map((section) => (
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