import React, { useRef, useEffect, useState } from 'react';
import * as fabric from 'fabric';
import { 
  FiMove, FiType, FiImage, FiSquare, FiCircle, FiTriangle,
  FiPenTool, FiTrash2, FiCopy, FiRotateCw, FiZoomIn, FiZoomOut,
  FiUndo, FiRedo, FiLayers, FiBold, FiItalic, FiUnderline,
  FiAlignLeft, FiAlignCenter, FiAlignRight
} from 'react-icons/fi';
import { Slide } from '../../types/Presentation';

interface SlideCanvasEditorProps {
  slide: Slide;
  onCanvasSave: (canvasJson: string, dataUrl: string) => void;
}

const SlideCanvasEditor: React.FC<SlideCanvasEditorProps> = ({ slide, onCanvasSave }) => {
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [selectedTool, setSelectedTool] = useState<'select' | 'text' | 'rectangle' | 'circle' | 'line'>('select');
  const [textSettings, setTextSettings] = useState({
    fontSize: 20,
    fontFamily: 'Arial',
    fill: '#000000',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: ''
  });
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const canvasElement = canvasContainerRef.current.querySelector('canvas');
    if (canvasElement) {
      const canvas = new fabric.Canvas(canvasElement, {
        width: 800,
        height: 600,
        backgroundColor: '#ffffff'
      });

      canvasRef.current = canvas;

      // Load existing canvas data
      if (slide.canvas_json) {
        canvas.loadFromJSON(slide.canvas_json, () => {
          canvas.renderAll();
          saveState();
        });
      }

      // Event handlers
      canvas.on('path:created', saveState);
      canvas.on('object:added', saveState);
      canvas.on('object:removed', saveState);
      canvas.on('object:modified', saveState);

      return () => {
        canvas.dispose();
      };
    }
  }, [slide.canvas_json]);

  const saveState = () => {
    if (!canvasRef.current) return;
    
    const canvasState = JSON.stringify(canvasRef.current.toJSON());
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(canvasState);
      if (newHistory.length > 50) newHistory.shift(); // Limit history
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  };

  const undo = () => {
    if (historyIndex > 0 && canvasRef.current) {
      const prevState = history[historyIndex - 1];
      canvasRef.current.loadFromJSON(prevState, () => {
        canvasRef.current!.renderAll();
      });
      setHistoryIndex(prev => prev - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1 && canvasRef.current) {
      const nextState = history[historyIndex + 1];
      canvasRef.current.loadFromJSON(nextState, () => {
        canvasRef.current!.renderAll();
      });
      setHistoryIndex(prev => prev + 1);
    }
  };

  const addText = () => {
    if (!canvasRef.current) return;

    const text = new fabric.IText('Click to edit', {
      left: 100,
      top: 100,
      fontSize: textSettings.fontSize,
      fontFamily: textSettings.fontFamily,
      fill: textSettings.fill,
      fontWeight: textSettings.fontWeight,
      fontStyle: textSettings.fontStyle,
      underline: textSettings.textDecoration === 'underline'
    });

    canvasRef.current.add(text);
    canvasRef.current.setActiveObject(text);
    canvasRef.current.renderAll();
  };

  const addShape = (shapeType: 'rectangle' | 'circle' | 'triangle') => {
    if (!canvasRef.current) return;

    let shape: fabric.Object;

    switch (shapeType) {
      case 'rectangle':
        shape = new fabric.Rect({
          left: 100,
          top: 100,
          width: 150,
          height: 100,
          fill: 'rgba(0,0,255,0.3)',
          stroke: '#000000',
          strokeWidth: 2
        });
        break;
      case 'circle':
        shape = new fabric.Circle({
          left: 100,
          top: 100,
          radius: 50,
          fill: 'rgba(255,0,0,0.3)',
          stroke: '#000000',
          strokeWidth: 2
        });
        break;
      case 'triangle':
        shape = new fabric.Triangle({
          left: 100,
          top: 100,
          width: 100,
          height: 100,
          fill: 'rgba(0,255,0,0.3)',
          stroke: '#000000',
          strokeWidth: 2
        });
        break;
      default:
        return;
    }

    canvasRef.current.add(shape);
    canvasRef.current.setActiveObject(shape);
    canvasRef.current.renderAll();
  };

  const deleteSelected = () => {
    if (!canvasRef.current) return;

    const activeObjects = canvasRef.current.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach(obj => canvasRef.current!.remove(obj));
      canvasRef.current.discardActiveObject();
      canvasRef.current.renderAll();
    }
  };

  const duplicateSelected = () => {
    if (!canvasRef.current) return;

    const activeObject = canvasRef.current.getActiveObject();
    if (activeObject) {
      activeObject.clone((cloned: fabric.Object) => {
        cloned.set({
          left: (cloned.left || 0) + 20,
          top: (cloned.top || 0) + 20,
        });
        canvasRef.current!.add(cloned);
        canvasRef.current!.setActiveObject(cloned);
        canvasRef.current!.renderAll();
      });
    }
  };

  const alignObjects = (alignment: 'left' | 'center' | 'right') => {
    if (!canvasRef.current) return;

    const activeObjects = canvasRef.current.getActiveObjects();
    if (activeObjects.length === 0) return;

    const canvasWidth = canvasRef.current.getWidth();

    activeObjects.forEach(obj => {
      switch (alignment) {
        case 'left':
          obj.set('left', 0);
          break;
        case 'center':
          obj.set('left', (canvasWidth - (obj.width || 0) * (obj.scaleX || 1)) / 2);
          break;
        case 'right':
          obj.set('left', canvasWidth - (obj.width || 0) * (obj.scaleX || 1));
          break;
      }
    });

    canvasRef.current.renderAll();
  };

  const handleSave = () => {
    if (!canvasRef.current) return;

    const canvasJson = JSON.stringify(canvasRef.current.toJSON());
    const dataUrl = canvasRef.current.toDataURL();
    onCanvasSave(canvasJson, dataUrl);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canvasRef.current) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgUrl = event.target?.result as string;
      fabric.Image.fromURL(imgUrl, (img) => {
        img.set({
          left: 100,
          top: 100,
          scaleX: 0.5,
          scaleY: 0.5
        });
        canvasRef.current!.add(img);
        canvasRef.current!.renderAll();
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex h-96 bg-gray-100 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="w-16 bg-white border-r border-gray-200 flex flex-col">
        {/* Tool Buttons */}
        <div className="p-2 space-y-2">
          <button
            onClick={() => setSelectedTool('select')}
            className={`w-10 h-10 flex items-center justify-center rounded ${
              selectedTool === 'select' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
            }`}
            title="Select"
          >
            <FiMove size={16} />
          </button>
          
          <button
            onClick={addText}
            className="w-10 h-10 flex items-center justify-center rounded hover:bg-gray-100"
            title="Add Text"
          >
            <FiType size={16} />
          </button>
          
          <label className="w-10 h-10 flex items-center justify-center rounded hover:bg-gray-100 cursor-pointer"
                 title="Add Image">
            <FiImage size={16} />
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
          
          <button
            onClick={() => addShape('rectangle')}
            className="w-10 h-10 flex items-center justify-center rounded hover:bg-gray-100"
            title="Add Rectangle"
          >
            <FiSquare size={16} />
          </button>
          
          <button
            onClick={() => addShape('circle')}
            className="w-10 h-10 flex items-center justify-center rounded hover:bg-gray-100"
            title="Add Circle"
          >
            <FiCircle size={16} />
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-2"></div>

        {/* Action Buttons */}
        <div className="p-2 space-y-2">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="w-10 h-10 flex items-center justify-center rounded hover:bg-gray-100 disabled:opacity-50"
            title="Undo"
          >
            <FiUndo size={16} />
          </button>
          
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="w-10 h-10 flex items-center justify-center rounded hover:bg-gray-100 disabled:opacity-50"
            title="Redo"
          >
            <FiRedo size={16} />
          </button>
          
          <button
            onClick={duplicateSelected}
            className="w-10 h-10 flex items-center justify-center rounded hover:bg-gray-100"
            title="Duplicate"
          >
            <FiCopy size={16} />
          </button>
          
          <button
            onClick={deleteSelected}
            className="w-10 h-10 flex items-center justify-center rounded hover:bg-gray-100 text-red-600"
            title="Delete"
          >
            <FiTrash2 size={16} />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="bg-white border-b border-gray-200 p-2 flex items-center gap-2">
          {/* Text Formatting */}
          <div className="flex items-center gap-1">
            <select
              value={textSettings.fontFamily}
              onChange={(e) => setTextSettings(prev => ({ ...prev, fontFamily: e.target.value }))}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Times New Roman">Times</option>
              <option value="Georgia">Georgia</option>
            </select>
            
            <input
              type="number"
              value={textSettings.fontSize}
              onChange={(e) => setTextSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
              className="w-12 text-xs border border-gray-300 rounded px-1 py-1"
              min="8"
              max="72"
            />
            
            <button
              onClick={() => setTextSettings(prev => ({ 
                ...prev, 
                fontWeight: prev.fontWeight === 'bold' ? 'normal' : 'bold' 
              }))}
              className={`p-1 rounded ${textSettings.fontWeight === 'bold' ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
            >
              <FiBold size={14} />
            </button>
            
            <button
              onClick={() => setTextSettings(prev => ({ 
                ...prev, 
                fontStyle: prev.fontStyle === 'italic' ? 'normal' : 'italic' 
              }))}
              className={`p-1 rounded ${textSettings.fontStyle === 'italic' ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
            >
              <FiItalic size={14} />
            </button>
            
            <input
              type="color"
              value={textSettings.fill}
              onChange={(e) => setTextSettings(prev => ({ ...prev, fill: e.target.value }))}
              className="w-6 h-6 border border-gray-300 rounded"
            />
          </div>

          <div className="w-px h-6 bg-gray-300"></div>

          {/* Alignment */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => alignObjects('left')}
              className="p-1 rounded hover:bg-gray-100"
              title="Align Left"
            >
              <FiAlignLeft size={14} />
            </button>
            <button
              onClick={() => alignObjects('center')}
              className="p-1 rounded hover:bg-gray-100"
              title="Align Center"
            >
              <FiAlignCenter size={14} />
            </button>
            <button
              onClick={() => alignObjects('right')}
              className="p-1 rounded hover:bg-gray-100"
              title="Align Right"
            >
              <FiAlignRight size={14} />
            </button>
          </div>

          <div className="ml-auto">
            <button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium"
            >
              Save Canvas
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div 
          ref={canvasContainerRef} 
          className="flex-1 flex items-center justify-center bg-gray-50 p-4"
        >
          <canvas 
            width={800} 
            height={600} 
            className="border border-gray-300 bg-white shadow-sm"
          />
        </div>
      </div>
    </div>
  );
};

export default SlideCanvasEditor;