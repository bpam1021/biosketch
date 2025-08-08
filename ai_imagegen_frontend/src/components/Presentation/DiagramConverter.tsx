import React, { useState, useEffect } from 'react';
import { FiBarChart, FiZap, FiSettings, FiEye, FiDownload } from 'react-icons/fi';
import { convertTextToDiagram, getDiagramTemplates } from '../../api/presentationApi';
import { ConversionOptions, DiagramTemplate, DiagramStyle } from '../../types/Presentation';
import { toast } from 'react-toastify';

interface DiagramConverterProps {
  selectedText: string;
  onDiagramCreated: (diagramElement: any) => void;
  onClose: () => void;
}

const DiagramConverter: React.FC<DiagramConverterProps> = ({
  selectedText,
  onDiagramCreated,
  onClose
}) => {
  const [templates, setTemplates] = useState<DiagramTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [options, setOptions] = useState<ConversionOptions>({
    diagram_type: 'flowchart',
    template: '',
    style: {
      theme: 'professional',
      colorScheme: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
      fontSize: 14,
      spacing: 20
    },
    auto_layout: true
  });

  useEffect(() => {
    loadTemplates();
  }, [options.diagram_type]);

  const loadTemplates = async () => {
    try {
      const data = await getDiagramTemplates(options.diagram_type);
      setTemplates(data);
      if (data.length > 0 && !options.template) {
        setOptions(prev => ({ ...prev, template: data[0].id }));
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handlePreview = async () => {
    setLoading(true);
    try {
      const result = await convertTextToDiagram(selectedText, options);
      setPreviewUrl(result.diagram_url);
    } catch (error) {
      toast.error('Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async () => {
    setLoading(true);
    try {
      const result = await convertTextToDiagram(selectedText, options);
      onDiagramCreated(result.diagram_element);
      onClose();
      toast.success('Diagram created successfully!');
    } catch (error) {
      toast.error('Failed to convert to diagram');
    } finally {
      setLoading(false);
    }
  };

  const diagramTypes = [
    { value: 'flowchart', label: 'Flowchart', icon: '🔄', desc: 'Process flows and workflows' },
    { value: 'mindmap', label: 'Mind Map', icon: '🧠', desc: 'Concept relationships' },
    { value: 'timeline', label: 'Timeline', icon: '⏰', desc: 'Chronological events' },
    { value: 'chart', label: 'Chart', icon: '📊', desc: 'Data visualization' },
    { value: 'infographic', label: 'Infographic', icon: '📈', desc: 'Visual information' },
    { value: 'process', label: 'Process', icon: '⚙️', desc: 'Step-by-step procedures' }
  ];

  const themes = [
    { value: 'professional', label: 'Professional', colors: ['#1E40AF', '#059669', '#D97706'] },
    { value: 'creative', label: 'Creative', colors: ['#7C3AED', '#EC4899', '#F59E0B'] },
    { value: 'minimal', label: 'Minimal', colors: ['#374151', '#6B7280', '#9CA3AF'] },
    { value: 'academic', label: 'Academic', colors: ['#1F2937', '#065F46', '#92400E'] }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FiBarChart className="text-blue-600" />
            Convert Text to Diagram
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="flex">
          {/* Configuration Panel */}
          <div className="w-1/2 p-6 border-r border-gray-200 overflow-y-auto">
            <div className="space-y-6">
              {/* Selected Text Preview */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Selected Text</h3>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm max-h-32 overflow-y-auto">
                  {selectedText}
                </div>
              </div>

              {/* Diagram Type Selection */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Diagram Type</h3>
                <div className="grid grid-cols-2 gap-3">
                  {diagramTypes.map((type) => (
                    <label key={type.value} className="cursor-pointer">
                      <input
                        type="radio"
                        name="diagram_type"
                        value={type.value}
                        checked={options.diagram_type === type.value}
                        onChange={(e) => setOptions(prev => ({ 
                          ...prev, 
                          diagram_type: e.target.value as any,
                          template: '' // Reset template when type changes
                        }))}
                        className="sr-only"
                      />
                      <div className={`border-2 rounded-lg p-3 transition-all ${
                        options.diagram_type === type.value 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <div className="text-xl mb-1">{type.icon}</div>
                        <div className="text-sm font-medium">{type.label}</div>
                        <div className="text-xs text-gray-600">{type.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Template Selection */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Template</h3>
                <div className="grid grid-cols-1 gap-3 max-h-48 overflow-y-auto">
                  {templates.map((template) => (
                    <label key={template.id} className="cursor-pointer">
                      <input
                        type="radio"
                        name="template"
                        value={template.id}
                        checked={options.template === template.id}
                        onChange={(e) => setOptions(prev => ({ 
                          ...prev, 
                          template: e.target.value 
                        }))}
                        className="sr-only"
                      />
                      <div className={`border-2 rounded-lg p-3 flex items-center gap-3 transition-all ${
                        options.template === template.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <img
                          src={template.preview}
                          alt={template.name}
                          className="w-16 h-12 object-cover rounded"
                        />
                        <div>
                          <div className="font-medium text-sm">{template.name}</div>
                          <div className="text-xs text-gray-600">{template.description}</div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Style Configuration */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Style</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                    <div className="grid grid-cols-2 gap-2">
                      {themes.map((theme) => (
                        <label key={theme.value} className="cursor-pointer">
                          <input
                            type="radio"
                            name="theme"
                            value={theme.value}
                            checked={options.style.theme === theme.value}
                            onChange={(e) => setOptions(prev => ({
                              ...prev,
                              style: { ...prev.style, theme: e.target.value as any }
                            }))}
                            className="sr-only"
                          />
                          <div className={`border-2 rounded-lg p-2 text-center transition-all ${
                            options.style.theme === theme.value 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}>
                            <div className="flex gap-1 justify-center mb-1">
                              {theme.colors.map((color, idx) => (
                                <div
                                  key={idx}
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                            <div className="text-xs font-medium">{theme.label}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Font Size</label>
                      <input
                        type="number"
                        min="10"
                        max="24"
                        value={options.style.fontSize}
                        onChange={(e) => setOptions(prev => ({
                          ...prev,
                          style: { ...prev.style, fontSize: parseInt(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Spacing</label>
                      <input
                        type="number"
                        min="10"
                        max="50"
                        value={options.style.spacing}
                        onChange={(e) => setOptions(prev => ({
                          ...prev,
                          style: { ...prev.style, spacing: parseInt(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="auto_layout"
                      checked={options.auto_layout}
                      onChange={(e) => setOptions(prev => ({ 
                        ...prev, 
                        auto_layout: e.target.checked 
                      }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="auto_layout" className="text-sm text-gray-700">
                      Automatic layout optimization
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="w-1/2 p-6 bg-gray-50">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Preview</h3>
                <button
                  onClick={handlePreview}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <FiEye size={16} />
                  )}
                  Generate Preview
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg bg-white p-4 min-h-64 flex items-center justify-center">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Diagram preview"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="text-center text-gray-500">
                    <FiBarChart className="mx-auto text-4xl mb-2 opacity-50" />
                    <p>Click "Generate Preview" to see your diagram</p>
                  </div>
                )}
              </div>

              {/* Conversion Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Conversion Details</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>• Type: {options.diagram_type}</p>
                  <p>• Theme: {options.style.theme}</p>
                  <p>• Auto Layout: {options.auto_layout ? 'Enabled' : 'Disabled'}</p>
                  <p>• Text Length: {selectedText.length} characters</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConvert}
                  disabled={loading || !previewUrl}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <FiZap size={16} />
                  )}
                  Create Diagram
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagramConverter;