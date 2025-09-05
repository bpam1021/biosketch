// Beautiful and Flexible Slide Template Selection Modal
// Interactive template selection with real-time previews

import React, { useState, useMemo } from 'react';
import { 
  FiX, FiCheck, FiSearch, FiGrid, FiList, FiZap, 
  FiImage, FiBarChart, FiColumns, FiStar 
} from 'react-icons/fi';
import { 
  slideTemplates, 
  slideTemplateCategories, 
  getTemplatesByCategory,
  getAllTemplates 
} from '../../config/slideTemplates';
import { SlideTemplate, SlideTemplateType, TemplateCategory } from '../../types/SlideTemplates';

interface SlideTemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateType: SlideTemplateType) => void;
  currentTemplate?: SlideTemplateType;
  title?: string;
}

interface TemplatePreviewProps {
  template: SlideTemplate;
  isSelected: boolean;
  onSelect: (templateType: SlideTemplateType) => void;
}

const TemplatePreview: React.FC<TemplatePreviewProps> = ({ 
  template, 
  isSelected, 
  onSelect 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleSelect = () => {
    onSelect(template.type);
  };

  return (
    <div
      className={`
        relative group cursor-pointer transition-all duration-300 transform
        ${isSelected 
          ? 'ring-4 ring-blue-500 ring-opacity-50 scale-105 shadow-2xl' 
          : 'hover:scale-105 hover:shadow-xl shadow-lg'
        }
        bg-white rounded-xl overflow-hidden border-2
        ${isSelected ? 'border-blue-500' : 'border-gray-200 hover:border-blue-300'}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleSelect}
    >
      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3 z-20 bg-blue-500 text-white rounded-full p-1">
          <FiCheck size={14} />
        </div>
      )}

      {/* Template Icon Badge */}
      <div className="absolute top-3 left-3 z-10 bg-white bg-opacity-90 backdrop-blur-sm rounded-full p-2 shadow-sm">
        <span className="text-lg">{template.icon}</span>
      </div>

      {/* Preview Canvas */}
      <div 
        className="relative w-full h-48 overflow-hidden"
        style={{ backgroundColor: template.preview.backgroundColor }}
      >
        <svg
          viewBox={`0 0 ${template.preview.dimensions.width} ${template.preview.dimensions.height}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {template.preview.zones.map((zone, index) => {
            if (zone.type === 'text') {
              return (
                <text
                  key={index}
                  x={zone.position.x + zone.position.width / 2}
                  y={zone.position.y + (zone.style.fontSize || 12) / 2 + zone.position.height / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{
                    fontSize: zone.style.fontSize || 12,
                    fontWeight: zone.style.fontWeight || 'normal',
                    fill: zone.style.color || '#000000',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                  }}
                >
                  {zone.content}
                </text>
              );
            } else if (zone.type === 'shape') {
              return (
                <rect
                  key={index}
                  x={zone.position.x}
                  y={zone.position.y}
                  width={zone.position.width}
                  height={zone.position.height}
                  style={{
                    fill: zone.style.backgroundColor || '#E5E7EB',
                    stroke: zone.style.border || '#D1D5DB',
                    strokeWidth: 1,
                    rx: zone.style.borderRadius || 0
                  }}
                />
              );
            }
            return null;
          })}
        </svg>

        {/* Hover Overlay */}
        {isHovered && !isSelected && (
          <div className="absolute inset-0 bg-blue-500 bg-opacity-10 flex items-center justify-center">
            <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-full p-3 shadow-lg">
              <FiCheck size={20} className="text-blue-500" />
            </div>
          </div>
        )}
      </div>

      {/* Template Info */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <h4 className="font-semibold text-gray-900 text-sm leading-tight">
            {template.name}
          </h4>
          <div className={`
            px-2 py-1 rounded-full text-xs font-medium
            ${getCategoryColor(template.category).bg}
            ${getCategoryColor(template.category).text}
          `}>
            {template.category}
          </div>
        </div>
        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
          {template.description}
        </p>
      </div>

      {/* Quick Actions on Hover */}
      {isHovered && (
        <div className="absolute bottom-4 left-4 right-4 flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(template.type);
            }}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors duration-200"
          >
            Select Template
          </button>
        </div>
      )}
    </div>
  );
};

const getCategoryColor = (category: string) => {
  const colors = {
    structure: { bg: 'bg-blue-100', text: 'text-blue-800' },
    content: { bg: 'bg-green-100', text: 'text-green-800' },
    visual: { bg: 'bg-purple-100', text: 'text-purple-800' },
    data: { bg: 'bg-orange-100', text: 'text-orange-800' },
    special: { bg: 'bg-red-100', text: 'text-red-800' }
  };
  return colors[category as keyof typeof colors] || { bg: 'bg-gray-100', text: 'text-gray-800' };
};

const getCategoryIcon = (category: string) => {
  const icons = {
    structure: FiGrid,
    content: FiList,
    visual: FiImage,
    data: FiBarChart,
    special: FiStar
  };
  return icons[category as keyof typeof icons] || FiGrid;
};

const SlideTemplateSelector: React.FC<SlideTemplateSelectorProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  currentTemplate,
  title = 'Choose Slide Template'
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTemplate, setSelectedTemplate] = useState<SlideTemplateType | null>(
    currentTemplate || null
  );

  // Filter templates based on category and search
  const filteredTemplates = useMemo(() => {
    let templates = selectedCategory === 'all' 
      ? getAllTemplates()
      : getTemplatesByCategory(selectedCategory);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      templates = templates.filter(template => 
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query)
      );
    }

    return templates;
  }, [selectedCategory, searchQuery]);

  const handleTemplateSelect = (templateType: SlideTemplateType) => {
    setSelectedTemplate(templateType);
  };

  const handleConfirm = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-full max-h-[90vh] m-4 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-600 mt-1">
              Select a professional template for your slide
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-full transition-colors duration-200"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Search and Controls */}
        <div className="p-6 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-4 mb-4">
            {/* Search */}
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors duration-200 ${
                  viewMode === 'grid' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FiGrid size={20} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors duration-200 ${
                  viewMode === 'list' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FiList size={20} />
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors duration-200 ${
                selectedCategory === 'all'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="mr-2">🎯</span>
              All Templates
            </button>
            {slideTemplateCategories.map((category) => {
              const IconComponent = getCategoryIcon(category.id);
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors duration-200 flex items-center gap-2 ${
                    selectedCategory === category.id
                      ? 'text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={{ 
                    backgroundColor: selectedCategory === category.id ? category.color : undefined
                  }}
                >
                  <span>{category.icon}</span>
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <FiSearch size={48} className="mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No templates found</h3>
              <p className="text-sm text-center">
                Try adjusting your search or selecting a different category
              </p>
            </div>
          ) : (
            <div className={`
              grid gap-6
              ${viewMode === 'grid' 
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                : 'grid-cols-1 max-w-4xl mx-auto'
              }
            `}>
              {filteredTemplates.map((template) => (
                <TemplatePreview
                  key={template.type}
                  template={template}
                  isSelected={selectedTemplate === template.type}
                  onSelect={handleTemplateSelect}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selectedTemplate && (
              <span className="flex items-center gap-2">
                <FiZap className="text-blue-500" />
                Selected: <strong>{slideTemplates[selectedTemplate].name}</strong>
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedTemplate}
              className={`px-6 py-2 rounded-lg font-medium transition-colors duration-200 ${
                selectedTemplate
                  ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Use Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlideTemplateSelector;