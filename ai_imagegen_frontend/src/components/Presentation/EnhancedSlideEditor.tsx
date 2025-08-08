import React, { useState, useRef, useEffect } from 'react';
import * as fabric from 'fabric';
import { 
  FiType, FiImage, FiSquare, FiCircle, FiArrowRight, FiSave, FiPlay,
  FiLayers, FiSettings, FiZap, FiGrid, FiMove, FiRotateCw, FiDownload
} from 'react-icons/fi';
import { Slide } from '../../types/Presentation';
import ContentImportPanel from './ContentImportPanel';
import { toast } from 'react-toastify';

interface EnhancedSlideEditorProps {
  slide: Slide;
  onSlideUpdate: (slide: Slide) => void;
  userImages?: string[];
  userDiagrams?: any[];
  isReadOnly?: boolean;
}

interface SlideTemplate {
  id: string;
  name: string;
  thumbnail: string;
  layout: any;
}

const slideTemplates: SlideTemplate[] = [
  {
    id: 'title',
    name: 'Title Slide',
    thumbnail: '/templates/title-slide.png',
    layout: { type: 'title', elements: ['title', 'subtitle'] }
  },
  {
    id: 'content',
    name: 'Content Slide',
    thumbnail: '/templates/content-slide.png',
    layout: { type: 'content', elements: ['title', 'content', 'image'] }
  },
  {
    id: 'two-column',
    name: 'Two Column',
    thumbnail: '/templates/two-column.png',
    layout: { type: 'two-column', elements: ['title', 'left-content', 'right-content'] }
  },
  {
    id: 'image-focus',
    name: 'Image Focus',
    thumbnail: '/templates/image-focus.png',
    layout: { type: 'image-focus', elements: ['large-image', 'caption'] }
  }
];

const EnhancedSlideEditor: React.FC<EnhancedSlideEditorProps> = ({
  slide,
  onSlideUpdate,
  userImages = [],
  userDiagrams = [],
  isReadOnly = false
}) => {
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedTool, setSelectedTool] = useState('select');
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAnimations, setShowAnimations] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [layers, setLayers] = useState<fabric.Object[]>([]);
  const [slideSettings, setSlideSettings] = useState({
    background: '#ffffff',
    theme: 'professional',
    transition: 'fade'
  });

  useEffect(() => {
    if (!canvasElRef.current) return;

    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: 1024,
      height: 768,
      backgroundColor: slideSettings.background,
      preserveObjectStacking: true
    });

    canvasRef.current = canvas;

    // Load existing canvas content
    if (slide.canvas_json) {
      try {
        canvas.loadFromJSON(slide.canvas_json, () => {
          canvas.renderAll();
          updateLayers();
        });
      } catch (error) {
        console.error('Failed to load canvas JSON:', error);
      }
    }

    // Canvas event listeners
    canvas.on('selection:created', handleObjectSelection);
    canvas.on('selection:updated', handleObjectSelection);
    canvas.on('selection:cleared', () => setSelectedObject(null));
    canvas.on('object:added', updateLayers);
    canvas.on('object:removed', updateLayers);

    return () => {
      canvas.dispose();
    };
  }, [slide.id]);

  const handleObjectSelection = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const activeObject = canvas.getActiveObject();
    setSelectedObject(activeObject || null);
  };

  const updateLayers = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const objects = canvas.getObjects().slice().reverse();
    setLayers(objects);
  };

  const addTextElement = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const text = new fabric.Textbox('Click to edit text', {
      left: 100,
      top: 100,
      fontSize: 24,
      fontFamily: 'Arial',
      fill: '#333333',
      width: 300,
      editable: true
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const addImageElement = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create placeholder for image
    const rect = new fabric.Rect({
      left: 200,
      top: 200,
      width: 300,
      height: 200,
      fill: '#f0f0f0',
      stroke: '#cccccc',
      strokeDashArray: [5, 5]
    });

    const text = new fabric.Text('Click to add image', {
      left: 350,
      top: 300,
      fontSize: 16,
      fill: '#666666',
      originX: 'center',
      originY: 'center'
    });

    const group = new fabric.Group([rect, text], {
      left: 200,
      top: 200
    });

    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
  };

  const addShapeElement = (shapeType: 'rectangle' | 'circle' | 'arrow') => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let shape: fabric.Object;

    switch (shapeType) {
      case 'rectangle':
        shape = new fabric.Rect({
          left: 150,
          top: 150,
          width: 200,
          height: 100,
          fill: '#4F46E5',
          stroke: '#312E81',
          strokeWidth: 2
        });
        break;
      case 'circle':
        shape = new fabric.Circle({
          left: 150,
          top: 150,
          radius: 50,
          fill: '#10B981',
          stroke: '#047857',
          strokeWidth: 2
        });
        break;
      case 'arrow':
        const line = new fabric.Line([50, 50, 150, 50], {
          stroke: '#EF4444',
          strokeWidth: 3
        });
        const triangle = new fabric.Triangle({
          left: 150,
          top: 50,
          width: 20,
          height: 20,
          fill: '#EF4444',
          originX: 'center',
          originY: 'center'
        });
        shape = new fabric.Group([line, triangle]);
        break;
      default:
        return;
    }

    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.renderAll();
  };

  const applySlideTemplate = (template: SlideTemplate) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.clear();
    
    // Apply template layout
    switch (template.id) {
      case 'title':
        addTextElement();
        // Position as title
        const titleText = canvas.getActiveObject() as fabric.Textbox;
        if (titleText) {
          titleText.set({
            left: canvas.width! / 2,
            top: canvas.height! / 3,
            fontSize: 48,
            fontWeight: 'bold',
            textAlign: 'center',
            originX: 'center'
          });
          titleText.text = 'Slide Title';
        }
        break;
      case 'content':
        // Add title
        addTextElement();
        const contentTitle = canvas.getActiveObject() as fabric.Textbox;
        if (contentTitle) {
          contentTitle.set({
            left: 50,
            top: 50,
            fontSize: 36,
            fontWeight: 'bold'
          });
          contentTitle.text = 'Content Title';
        }
        
        // Add content area
        addTextElement();
        const contentText = canvas.getActiveObject() as fabric.Textbox;
        if (contentText) {
          contentText.set({
            left: 50,
            top: 150,
            width: 500,
            fontSize: 18
          });
          contentText.text = 'Your content goes here...';
        }
        break;
      // Add more template cases
    }

    canvas.renderAll();
    setShowTemplates(false);
    toast.success(`Applied ${template.name} template`);
  };

