import React, { useState, useRef, useEffect } from 'react';
import * as fabric from 'fabric';
import { Presentation, ContentSection, DiagramElement } from '../../types/Presentation';
import { 
  FiPlay, FiPause, FiSkipForward, FiDownload, FiSettings, FiPlus, 
  FiEdit3, FiZap, FiType, FiImage, FiBarChart, FiList, FiLayers
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import DiagramCreator from './DiagramCreator';

interface EnhancedSlideEditorProps {
  presentation: Presentation;
  sections: ContentSection[];
  onSectionUpdate: (sectionId: string, updates: Partial<ContentSection>) => Promise<ContentSection | undefined>;
  onSectionsReorder: (newOrder: ContentSection[]) => Promise<void>;
  onSectionCreate: (data: Partial<ContentSection>) => Promise<ContentSection | undefined>;
  onSectionDelete: (sectionId: string) => Promise<void>;
  onDiagramCreate: (diagram: Partial<DiagramElement>) => Promise<DiagramElement | undefined>;
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
  onDiagramCreate
}) => {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSection, setSelectedSection] = useState<ContentSection | null>(null);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  
  // Diagram conversion
  const [showDiagramCreator, setShowDiagramCreator] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');
  
  const [animationSettings, setAnimationSettings] = useState<AnimationSettings>({
    type: 'fadeIn',
    duration: 1000,
    delay: 0,
    easing: 'ease-in-out'
  });

  const canvasRef = useRef<fabric.Canvas | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const slideableSections = sections.filter(s => s.section_type === 'content_slide');
  const currentSection = slideableSections[currentSectionIndex];

  // Initialize canvas
  useEffect(() => {
    if (canvasContainerRef.current && !canvasRef.current) {
      const canvas = new fabric.Canvas(canvasContainerRef.current.querySelector('canvas')!);
      canvasRef.current = canvas;

      // Set canvas size
      canvas.setDimensions({ width: 1024, height: 768 });

      return () => {
        canvas.dispose();
      };
    }
  }, []);

  // Load section content into canvas
  useEffect(() => {
    if (canvasRef.current && currentSection) {
      canvasRef.current.clear();

      if (currentSection.canvas_json) {
        try {
          canvasRef.current.loadFromJSON(currentSection.canvas_json, () => {
            canvasRef.current?.renderAll();
          });
        } catch (error) {
          console.error('Error loading canvas JSON:', error);
          // Add default content if JSON fails
          addDefaultSlideContent();
        }
      } else {
        addDefaultSlideContent();
      }
    }
  }, [currentSectionIndex, currentSection]);

  const addDefaultSlideContent = () => {
    if (!canvasRef.current || !currentSection) return;

    // Add title
    const titleText = new fabric.Text(currentSection.title || 'Slide Title', {
      left: 100,
      top: 100,
      fontSize: 48,
      fontWeight: 'bold',
      fill: '#1f2937'
    });

    // Add content
    const contentText = new fabric.Text(currentSection.content || 'Slide content goes here...', {
      left: 100,
      top: 200,
      fontSize: 24,
      fill: '#374151',
      width: 800
    });

    canvasRef.current.add(titleText, contentText);
    canvasRef.current.renderAll();
  };

  const nextSection = () => {
    if (currentSectionIndex < slideableSections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
    }
  };

  const prevSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
    }
  };

  const startPreview = () => {
    setIsPlaying(true);
    // Implement slideshow logic
  };

  const stopPreview = () => {
    setIsPlaying(false);
  };

  const saveCurrentSection = async () => {
    if (!canvasRef.current || !currentSection) return;

    try {
      const canvasJSON = JSON.stringify(canvasRef.current.toJSON());
      const dataUrl = canvasRef.current.toDataURL();
      
      await onSectionUpdate(currentSection.id, {
        canvas_json: canvasJSON,
        rendered_image: dataUrl
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
  const handleDiagramCreated = async (diagram: DiagramElement) => {
    if (!canvasRef.current) return;

    try {
      const createdDiagram = await onDiagramCreate(diagram);
      if (createdDiagram && createdDiagram.image_url) {
        // Add diagram as image to canvas
        fabric.Image.fromURL(createdDiagram.image_url, (img) => {
          img.set({
            left: 100,
            top: 300,
            scaleX: 0.5,
            scaleY: 0.5
          });
          canvasRef.current?.add(img);
          canvasRef.current?.renderAll();
        });
        
        toast.success('Diagram added to slide successfully!');
      }
    } catch (error) {
      toast.error('Failed to create diagram');
    }
    
    setShowDiagramCreator(false);
    setSelectedText('');
  };

  // Get section type icon
  const getSectionIcon = (section: ContentSection) => {
    if (section.animation_config?.animations?.length) return <FiZap className="text-purple-600" />;
    if (section.canvas_json) return <FiImage className="text-blue-600" />;
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
            <button
              onClick={addNewSlide}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title="Add New Slide"
            >
              <FiPlus size={16} />
            </button>
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
                    
                    {/* Quick Actions */}
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
                          // Add edit functionality
                        }}
                        className="p-1 hover:bg-gray-200 rounded text-gray-600"
                        title="Edit slide"
                      >
                        <FiEdit3 size={12} />
                      </button>
                    </div>
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
                onClick={isPlaying ? stopPreview : startPreview}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isPlaying
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isPlaying ? <FiPause size={16} /> : <FiPlay size={16} />}
                {isPlaying ? 'Stop Preview' : 'Start Preview'}
              </button>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={prevSection}
                  disabled={currentSectionIndex === 0}
                  className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  <FiSkipForward size={16} className="transform rotate-180" />
                </button>
                <span className="text-sm text-gray-600 px-3">
                  Slide {currentSectionIndex + 1} of {slideableSections.length}
                </span>
                <button
                  onClick={nextSection}
                  disabled={currentSectionIndex === slideableSections.length - 1}
                  className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  <FiSkipForward size={16} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setSelectedSection(currentSection);
                  setShowDiagramCreator(true);
                }}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                <FiZap size={16} />
                Add Diagram
              </button>
              
              <button
                onClick={saveCurrentSection}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                Save Slide
              </button>
              
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
            <div
              ref={canvasContainerRef}
              className="bg-white rounded-lg shadow-xl border-2 border-gray-200"
              style={{ width: '1024px', height: '768px' }}
            >
              <canvas 
                width={1024} 
                height={768} 
                className="rounded-lg"
                onMouseUp={() => {
                  // Handle text selection for diagram conversion
                  const selection = window.getSelection();
                  if (selection && !selection.isCollapsed && selection.toString().trim().length > 10) {
                    setSelectedText(selection.toString().trim());
                    setShowDiagramCreator(true);
                  }
                }}
              />
            </div>
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
    </div>
  );
};

export default EnhancedSlideEditor;