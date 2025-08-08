import React, { useState, useRef, useEffect } from 'react';
import { 
  FiType, FiImage, FiBarChart, FiTrendingUp, FiGitBranch, FiClock, FiZap, FiSave,
  FiMove, FiLayers, FiSettings
} from 'react-icons/fi';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'react-toastify';
import DiagramConverter from './DiagramConverter';

interface DocumentEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  onSave: () => void;
  presentationId?: number;
  enableSectionManagement?: boolean;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  selectedText: string;
  range: Range | null;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({ content, onContentChange, onSave }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showDiagramConverter, setShowDiagramConverter] = useState(false);
  const [selectedTextForConversion, setSelectedTextForConversion] = useState('');
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    selectedText: '',
    range: null
  });

  const diagramTypes = [
    { type: 'flowchart', icon: <FiGitBranch />, label: 'Flowchart', description: 'Process flow diagram' },
    { type: 'chart', icon: <FiBarChart />, label: 'Chart', description: 'Bar, pie, or line chart' },
    { type: 'timeline', icon: <FiClock />, label: 'Timeline', description: 'Chronological events' },
    { type: 'mindmap', icon: <FiZap />, label: 'Mind Map', description: 'Concept relationships' },
    { type: 'infographic', icon: <FiTrendingUp />, label: 'Infographic', description: 'Visual data story' }
  ];

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const editorRect = editorRef.current?.getBoundingClientRect();
        
        if (editorRect && rect.width > 0) {
          setTooltip({
            visible: true,
            x: rect.left - editorRect.left + rect.width / 2,
            y: rect.top - editorRect.top - 10,
            selectedText: selection.toString(),
            range: range.cloneRange()
          });
        }
      } else {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (editorRef.current && !editorRef.current.contains(e.target as Node)) {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
    };

    document.addEventListener('selectionchange', handleSelection);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('selectionchange', handleSelection);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleContentChange = (e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.innerHTML;
    onContentChange(newContent);
  };

  const convertToDiagram = async (type: string) => {
    if (!tooltip.selectedText || !tooltip.range) return;

    setSelectedTextForConversion(tooltip.selectedText);
    setShowDiagramConverter(true);
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  const handleDiagramCreated = (diagramData: { preview_url: string; name: string }) => {
      if (!tooltip.range) return;
  
      try {
        const diagramId = `diagram-${Date.now()}`;
        const diagramElement = document.createElement('div');
        diagramElement.className = 'diagram-container';
        diagramElement.innerHTML = `
          <div class="diagram-result bg-white border border-gray-200 rounded-lg p-4 my-4">
            <img src="${diagramData.preview_url}" alt="${diagramData.name}" class="w-full h-auto rounded" />
            <div class="mt-2 flex justify-between items-center">
              <span class="text-sm text-gray-600">${diagramData.name}</span>
              <button class="text-blue-600 hover:text-blue-800 text-sm">Edit Diagram</button>
            </div>
          </div>
        `;
  
        // Replace selected text with diagram
        tooltip.range.deleteContents();
        tooltip.range.insertNode(diagramElement);
  
        // Update content
        if (editorRef.current) {
          onContentChange(editorRef.current.innerHTML);
        }
      } catch (error) {
        toast.error('Failed to insert diagram');
      }
    };

  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onContentChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="relative w-full h-full bg-white">
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-3 flex items-center gap-2 bg-gray-50">
        <button
          onClick={() => formatText('bold')}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          onClick={() => formatText('italic')}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Italic"
        >
          <em>I</em>
        </button>
        <button
          onClick={() => formatText('underline')}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Underline"
        >
          <u>U</u>
        </button>
        <div className="w-px h-6 bg-gray-300 mx-2"></div>
        <select
          onChange={(e) => formatText('fontSize', e.target.value)}
          className="px-2 py-1 border border-gray-300 rounded text-sm"
          defaultValue="3"
        >
          <option value="1">Small</option>
          <option value="3">Normal</option>
          <option value="5">Large</option>
          <option value="7">Extra Large</option>
        </select>
        <div className="w-px h-6 bg-gray-300 mx-2"></div>
        <button
          onClick={() => formatText('insertUnorderedList')}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Bullet List"
        >
          •
        </button>
        <button
          onClick={() => formatText('insertOrderedList')}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Numbered List"
        >
          1.
        </button>
        <div className="flex-1"></div>
        <button
          onClick={onSave}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          <FiSave size={16} />
          Save
        </button>
      </div>

      {/* Editor */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleContentChange}
          dangerouslySetInnerHTML={{ __html: content }}
          className="p-6 min-h-[500px] focus:outline-none prose prose-lg max-w-none"
          style={{ lineHeight: '1.6' }}
        />

        {/* Conversion Tooltip */}
        {tooltip.visible && (
          <div
            className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[300px]"
            style={{
              left: tooltip.x - 150,
              top: tooltip.y - 10,
              
              transform: 'translateY(-100%)'
            }}
          >
            <div className="text-sm font-medium text-gray-700 mb-2">
              Convert "{tooltip.selectedText.substring(0, 30)}..." to:
            </div>
            <div className="grid grid-cols-2 gap-2">
              {diagramTypes.map((diagram) => (
                <button
                  key={diagram.type}
                  onClick={() => convertToDiagram(diagram.type)}
                  className="flex items-center gap-2 p-2 text-left hover:bg-gray-100 rounded transition-colors"
                  title={diagram.description}
                >
                  <span className="text-blue-600">{diagram.icon}</span>
                  <div>
                    <div className="text-sm font-medium">{diagram.label}</div>
                    <div className="text-xs text-gray-500">{diagram.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Diagram Converter Modal */}
      {showDiagramConverter && (
        <DiagramConverter
          selectedText={selectedTextForConversion}
          onDiagramCreated={handleDiagramCreated}
          onClose={() => setShowDiagramConverter(false)}
        />
      )}
    </div>
  );
};

export default DocumentEditor;