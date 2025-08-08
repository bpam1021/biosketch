import React, { useState, useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  FiMove, FiEdit3, FiTrash2, FiBarChart, FiImage, FiCopy,
  FiChevronDown, FiChevronUp, FiSettings, FiZap
} from 'react-icons/fi';
import { SectionData, ConversionOptions, DiagramTemplate } from '../../types/Presentation';
import { convertSectionToDiagram, getDiagramTemplates } from '../../api/presentationApi';
import { toast } from 'react-toastify';

interface SectionEditorProps {
  sections: SectionData[];
  onSectionsChange: (sections: SectionData[]) => void;
  onSectionConvert: (sectionId: string, diagramElement: any) => void;
  importableImages?: string[];
  importableDiagrams?: any[];
}

const SectionEditor: React.FC<SectionEditorProps> = ({
  sections,
  onSectionsChange,
  onSectionConvert,
  importableImages = [],
  importableDiagrams = []
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [showConversionModal, setShowConversionModal] = useState<string | null>(null);
  const [diagramTemplates, setDiagramTemplates] = useState<DiagramTemplate[]>([]);
  const [conversionOptions, setConversionOptions] = useState<ConversionOptions>({
    diagram_type: 'flowchart',
    template: '',
    style: {
      theme: 'professional',
      colorScheme: ['#3B82F6', '#10B981', '#F59E0B'],
      fontSize: 14,
      spacing: 20
    },
    auto_layout: true
  });

  useEffect(() => {
    loadDiagramTemplates();
  }, []);

  const loadDiagramTemplates = async () => {
    try {
      const templates = await getDiagramTemplates();
      setDiagramTemplates(templates);
    } catch (error) {
      console.error('Failed to load diagram templates:', error);
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const reordered = Array.from(sections);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    // Update order property
    const updatedSections = reordered.map((section, index) => ({
      ...section,
      order: index
    }));

    onSectionsChange(updatedSections);
  };

  const toggleSectionExpansion = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const updateSection = (sectionId: string, updates: Partial<SectionData>) => {
    const updatedSections = sections.map(section =>
      section.id === sectionId ? { ...section, ...updates } : section
    );
    onSectionsChange(updatedSections);
  };

  const deleteSection = (sectionId: string) => {
    if (confirm('Are you sure you want to delete this section?')) {
      const filteredSections = sections.filter(section => section.id !== sectionId);
      onSectionsChange(filteredSections);
    }
  };

  const duplicateSection = (section: SectionData) => {
    const newSection: SectionData = {
      ...section,
      id: `section_${Date.now()}`,
      title: `${section.title} (Copy)`,
      order: sections.length
    };
    onSectionsChange([...sections, newSection]);
  };

  const handleConvertToDiagram = async (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    try {
      const result = await convertSectionToDiagram(sectionId, conversionOptions);
      onSectionConvert(sectionId, result.diagram_element);
      setShowConversionModal(null);
      toast.success('Section converted to diagram successfully!');
    } catch (error) {
      toast.error('Failed to convert section to diagram');
      console.error('Conversion error:', error);
    }
  };

  const insertImportableImage = (sectionId: string, imageUrl: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const imageHtml = `<img src="${imageUrl}" alt="Imported image" class="max-w-full h-auto rounded-lg my-4" />`;
    const updatedContent = section.content + '\n\n' + imageHtml;
    
    updateSection(sectionId, { content: updatedContent });
    toast.success('Image imported successfully!');
  };

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'heading': return '📝';
      case 'paragraph': return '📄';
      case 'list': return '📋';
      case 'table': return '📊';
      case 'image': return '🖼️';
      case 'diagram': return '📈';
      default: return '📝';
    }
  };

  return (
    <div className="space-y-4">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="sections">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
              {sections.map((section, index) => (
                <Draggable key={section.id} draggableId={section.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`bg-white border border-gray-200 rounded-lg shadow-sm transition-all ${
                        snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-400' : 'hover:shadow-md'
                      }`}
                    >
                      {/* Section Header */}
                      <div className="flex items-center justify-between p-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div {...provided.dragHandleProps} className="cursor-grab p-1 hover:bg-gray-100 rounded">
                            <FiMove className="text-gray-400" />
                          </div>
                          <span className="text-lg">{getSectionIcon(section.type)}</span>
                          <div>
                            <h3 className="font-semibold text-gray-900">{section.title}</h3>
                            <p className="text-sm text-gray-500 capitalize">{section.type}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowConversionModal(section.id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Convert to diagram"
                          >
                            <FiBarChart />
                          </button>
                          <button
                            onClick={() => setEditingSection(editingSection === section.id ? null : section.id)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="Edit section"
                          >
                            <FiEdit3 />
                          </button>
                          <button
                            onClick={() => duplicateSection(section)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Duplicate section"
                          >
                            <FiCopy />
                          </button>
                          <button
                            onClick={() => deleteSection(section.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete section"
                          >
                            <FiTrash2 />
                          </button>
                          <button
                            onClick={() => toggleSectionExpansion(section.id)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          >
                            {expandedSections.has(section.id) ? <FiChevronUp /> : <FiChevronDown />}
                          </button>
                        </div>
                      </div>

                      {/* Section Content */}
                      {expandedSections.has(section.id) && (
                        <div className="p-4">
                          {editingSection === section.id ? (
                            <div className="space-y-4">
                              <input
                                type="text"
                                value={section.title}
                                onChange={(e) => updateSection(section.id, { title: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Section title"
                              />
                              <textarea
                                value={section.content}
                                onChange={(e) => updateSection(section.id, { content: e.target.value })}
                                rows={6}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                                placeholder="Section content"
                              />
                              
                              {/* Import Options */}
                              {importableImages.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-2">Import Images</h4>
                                  <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                                    {importableImages.slice(0, 8).map((imageUrl, idx) => (
                                      <button
                                        key={idx}
                                        onClick={() => insertImportableImage(section.id, imageUrl)}
                                        className="aspect-square rounded overflow-hidden hover:ring-2 hover:ring-blue-500"
                                      >
                                        <img
                                          src={imageUrl}
                                          alt={`Import ${idx + 1}`}
                                          className="w-full h-full object-cover"
                                        />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="flex gap-2">
                                <button
                                  onClick={() => setEditingSection(null)}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                >
                                  Save Changes
                                </button>
                                <button
                                  onClick={() => setEditingSection(null)}
                                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="prose prose-sm max-w-none">
                              <div dangerouslySetInnerHTML={{ __html: section.content }} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Conversion Modal */}
      {showConversionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Convert to Diagram</h2>
              <button
                onClick={() => setShowConversionModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Diagram Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Diagram Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'flowchart', label: 'Flowchart', icon: '🔄' },
                    { value: 'mindmap', label: 'Mind Map', icon: '🧠' },
                    { value: 'timeline', label: 'Timeline', icon: '⏰' },
                    { value: 'chart', label: 'Chart', icon: '📊' },
                    { value: 'infographic', label: 'Infographic', icon: '📈' },
                    { value: 'process', label: 'Process', icon: '⚙️' }
                  ].map((type) => (
                    <label key={type.value} className="cursor-pointer">
                      <input
                        type="radio"
                        name="diagram_type"
                        value={type.value}
                        checked={conversionOptions.diagram_type === type.value}
                        onChange={(e) => setConversionOptions(prev => ({ 
                          ...prev, 
                          diagram_type: e.target.value as any 
                        }))}
                        className="sr-only"
                      />
                      <div className={`border-2 rounded-lg p-3 text-center transition-all ${
                        conversionOptions.diagram_type === type.value 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <div className="text-2xl mb-1">{type.icon}</div>
                        <div className="text-sm font-medium">{type.label}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Template
                </label>
                <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto">
                  {diagramTemplates
                    .filter(t => t.type === conversionOptions.diagram_type)
                    .map((template) => (
                      <label key={template.id} className="cursor-pointer">
                        <input
                          type="radio"
                          name="template"
                          value={template.id}
                          checked={conversionOptions.template === template.id}
                          onChange={(e) => setConversionOptions(prev => ({ 
                            ...prev, 
                            template: e.target.value 
                          }))}
                          className="sr-only"
                        />
                        <div className={`border-2 rounded-lg p-3 transition-all ${
                          conversionOptions.template === template.id 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}>
                          <img
                            src={template.preview}
                            alt={template.name}
                            className="w-full h-20 object-cover rounded mb-2"
                          />
                          <div className="text-sm font-medium">{template.name}</div>
                          <div className="text-xs text-gray-600">{template.description}</div>
                        </div>
                      </label>
                    ))}
                </div>
              </div>

              {/* Style Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Style Options
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Theme</label>
                    <select
                      value={conversionOptions.style.theme}
                      onChange={(e) => setConversionOptions(prev => ({
                        ...prev,
                        style: { ...prev.style, theme: e.target.value as any }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="professional">Professional</option>
                      <option value="creative">Creative</option>
                      <option value="minimal">Minimal</option>
                      <option value="academic">Academic</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Font Size</label>
                    <input
                      type="number"
                      min="10"
                      max="24"
                      value={conversionOptions.style.fontSize}
                      onChange={(e) => setConversionOptions(prev => ({
                        ...prev,
                        style: { ...prev.style, fontSize: parseInt(e.target.value) }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Auto Layout */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="auto_layout"
                  checked={conversionOptions.auto_layout}
                  onChange={(e) => setConversionOptions(prev => ({ 
                    ...prev, 
                    auto_layout: e.target.checked 
                  }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="auto_layout" className="text-sm text-gray-700">
                  Use automatic layout optimization
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowConversionModal(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleConvertToDiagram(showConversionModal)}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <FiZap size={16} />
                  Convert to Diagram
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SectionEditor;