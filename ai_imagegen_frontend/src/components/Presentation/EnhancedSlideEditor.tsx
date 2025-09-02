import React, { useState, useRef, useEffect } from 'react';
import { Presentation, ContentSection, DiagramElement } from '../../types/Presentation';
import { 
  FiPlay, FiPause, FiSkipForward, FiDownload, FiSettings, FiPlus, 
  FiEdit3, FiZap, FiType, FiImage, FiBarChart, FiList, FiLayers, FiUpload, FiTrash2, FiMove
} from 'react-icons/fi';
import { toast } from 'react-toastify';
// Removed DiagramCreator - using only ChartGenerator

interface EnhancedSlideEditorProps {
  presentation: Presentation;
  sections: ContentSection[];
  onSectionUpdate: (sectionId: string, updates: Partial<ContentSection>) => Promise<ContentSection | undefined>;
  onSectionsReorder: (newOrder: ContentSection[]) => Promise<void>;
  onSectionCreate: (data: Partial<ContentSection>) => Promise<ContentSection | undefined>;
  onSectionDelete: (sectionId: string) => Promise<void>;
  onDiagramCreate: (diagram: Partial<DiagramElement>, sectionId?: string) => Promise<DiagramElement | undefined>;
  viewMode: 'edit' | 'preview';
}

interface AnimationSettings {
  type: 'fadeIn' | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown' | 'zoomIn' | 'zoomOut' | 'rotate' | 'bounce';
  duration: number;
  delay: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

const EnhancedSlideEditor: React.FC<EnhancedSlideEditorProps> = ({ 
  presentation,
  sections,
  onSectionUpdate,
  onSectionsReorder,
  onSectionCreate,
  onSectionDelete,
  onDiagramCreate,
  viewMode
}) => {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSection, setSelectedSection] = useState<ContentSection | null>(null);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  
  // Enhanced presentation mode state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [autoAdvanceInterval, setAutoAdvanceInterval] = useState(5000);
  const [showControls, setShowControls] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideTransition, setSlideTransition] = useState<'fade' | 'slide' | 'zoom'>('fade');
  
  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editingSection, setEditingSection] = useState<ContentSection | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  
  // Diagram conversion
  const [showDiagramCreator, setShowDiagramCreator] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');
  
  // Image upload functionality
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [animationSettings, setAnimationSettings] = useState<AnimationSettings>({
    type: 'fadeIn',
    duration: 1000,
    delay: 0,
    easing: 'ease-in-out'
  });

  console.log('EnhancedSlideEditor received sections:', sections);
  console.log('Total sections count:', sections.length);

  // Accept multiple section types for slide presentations (more flexible filtering)
  const slideableSections = sections.filter(s => 
    s.section_type === 'content_slide' || 
    s.section_type === 'slide' || 
    s.section_type === 'section' ||
    // If no specific slide sections, include all sections for slide presentations
    (sections.filter(sec => sec.section_type === 'content_slide').length === 0 && s.section_type)
  );
  
  console.log('Filtered slideable sections:', slideableSections);
  console.log('Slideable sections count:', slideableSections.length);
  
  const currentSection = slideableSections[currentSectionIndex];
  console.log('Current section:', currentSection);

  // Process content - strip HTML and create readable text with proper line breaks
  const processContent = (content: string): string => {
    if (!content) return 'Slide content goes here...';
    
    // Remove HTML tags and decode entities but preserve line breaks for lists
    let processedContent = content
      .replace(/<li>/g, '\n• ')      // Convert list items to bullets with newlines
      .replace(/<\/li>/g, '')       // Remove closing li tags
      .replace(/<br\s*\/?>/g, '\n') // Convert br tags to newlines
      .replace(/<p>/g, '\n')        // Convert paragraph opening tags to newlines
      .replace(/<\/p>/g, '')        // Remove paragraph closing tags
      .replace(/<[^>]*>/g, ' ')     // Replace other tags with spaces
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    // Clean up spacing but preserve bullet point structure
    return processedContent
      .split('\n')
      .map(line => line.trim())                    // Trim each line
      .filter((line, index, arr) => 
        line !== '' || 
        (index > 0 && arr[index - 1].startsWith('•')) ||  // Keep empty lines after bullet points
        (index < arr.length - 1 && arr[index + 1].startsWith('•'))  // Keep empty lines before bullet points
      )
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')                  // Limit consecutive line breaks to max 2
      .trim();
  };

  // Enhanced navigation with smooth transitions
  const nextSection = () => {
    if (currentSectionIndex < slideableSections.length - 1 && !isTransitioning) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSectionIndex(currentSectionIndex + 1);
        setIsTransitioning(false);
      }, slideTransition === 'fade' ? 150 : 300);
    }
  };

  const prevSection = () => {
    if (currentSectionIndex > 0 && !isTransitioning) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSectionIndex(currentSectionIndex - 1);
        setIsTransitioning(false);
      }, slideTransition === 'fade' ? 150 : 300);
    }
  };

  const goToSlide = (index: number) => {
    if (index >= 0 && index < slideableSections.length && index !== currentSectionIndex) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSectionIndex(index);
        setIsTransitioning(false);
      }, slideTransition === 'fade' ? 150 : 300);
    }
  };

  const startFullscreenPresentation = () => {
    setIsFullscreen(true);
    setIsPlaying(true);
    setShowControls(true);
    
    // Request fullscreen
    document.documentElement.requestFullscreen?.();
  };

  const exitFullscreenPresentation = () => {
    setIsFullscreen(false);
    setIsPlaying(false);
    setAutoAdvance(false);
    
    // Exit fullscreen
    document.exitFullscreen?.();
  };

  const startPreview = () => {
    setIsPlaying(true);
    if (autoAdvance) {
      const interval = setInterval(() => {
        if (currentSectionIndex < slideableSections.length - 1) {
          nextSection();
        } else {
          setIsPlaying(false);
          clearInterval(interval);
        }
      }, autoAdvanceInterval);
    }
  };

  const stopPreview = () => {
    setIsPlaying(false);
    setAutoAdvance(false);
  };

  // Keyboard navigation for presentation mode
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isFullscreen || isPlaying) {
        switch (e.key) {
          case 'ArrowRight':
          case ' ':
          case 'PageDown':
            e.preventDefault();
            nextSection();
            break;
          case 'ArrowLeft':
          case 'PageUp':
            e.preventDefault();
            prevSection();
            break;
          case 'Escape':
            e.preventDefault();
            if (isFullscreen) {
              exitFullscreenPresentation();
            } else {
              stopPreview();
            }
            break;
          case 'Home':
            e.preventDefault();
            goToSlide(0);
            break;
          case 'End':
            e.preventDefault();
            goToSlide(slideableSections.length - 1);
            break;
          case 'f':
          case 'F':
            e.preventDefault();
            if (!isFullscreen) {
              startFullscreenPresentation();
            }
            break;
          case 'c':
          case 'C':
            e.preventDefault();
            setShowControls(!showControls);
            break;
          default:
            // Number keys for direct slide navigation
            const slideNumber = parseInt(e.key);
            if (slideNumber >= 1 && slideNumber <= slideableSections.length) {
              e.preventDefault();
              goToSlide(slideNumber - 1);
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isFullscreen, isPlaying, currentSectionIndex, slideableSections.length, showControls]);

  // Auto-advance functionality
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoAdvance && isPlaying) {
      interval = setInterval(() => {
        if (currentSectionIndex < slideableSections.length - 1) {
          nextSection();
        } else {
          // End of presentation
          setIsPlaying(false);
          setAutoAdvance(false);
          toast.info('Presentation completed!');
        }
      }, autoAdvanceInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoAdvance, isPlaying, currentSectionIndex, slideableSections.length, autoAdvanceInterval]);

  // Hide mouse cursor in fullscreen after inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const handleMouseMove = () => {
      if (isFullscreen) {
        setShowControls(true);
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          setShowControls(false);
        }, 3000);
      }
    };

    if (isFullscreen) {
      document.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (timeout) clearTimeout(timeout);
    };
  }, [isFullscreen]);

  // Start editing a slide
  const startEditing = (section: ContentSection) => {
    setIsEditing(true);
    setEditingSection(section);
    setEditTitle(section.title);
    setEditContent(section.content || '');
  };

  // Cancel editing
  const cancelEditing = () => {
    setIsEditing(false);
    setEditingSection(null);
    setEditTitle('');
    setEditContent('');
  };

  // Save edited slide content
  const saveEditedSlide = async () => {
    if (!editingSection) return;

    try {
      await onSectionUpdate(editingSection.id, {
        title: editTitle,
        content: editContent,
        rich_content: editContent,
        updated_at: new Date().toISOString()
      });
      
      // Update local state
      setIsEditing(false);
      setEditingSection(null);
      setEditTitle('');
      setEditContent('');
      
      toast.success('Slide updated successfully!');
    } catch (error) {
      console.error('Failed to update slide:', error);
      toast.error('Failed to update slide');
    }
  };

  const saveCurrentSection = async () => {
    if (!currentSection) return;

    try {
      await onSectionUpdate(currentSection.id, {
        updated_at: new Date().toISOString()
      });
      toast.success('Slide saved successfully');
    } catch (error) {
      toast.error('Failed to save slide');
    }
  };

  const addNewSlide = async () => {
    await onSectionCreate({
      section_type: 'content_slide',
      title: `Slide ${slideableSections.length + 1}`,
      content: 'New slide content...',
      rich_content: 'New slide content...',
      order: slideableSections.length,
      content_data: {},
      layout_config: {},
      style_config: {},
      animation_config: {},
      interaction_config: {},
      ai_generated: false,
      generation_metadata: {},
      comments: [],
      version_history: [],
      media_files: []
    });
  };

  // Handle diagram creation
  const handleDiagramCreated = async (diagramData: DiagramElement) => {
    try {
      // Create diagram directly with the current section ID
      const sectionId = currentSection?.id || 'main';
      const createdDiagram = await onDiagramCreate(diagramData, sectionId);
      
      if (createdDiagram) {
        toast.success(`✅ Diagram "${createdDiagram.title}" added to slide successfully!`);
        
        // Update the current section to show that a diagram was added
        if (currentSection) {
          await onSectionUpdate(currentSection.id, {
            content: currentSection.content + `\n\n[Diagram: ${createdDiagram.title} (${createdDiagram.chart_type})]`,
            updated_at: new Date().toISOString(),
            // Add diagram reference to the section
            canvas_json: {
              ...currentSection.canvas_json,
              diagrams: [
                ...(currentSection.canvas_json?.diagrams || []),
                {
                  id: createdDiagram.id,
                  title: createdDiagram.title,
                  chart_type: createdDiagram.chart_type,
                  position: { x: 50, y: 400 }, // Position below main content
                  size: { width: 400, height: 300 }
                }
              ]
            }
          });
        }
        
        // Optional: Show a brief loading indicator for diagram generation
        if (!createdDiagram.image_url) {
          toast.info('🎨 Diagram is being generated in the background...', { autoClose: 3000 });
        }
      }
    } catch (error) {
      console.error('Failed to create diagram:', error);
      toast.error('❌ Failed to create diagram. Please try again.');
    }
    
    setShowDiagramCreator(false);
    setSelectedText('');
  };

  // Image upload functionality
  const handleImageUpload = async (file: File) => {
    if (!currentSection) return;

    setUploadingImage(true);
    try {
      // Create a FormData object to handle file upload
      const formData = new FormData();
      formData.append('image', file);
      formData.append('presentation_id', presentation.id);
      formData.append('section_id', currentSection.id);

      // Upload image to backend (assuming an endpoint exists)
      const response = await fetch('/api/presentations/upload-image/', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const result = await response.json();
      
      // Update the section with the new image
      const currentImages = currentSection.media_files || [];
      const updatedSection = await onSectionUpdate(currentSection.id, {
        media_files: [
          ...currentImages,
          {
            id: result.id || Date.now().toString(),
            type: 'image',
            url: result.url || URL.createObjectURL(file),
            filename: file.name,
            size: file.size,
            position: { x: 50, y: 50 },
            dimensions: { width: 300, height: 200 },
            alt_text: file.name.split('.')[0]
          }
        ],
        updated_at: new Date().toISOString()
      });

      toast.success('Image uploaded successfully!');
      setShowImageUpload(false);
    } catch (error) {
      console.error('Image upload failed:', error);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      handleImageUpload(imageFiles[0]);
    }
  };

  const handleImageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeImage = async (imageId: string) => {
    if (!currentSection) return;

    try {
      const updatedImages = (currentSection.media_files || []).filter(img => img.id !== imageId);
      await onSectionUpdate(currentSection.id, {
        media_files: updatedImages,
        updated_at: new Date().toISOString()
      });
      toast.success('Image removed successfully!');
    } catch (error) {
      toast.error('Failed to remove image');
    }
  };

  const updateImagePosition = async (imageId: string, position: { x: number; y: number }) => {
    if (!currentSection) return;

    try {
      const updatedImages = (currentSection.media_files || []).map(img =>
        img.id === imageId ? { ...img, position } : img
      );
      await onSectionUpdate(currentSection.id, {
        media_files: updatedImages,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to update image position:', error);
    }
  };

  // Get section type icon
  const getSectionIcon = (section: ContentSection) => {
    if (section.animation_config?.animations?.length) return <FiZap className="text-purple-600" />;
    if (section.canvas_json) return <FiImage className="text-blue-600" />;
    if (section.media_files?.length) return <FiImage className="text-green-600" />;
    return <FiType className="text-gray-600" />;
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Enhanced Slide Timeline Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FiLayers size={18} />
              Slide Timeline
            </h3>
            {viewMode === 'edit' && (
              <button
                onClick={addNewSlide}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title="Add New Slide"
              >
                <FiPlus size={16} />
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">{slideableSections.length} slides</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {slideableSections.map((section, index) => (
            <div
              key={section.id}
              className={`group relative p-3 mb-2 rounded-lg cursor-pointer transition-all ${
                index === currentSectionIndex
                  ? 'bg-blue-50 border-2 border-blue-500'
                  : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
              } ${hoveredSection === section.id ? 'ring-2 ring-blue-200' : ''}`}
              onClick={() => setCurrentSectionIndex(index)}
              onMouseEnter={() => setHoveredSection(section.id)}
              onMouseLeave={() => setHoveredSection(null)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                    {index + 1}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getSectionIcon(section)}
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {section.title}
                      </span>
                    </div>
                    
                    {/* Quick Actions - Only show in edit mode */}
                    {viewMode === 'edit' && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSection(section);
                            setShowDiagramCreator(true);
                          }}
                          className="p-1 hover:bg-purple-100 rounded text-purple-600"
                          title="Add diagram to slide"
                        >
                          <FiZap size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(section);
                          }}
                          className="p-1 hover:bg-gray-200 rounded text-gray-600"
                          title="Edit slide"
                        >
                          <FiEdit3 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {section.content || 'Empty slide'}
                  </p>
                  
                  {/* Status Indicators */}
                  <div className="flex items-center gap-2 mt-2">
                    {section.animation_config?.animations && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                        🎬 Animated
                      </span>
                    )}
                    {section.canvas_json && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        ✓ Content
                      </span>
                    )}
                    {section.ai_generated && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        🤖 AI
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={startFullscreenPresentation}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <FiPlay size={16} />
                Present
              </button>

              <button
                onClick={isPlaying ? stopPreview : startPreview}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isPlaying
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isPlaying ? <FiPause size={16} /> : <FiPlay size={16} />}
                {isPlaying ? 'Stop Preview' : 'Preview'}
              </button>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={prevSection}
                  disabled={currentSectionIndex === 0 || isTransitioning}
                  className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  <FiSkipForward size={16} className="transform rotate-180" />
                </button>
                <span className="text-sm text-gray-600 px-3 font-mono">
                  {currentSectionIndex + 1} / {slideableSections.length}
                </span>
                <button
                  onClick={nextSection}
                  disabled={currentSectionIndex === slideableSections.length - 1 || isTransitioning}
                  className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  <FiSkipForward size={16} />
                </button>
              </div>

              {/* Presentation Settings */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={autoAdvance}
                    onChange={(e) => setAutoAdvance(e.target.checked)}
                    className="rounded"
                  />
                  Auto-advance
                </label>
                {autoAdvance && (
                  <select
                    value={autoAdvanceInterval / 1000}
                    onChange={(e) => setAutoAdvanceInterval(parseInt(e.target.value) * 1000)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value={3}>3s</option>
                    <option value={5}>5s</option>
                    <option value={10}>10s</option>
                    <option value={15}>15s</option>
                  </select>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {viewMode === 'edit' && (
                <>
                  <button
                    onClick={() => {
                      setSelectedSection(currentSection || null);
                      setShowDiagramCreator(true);
                    }}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    <FiZap size={16} />
                    Add Diagram
                  </button>

                  <button
                    onClick={() => setShowImageUpload(true)}
                    className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    <FiUpload size={16} />
                    Add Image
                  </button>
                  
                  <button
                    onClick={saveCurrentSection}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    Save Slide
                  </button>
                </>
              )}
              
              <button
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                <FiDownload size={16} />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Canvas and Properties Panel */}
        <div className="flex-1 flex">
          {/* Canvas */}
          <div className="flex-1 p-6 flex items-center justify-center bg-gray-100">
            {slideableSections.length === 0 ? (
              // No slides available - show create first slide prompt
              <div className="text-center">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md">
                  <FiPlus className="mx-auto text-gray-400 mb-4" size={48} />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Slides Yet</h3>
                  <p className="text-gray-600 mb-6">Get started by creating your first slide.</p>
                  <button
                    onClick={addNewSlide}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 mx-auto"
                  >
                    <FiPlus size={16} />
                    Create First Slide
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-4xl">
                {/* Current Slide Display */}
                {currentSection && (
                  <div 
                    className="rounded-lg shadow-xl border-2 border-gray-200 overflow-hidden"
                    style={{
                      width: '1024px',
                      height: '768px',
                      backgroundColor: currentSection.style_config?.background?.value || '#1a1a1a'
                    }}
                  >
                    <div className="h-full flex flex-col justify-center p-12 text-white">
                      {/* Slide Title */}
                      <h1 
                        className="text-4xl font-bold mb-8 leading-tight"
                        style={{ 
                          color: currentSection.style_config?.theme_colors?.text || '#ffffff'
                        }}
                        onMouseUp={() => {
                          const selection = window.getSelection();
                          if (selection && !selection.isCollapsed && selection.toString().trim().length > 10) {
                            setSelectedText(selection.toString().trim());
                            setShowDiagramCreator(true);
                          }
                        }}
                      >
                        {currentSection.title}
                      </h1>

                      {/* Slide Content */}
                      <div 
                        className="text-lg leading-relaxed space-y-4"
                        style={{ 
                          color: currentSection.style_config?.theme_colors?.text || '#ffffff'
                        }}
                        onMouseUp={() => {
                          const selection = window.getSelection();
                          if (selection && !selection.isCollapsed && selection.toString().trim().length > 10) {
                            setSelectedText(selection.toString().trim());
                            setShowDiagramCreator(true);
                          }
                        }}
                      >
                        {processContent(currentSection.content || '').split('\n').map((line, index) => (
                          <p key={index} className={line.startsWith('•') ? 'ml-4' : ''}>
                            {line}
                          </p>
                        ))}
                      </div>

                      {/* Template and Notes Info */}
                      <div className="mt-auto pt-8">
                        {currentSection.generation_metadata?.template_info && (
                          <div 
                            className="text-sm opacity-70"
                            style={{ 
                              color: currentSection.style_config?.theme_colors?.text || '#ffffff'
                            }}
                          >
                            Template: {currentSection.generation_metadata.template_info.name}
                          </div>
                        )}
                        
                        {currentSection.notes && currentSection.notes !== currentSection.content && (
                          <div 
                            className="text-xs opacity-60 mt-2"
                            style={{ 
                              color: currentSection.style_config?.theme_colors?.text || '#ffffff'
                            }}
                          >
                            Notes: {currentSection.notes.substring(0, 150)}...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Enhanced Properties Panel */}
          <div className="w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiSettings size={16} />
              Slide Properties
            </h3>

            {currentSection && (
              <div className="space-y-6">
                {/* Slide Info */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">{currentSection.title}</h4>
                  <p className="text-sm text-gray-600">Slide {currentSectionIndex + 1} of {slideableSections.length}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {currentSection.ai_generated && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">AI Generated</span>
                    )}
                    {currentSection.animation_config?.animations && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                        {currentSection.animation_config.animations.length} Animation(s)
                      </span>
                    )}
                  </div>
                </div>

                {/* Animation Settings */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Animation Settings</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Animation Type</label>
                      <select
                        value={animationSettings.type}
                        onChange={(e) => setAnimationSettings(prev => ({ ...prev, type: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="fadeIn">Fade In</option>
                        <option value="slideLeft">Slide Left</option>
                        <option value="slideRight">Slide Right</option>
                        <option value="slideUp">Slide Up</option>
                        <option value="slideDown">Slide Down</option>
                        <option value="zoomIn">Zoom In</option>
                        <option value="zoomOut">Zoom Out</option>
                        <option value="rotate">Rotate</option>
                        <option value="bounce">Bounce</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Duration: {animationSettings.duration}ms
                      </label>
                      <input
                        type="range"
                        min={100}
                        max={3000}
                        step={100}
                        value={animationSettings.duration}
                        onChange={(e) => setAnimationSettings(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Delay: {animationSettings.delay}ms
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={2000}
                        step={100}
                        value={animationSettings.delay}
                        onChange={(e) => setAnimationSettings(prev => ({ ...prev, delay: parseInt(e.target.value) }))}
                        className="w-full"
                      />
                    </div>

                    <button
                      onClick={() => {
                        // Apply animation logic
                        toast.success('Animation applied to slide');
                      }}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium"
                    >
                      Apply Animation
                    </button>
                  </div>
                </div>

                {/* Quick Actions */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Quick Actions</h4>
                  
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setSelectedSection(currentSection);
                        setShowDiagramCreator(true);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
                    >
                      <FiZap size={16} />
                      Add Diagram
                    </button>
                    
                    <button
                      onClick={addNewSlide}
                      className="w-full flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                    >
                      <FiPlus size={16} />
                      Duplicate Slide
                    </button>
                    
                    <button
                      onClick={() => onSectionDelete(currentSection.id)}
                      className="w-full flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                    >
                      Delete Slide
                    </button>
                  </div>
                </div>
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
          selectedText={selectedText}
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

      {/* Edit Slide Modal */}
      {isEditing && editingSection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Edit Slide</h3>
              <p className="text-sm text-gray-600 mt-1">Slide {slideableSections.findIndex(s => s.id === editingSection.id) + 1}</p>
            </div>
            
            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Slide Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter slide title..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Slide Content</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Enter slide content...
                  
Tips:
• Use bullet points for lists
• Each line will be displayed separately  
• Keep content concise and readable"
                />
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">✨ Formatting Tips</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Use <strong>•</strong> for bullet points</li>
                  <li>• Press Enter for new lines</li>
                  <li>• Keep content concise for better readability</li>
                  <li>• Each line will appear as a separate paragraph on the slide</li>
                </ul>
              </div>
            </div>
            
            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={cancelEditing}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEditedSlide}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Presentation Mode */}
      {isFullscreen && currentSection && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          {/* Presentation Slide */}
          <div 
            className={`w-screen h-screen flex items-center justify-center transition-all duration-300 ${
              isTransitioning 
                ? slideTransition === 'fade' 
                  ? 'opacity-0' 
                  : slideTransition === 'slide' 
                    ? 'transform translate-x-full'
                    : 'transform scale-110 opacity-0'
                : 'opacity-100 transform translate-x-0 scale-100'
            }`}
            onClick={nextSection}
            style={{ cursor: showControls ? 'pointer' : 'none' }}
          >
            <div 
              className="w-full h-full flex flex-col justify-center p-16 text-white"
              style={{
                backgroundColor: currentSection.style_config?.background?.value || '#1a1a1a'
              }}
            >
              {/* Slide Title */}
              <h1 
                className="text-6xl font-bold mb-12 leading-tight text-center"
                style={{ 
                  color: currentSection.style_config?.theme_colors?.text || '#ffffff'
                }}
              >
                {currentSection.title}
              </h1>

              {/* Slide Content */}
              <div 
                className="text-3xl leading-relaxed space-y-8 text-center max-w-6xl mx-auto"
                style={{ 
                  color: currentSection.style_config?.theme_colors?.text || '#ffffff'
                }}
              >
                {processContent(currentSection.content || '').split('\n').map((line, index) => (
                  <p 
                    key={index} 
                    className={`${line.startsWith('•') ? 'text-left ml-8' : 'text-center'} animate-fadeIn`}
                    style={{ animationDelay: `${index * 0.2}s` }}
                  >
                    {line}
                  </p>
                ))}
              </div>

              {/* Slide progress indicator */}
              <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2">
                <div className="flex items-center gap-2">
                  {slideableSections.map((_, index) => (
                    <div
                      key={index}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        index === currentSectionIndex 
                          ? 'bg-white' 
                          : index < currentSectionIndex 
                            ? 'bg-white/60' 
                            : 'bg-white/20'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Presentation Controls Overlay */}
          {showControls && (
            <div className="fixed inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/70 to-transparent">
              <div className="flex items-center justify-between max-w-6xl mx-auto">
                <div className="flex items-center gap-4">
                  <button
                    onClick={exitFullscreenPresentation}
                    className="bg-red-600/80 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors backdrop-blur-sm"
                  >
                    Exit Presentation
                  </button>
                  
                  <div className="text-white/80 text-sm">
                    Press <kbd className="bg-white/20 px-2 py-1 rounded">Space</kbd> or <kbd className="bg-white/20 px-2 py-1 rounded">→</kbd> to advance
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-white/80 text-lg font-mono">
                    {currentSectionIndex + 1} / {slideableSections.length}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        prevSection();
                      }}
                      disabled={currentSectionIndex === 0 || isTransitioning}
                      className="p-2 bg-white/20 hover:bg-white/30 disabled:opacity-50 rounded-lg transition-colors backdrop-blur-sm"
                    >
                      <FiSkipForward size={20} className="transform rotate-180 text-white" />
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        nextSection();
                      }}
                      disabled={currentSectionIndex === slideableSections.length - 1 || isTransitioning}
                      className="p-2 bg-white/20 hover:bg-white/30 disabled:opacity-50 rounded-lg transition-colors backdrop-blur-sm"
                    >
                      <FiSkipForward size={20} className="text-white" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Auto-advance indicator */}
              {autoAdvance && isPlaying && (
                <div className="mt-4 max-w-6xl mx-auto">
                  <div className="w-full bg-white/20 rounded-full h-1">
                    <div 
                      className="bg-white h-1 rounded-full transition-all duration-1000 ease-linear"
                      style={{ 
                        width: '0%',
                        animation: `progress ${autoAdvanceInterval}ms linear infinite`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Keyboard shortcuts help */}
          <div className="fixed top-4 right-4">
            {showControls && (
              <div className="bg-black/60 backdrop-blur-sm rounded-lg p-4 text-white/80 text-xs">
                <div className="font-medium mb-2">Keyboard Shortcuts:</div>
                <div className="space-y-1">
                  <div><kbd className="bg-white/20 px-1 rounded">Space</kbd> / <kbd className="bg-white/20 px-1 rounded">→</kbd> Next slide</div>
                  <div><kbd className="bg-white/20 px-1 rounded">←</kbd> Previous slide</div>
                  <div><kbd className="bg-white/20 px-1 rounded">ESC</kbd> Exit fullscreen</div>
                  <div><kbd className="bg-white/20 px-1 rounded">1-9</kbd> Go to slide</div>
                  <div><kbd className="bg-white/20 px-1 rounded">C</kbd> Toggle controls</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image Upload Modal */}
      {showImageUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Add Image to Slide</h3>
              <p className="text-sm text-gray-600 mt-1">Upload an image to enhance your presentation</p>
            </div>
            
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              {/* Drag & Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  uploadingImage ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDrop={handleImageDrop}
                onDragOver={handleImageDragOver}
              >
                {uploadingImage ? (
                  <div className="space-y-4">
                    <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
                    <p className="text-blue-600 font-medium">Uploading image...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <FiUpload className="mx-auto text-gray-400" size={48} />
                    <div>
                      <p className="text-lg font-medium text-gray-900">Drop your image here</p>
                      <p className="text-gray-500 mt-1">or click to browse</p>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                      Choose Image
                    </button>
                    <p className="text-xs text-gray-400">PNG, JPG, GIF up to 10MB</p>
                  </div>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                  className="hidden"
                />
              </div>

              {/* Current Images in Slide */}
              {currentSection?.media_files && currentSection.media_files.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Current Images ({currentSection.media_files.length})</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {currentSection.media_files
                      .filter(file => file.type === 'image')
                      .map((image) => (
                        <div key={image.id} className="relative group">
                          <img
                            src={image.url}
                            alt={image.alt_text || image.filename}
                            className="w-full h-24 object-cover rounded-lg border border-gray-200"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <button
                              onClick={() => removeImage(image.id)}
                              className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
                              title="Remove image"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 truncate">{image.filename}</p>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}

              {/* Upload Tips */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">📸 Image Tips</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Use high-resolution images for better quality</li>
                  <li>• Images will be automatically resized to fit the slide</li>
                  <li>• You can drag images to reposition them on the slide</li>
                  <li>• Supported formats: PNG, JPG, GIF, WebP</li>
                </ul>
              </div>
            </div>
            
            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowImageUpload(false)}
                disabled={uploadingImage}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Close
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {uploadingImage ? 'Uploading...' : 'Add Another Image'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out forwards;
          opacity: 0;
        }
        
        kbd {
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  );
};

export default EnhancedSlideEditor;