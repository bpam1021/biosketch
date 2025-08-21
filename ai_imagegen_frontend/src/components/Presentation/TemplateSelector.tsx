import React, { useState, useEffect } from 'react';
import { FiSearch, FiGrid, FiList, FiStar, FiCheck } from 'react-icons/fi';
import { PresentationTemplate } from '../../types/Presentation';
import { listPresentationTemplates } from '../../api/presentationApi';

interface TemplateSelectorProps {
  presentationType: 'document' | 'slide';
  selectedTemplate: string;
  onTemplateSelect: (templateId: string) => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  presentationType,
  selectedTemplate,
  onTemplateSelect
}) => {
  const [templates, setTemplates] = useState<PresentationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadTemplates();
  }, [presentationType]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await listPresentationTemplates({
        template_type: presentationType
      });
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(new Set(templates.map(t => t.category)));
  
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const TemplateCard: React.FC<{ template: PresentationTemplate }> = ({ template }) => (
    <div
      onClick={() => onTemplateSelect(template.id)}
      className={`relative cursor-pointer border-2 rounded-lg transition-all ${
        selectedTemplate === template.id
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      }`}
    >
      {/* Selection Indicator */}
      {selectedTemplate === template.id && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
          <FiCheck size={14} className="text-white" />
        </div>
      )}

      {/* Premium Badge */}
      {template.is_premium && (
        <div className="absolute top-2 left-2 bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full font-medium">
          <FiStar size={10} className="inline mr-1" />
          Premium
        </div>
      )}

      <div className="p-4">
        {/* Thumbnail */}
        <div className="w-full h-32 bg-gray-100 rounded-lg mb-3 overflow-hidden">
          {template.thumbnail_url ? (
            <img
              src={template.thumbnail_url}
              alt={template.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <span className="text-xs">Preview</span>
            </div>
          )}
        </div>

        {/* Content */}
        <h3 className="font-medium text-gray-900 mb-1 truncate">{template.name}</h3>
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{template.description}</p>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded capitalize">
            {template.category}
          </span>
          <span className="text-xs text-gray-500">
            {template.usage_count} uses
          </span>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Choose Template ({templates.length} available)
        </h3>
        
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
            >
              <FiGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
            >
              <FiList size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          {categories.map(category => (
            <option key={category} value={category} className="capitalize">
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* Default Template Option */}
      <div
        onClick={() => onTemplateSelect('')}
        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
          selectedTemplate === ''
            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex items-center gap-4">
          {selectedTemplate === '' && (
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
              <FiCheck size={14} className="text-white" />
            </div>
          )}
          <div className="w-16 h-12 bg-gray-200 rounded flex items-center justify-center">
            <span className="text-gray-500 text-xs">Default</span>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">No Template</h4>
            <p className="text-sm text-gray-600">Start with basic styling</p>
          </div>
        </div>
      </div>

      {/* Templates Grid/List */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No templates found matching your criteria</p>
        </div>
      ) : (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-3'
        }>
          {filteredTemplates.map(template => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TemplateSelector;