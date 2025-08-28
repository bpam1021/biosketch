import React, { useState, useRef, useEffect } from 'react';
import {
  FiPlay, FiPause, FiSkipBack, FiSkipForward, FiPlus, FiTrash2,
  FiCopy, FiMove, FiImage, FiType, FiBarChart, FiTable, FiSettings,
  FiSave, FiDownload, FiGrid, FiMonitor, FiSmartphone, FiTablet,
  FiZoomIn, FiZoomOut, FiRotateCcw, FiRotateCw, FiLayers
} from 'react-icons/fi';
import { toast } from 'react-toastify';

interface SlideZone {
  id: string;
  type: 'title' | 'content' | 'image' | 'chart' | 'table';
  position: { x: number, y: number, width: number, height: number };
  content: string;
  placeholder: string;
  styles: {
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    backgroundColor?: string;
    alignment?: 'left' | 'center' | 'right';
    padding?: number;
  };
}

interface Slide {
  id: string;
  template_id: string;
  order: number;
  zones: SlideZone[];
  background: {
    type: 'color' | 'gradient' | 'image';
    value: string;
  };
  notes: string;
  transition: string;
  duration?: number;
}

interface SlideTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
}

interface SlidePresentation {
  id: string;
  title: string;
  slides: Slide[];
  theme: SlideTheme;
  settings: {
    slideSize: '16:9' | '4:3' | 'custom';
    transitionType: string;
    autoAdvance: boolean;
  };
}

interface SlideEditorProps {
  presentation: SlidePresentation;
  onPresentationUpdate: (updates: Partial<SlidePresentation>) => Promise<void>;
  onSlideUpdate: (slideId: string, updates: Partial<Slide>) => Promise<void>;
  readOnly?: boolean;
}

