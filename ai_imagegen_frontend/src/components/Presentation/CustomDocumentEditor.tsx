import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  FiEdit3, FiZap, FiEye, FiSave, FiType, FiList, FiBarChart, 
  FiImage, FiMoreHorizontal, FiCheck, FiX, FiPlus, FiChevronDown, FiChevronRight,
  FiDownload, FiUpload
} from 'react-icons/fi';
import { toast } from 'react-toastify';
// Removed DiagramCreator - using only ChartGenerator
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
  
  // Removed diagram conversion - using only chart generation
  
  // Chart generator
  const [showChartGenerator, setShowChartGenerator] = useState(false);
  const [selectedTextForChart, setSelectedTextForChart] = useState<string>('');
  const [chartEditMode, setChartEditMode] = useState(false);
  const [editingChart, setEditingChart] = useState<any>(null);
  
  // Interactive chart data storage
  const [interactiveCharts, setInteractiveCharts] = useState<Map<string, any>>(new Map());
  
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
    
    if (presentation.content && presentation.content.trim()) {
      // Direct content field
      contentToLoad = presentation.content;
      console.log('Loading from presentation.content');
    } else if ((presentation as any).chapters && (presentation as any).chapters.length > 0) {
      // From document chapters (for new Document model structure)
      const chapters = (presentation as any).chapters;
      contentToLoad = chapters.map((chapter: any) => {
        let chapterContent = `<h1>${chapter.title}</h1>`;
        if (chapter.content) {
          chapterContent += chapter.content;
        }
        if (chapter.sections && chapter.sections.length > 0) {
          chapter.sections.forEach((section: any) => {
            const level = Math.min(section.level + 1, 6); // Ensure heading level is valid
            chapterContent += `<h${level}>${section.title}</h${level}>`;
            if (section.content) {
              chapterContent += section.content;
            }
          });
        }
        return chapterContent;
      }).join('\n');
      console.log('Loading from document chapters');
    } else if ((presentation as any).sections && (presentation as any).sections.length > 0) {
      // From sections array (legacy format)
      const sectionsArray = (presentation as any).sections;
      contentToLoad = sectionsArray.map((section: any) => {
        if (section.section_type === 'heading') {
          const level = section.style_config?.fontSize > 24 ? 1 : section.style_config?.fontSize > 20 ? 2 : 3;
          return `<h${level}>${section.title || section.content}</h${level}>`;
        } else if (section.section_type === 'paragraph') {
          return `<p>${section.rich_content || section.content || 'Empty paragraph'}</p>`;
        } else if (section.section_type === 'list') {
          const items = (section.content || '').split('\n').filter((item: string) => item.trim());
          const listItems = items.map((item: string) => `<li>${item.replace(/^[•\-\*]\s*/, '')}</li>`).join('');
          return `<ul>${listItems}</ul>`;
        } else {
          return `<p>${section.content || section.title || 'Empty section'}</p>`;
        }
      }).join('\n');
      console.log('Loading from legacy sections');
    } else if ((presentation as any).abstract && (presentation as any).abstract.trim()) {
      // Load from document abstract if available
      contentToLoad = `<h1>${presentation.title || 'Document'}</h1><h2>Abstract</h2><p>${(presentation as any).abstract}</p><h2>Content</h2><p>Continue building your document by adding more sections...</p>`;
      console.log('Loading from document abstract');
    } else if (presentation.title) {
      // Create initial content from title
      contentToLoad = `<h1>${presentation.title}</h1><p>Start building your document by adding content sections...</p>`;
      console.log('Loading default content with title');
    }
    
    console.log('Content to load:', contentToLoad?.substring(0, 200) + '...');
    
    if (contentToLoad && contentToLoad.trim()) {
      const parsedSections = parseContent(contentToLoad);
      console.log('Parsed sections count:', parsedSections.length);
      setSections(parsedSections);
    } else {
      // Create a default structure if no content available
      console.log('Creating default sections');
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
        content: 'Start building your professional document by adding content sections. Use the toolbar to add headings, paragraphs, lists, and more.',
        rawHtml: '<p>Start building your professional document by adding content sections. Use the toolbar to add headings, paragraphs, lists, and more.</p>',
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

  // Handle text selection for chart conversion
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().trim().length > 10) {
      setSelectedTextForChart(selection.toString().trim());
      setChartEditMode(false);
      setEditingChart(null);
      setShowChartGenerator(true);
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
    
    // Legacy function cleanup
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
                  title="Convert to AI chart"
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
                setSelectedTextForChart(section.content);
                setChartEditMode(false);
                setEditingChart(null);
                setShowChartGenerator(true);
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
                onMouseLeave={(e) => {
                  // Only hide if we're not moving to a child element (like buttons)
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setHoveredSection(null);
                  }
                }}
              >
                {/* Edit Controls - Fixed tooltip interaction */}
                {viewMode === 'edit' && hoveredSection === section.id && (
                  <div 
                    className="absolute -left-16 top-0 flex flex-col gap-1 bg-white border border-gray-200 rounded-md shadow-lg p-1 z-10"
                    onMouseEnter={() => setHoveredSection(section.id)} // Keep tooltip visible
                    onMouseLeave={() => setHoveredSection(null)}
                  >
                    <button
                      onClick={() => startEditing(section.id, section.content)}
                      className="p-2 hover:bg-gray-50 rounded flex items-center justify-center"
                      title="Edit section"
                    >
                      <FiEdit3 size={14} className="text-gray-600" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSection(section);
                        setSelectedTextForChart(section.content);
                        setChartEditMode(false);
                        setEditingChart(null);
                        setShowChartGenerator(true);
                      }}
                      className="p-2 hover:bg-blue-50 rounded flex items-center justify-center"
                      title="Convert to AI chart"
                    >
                      <FiBarChart size={14} className="text-blue-600" />
                    </button>
                    
                    {/* Chart Edit Button - only show for diagram sections */}
                    {section.type === 'diagram' && (
                      <button
                        onClick={() => {
                          // Extract chart data from the section if available
                          const chartMatch = section.rawHtml.match(/data-chart-id="([^"]*)"/)
                          const chartId = chartMatch ? chartMatch[1] : `chart-${Date.now()}`;
                          
                          // Try to parse chart data from the HTML
                          let chartData = {};
                          let chartConfig = {};
                          
                          try {
                            // Look for JSON data in the HTML
                            const jsonMatch = section.rawHtml.match(/<pre[^>]*>([^<]*)</)
                            if (jsonMatch && jsonMatch[1]) {
                              const jsonStr = jsonMatch[1].replace(/\.\.\.$/, '');
                              chartData = JSON.parse(jsonStr);
                            }
                          } catch (error) {
                            console.warn('Could not parse existing chart data:', error);
                            // Use default sample data
                            chartData = {
                              labels: ['Data 1', 'Data 2', 'Data 3'],
                              datasets: [{
                                label: 'Sample Data',
                                data: [10, 20, 30],
                                backgroundColor: ['#3B82F6', '#10B981', '#F59E0B']
                              }]
                            };
                          }
                          
                          setEditingChart({
                            id: chartId,
                            title: 'Existing Chart',
                            chart_type: 'bar_chart',
                            data: chartData,
                            config: chartConfig,
                            styling: chartConfig
                          });
                          setChartEditMode(true);
                          setSelectedSection(section);
                          setShowChartGenerator(true);
                        }}
                        className="p-2 hover:bg-green-50 rounded flex items-center justify-center"
                        title="Edit chart"
                      >
                        <FiEdit3 size={14} className="text-green-600" />
                      </button>
                    )}
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
                    className="prose prose-lg max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-h5:text-base prose-h6:text-sm prose-p:text-base prose-p:leading-relaxed"
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

      {/* Removed Diagram Creator Modal - using only ChartGenerator */}

      {/* Chart Generator Modal */}
      {showChartGenerator && (
        <ChartGenerator
          selectedText={selectedTextForChart}
          onClose={() => {
            setShowChartGenerator(false);
            setSelectedTextForChart('');
            setChartEditMode(false);
            setEditingChart(null);
          }}
          isVisible={showChartGenerator}
          editMode={chartEditMode}
          existingChart={editingChart}
          onChartGenerate={async (chartType: string, chartData: any, chartConfig: any, aiPrompt: string) => {
            if (selectedSection) {
              try {
                // Create chart HTML with the generated data
                const chartId = `chart-${Date.now()}`;
                
                // Check if we have an image URL from the backend response
                const imageUrl = chartData?.imageUrl || chartConfig?.imageUrl;
                const diagramTitle = chartData?.title || chartConfig?.title || 'AI Generated Chart';
                const chartTypeDisplay = chartData?.type || chartType || 'chart';
                
                // Create enhanced HTML with the actual chart image if available
                const chartHtml = `
                  <div class="chart-container" data-chart-id="${chartId}" style="margin: 1rem 0; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; background: #f9fafb;">
                    <h4 style="margin-bottom: 0.5rem; font-weight: 600; color: #1f2937;">${diagramTitle}</h4>
                    <div id="${chartId}" style="width: 100%; background: white; border-radius: 0.25rem; border: 1px solid #e5e7eb; overflow: hidden;">
                      ${imageUrl ? `
                        <img src="${imageUrl}" alt="${diagramTitle}" style="width: 100%; height: auto; display: block; border-radius: 0.25rem;" />
                      ` : `
                        <div style="height: 400px; display: flex; align-items: center; justify-content: center; text-align: center; color: #6b7280;">
                          <div>
                            <div style="font-size: 3rem; margin-bottom: 1rem;">📊</div>
                            <p style="font-weight: 600; margin-bottom: 0.5rem;">AI Generated Chart</p>
                            <p style="font-size: 0.875rem;">Chart data processed successfully</p>
                            <div style="margin-top: 1rem; padding: 0.5rem; background: #f3f4f6; border-radius: 0.25rem; text-align: left; font-size: 0.75rem; max-height: 100px; overflow: auto;">
                              ${JSON.stringify(chartData, null, 2).substring(0, 300)}...
                            </div>
                          </div>
                        </div>
                      `}
                    </div>
                    <div style="font-size: 0.75rem; color: #9ca3af; margin-top: 0.5rem; display: flex; justify-content: space-between;">
                      <span>Type: ${chartTypeDisplay}</span>
                      <span>Generated: ${new Date().toLocaleString()}</span>
                    </div>
                    ${chartData?.confidence ? `
                      <div style="margin-top: 0.5rem; padding: 0.5rem; background: #ecfdf5; border: 1px solid #d1fae5; border-radius: 0.25rem;">
                        <p style="font-size: 0.75rem; color: #065f46; margin: 0;">
                          <strong>AI Confidence:</strong> ${Math.round(chartData.confidence * 100)}%
                        </p>
                      </div>
                    ` : ''}
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
                
                // Don't update presentation immediately to avoid editor switching
                // The sections are already updated in local state
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
            setChartEditMode(false);
            setEditingChart(null);
          }}
          onChartUpdate={async (chartId: string, updatedData: any, updatedConfig: any) => {
            if (selectedSection && chartEditMode) {
              try {
                // Update the chart HTML with new data
                const chartHtml = `
                  <div class="chart-container" data-chart-id="${chartId}" style="margin: 1rem 0; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; background: #f9fafb;">
                    <h4 style="margin-bottom: 0.5rem; font-weight: 600; color: #1f2937;">Updated AI Chart</h4>
                    <div id="${chartId}" style="width: 100%; height: 400px; background: white; border-radius: 0.25rem; display: flex; align-items: center; justify-content: center; border: 1px solid #e5e7eb;">
                      <div style="text-align: center; color: #6b7280;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">📊</div>
                        <p style="font-weight: 600; margin-bottom: 0.5rem;">Updated Interactive Chart</p>
                        <p style="font-size: 0.875rem;">Chart updated with new data and configuration</p>
                        <pre style="background: #f3f4f6; padding: 0.5rem; border-radius: 0.25rem; margin-top: 1rem; text-align: left; font-size: 0.75rem; overflow: auto;">${JSON.stringify(updatedData, null, 2).substring(0, 200)}...</pre>
                      </div>
                    </div>
                    <div style="font-size: 0.75rem; color: #9ca3af; margin-top: 0.5rem; display: flex; justify-content: space-between;">
                      <span>Type: Updated AI Chart</span>
                      <span>Updated: ${new Date().toLocaleString()}</span>
                    </div>
                  </div>
                `;
                
                // Update the section with new chart HTML
                const sectionIndex = sections.findIndex(s => s.id === selectedSection.id);
                const updatedSections = [...sections];
                
                updatedSections[sectionIndex] = {
                  ...selectedSection,
                  type: 'diagram',
                  content: 'Updated AI Chart',
                  rawHtml: chartHtml
                };
                
                setSections(updatedSections);
                
                // Update presentation content
                const updatedHtml = updatedSections.map(s => s.rawHtml).join('\n');
                
                if (onPresentationUpdate) {
                  await onPresentationUpdate({
                    content: updatedHtml
                  });
                }
                
                toast.success('Chart updated successfully!');
                
              } catch (error) {
                console.error('Failed to update chart in document:', error);
                toast.error('Failed to update chart in document');
              }
            }
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