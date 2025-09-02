import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  FiEdit3, FiZap, FiEye, FiSave, FiType, FiList, FiBarChart, 
  FiImage, FiMoreHorizontal, FiCheck, FiX, FiPlus, FiChevronDown, FiChevronRight,
  FiDownload, FiUpload
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import DiagramCreator from './DiagramCreator';
import InteractiveChart from '../Charts/InteractiveChart';
import ChartGenerator from '../Charts/ChartGenerator';
import { ExportModal } from './ExportModal';
import { Presentation, DiagramElement, ContentSection, ExportRequest } from '../../types/Presentation';
import { uploadImage, exportPresentation, getExportStatus } from '../../api/presentationApi';

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
  onDiagramCreate: (diagram: Partial<DiagramElement>, sectionId?: string) => Promise<DiagramElement | undefined>;
  onSectionUpdate?: (sectionId: string, updates: Partial<ContentSection>) => Promise<ContentSection | undefined>;
  viewMode: 'edit' | 'preview';
  sections?: ContentSection[];
  onSectionCreate?: (data: Partial<ContentSection>) => Promise<ContentSection | undefined>;
  onSectionDelete?: (sectionId: string) => Promise<void>;
  onSectionsReorder?: (newOrder: ContentSection[]) => Promise<void>;
}

const CustomDocumentEditor: React.FC<CustomDocumentEditorProps> = ({
  presentation,
  onPresentationUpdate,
  onDiagramCreate,
  onSectionUpdate,
  viewMode,
  sections: propSections,
  onSectionCreate,
  onSectionDelete,
  onSectionsReorder
}) => {
  const [sections, setSections] = useState<DocumentSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<DocumentSection | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  
  // Diagram conversion
  const [showDiagramCreator, setShowDiagramCreator] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');
  
  // Chart generator
  const [showChartGenerator, setShowChartGenerator] = useState(false);
  const [selectedTextForChart, setSelectedTextForChart] = useState<string>('');
  
  // Export functionality
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Image upload functionality
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
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
    console.log('CustomDocumentEditor presentation data:', presentation);
    
    // Try to load content from different sources
    let contentToLoad = '';
    
    if (presentation.content) {
      // Direct content field
      contentToLoad = presentation.content;
    } else if ((presentation as any).sections && (presentation as any).sections.length > 0) {
      // From sections array (if presentation has sections property)
      const sectionsArray = (presentation as any).sections;
      contentToLoad = sectionsArray.map((section: any) => {
        if (section.section_type === 'heading') {
          const level = section.style_config?.fontSize > 24 ? 1 : section.style_config?.fontSize > 20 ? 2 : 3;
          return `<h${level}>${section.title || section.content}</h${level}>`;
        } else if (section.section_type === 'paragraph') {
          return `<p>${section.rich_content || section.content || 'Empty paragraph'}</p>`;
        } else if (section.section_type === 'list') {
          const items = (section.content || '').split('\n').filter(item => item.trim());
          const listItems = items.map(item => `<li>${item.replace(/^[•\-\*]\s*/, '')}</li>`).join('');
          return `<ul>${listItems}</ul>`;
        } else {
          return `<p>${section.content || section.title || 'Empty section'}</p>`;
        }
      }).join('\n');
    } else if (presentation.title) {
      // Create initial content from title
      contentToLoad = `<h1>${presentation.title}</h1><p>Start building your document by adding content sections...</p>`;
    }
    
    console.log('Content to load:', contentToLoad);
    
    if (contentToLoad) {
      const parsedSections = parseContent(contentToLoad);
      console.log('Parsed sections:', parsedSections);
      setSections(parsedSections);
    } else {
      // Create a default structure if no content available
      const defaultSections = [{
        id: 'section-1',
        type: 'heading' as const,
        level: 1,
        content: presentation.title || 'Document Title',
        rawHtml: `<h1>${presentation.title || 'Document Title'}</h1>`,
        startIndex: 0,
        endIndex: 0
      }, {
        id: 'section-2', 
        type: 'paragraph' as const,
        content: 'Add sections to begin creating your professional document',
        rawHtml: '<p>Add sections to begin creating your professional document</p>',
        startIndex: 0,
        endIndex: 0
      }];
      setSections(defaultSections);
    }
  }, [presentation, parseContent]);

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

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image file size should be less than 10MB');
      return;
    }

    try {
      setIsUploadingImage(true);
      toast.info('📤 Uploading image...');
      
      const response = await uploadImage(file);
      
      // Insert image HTML after selected section or at the end
      const imageHtml = `
        <div class="image-container" style="margin: 1rem 0; text-align: center;">
          <img src="${response.url}" alt="${file.name}" style="max-width: 100%; height: auto; border-radius: 0.5rem; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);" />
          <p style="font-size: 0.875rem; color: #6b7280; margin-top: 0.5rem; font-style: italic;">${file.name}</p>
        </div>
      `;
      
      const newSection: DocumentSection = {
        id: `section-image-${Date.now()}`,
        type: 'diagram', // Using diagram type for images for now
        content: `Image: ${file.name}`,
        rawHtml: imageHtml,
        startIndex: 0,
        endIndex: 0
      };
      
      // Add image section after selected section or at the end
      const updatedSections = [...sections];
      if (selectedSection) {
        const sectionIndex = sections.findIndex(s => s.id === selectedSection.id);
        updatedSections.splice(sectionIndex + 1, 0, newSection);
      } else {
        updatedSections.push(newSection);
      }
      
      setSections(updatedSections);
      
      // Update presentation content
      const updatedHtml = updatedSections.map(s => s.rawHtml).join('\n');
      await onPresentationUpdate({ content: updatedHtml });
      
      toast.success('✅ Image uploaded and added to document!');
      
      // Clear the input
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
      
      // Scroll to the newly added image
      setTimeout(() => {
        const imageElement = document.querySelector(`#content-${newSection.id}`);
        if (imageElement) {
          imageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
      
    } catch (error) {
      console.error('Failed to upload image:', error);
      toast.error('❌ Failed to upload image. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle export
  const handleExport = async (exportData: ExportRequest) => {
    if (!presentation) return;

    try {
      setIsExporting(true);
      const result = await exportPresentation(presentation.id, exportData);
      
      toast.info('📄 Export started. You\'ll be notified when it\'s ready.');
      
      // Poll for export status
      const checkStatus = async () => {
        try {
          const status = await getExportStatus(presentation.id);
          const latestJob = status.jobs[0];
          
          if (latestJob?.status === 'completed') {
            toast.success('✅ Export completed successfully!');
            if (latestJob.output_file_url) {
              // Create download link
              const link = document.createElement('a');
              link.href = latestJob.output_file_url;
              link.download = `${presentation.title}.${exportData.export_format}`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          } else if (latestJob?.status === 'failed') {
            toast.error(`❌ Export failed: ${latestJob.error_message || 'Unknown error'}`);
          } else {
            // Still processing, check again in 5 seconds
            setTimeout(checkStatus, 5000);
          }
        } catch (err) {
          console.error('Failed to check export status:', err);
        }
      };
      
      setTimeout(checkStatus, 5000);
      
    } catch (err) {
      toast.error('❌ Failed to start export.');
      console.error(err);
    } finally {
      setIsExporting(false);
      setShowExportModal(false);
    }
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
  const handleDiagramCreated = async (diagramData: DiagramElement) => {
    if (selectedSection) {
      try {
        // Create diagram using fallback endpoint - don't pass section ID for document presentations
        // This will use the backend's fallback endpoint which internally uses 'main'
        const createdDiagram = await onDiagramCreate(diagramData);
        
        if (createdDiagram) {
          // Add diagram HTML after the selected section in the document
          const diagramHtml = `
            <div class="diagram-container" data-diagram-id="${createdDiagram.id}" style="margin: 1rem 0; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; background: #f9fafb;">
              <h4 style="margin-bottom: 0.5rem; font-weight: 600; color: #1f2937;">${createdDiagram.title}</h4>
              ${createdDiagram.image_url ? 
                `<img src="${createdDiagram.image_url}" alt="${createdDiagram.title}" style="max-width: 100%; height: auto; border-radius: 0.25rem;" />` : 
                '<div style="padding: 2rem; text-align: center; color: #6b7280; background: #f3f4f6; border-radius: 0.25rem;"><p>🎨 Diagram is being generated...</p><p style="font-size: 0.75rem; margin-top: 0.5rem;">This may take a few moments</p></div>'
              }
              <div style="font-size: 0.75rem; color: #9ca3af; margin-top: 0.5rem; display: flex; justify-content: space-between;">
                <span>Type: ${createdDiagram.chart_type || 'diagram'}</span>
                <span>ID: ${createdDiagram.id}</span>
              </div>
            </div>
          `;
          
          const sectionIndex = sections.findIndex(s => s.id === selectedSection.id);
          const updatedSections = [...sections];
          
          // Insert diagram section after the selected section
          updatedSections.splice(sectionIndex + 1, 0, {
            id: `section-diagram-${Date.now()}`,
            type: 'diagram',
            content: createdDiagram.title || 'New Diagram',
            rawHtml: diagramHtml,
            startIndex: 0,
            endIndex: 0
          });
          
          setSections(updatedSections);
          
          // Update presentation content with the new diagram
          const updatedHtml = updatedSections.map(s => s.rawHtml).join('\n');
          await onPresentationUpdate({ content: updatedHtml });
          
          toast.success(`✅ Diagram "${createdDiagram.title}" added to document!`);
          
          // Scroll to the newly added diagram
          setTimeout(() => {
            const diagramElement = document.querySelector(`[data-diagram-id="${createdDiagram.id}"]`);
            if (diagramElement) {
              diagramElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 500);
        }
      } catch (error) {
        console.error('Failed to create diagram:', error);
        toast.error('❌ Failed to create diagram. Please try again.');
      }
    }
    
    setShowDiagramCreator(false);
    setSelectedText('');
    setSelectedSection(null);
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
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-purple-100 rounded text-purple-600 flex-shrink-0 mr-1"
                  title="Convert to diagram"
                >
                  <FiZap size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSection(section);
                    setSelectedTextForChart(section.content);
                    setShowChartGenerator(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-100 rounded text-blue-600 flex-shrink-0"
                  title="Convert to AI chart"
                >
                  <FiBarChart size={12} />
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
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                {viewMode === 'edit' ? 'Editing' : 'Preview'} • {sections.length} sections
              </span>
              
              {/* Image Upload Button */}
              {viewMode === 'edit' && (
                <>
                  <input
                    type="file"
                    ref={imageInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                    title="Upload image"
                  >
                    <FiUpload size={14} />
                    {isUploadingImage ? 'Uploading...' : 'Upload Image'}
                  </button>
                </>
              )}
              
              {/* Export Button */}
              <button
                onClick={() => setShowExportModal(true)}
                disabled={isExporting}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                title="Export document"
              >
                <FiDownload size={14} />
                {isExporting ? 'Exporting...' : 'Export'}
              </button>
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
                    <button
                      onClick={() => {
                        setSelectedSection(section);
                        setSelectedTextForChart(section.content);
                        setShowChartGenerator(true);
                      }}
                      className="p-1 bg-white rounded shadow-sm border border-gray-200 hover:bg-blue-50 text-blue-600"
                      title="Convert to AI chart"
                    >
                      <FiBarChart size={12} />
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

      {/* Chart Generator Modal */}
      {showChartGenerator && (
        <ChartGenerator
          isOpen={showChartGenerator}
          onClose={() => {
            setShowChartGenerator(false);
            setSelectedTextForChart('');
          }}
          sourceContent={selectedTextForChart}
          onChartGenerated={async (chartData, chartConfig) => {
            if (selectedSection) {
              try {
                // Create chart HTML with the generated data
                const chartId = `chart-${Date.now()}`;
                const chartHtml = `
                  <div class="chart-container" data-chart-id="${chartId}" style="margin: 1rem 0; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; background: #f9fafb;">
                    <h4 style="margin-bottom: 0.5rem; font-weight: 600; color: #1f2937;">AI Generated Chart</h4>
                    <div id="${chartId}" style="width: 100%; height: 400px; background: white; border-radius: 0.25rem; display: flex; align-items: center; justify-content: center; border: 1px solid #e5e7eb;">
                      <div style="text-align: center; color: #6b7280;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">📈</div>
                        <p style="font-weight: 600; margin-bottom: 0.5rem;">Interactive Chart</p>
                        <p style="font-size: 0.875rem;">Chart will render here with provided data</p>
                        <pre style="background: #f3f4f6; padding: 0.5rem; border-radius: 0.25rem; margin-top: 1rem; text-align: left; font-size: 0.75rem; overflow: auto;">${JSON.stringify(chartData, null, 2).substring(0, 200)}...</pre>
                      </div>
                    </div>
                    <div style="font-size: 0.75rem; color: #9ca3af; margin-top: 0.5rem; display: flex; justify-content: space-between;">
                      <span>Type: AI Chart</span>
                      <span>Generated: ${new Date().toLocaleString()}</span>
                    </div>
                  </div>
                `;
                
                // Replace the selected section with the chart
                const sectionIndex = sections.findIndex(s => s.id === selectedSection.id);
                const updatedSections = [...sections];
                
                // Replace the section with chart
                updatedSections[sectionIndex] = {
                  ...selectedSection,
                  type: 'diagram',
                  content: 'AI Generated Chart',
                  rawHtml: chartHtml
                };
                
                setSections(updatedSections);
                
                // Update presentation content
                const updatedHtml = updatedSections.map(s => s.rawHtml).join('\n');
                await onPresentationUpdate({ content: updatedHtml });
                
                toast.success('✅ Content replaced with AI-generated chart!');
                
                // Scroll to the chart
                setTimeout(() => {
                  const chartElement = document.querySelector(`[data-chart-id="${chartId}"]`);
                  if (chartElement) {
                    chartElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }, 500);
                
              } catch (error) {
                console.error('Failed to replace content with chart:', error);
                toast.error('❌ Failed to create AI chart. Please try again.');
              }
            }
            
            setShowChartGenerator(false);
            setSelectedTextForChart('');
            setSelectedSection(null);
          }}
        />
      )}

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          presentation={presentation}
          selectedSections={[]}
          onExport={handleExport}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
};

export default CustomDocumentEditor;