const SlideEditor: React.FC<SlideEditorProps> = ({
  presentation,
  onPresentationUpdate,
  onSlideUpdate,
  readOnly = false
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showGrid, setShowGrid] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [sidebarTab, setSidebarTab] = useState<'slides' | 'design' | 'animations'>('slides');

  const slideCanvasRef = useRef<HTMLDivElement>(null);
  const currentSlide = presentation.slides[currentSlideIndex];

  // Slide navigation
  const goToSlide = (index: number) => {
    if (index >= 0 && index < presentation.slides.length) {
      setCurrentSlideIndex(index);
      setSelectedZone(null);
    }
  };

  const addNewSlide = (templateId?: string) => {
    const newSlide: Slide = {
      id: `slide-${Date.now()}`,
      template_id: templateId || 'title_content',
      order: presentation.slides.length,
      zones: getDefaultZones(templateId || 'title_content'),
      background: { type: 'color', value: presentation.theme.colors.background },
      notes: '',
      transition: 'fade',
    };

    const updatedSlides = [...presentation.slides, newSlide];
    onPresentationUpdate({ slides: updatedSlides });
    setCurrentSlideIndex(updatedSlides.length - 1);
  };

  const duplicateSlide = (slideIndex: number) => {
    const slideToClone = presentation.slides[slideIndex];
    const newSlide: Slide = {
      ...slideToClone,
      id: `slide-${Date.now()}`,
      order: slideIndex + 1,
      zones: slideToClone.zones.map(zone => ({ ...zone, id: `zone-${Date.now()}-${zone.id}` }))
    };

    const updatedSlides = [...presentation.slides];
    updatedSlides.splice(slideIndex + 1, 0, newSlide);
    
    // Update order for subsequent slides
    updatedSlides.forEach((slide, index) => {
      slide.order = index;
    });

    onPresentationUpdate({ slides: updatedSlides });
    setCurrentSlideIndex(slideIndex + 1);
  };

  const deleteSlide = (slideIndex: number) => {
    if (presentation.slides.length <= 1) {
      toast.error('Cannot delete the last slide');
      return;
    }

    const updatedSlides = presentation.slides.filter((_, index) => index !== slideIndex);
    updatedSlides.forEach((slide, index) => {
      slide.order = index;
    });

    onPresentationUpdate({ slides: updatedSlides });
    
    if (currentSlideIndex >= updatedSlides.length) {
      setCurrentSlideIndex(updatedSlides.length - 1);
    }
  };

  // Zone management
  const updateZoneContent = (zoneId: string, content: string) => {
    if (!currentSlide) return;

    const updatedZones = currentSlide.zones.map(zone =>
      zone.id === zoneId ? { ...zone, content } : zone
    );

    onSlideUpdate(currentSlide.id, { zones: updatedZones });
  };

  const updateZoneStyles = (zoneId: string, styles: Partial<SlideZone['styles']>) => {
    if (!currentSlide) return;

    const updatedZones = currentSlide.zones.map(zone =>
      zone.id === zoneId ? { ...zone, styles: { ...zone.styles, ...styles } } : zone
    );

    onSlideUpdate(currentSlide.id, { zones: updatedZones });
  };

  const moveZone = (zoneId: string, newPosition: { x: number; y: number; width: number; height: number }) => {
    if (!currentSlide) return;

    const updatedZones = currentSlide.zones.map(zone =>
      zone.id === zoneId ? { ...zone, position: newPosition } : zone
    );

    onSlideUpdate(currentSlide.id, { zones: updatedZones });
  };

  // Get default zones for templates
  const getDefaultZones = (templateId: string): SlideZone[] => {
    const templates: Record<string, SlideZone[]> = {
      title: [
        {
          id: 'title',
          type: 'title',
          position: { x: 10, y: 30, width: 80, height: 25 },
          content: 'Presentation Title',
          placeholder: 'Enter your title',
          styles: { fontSize: 48, fontFamily: presentation.theme.fonts.heading, color: presentation.theme.colors.primary, alignment: 'center' }
        },
        {
          id: 'subtitle',
          type: 'content',
          position: { x: 10, y: 60, width: 80, height: 15 },
          content: '',
          placeholder: 'Enter subtitle',
          styles: { fontSize: 24, fontFamily: presentation.theme.fonts.body, color: presentation.theme.colors.text, alignment: 'center' }
        }
      ],
      title_content: [
        {
          id: 'title',
          type: 'title',
          position: { x: 5, y: 5, width: 90, height: 15 },
          content: 'Slide Title',
          placeholder: 'Enter title',
          styles: { fontSize: 32, fontFamily: presentation.theme.fonts.heading, color: presentation.theme.colors.primary, alignment: 'left' }
        },
        {
          id: 'content',
          type: 'content',
          position: { x: 5, y: 25, width: 90, height: 65 },
          content: '',
          placeholder: 'Add your content here...\n• Bullet point 1\n• Bullet point 2\n• Bullet point 3',
          styles: { fontSize: 18, fontFamily: presentation.theme.fonts.body, color: presentation.theme.colors.text, alignment: 'left', padding: 20 }
        }
      ],
      two_column: [
        {
          id: 'title',
          type: 'title',
          position: { x: 5, y: 5, width: 90, height: 15 },
          content: 'Two Column Layout',
          placeholder: 'Enter title',
          styles: { fontSize: 32, fontFamily: presentation.theme.fonts.heading, color: presentation.theme.colors.primary, alignment: 'left' }
        },
        {
          id: 'left',
          type: 'content',
          position: { x: 5, y: 25, width: 42, height: 65 },
          content: '',
          placeholder: 'Left column content',
          styles: { fontSize: 16, fontFamily: presentation.theme.fonts.body, color: presentation.theme.colors.text, alignment: 'left', padding: 15 }
        },
        {
          id: 'right',
          type: 'content',
          position: { x: 53, y: 25, width: 42, height: 65 },
          content: '',
          placeholder: 'Right column content',
          styles: { fontSize: 16, fontFamily: presentation.theme.fonts.body, color: presentation.theme.colors.text, alignment: 'left', padding: 15 }
        }
      ]
    };

    return templates[templateId] || templates.title_content;
  };

  // Presentation controls
  const startSlideshow = () => {
    setIsPlaying(true);
    setViewMode('preview');
    // Full screen slideshow logic would go here
  };

  const stopSlideshow = () => {
    setIsPlaying(false);
    setViewMode('edit');
  };

  // Render slide canvas
  const renderSlideCanvas = () => {
    if (!currentSlide) return null;

    const aspectRatio = presentation.settings.slideSize === '4:3' ? (3/4) : (9/16);
    const canvasWidth = Math.min(800, (slideCanvasRef.current?.clientWidth || 800) * 0.8);
    const canvasHeight = canvasWidth * aspectRatio;
    const scale = zoomLevel / 100;

    return (
      <div 
        className="relative mx-auto border border-gray-300 shadow-lg"
        style={{
          width: canvasWidth * scale,
          height: canvasHeight * scale,
          backgroundColor: currentSlide.background.value,
          backgroundImage: currentSlide.background.type === 'image' ? `url(${currentSlide.background.value})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Grid overlay */}
        {showGrid && (
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}
          />
        )}

        {/* Slide zones */}
        {currentSlide.zones.map((zone) => (
          <SlideZone
            key={zone.id}
            zone={zone}
            isSelected={selectedZone === zone.id}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            scale={scale}
            onSelect={() => setSelectedZone(zone.id)}
            onUpdateContent={(content) => updateZoneContent(zone.id, content)}
            onUpdateStyles={(styles) => updateZoneStyles(zone.id, styles)}
            onMove={(position) => moveZone(zone.id, position)}
            readOnly={readOnly || viewMode === 'preview'}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Left Sidebar - Slide Navigator */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => setSidebarTab('slides')}
              className={`flex-1 py-2 px-3 text-sm rounded ${
                sidebarTab === 'slides' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Slides
            </button>
            <button
              onClick={() => setSidebarTab('design')}
              className={`flex-1 py-2 px-3 text-sm rounded ${
                sidebarTab === 'design' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Design
            </button>
          </div>

          {!readOnly && (
            <button
              onClick={() => addNewSlide()}
              className="w-full flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              <FiPlus size={16} />
              New Slide
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {sidebarTab === 'slides' && (
            <div className="space-y-3">
              {presentation.slides.map((slide, index) => (
                <div
                  key={slide.id}
                  onClick={() => goToSlide(index)}
                  className={`relative p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    index === currentSlideIndex
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="text-sm font-medium mb-2">Slide {index + 1}</div>
                  
                  {/* Mini slide preview */}
                  <div 
                    className="w-full h-16 bg-gray-100 rounded border relative overflow-hidden"
                    style={{ backgroundColor: slide.background.value }}
                  >
                    {slide.zones.map(zone => (
                      <div
                        key={zone.id}
                        className="absolute text-xs"
                        style={{
                          left: `${zone.position.x}%`,
                          top: `${zone.position.y}%`,
                          width: `${zone.position.width}%`,
                          height: `${zone.position.height}%`,
                          fontSize: '6px',
                          backgroundColor: zone.type === 'title' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                          border: '1px solid rgba(107, 114, 128, 0.3)'
                        }}
                      />
                    ))}
                  </div>

                  {!readOnly && (
                    <div className="flex justify-end gap-1 mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateSlide(index);
                        }}
                        className="p-1 hover:bg-gray-200 rounded"
                        title="Duplicate"
                      >
                        <FiCopy size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSlide(index);
                        }}
                        className="p-1 hover:bg-red-100 text-red-600 rounded"
                        title="Delete"
                      >
                        <FiTrash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {sidebarTab === 'design' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Theme Colors</h3>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(presentation.theme.colors).map(([key, color]) => (
                    <div key={key} className="text-center">
                      <div 
                        className="w-8 h-8 rounded border mx-auto mb-1"
                        style={{ backgroundColor: color }}
                      />
                      <div className="text-xs text-gray-600 capitalize">{key}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">Slide Background</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => onSlideUpdate(currentSlide.id, { 
                      background: { type: 'color', value: presentation.theme.colors.background } 
                    })}
                    className="w-full p-2 text-left text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Default Background
                  </button>
                  <button
                    onClick={() => onSlideUpdate(currentSlide.id, { 
                      background: { type: 'gradient', value: `linear-gradient(135deg, ${presentation.theme.colors.primary}, ${presentation.theme.colors.secondary})` } 
                    })}
                    className="w-full p-2 text-left text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Gradient Background
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900">{presentation.title}</h1>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Slide {currentSlideIndex + 1} of {presentation.slides.length}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom controls */}
              <button
                onClick={() => setZoomLevel(Math.max(50, zoomLevel - 25))}
                className="p-2 hover:bg-gray-100 rounded"
                title="Zoom Out"
              >
                <FiZoomOut size={16} />
              </button>
              <span className="text-sm px-2">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
                className="p-2 hover:bg-gray-100 rounded"
                title="Zoom In"
              >
                <FiZoomIn size={16} />
              </button>

              <div className="w-px h-6 bg-gray-300" />

              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`p-2 rounded ${showGrid ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
                title="Toggle Grid"
              >
                <FiGrid size={16} />
              </button>

              <div className="w-px h-6 bg-gray-300" />

              {!readOnly && (
                <button
                  onClick={() => onPresentationUpdate(presentation)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  <FiSave size={16} />
                  Save
                </button>
              )}

              <button
                onClick={isPlaying ? stopSlideshow : startSlideshow}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
              >
                {isPlaying ? <FiPause size={16} /> : <FiPlay size={16} />}
                {isPlaying ? 'Stop' : 'Present'}
              </button>
            </div>
          </div>

          {/* Slide navigation */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              onClick={() => goToSlide(currentSlideIndex - 1)}
              disabled={currentSlideIndex === 0}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <FiSkipBack size={20} />
            </button>
            
            <div className="flex items-center gap-2">
              {presentation.slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-3 h-3 rounded-full ${
                    index === currentSlideIndex ? 'bg-blue-600' : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => goToSlide(currentSlideIndex + 1)}
              disabled={currentSlideIndex === presentation.slides.length - 1}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <FiSkipForward size={20} />
            </button>
          </div>
        </div>

        {/* Slide Canvas */}
        <div 
          ref={slideCanvasRef}
          className="flex-1 p-8 overflow-auto flex items-center justify-center"
        >
          {renderSlideCanvas()}
        </div>
      </div>

      {/* Right Sidebar - Properties */}
      {selectedZone && (
        <ZonePropertiesPanel
          zone={currentSlide.zones.find(z => z.id === selectedZone)!}
          onUpdateStyles={(styles) => updateZoneStyles(selectedZone, styles)}
          theme={presentation.theme}
        />
      )}
    </div>
  );
};

// Individual Slide Zone Component
interface SlideZoneProps {
  zone: SlideZone;
  isSelected: boolean;
  canvasWidth: number;
  canvasHeight: number;
  scale: number;
  onSelect: () => void;
  onUpdateContent: (content: string) => void;
  onUpdateStyles: (styles: Partial<SlideZone['styles']>) => void;
  onMove: (position: { x: number; y: number; width: number; height: number }) => void;
  readOnly: boolean;
}

const SlideZone: React.FC<SlideZoneProps> = ({
  zone,
  isSelected,
  canvasWidth,
  canvasHeight,
  scale,
  onSelect,
  onUpdateContent,
  readOnly
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(zone.content);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    onUpdateContent(newContent);
  };

  const handleDoubleClick = () => {
    if (!readOnly) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  const zoneStyle = {
    position: 'absolute' as const,
    left: `${zone.position.x}%`,
    top: `${zone.position.y}%`,
    width: `${zone.position.width}%`,
    height: `${zone.position.height}%`,
    fontSize: (zone.styles.fontSize || 16) * scale,
    fontFamily: zone.styles.fontFamily || 'Inter',
    color: zone.styles.color || '#000',
    backgroundColor: zone.styles.backgroundColor || 'transparent',
    textAlign: zone.styles.alignment || 'left',
    padding: (zone.styles.padding || 10) * scale,
    border: isSelected ? '2px solid #3b82f6' : '1px solid transparent',
    cursor: readOnly ? 'default' : 'pointer',
    outline: 'none',
    resize: 'none' as const,
    overflow: 'hidden',
    display: 'flex',
    alignItems: zone.type === 'title' ? 'center' : 'flex-start',
    whiteSpace: 'pre-wrap' as const
  };

  if (isEditing) {
    return (
      <textarea
        style={zoneStyle}
        value={content}
        onChange={(e) => handleContentChange(e.target.value)}
        onBlur={handleBlur}
        autoFocus
        className="bg-white bg-opacity-90"
      />
    );
  }

  return (
    <div
      style={zoneStyle}
      onClick={onSelect}
      onDoubleClick={handleDoubleClick}
      className={`${isSelected ? 'ring-2 ring-blue-500' : ''} hover:bg-blue-50 hover:bg-opacity-20 transition-all`}
    >
      {content || (
        <span className="text-gray-400 italic">
          {zone.placeholder}
        </span>
      )}
      
      {isSelected && !readOnly && (
        <div className="absolute -top-6 left-0 bg-blue-600 text-white px-2 py-1 text-xs rounded">
          {zone.type}
        </div>
      )}
    </div>
  );
};

// Zone Properties Panel Component
interface ZonePropertiesPanelProps {
  zone: SlideZone;
  onUpdateStyles: (styles: Partial<SlideZone['styles']>) => void;
  theme: SlideTheme;
}

const ZonePropertiesPanel: React.FC<ZonePropertiesPanelProps> = ({
  zone,
  onUpdateStyles,
  theme
}) => {
  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4">
      <h3 className="font-medium text-gray-900 mb-4">Zone Properties</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
          <input
            type="range"
            min="12"
            max="72"
            value={zone.styles.fontSize || 16}
            onChange={(e) => onUpdateStyles({ fontSize: Number(e.target.value) })}
            className="w-full"
          />
          <span className="text-sm text-gray-500">{zone.styles.fontSize || 16}px</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Text Color</label>
          <div className="grid grid-cols-5 gap-2">
            {Object.values(theme.colors).map((color, index) => (
              <button
                key={index}
                onClick={() => onUpdateStyles({ color })}
                className="w-8 h-8 rounded border"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Alignment</label>
          <div className="flex gap-1">
            {(['left', 'center', 'right'] as const).map(alignment => (
              <button
                key={alignment}
                onClick={() => onUpdateStyles({ alignment })}
                className={`flex-1 py-2 px-3 text-sm border rounded ${
                  zone.styles.alignment === alignment 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {alignment.charAt(0).toUpperCase() + alignment.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Font Family</label>
          <select
            value={zone.styles.fontFamily || theme.fonts.body}
            onChange={(e) => onUpdateStyles({ fontFamily: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="Inter">Inter</option>
            <option value="Arial">Arial</option>
            <option value="Georgia">Georgia</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Roboto">Roboto</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default SlideEditor;