//   const insertUserImage = (imageUrl: string) => {
//     const canvas = canvasRef.current;
//     if (!canvas || !fabric) return;

//     fabric.Image.fromURL(
//         imageUrl,
//         (img: fabric.Image) => {
//         if (!img) {
//             console.error("Failed to load image:", imageUrl);
//             return;
//         }
//         img.set({
//             left: 100,
//             top: 100,
//             scaleX: 0.5,
//             scaleY: 0.5
//         });
//         canvas.add(img);
//         canvas.setActiveObject(img);
//         canvas.renderAll();
//         },
//         { crossOrigin: "anonymous" }
//     );
//     };

  const saveSlide = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const canvasJSON = JSON.stringify(canvas.toJSON());
      const dataURL = canvas.toDataURL({
          format: 'png', quality: 1.0,
          multiplier: 0
      });
      
      const updatedSlide = {
        ...slide,
        canvas_json: canvasJSON,
        updated_at: new Date().toISOString()
      };

      onSlideUpdate(updatedSlide);
      toast.success('Slide saved successfully!');
    } catch (error) {
      toast.error('Failed to save slide');
      console.error('Save error:', error);
    }
  };

  const previewSlide = () => {
    // Implementation for slide preview
    toast.info('Opening slide preview...');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Slide Toolbar */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Tool Selection */}
            <div className="flex items-center gap-2 border-r border-gray-300 pr-4">
              <button
                onClick={() => setSelectedTool('select')}
                className={`p-2 rounded ${selectedTool === 'select' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
                title="Select"
              >
                <FiMove />
              </button>
              <button
                onClick={addTextElement}
                className="p-2 rounded hover:bg-gray-100"
                title="Add Text"
              >
                <FiType />
              </button>
              <button
                onClick={addImageElement}
                className="p-2 rounded hover:bg-gray-100"
                title="Add Image"
              >
                <FiImage />
              </button>
              <button
                onClick={() => addShapeElement('rectangle')}
                className="p-2 rounded hover:bg-gray-100"
                title="Add Rectangle"
              >
                <FiSquare />
              </button>
              <button
                onClick={() => addShapeElement('circle')}
                className="p-2 rounded hover:bg-gray-100"
                title="Add Circle"
              >
                <FiCircle />
              </button>
              <button
                onClick={() => addShapeElement('arrow')}
                className="p-2 rounded hover:bg-gray-100"
                title="Add Arrow"
              >
                <FiArrowRight />
              </button>
            </div>

            {/* Layout Templates */}
            <div className="relative">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                <FiGrid />
                Templates
              </button>
              
              {showTemplates && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                  <div className="p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Slide Templates</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {slideTemplates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => applySlideTemplate(template)}
                          className="flex flex-col items-center p-3 border border-gray-200 rounded hover:border-blue-500 hover:bg-blue-50 transition-colors"
                        >
                          <div className="w-16 h-12 bg-gray-100 rounded mb-2 flex items-center justify-center">
                            <FiGrid className="text-gray-400" />
                          </div>
                          <span className="text-xs text-gray-700">{template.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Content */}
            {(userImages.length > 0 || userDiagrams.length > 0) && (
              <div className="relative">
                <button
                  onClick={() => setShowImportPanel(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  <FiDownload />
                  Import Content
                </button>
              </div>
            )}
          </div>

          {/* Slide Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAnimations(!showAnimations)}
              className="flex items-center gap-2 px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              <FiZap />
              Animations
            </button>
            <button
              onClick={previewSlide}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              <FiPlay />
              Preview
            </button>
            <button
              onClick={saveSlide}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              <FiSave />
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex">
        {/* Canvas Area */}
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="relative">
            <canvas
              ref={canvasElRef}
              className="border border-gray-300 rounded-lg shadow-lg bg-white"
            />
            
            {/* Canvas Overlay Controls */}
            {selectedObject && (
              <div className="absolute top-2 right-2 bg-white rounded-lg shadow-md p-2 flex gap-2">
                <button
                  onClick={() => {
                    if (selectedObject) {
                      selectedObject.set('angle', (selectedObject.angle || 0) + 15);
                      canvasRef.current?.renderAll();
                    }
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Rotate"
                >
                  <FiRotateCw size={14} />
                </button>
                <button
                  onClick={() => {
                    if (selectedObject && canvasRef.current) {
                      canvasRef.current.remove(selectedObject);
                      canvasRef.current.renderAll();
                    }
                  }}
                  className="p-1 hover:bg-gray-100 rounded text-red-600"
                  title="Delete"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Import Panel Modal */}
        {showImportPanel && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Import Content to Slide</h2>
                <button
                  onClick={() => setShowImportPanel(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <ContentImportPanel
                  presentationId={slide.presentation}
                  onContentImported={(importedContent) => {
                    // Handle imported content in slide
                    toast.success('Content imported to slide!');
                    setShowImportPanel(false);
                  }}
                  targetPosition={{ slideIndex: slide.order }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Properties Panel */}
        <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
          <div className="space-y-6">
            {/* Slide Settings */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FiSettings />
                Slide Settings
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Background
                  </label>
                  <input
                    type="color"
                    value={slideSettings.background}
                    onChange={(e) => {
                      setSlideSettings(prev => ({ ...prev, background: e.target.value }));
                      if (canvasRef.current) {
                        canvasRef.current.backgroundColor = e.target.value;
                        canvasRef.current.renderAll();
                      }
                    }}
                    className="w-full h-10 rounded border border-gray-300"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Theme
                  </label>
                  <select
                    value={slideSettings.theme}
                    onChange={(e) => setSlideSettings(prev => ({ ...prev, theme: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="professional">Professional</option>
                    <option value="creative">Creative</option>
                    <option value="minimal">Minimal</option>
                    <option value="academic">Academic</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Object Properties */}
            {selectedObject && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Object Properties</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600">X Position</label>
                      <input
                        type="number"
                        value={Math.round(selectedObject.left || 0)}
                        onChange={(e) => {
                          selectedObject.set('left', parseInt(e.target.value));
                          canvasRef.current?.renderAll();
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Y Position</label>
                      <input
                        type="number"
                        value={Math.round(selectedObject.top || 0)}
                        onChange={(e) => {
                          selectedObject.set('top', parseInt(e.target.value));
                          canvasRef.current?.renderAll();
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>

                  {selectedObject.type === 'textbox' && (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-gray-600">Font Size</label>
                        <input
                          type="number"
                          value={(selectedObject as fabric.Textbox).fontSize || 20}
                          onChange={(e) => {
                            (selectedObject as fabric.Textbox).set('fontSize', parseInt(e.target.value));
                            canvasRef.current?.renderAll();
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600">Text Color</label>
                        <input
                          type="color"
                          value={selectedObject.fill as string || '#000000'}
                          onChange={(e) => {
                            selectedObject.set('fill', e.target.value);
                            canvasRef.current?.renderAll();
                          }}
                          className="w-full h-8 rounded border border-gray-300"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Layers Panel */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FiLayers />
                Layers
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {layers.map((obj, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      canvasRef.current?.setActiveObject(obj);
                      canvasRef.current?.renderAll();
                    }}
                    className={`p-2 rounded cursor-pointer text-sm ${
                      selectedObject === obj ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'
                    }`}
                  >
                    {(obj as any).layerLabel || `${obj.type} ${index + 1}`}
                  </div>
                ))}
              </div>
            </div>

            {/* Animation Panel */}
            {showAnimations && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FiZap />
                  Animations
                </h3>
                <div className="space-y-2">
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option>Fade In</option>
                    <option>Slide In</option>
                    <option>Zoom In</option>
                    <option>Bounce</option>
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600">Duration (ms)</label>
                      <input
                        type="number"
                        defaultValue={1000}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Delay (ms)</label>
                      <input
                        type="number"
                        defaultValue={0}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>
                  <button className="w-full bg-yellow-600 text-white py-2 rounded hover:bg-yellow-700 text-sm">
                    Add Animation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  function insertUserDiagram(diagram: any) {
    // Implementation for inserting user diagrams
    toast.info('Inserting diagram...');
  }
};

export default EnhancedSlideEditor;