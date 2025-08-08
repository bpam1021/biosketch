import React from 'react';
import { FiFileText, FiMonitor, FiArrowRight, FiSettings } from 'react-icons/fi';
import { PresentationOptions } from '../../types/Presentation';

interface PresentationTypeSelectorProps {
  onSelect: (type: 'document' | 'slides', options?: PresentationOptions) => void;
}

const PresentationTypeSelector: React.FC<PresentationTypeSelectorProps> = ({ onSelect }) => {
  const [showOptions, setShowOptions] = React.useState(false);
  const [selectedType, setSelectedType] = React.useState<'document' | 'slides' | null>(null);
  const [options, setOptions] = React.useState<PresentationOptions>({
    slide_size: 'widescreen',
    theme: 'professional',
    include_title_slide: true,
    include_conclusion: true,
    auto_generate_outline: true,
    content_depth: 'detailed',
    include_references: false,
  });

  const handleTypeSelect = (type: 'document' | 'slides') => {
    setSelectedType(type);
    setShowOptions(true);
  };

  const handleConfirm = () => {
    if (selectedType) {
      onSelect(selectedType, options);
    }
  };

  if (showOptions && selectedType) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Configure Your {selectedType === 'document' ? 'Document' : 'Presentation'}
          </h1>
          <p className="text-lg text-gray-600">
            Customize the settings for your content creation
          </p>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 space-y-6">
          {/* Slide Size (for presentations) */}
          {selectedType === 'slides' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Slide Size
              </label>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: 'standard', label: 'Standard (4:3)', desc: '1024×768' },
                  { value: 'widescreen', label: 'Widescreen (16:9)', desc: '1920×1080' },
                  { value: 'custom', label: 'Custom Size', desc: 'Set your own' }
                ].map((size) => (
                  <label key={size.value} className="cursor-pointer">
                    <input
                      type="radio"
                      name="slide_size"
                      value={size.value}
                      checked={options.slide_size === size.value}
                      onChange={(e) => setOptions(prev => ({ ...prev, slide_size: e.target.value as any }))}
                      className="sr-only"
                    />
                    <div className={`border-2 rounded-lg p-4 text-center transition-all ${
                      options.slide_size === size.value 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <div className="font-medium text-gray-900">{size.label}</div>
                      <div className="text-sm text-gray-600">{size.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Theme Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Theme
            </label>
            <div className="grid grid-cols-4 gap-4">
              {[
                { value: 'professional', label: 'Professional', color: 'bg-blue-500' },
                { value: 'creative', label: 'Creative', color: 'bg-purple-500' },
                { value: 'minimal', label: 'Minimal', color: 'bg-gray-500' },
                { value: 'academic', label: 'Academic', color: 'bg-green-500' }
              ].map((theme) => (
                <label key={theme.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="theme"
                    value={theme.value}
                    checked={options.theme === theme.value}
                    onChange={(e) => setOptions(prev => ({ ...prev, theme: e.target.value as any }))}
                    className="sr-only"
                  />
                  <div className={`border-2 rounded-lg p-4 text-center transition-all ${
                    options.theme === theme.value 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className={`w-8 h-8 ${theme.color} rounded mx-auto mb-2`}></div>
                    <div className="font-medium text-gray-900">{theme.label}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Content Depth */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Content Depth
            </label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: 'basic', label: 'Basic', desc: 'Simple overview' },
                { value: 'detailed', label: 'Detailed', desc: 'Comprehensive content' },
                { value: 'comprehensive', label: 'Comprehensive', desc: 'In-depth analysis' }
              ].map((depth) => (
                <label key={depth.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="content_depth"
                    value={depth.value}
                    checked={options.content_depth === depth.value}
                    onChange={(e) => setOptions(prev => ({ ...prev, content_depth: e.target.value as any }))}
                    className="sr-only"
                  />
                  <div className={`border-2 rounded-lg p-4 text-center transition-all ${
                    options.content_depth === depth.value 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className="font-medium text-gray-900">{depth.label}</div>
                    <div className="text-sm text-gray-600">{depth.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Additional Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Additional Options</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={options.include_title_slide}
                  onChange={(e) => setOptions(prev => ({ ...prev, include_title_slide: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Include title slide</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={options.include_conclusion}
                  onChange={(e) => setOptions(prev => ({ ...prev, include_conclusion: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Include conclusion</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={options.auto_generate_outline}
                  onChange={(e) => setOptions(prev => ({ ...prev, auto_generate_outline: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Auto-generate outline</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={options.include_references}
                  onChange={(e) => setOptions(prev => ({ ...prev, include_references: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Include references</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6">
            <button
              onClick={() => setShowOptions(false)}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <FiSettings size={16} />
              Create {selectedType === 'document' ? 'Document' : 'Presentation'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Create Your Presentation
        </h1>
        <p className="text-lg text-gray-600">
          Choose how you want to create and present your content
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Document Type */}
        <div
          onClick={() => handleTypeSelect('document')}
          className="group cursor-pointer bg-white border-2 border-gray-200 rounded-2xl p-8 hover:border-blue-500 hover:shadow-lg transition-all duration-300"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
              <FiFileText className="text-2xl text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Document Style
            </h3>
            <p className="text-gray-600 mb-6">
              Create rich documents with inline editing, smart diagrams, and AI-powered content conversion
            </p>
            
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Rich text editing like Word</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Convert text to diagrams</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Smart content suggestions</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Export to Word/PDF</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center text-blue-600 group-hover:text-blue-700">
              <span className="mr-2">Get Started</span>
              <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        {/* Slides Type */}
        <div
          onClick={() => handleTypeSelect('slides')}
          className="group cursor-pointer bg-white border-2 border-gray-200 rounded-2xl p-8 hover:border-purple-500 hover:shadow-lg transition-all duration-300"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
              <FiMonitor className="text-2xl text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Slide Presentation
            </h3>
            <p className="text-gray-600 mb-6">
              Build dynamic slide presentations with animations, video export, and interactive elements
            </p>
            
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Visual slide editor</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Animations & transitions</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Export to video (MP4)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">PowerPoint export</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center text-purple-600 group-hover:text-purple-700">
              <span className="mr-2">Get Started</span>
              <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* Feature Comparison */}
      <div className="mt-12 bg-gray-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
          Feature Comparison
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-4">Feature</th>
                <th className="text-center py-2 px-4">Document</th>
                <th className="text-center py-2 px-4">Slides</th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              <tr className="border-b border-gray-100">
                <td className="py-2 px-4">Rich text editing</td>
                <td className="text-center py-2 px-4">✅</td>
                <td className="text-center py-2 px-4">✅</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-4">Diagram conversion</td>
                <td className="text-center py-2 px-4">✅</td>
                <td className="text-center py-2 px-4">➖</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-4">Video export</td>
                <td className="text-center py-2 px-4">➖</td>
                <td className="text-center py-2 px-4">✅</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-4">Animations</td>
                <td className="text-center py-2 px-4">➖</td>
                <td className="text-center py-2 px-4">✅</td>
              </tr>
              <tr>
                <td className="py-2 px-4">AI assistance</td>
                <td className="text-center py-2 px-4">✅</td>
                <td className="text-center py-2 px-4">✅</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PresentationTypeSelector;