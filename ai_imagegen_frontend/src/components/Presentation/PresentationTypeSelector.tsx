import React from 'react';
import { FiFileText, FiMonitor, FiArrowRight } from 'react-icons/fi';

interface PresentationTypeSelectorProps {
  onSelect: (type: 'document' | 'slides') => void;
}

const PresentationTypeSelector: React.FC<PresentationTypeSelectorProps> = ({ onSelect }) => {
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
          onClick={() => onSelect('document')}
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
          onClick={() => onSelect('slides')}
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