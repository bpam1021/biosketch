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
  
  // Auto-save and focus management
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [focusedSectionId, setFocusedSectionId] = useState<string | null>(null);

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

  // State for tracking rendered charts to avoid re-renders
  const [renderedCharts, setRenderedCharts] = useState<Set<string>>(new Set());

  // Render interactive charts after sections update
  useEffect(() => {
    console.log('🎨 Chart rendering useEffect triggered');
    console.log('📊 Current sections count:', sections.length);
    console.log('🗺️ Interactive charts map size:', interactiveCharts.size);
    console.log('🎯 Rendered charts set size:', renderedCharts.size);
    // Helper function to rebuild content with current chart data
    const rebuildContentWithCharts = async (sectionsToUse?: DocumentSection[]): Promise<string> => {
      // Build HTML from provided sections or current sections array
      const sectionsForRebuild = sectionsToUse || sections;
      const allSections = flattenSections(sectionsForRebuild);
      let updatedHtml = allSections.map(s => s.rawHtml).join('\n');
      
      // If no interactive charts exist, return current HTML
      if (interactiveCharts.size === 0) {
        return updatedHtml;
      }
      
      // Update each chart wrapper with current chart data and static representation
      interactiveCharts.forEach((chartData, chartId) => {
        const chartWrapper = `data-chart-id="${chartId}"`;
        const wrapperRegex = new RegExp(`<div class="interactive-chart-wrapper" ${chartWrapper}[^>]*>.*?</div>`, 'gs');
        
        if (updatedHtml.match(wrapperRegex)) {
          // Create static chart representation for export compatibility
          const staticChartHtml = generateStaticChartHtml(chartData);
          
          // Replace with updated chart data and static representation
          const chartDataJson = JSON.stringify(chartData);
          const updatedWrapper = `<div class="interactive-chart-wrapper" ${chartWrapper} data-chart-data='${chartDataJson.replace(/'/g, "&apos;")}' style="width: 100%; height: 400px; background: white; border-radius: 0.25rem; border: 1px solid #e5e7eb; position: relative; overflow: hidden; display: flex; flex-direction: column;">
            <!-- Interactive chart for browser -->
            <div class="interactive-chart-content" style="display: block;">
              <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: #6b7280;">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">📊</div>
                <p style="font-weight: 600; margin-bottom: 0.5rem;">Interactive Chart</p>
                <p style="font-size: 0.875rem;">${chartData.type || 'Chart'}</p>
              </div>
            </div>
            <!-- Static chart for export -->
            <div class="static-chart-content" style="display: none; width: 100%; height: 100%;">
              ${staticChartHtml}
            </div>
          </div>`;
          
          updatedHtml = updatedHtml.replace(wrapperRegex, updatedWrapper);
        }
      });
      
      return updatedHtml;
    };

    // Generate static HTML representation of chart for export
    const generateStaticChartHtml = (chartData: any): string => {
      const chartType = chartData.type || 'bar_chart';
      const title = chartData.title || 'Chart';
      
      // Create a simple static representation based on chart type
      switch (chartType) {
        case 'bar_chart':
        case 'line_chart':
        case 'pie_chart':
          return `
            <div style="padding: 20px; text-align: center;">
              <h3 style="margin-bottom: 20px; color: #1f2937;">${title}</h3>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 10px 0;">
                <p style="color: #6b7280; margin: 0;">Chart Type: ${chartType.replace('_', ' ').toUpperCase()}</p>
                ${chartData.data?.labels ? `<p style="color: #6b7280; margin: 5px 0;">Labels: ${chartData.data.labels.join(', ')}</p>` : ''}
                ${chartData.data?.datasets ? `<p style="color: #6b7280; margin: 5px 0;">Datasets: ${chartData.data.datasets.length} series</p>` : ''}
              </div>
            </div>
          `;
        
        case 'flowchart':
        case 'workflow_diagram':
        case 'process_workflow':
          return `
            <div style="padding: 20px; text-align: center;">
              <h3 style="margin-bottom: 20px; color: #1f2937;">${title}</h3>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 10px 0;">
                <p style="color: #6b7280; margin: 0;">Diagram Type: ${chartType.replace('_', ' ').toUpperCase()}</p>
                ${chartData.nodes ? `<p style="color: #6b7280; margin: 5px 0;">Nodes: ${chartData.nodes.length} steps</p>` : ''}
                ${chartData.edges ? `<p style="color: #6b7280; margin: 5px 0;">Connections: ${chartData.edges.length} links</p>` : ''}
              </div>
            </div>
          `;
        
        default:
          return `
            <div style="padding: 20px; text-align: center;">
              <h3 style="margin-bottom: 20px; color: #1f2937;">${title}</h3>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 10px 0;">
                <p style="color: #6b7280; margin: 0;">Chart/Diagram: ${chartType.replace('_', ' ').toUpperCase()}</p>
                <p style="color: #9ca3af; font-size: 0.875rem; margin: 10px 0;">Interactive content available in web view</p>
              </div>
            </div>
          `;
      }
    };

    const renderInteractiveCharts = () => {
      console.log('🚀 Starting renderInteractiveCharts function');
      console.log('🗺️ Charts to process:', Array.from(interactiveCharts.keys()));
      
      interactiveCharts.forEach((chartData, chartId) => {
        console.log(`🎯 Processing chart: ${chartId}`);
        console.log('  - Chart data:', chartData);
        console.log('  - Already rendered:', renderedCharts.has(chartId));
        
        // Skip if chart is already rendered
        if (renderedCharts.has(chartId)) {
          console.log(`  ⏭️ Skipping ${chartId} - already rendered`);
          return;
        }
        
        const chartWrapper = document.querySelector(`[data-chart-id="${chartId}"]`);
        console.log(`  🔍 Chart wrapper found for ${chartId}:`, !!chartWrapper);
        
        if (chartWrapper) {
          console.log('  📍 Chart wrapper element:', chartWrapper);
          const hasCanvas = chartWrapper.querySelector('canvas');
          console.log('  🖼️ Already has canvas:', !!hasCanvas);
        }
        
        if (chartWrapper && !chartWrapper.querySelector('canvas')) {
          try {
            console.log(`  🔧 Setting up React container for ${chartId}`);
            // Create a container for the React component
            chartWrapper.innerHTML = `<div id="interactive-chart-${chartId}" style="width: 100%; height: 400px; overflow: hidden; position: relative;"></div>`;
            
            // Import and render the chart component dynamically
            console.log(`  📦 Importing React DOM for ${chartId}`);
            import('react-dom/client').then(({ createRoot }) => {
              console.log(`  ✅ React DOM imported for ${chartId}`);
              const container = document.getElementById(`interactive-chart-${chartId}`);
              console.log(`  📍 Container found for ${chartId}:`, !!container);
              if (container) {
                try {
                  console.log(`  🌳 Creating React root for ${chartId}`);
                  const root = createRoot(container);
                  
                  // Ensure we have valid chart data - handle different chart types
                  const validChartData = chartData?.data || chartData || {
                    labels: ['Sample'],
                    datasets: [{
                      label: 'Sample Data',
                      data: [1],
                      backgroundColor: '#3B82F6'
                    }]
                  };
                  console.log(`  📊 Valid chart data for ${chartId}:`, validChartData);
                  console.log(`  🎨 Rendering React component for ${chartId}`);
                  root.render(
                    React.createElement(InteractiveChart, {
                      diagramId: chartId,
                      title: chartData?.title || 'Interactive Chart',
                      chartType: chartData?.type || 'bar_chart',
                      data: validChartData,
                      config: {
                        type: (chartData?.type === 'pie_chart' ? 'pie' : chartData?.type === 'line_chart' ? 'line' : 'bar') as any,
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          title: {
                            display: true,
                            text: chartData?.title || 'Interactive Chart',
                            font: {
                              size: 16,
                              weight: 'bold' as const
                            }
                          },
                          legend: {
                            display: true,
                            position: 'top' as const
                          }
                        },
                        ...chartData?.config
                      },
                      styling: chartData?.styling || {},
                      editable: true,
                      onDataUpdate: async (newData: any) => {
                        try {
                          console.log('Chart data updated:', newData);
                          // Update the stored chart data
                          setInteractiveCharts(prev => {
                            const updated = new Map(prev);
                            updated.set(chartId, { ...chartData, data: newData });
                            return updated;
                          });
                          
                          // Save to backend by rebuilding content with updated charts
                          setTimeout(async () => {
                            try {
                              // Get the current sections from state and save
                              await saveContentToBackend(sections, true);
                            } catch (error) {
                              console.error('Error saving chart updates:', error);
                              toast.error('Failed to save chart updates');
                            }
                          }, 100); // Small delay to allow state to update
                        } catch (error) {
                          console.error('Error updating chart data:', error);
                          toast.error('Failed to update chart data');
                        }
                      },
                      onConfigUpdate: async (newConfig: any) => {
                        try {
                          console.log('Chart config updated:', newConfig);
                          // Update the stored chart config
                          setInteractiveCharts(prev => {
                            const updated = new Map(prev);
                            updated.set(chartId, { ...chartData, config: newConfig });
                            return updated;
                          });
                          
                          // Save to backend by rebuilding content with updated charts
                          setTimeout(async () => {
                            try {
                              // Get the current sections from state and save
                              await saveContentToBackend(sections, true);
                            } catch (error) {
                              console.error('Error saving chart updates:', error);
                              toast.error('Failed to save chart updates');
                            }
                          }, 100);
                        } catch (error) {
                          console.error('Error updating chart config:', error);
                          toast.error('Failed to update chart settings');
                        }
                      },
                      onStylingUpdate: async (newStyling: any) => {
                        try {
                          console.log('Chart styling updated:', newStyling);
                          // Update the stored chart styling
                          setInteractiveCharts(prev => {
                            const updated = new Map(prev);
                            updated.set(chartId, { ...chartData, styling: newStyling });
                            return updated;
                          });
                          
                          // Save to backend by rebuilding content with updated charts
                          setTimeout(async () => {
                            try {
                              // Get the current sections from state and save
                              await saveContentToBackend(sections, true);
                            } catch (error) {
                              console.error('Error saving chart updates:', error);
                              toast.error('Failed to save chart updates');
                            }
                          }, 100);
                        } catch (error) {
                          console.error('Error updating chart styling:', error);
                          toast.error('Failed to update chart styling');
                        }
                      }
                    })
                  );
                  
                  // Mark this chart as rendered
                  console.log(`  ✅ Successfully rendered chart ${chartId}`);
                  setRenderedCharts(prev => new Set([...prev, chartId]));
                } catch (renderError) {
                  console.error('Error rendering chart component:', renderError);
                  // Fallback display
                  container.innerHTML = `
                    <div style="height: 380px; display: flex; align-items: center; justify-content: center; text-align: center; color: #6b7280;">
                      <div>
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚠️</div>
                        <p style="font-weight: 600;">Chart Render Error</p>
                        <p style="font-size: 0.875rem;">Unable to render interactive chart</p>
                      </div>
                    </div>
                  `;
                }
              }
            }).catch(error => {
              console.error('Failed to dynamically import chart component:', error);
              // Fallback to static display
              if (chartData.imageUrl) {
                chartWrapper.innerHTML = `
                  <img src="${chartData.imageUrl}" alt="${chartData.title}" style="width: 100%; height: 380px; object-fit: contain; border-radius: 0.25rem;" />
                `;
              } else {
                chartWrapper.innerHTML = `
                  <div style="height: 380px; display: flex; align-items: center; justify-content: center; text-align: center; color: #6b7280;">
                    <div>
                      <div style="font-size: 2rem; margin-bottom: 0.5rem;">📊</div>
                      <p style="font-weight: 600;">Loading Interactive Chart...</p>
                      <p style="font-size: 0.875rem;">${chartData.title || 'Chart'}</p>
                    </div>
                  </div>
                `;
              }
            });
          } catch (error) {
            console.error('Failed to render interactive chart:', error);
            // Fallback to image display
            if (chartData.imageUrl) {
              chartWrapper.innerHTML = `
                <img src="${chartData.imageUrl}" alt="${chartData.title}" style="width: 100%; height: 380px; object-fit: contain; border-radius: 0.25rem;" />
              `;
            } else {
              chartWrapper.innerHTML = `
                <div style="height: 380px; display: flex; align-items: center; justify-content: center; text-align: center; color: #6b7280;">
                  <div>
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">📊</div>
                    <p style="font-weight: 600;">Chart Display Error</p>
                    <p style="font-size: 0.875rem;">Unable to render interactive chart</p>
                  </div>
                </div>
              `;
            }
          }
        }
      });
    };

    // Render charts after a short delay to ensure DOM is ready
    if (interactiveCharts.size > 0) {
      const timeoutId = setTimeout(renderInteractiveCharts, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [sections, interactiveCharts, renderedCharts]);

  // Initialize sections from presentation content
  useEffect(() => {
    console.log('🚀 Initializing CustomDocumentEditor with presentation data:', presentation);
    console.log('📋 Presentation ID:', presentation.id);
    console.log('📋 Presentation type:', presentation.presentation_type);
    
    // Try to load content from different sources
    let contentToLoad = '';
    
    if (presentation.content && presentation.content.trim()) {
      // Direct content field
      contentToLoad = presentation.content;
      console.log('📥 Loading from presentation.content');
      console.log('📄 Content length:', presentation.content.length);
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
    
    console.log('📋 Final content to load:', contentToLoad?.substring(0, 200) + '...');
    console.log('📏 Full content length:', contentToLoad?.length);
    
    // Check if content contains chart containers
    if (contentToLoad) {
      const hasCharts = contentToLoad.includes('chart-container');
      const hasMetadata = contentToLoad.includes('chart-metadata');
      console.log('🔍 Content analysis:');
      console.log('  - Contains chart containers:', hasCharts);
      console.log('  - Contains chart metadata:', hasMetadata);
    }
    
    if (contentToLoad && contentToLoad.trim()) {
      console.log('🔧 Parsing content into sections...');
      const parsedSections = parseContent(contentToLoad);
      console.log('📊 Parsed sections count:', parsedSections.length);
      console.log('📊 Parsed sections:', parsedSections);
      
      // Extract and restore chart data from HTML BEFORE setting sections
      console.log('🎯 About to restore charts from content...');
      restoreChartsFromContent(contentToLoad);
      
      console.log('✅ Setting parsed sections to state');
      setSections(parsedSections);
    } else {
      // Create a default structure if no content available
      console.log('⚠️ No content available - creating default sections');
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
  }, [presentation.id, presentation.content, presentation.description, parseContent]);

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

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

  // Function to restore chart data from saved HTML content
  const restoreChartsFromContent = (htmlContent: string) => {
    console.log('🔄 Starting chart restoration from content...');
    console.log('📄 HTML content length:', htmlContent.length);
    console.log('📄 HTML content sample:', htmlContent.substring(0, 500) + '...');
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const chartContainers = doc.querySelectorAll('.chart-container[data-chart-id]');
    
    console.log(`🔍 Found ${chartContainers.length} chart containers in HTML`);
    
    const restoredCharts = new Map<string, any>();
    
    chartContainers.forEach((container, index) => {
      const chartId = container.getAttribute('data-chart-id');
      const chartType = container.getAttribute('data-chart-type');
      const metadataScript = container.querySelector('script.chart-metadata');
      
      console.log(`📊 Processing chart ${index + 1}:`);
      console.log('  - Chart ID:', chartId);
      console.log('  - Chart Type:', chartType);
      console.log('  - Metadata script found:', !!metadataScript);
      
      if (chartId && metadataScript) {
        try {
          const metadataText = metadataScript.textContent || '{}';
          console.log('  - Raw metadata text:', metadataText.substring(0, 200) + '...');
          
          const chartMetadata = JSON.parse(metadataText);
          console.log(`  ✅ Successfully parsed chart ${chartId}:`, chartMetadata);
          restoredCharts.set(chartId, chartMetadata);
        } catch (error) {
          console.error(`  ❌ Failed to parse chart metadata for ${chartId}:`, error);
          console.error('  - Metadata text:', metadataScript.textContent);
        }
      } else {
        console.log(`  ⚠️ Skipping chart - missing chartId (${chartId}) or metadataScript (${!!metadataScript})`);
      }
    });
    
    if (restoredCharts.size > 0) {
      console.log(`✅ Successfully restored ${restoredCharts.size} charts from content:`);
      restoredCharts.forEach((chart, id) => {
        console.log(`  - ${id}: ${chart.type} (${chart.title})`);
      });
      setInteractiveCharts(restoredCharts);
    } else {
      console.log('⚠️ No charts were restored from content');
    }
  };

  const saveEdit = async (sectionId: string, silent = false) => {
    const section = findSectionInTree(sections, sectionId);
    if (!section) return;
    
    try {
      setIsSaving(true);
      
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
      
      // Update sections state first
      setEditingSection(null);
      
          // Force re-render by creating new sections array
      const newSections = [...sections];
      setSections(newSections);
      
      // Rebuild HTML and save - flatten tree to get all sections in order
      const allSections = flattenSections(newSections);
      const updatedHtml = allSections.map(s => s.rawHtml).join('\n');
      
      console.log('Regular save - Saving updated HTML:', updatedHtml.substring(0, 200) + '...');
      console.log('Regular save - HTML length:', updatedHtml.length);
      
      const result = await onPresentationUpdate({ 
        content: updatedHtml,
        description: updatedHtml  // Keep for backward compatibility
      });
      
      console.log('Regular save - onPresentationUpdate result:', result);
      
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      
      if (!silent) {
        toast.success('Section updated successfully', {
          position: 'bottom-right',
          autoClose: 2000,
          hideProgressBar: true
        });
      }
    } catch (error) {
      if (!silent) {
        toast.error('Failed to save changes');
      }
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
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
      const result = await onPresentationUpdate({ content: updatedHtml });
      
      // Check if the result has the expected structure, if not, refresh the presentation
      if (result && (!result.content || result.content.length === 0) && onRefreshPresentation) {
        console.log('Image upload result has different structure, refreshing presentation...');
        await onRefreshPresentation();
      }
      
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
              ${(createdDiagram as any).image_url ? 
                `<img src="${(createdDiagram as any).image_url}" alt="${createdDiagram.title}" style="max-width: 100%; height: auto; border-radius: 0.25rem;" />` : 
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
          const result = await onPresentationUpdate({ content: updatedHtml });
          
          // Check if the result has the expected structure, if not, refresh the presentation
          if (result && (!result.content || result.content.length === 0) && onRefreshPresentation) {
            console.log('Diagram creation result has different structure, refreshing presentation...');
            await onRefreshPresentation();
          }
          
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
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">
                  {viewMode === 'edit' ? 'Editing' : 'Preview'} • {sections.length} sections
                </span>
                {hasUnsavedChanges && (
                  <span className="text-sm text-orange-600 flex items-center gap-1">
                    <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse"></div>
                    Unsaved changes
                  </span>
                )}
                {lastSaved && !hasUnsavedChanges && (
                  <span className="text-sm text-green-600">
                    ✓ Saved {lastSaved.toLocaleTimeString()}
                  </span>
                )}
                {focusedSectionId && (
                  <span className="text-sm text-blue-600 flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    Editing section
                  </span>
                )}
              </div>
              
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
                  try {
                    const relatedTarget = e.relatedTarget as Node | null;
                    if (!relatedTarget || !e.currentTarget?.contains(relatedTarget)) {
                      setHoveredSection(null);
                    }
                  } catch (error) {
                    // Ignore DOM traversal errors and just hide the hover state
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
                      onChange={(e) => {
                        setEditContent(e.target.value);
                        setHasUnsavedChanges(true);
                        
                        // Debounced auto-save
                        if (autoSaveTimeoutRef.current) {
                          clearTimeout(autoSaveTimeoutRef.current);
                        }
                        autoSaveTimeoutRef.current = setTimeout(() => {
                          saveEdit(section.id, true); // Silent save
                        }, 3000);
                      }}
                      onFocus={() => setFocusedSectionId(section.id)}
                      onBlur={() => {
                        setFocusedSectionId(null);
                        // Save on blur if there are unsaved changes
                        if (hasUnsavedChanges) {
                          saveEdit(section.id, true);
                        }
                      }}
                      className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      rows={Math.min(10, Math.max(3, editContent.split('\n').length))}
                      autoFocus
                      placeholder="Enter your content here..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(section.id)}
                        disabled={isSaving}
                        className={`flex items-center gap-2 px-3 py-1 rounded text-sm transition-colors ${
                          isSaving 
                            ? 'bg-gray-400 text-white cursor-not-allowed'
                            : hasUnsavedChanges 
                              ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                              : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {isSaving ? (
                          <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                          <FiCheck size={12} />
                        )}
                        {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Save'}
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
                
                console.log('onChartGenerate received data:', { chartType, chartData, chartConfig, aiPrompt });
                
                // Check if we have an image URL from the backend response
                const imageUrl = chartData?.imageUrl || chartConfig?.imageUrl;
                const diagramTitle = chartData?.diagramInfo?.title || chartData?.title || chartConfig?.title || 'AI Generated Chart';
                const chartTypeDisplay = chartData?.diagramInfo?.chart_type || chartData?.type || chartType || 'chart';
                const confidenceScore = chartData?.diagramInfo?.confidence_score;
                
                // Store the chart data for interactive rendering
                const chartDataForStorage = {
                  id: chartId,
                  title: diagramTitle,
                  type: chartTypeDisplay,
                  data: chartData, // Use the full chartData object which contains nodes, edges, etc.
                  config: chartConfig || {},
                  imageUrl: imageUrl,
                  diagramInfo: chartData?.diagramInfo || {}
                };
                
                // Store in interactive charts map
                // Chart data stored successfully
                setInteractiveCharts(prev => new Map(prev.set(chartId, chartDataForStorage)));
                
                // Create structured chart HTML with embedded JSON data for persistence
                const chartMetadataJson = JSON.stringify(chartDataForStorage, null, 2);
                const chartHtml = `
                  <div class="chart-container" data-chart-type="${chartTypeDisplay}" data-chart-id="${chartId}" style="margin: 1rem 0; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; background: #f9fafb;">
                    <h4 style="margin-bottom: 0.5rem; font-weight: 600; color: #1f2937;">${diagramTitle}</h4>
                    
                    <!-- Chart metadata for reconstruction -->
                    <script type="application/json" class="chart-metadata">
                    ${chartMetadataJson}
                    </script>
                    
                    <div class="interactive-chart-wrapper" data-chart-id="${chartId}" style="width: 100%; height: 400px; background: white; border-radius: 0.25rem; border: 1px solid #e5e7eb; position: relative; overflow: hidden; display: flex; flex-direction: column;">
                      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: #6b7280;">
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">📊</div>
                        <p style="font-weight: 600; margin-bottom: 0.5rem;">Interactive Chart</p>
                        <p style="font-size: 0.875rem;">${chartTypeDisplay}</p>
                      </div>
                    </div>
                    
                    <div style="font-size: 0.75rem; color: #9ca3af; margin-top: 0.5rem; display: flex; justify-content: space-between;">
                      <span>Type: ${chartTypeDisplay}</span>
                      <span>Generated: ${new Date().toLocaleString()}</span>
                    </div>
                    ${confidenceScore ? `
                      <div style="margin-top: 0.5rem; padding: 0.5rem; background: #ecfdf5; border: 1px solid #d1fae5; border-radius: 0.25rem;">
                        <p style="font-size: 0.75rem; color: #065f46; margin: 0;">
                          <strong>AI Confidence:</strong> ${Math.round(confidenceScore * 100)}%
                        </p>
                      </div>
                    ` : ''}
                  </div>
                `;
                
                console.log('Selected section for replacement:', selectedSection);
                console.log('Current sections before replacement:', sections);
                
                // Find and replace the section directly in the tree structure
                const replaceSection = (sections: DocumentSection[]): DocumentSection[] => {
                  return sections.map(section => {
                    if (section.id === selectedSection.id) {
                      // Replace this section with the chart
                      console.log('Found section to replace:', section.id);
                      return {
                        ...selectedSection,
                        type: 'diagram' as const,
                        content: diagramTitle || 'AI Generated Chart',
                        rawHtml: chartHtml
                      };
                    } else if (section.children && section.children.length > 0) {
                      // Recursively search in children
                      return {
                        ...section,
                        children: replaceSection(section.children)
                      };
                    }
                    return section;
                  });
                };
                
                const updatedSections = replaceSection(sections);
                console.log('Updated sections after replacement:', updatedSections);
                
                // Check if replacement actually happened
                const flatUpdated = flattenSections(updatedSections);
                const chartSection = flatUpdated.find(s => s.type === 'diagram' && s.rawHtml.includes(chartId));
                
                // Update sections state and save to backend
                let finalUpdatedSections = updatedSections;
                
                if (chartSection) {
                  console.log('Chart section successfully created:', chartSection);
                  setSections(updatedSections);
                  finalUpdatedSections = updatedSections;
                } else {
                  console.error('Chart replacement failed, using fallback');
                  // Fallback: Add chart as new section
                  const newChartSection: DocumentSection = {
                    id: `chart-section-${Date.now()}`,
                    type: 'diagram',
                    content: diagramTitle || 'AI Generated Chart', 
                    rawHtml: chartHtml,
                    startIndex: 0,
                    endIndex: 0
                  };
                  
                  finalUpdatedSections = [...sections, newChartSection];
                  setSections(finalUpdatedSections);
                }
                
                // IMPORTANT: Save the updated sections to the backend database
                try {
                  const allSections = flattenSections(finalUpdatedSections);
                  const updatedHtml = allSections.map(s => s.rawHtml).join('\n');
                  
                  console.log('Saving updated HTML to backend:', updatedHtml.substring(0, 200) + '...');
                  console.log('Calling onPresentationUpdate with:', { content: updatedHtml.length + ' chars' });
                  
                  const result = await onPresentationUpdate({ 
                    content: updatedHtml,
                    description: updatedHtml  // Keep for backward compatibility
                  });
                  
                  console.log('onPresentationUpdate result:', result);
                  
                  
                  
                  setHasUnsavedChanges(false);
                  setLastSaved(new Date());
                  
                  toast.success('✅ Chart created and saved successfully!');
                } catch (saveError) {
                  console.error('Failed to save chart to backend:', saveError);
                  toast.error('⚠️ Chart created but failed to save. Please refresh and try again.');
                }
                
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
                
                // Update the section with new chart HTML using tree structure
                const replaceSection = (sections: DocumentSection[]): DocumentSection[] => {
                  return sections.map(section => {
                    if (section.id === selectedSection.id) {
                      return {
                        ...selectedSection,
                        type: 'diagram' as const,
                        content: 'Updated AI Chart',
                        rawHtml: chartHtml
                      };
                    } else if (section.children && section.children.length > 0) {
                      return {
                        ...section,
                        children: replaceSection(section.children)
                      };
                    }
                    return section;
                  });
                };
                
                const updatedSections = replaceSection(sections);
                setSections(updatedSections);
                
                // Update presentation content using proper flattening
                const allSections = flattenSections(updatedSections);
                const updatedHtml = allSections.map(s => s.rawHtml).join('\n');
                
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