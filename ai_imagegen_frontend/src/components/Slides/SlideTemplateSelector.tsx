import React, { useState } from 'react';
import {
  FiLayout, FiImage, FiType, FiColumns, FiBarChart, FiTable,
  FiQuote, FiList, FiMaximize2, FiCheck, FiShuffle
} from 'react-icons/fi';

interface SlideZone {
  id: string;
  type: 'title' | 'content' | 'image' | 'chart' | 'table';
  position: { x: number, y: number, width: number, height: number };
  placeholder: string;
}

interface SlideTemplate {
  id: string;
  name: string;
  layout_type: string;
  zones: SlideZone[];
  preview_image?: string;
  is_premium: boolean;
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
  effects: {
    shadow: boolean;
    gradient: boolean;
    animation: string;
  };
  is_premium: boolean;
}

interface SlideTemplateSelectorProps {
  onTemplateSelect: (template: SlideTemplate, theme: SlideTheme) => void;
  onClose: () => void;
}

const SlideTemplateSelector: React.FC<SlideTemplateSelectorProps> = ({
  onTemplateSelect,
  onClose
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<SlideTemplate | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<SlideTheme | null>(null);
  const [activeTab, setActiveTab] = useState<'templates' | 'themes'>('templates');

  // PowerPoint-style templates
  const slideTemplates: SlideTemplate[] = [
    {
      id: 'title',
      name: 'Title Slide',
      layout_type: 'title',
      zones: [
        { id: 'title', type: 'title', position: { x: 10, y: 30, width: 80, height: 25 }, placeholder: 'Presentation Title' },
        { id: 'subtitle', type: 'content', position: { x: 10, y: 60, width: 80, height: 15 }, placeholder: 'Subtitle or Description' }
      ],
      is_premium: false
    },
    {
      id: 'title_content',
      name: 'Title + Content',
      layout_type: 'title_content',
      zones: [
        { id: 'title', type: 'title', position: { x: 5, y: 5, width: 90, height: 15 }, placeholder: 'Slide Title' },
        { id: 'content', type: 'content', position: { x: 5, y: 25, width: 90, height: 65 }, placeholder: 'Your content here...' }
      ],
      is_premium: false
    },
    {
      id: 'two_column',
      name: 'Two Column',
      layout_type: 'two_column',
      zones: [
        { id: 'title', type: 'title', position: { x: 5, y: 5, width: 90, height: 15 }, placeholder: 'Slide Title' },
        { id: 'left', type: 'content', position: { x: 5, y: 25, width: 42, height: 65 }, placeholder: 'Left column content' },
        { id: 'right', type: 'content', position: { x: 53, y: 25, width: 42, height: 65 }, placeholder: 'Right column content' }
      ],
      is_premium: false
    },
    {
      id: 'image_content',
      name: 'Image + Content',
      layout_type: 'image_content',
      zones: [
        { id: 'title', type: 'title', position: { x: 5, y: 5, width: 90, height: 15 }, placeholder: 'Slide Title' },
        { id: 'image', type: 'image', position: { x: 5, y: 25, width: 45, height: 65 }, placeholder: 'Click to add image' },
        { id: 'content', type: 'content', position: { x: 55, y: 25, width: 40, height: 65 }, placeholder: 'Content about the image' }
      ],
      is_premium: false
    },
    {
      id: 'full_image',
      name: 'Full Image Background',
      layout_type: 'full_image',
      zones: [
        { id: 'background', type: 'image', position: { x: 0, y: 0, width: 100, height: 100 }, placeholder: 'Background image' },
        { id: 'title', type: 'title', position: { x: 10, y: 30, width: 80, height: 20 }, placeholder: 'Overlay title' },
        { id: 'content', type: 'content', position: { x: 10, y: 55, width: 80, height: 25 }, placeholder: 'Overlay content' }
      ],
      is_premium: true
    },
    {
      id: 'comparison',
      name: 'Comparison',
      layout_type: 'comparison',
      zones: [
        { id: 'title', type: 'title', position: { x: 5, y: 5, width: 90, height: 15 }, placeholder: 'Comparison Title' },
        { id: 'left_title', type: 'title', position: { x: 5, y: 25, width: 42, height: 10 }, placeholder: 'Option A' },
        { id: 'right_title', type: 'title', position: { x: 53, y: 25, width: 42, height: 10 }, placeholder: 'Option B' },
        { id: 'left_content', type: 'content', position: { x: 5, y: 40, width: 42, height: 50 }, placeholder: 'Features of A' },
        { id: 'right_content', type: 'content', position: { x: 53, y: 40, width: 42, height: 50 }, placeholder: 'Features of B' }
      ],
      is_premium: false
    },
    {
      id: 'chart',
      name: 'Chart/Graph',
      layout_type: 'chart',
      zones: [
        { id: 'title', type: 'title', position: { x: 5, y: 5, width: 90, height: 15 }, placeholder: 'Chart Title' },
        { id: 'chart', type: 'chart', position: { x: 5, y: 25, width: 90, height: 65 }, placeholder: 'Chart will be generated here' }
      ],
      is_premium: false
    },
    {
      id: 'table',
      name: 'Table',
      layout_type: 'table',
      zones: [
        { id: 'title', type: 'title', position: { x: 5, y: 5, width: 90, height: 15 }, placeholder: 'Table Title' },
        { id: 'table', type: 'table', position: { x: 5, y: 25, width: 90, height: 65 }, placeholder: 'Table content' }
      ],
      is_premium: false
    }
  ];

  // PowerPoint-style themes
  const slideThemes: SlideTheme[] = [
    {
      id: 'corporate_blue',
      name: 'Corporate Blue',
      colors: {
        primary: '#1e40af',
        secondary: '#3b82f6',
        accent: '#60a5fa',
        background: '#ffffff',
        text: '#1f2937'
      },
      fonts: { heading: 'Inter', body: 'Inter' },
      effects: { shadow: true, gradient: false, animation: 'fade' },
      is_premium: false
    },
    {
      id: 'modern_dark',
      name: 'Modern Dark',
      colors: {
        primary: '#111827',
        secondary: '#374151',
        accent: '#06b6d4',
        background: '#1f2937',
        text: '#f9fafb'
      },
      fonts: { heading: 'Inter', body: 'Inter' },
      effects: { shadow: true, gradient: true, animation: 'slide' },
      is_premium: true
    },
    {
      id: 'professional_green',
      name: 'Professional Green',
      colors: {
        primary: '#047857',
        secondary: '#059669',
        accent: '#10b981',
        background: '#ffffff',
        text: '#1f2937'
      },
      fonts: { heading: 'Roboto', body: 'Roboto' },
      effects: { shadow: false, gradient: false, animation: 'none' },
      is_premium: false
    },
    {
      id: 'elegant_purple',
      name: 'Elegant Purple',
      colors: {
        primary: '#7c3aed',
        secondary: '#8b5cf6',
        accent: '#a78bfa',
        background: '#faf7ff',
        text: '#1f2937'
      },
      fonts: { heading: 'Playfair Display', body: 'Source Sans Pro' },
      effects: { shadow: true, gradient: true, animation: 'fade' },
      is_premium: true
    },
    {
      id: 'minimalist_gray',
      name: 'Minimalist Gray',
      colors: {
        primary: '#4b5563',
        secondary: '#6b7280',
        accent: '#9ca3af',
        background: '#ffffff',
        text: '#111827'
      },
      fonts: { heading: 'Inter', body: 'Inter' },
      effects: { shadow: false, gradient: false, animation: 'none' },
      is_premium: false
    }
  ];

  const getTemplateIcon = (layoutType: string) => {
    switch (layoutType) {
      case 'title': return FiType;
      case 'title_content': return FiLayout;
      case 'two_column': return FiColumns;
      case 'image_content': return FiImage;
      case 'full_image': return FiMaximize2;
      case 'comparison': return FiShuffle;
      case 'chart': return FiBarChart;
      case 'table': return FiTable;
      default: return FiLayout;
    }
  };

  const renderTemplatePreview = (template: SlideTemplate, theme?: SlideTheme) => {
    const currentTheme = theme || slideThemes[0];
    
    return (
      <div 
        className="relative w-full aspect-video rounded border"
        style={{ backgroundColor: currentTheme.colors.background }}
      >
        {template.zones.map((zone) => (
          <div
            key={zone.id}
            className="absolute border-2 border-dashed flex items-center justify-center text-xs text-center p-1"
            style={{
              left: `${zone.position.x}%`,
              top: `${zone.position.y}%`,
              width: `${zone.position.width}%`,
              height: `${zone.position.height}%`,
              borderColor: currentTheme.colors.accent,
              color: currentTheme.colors.text,
              backgroundColor: zone.type === 'title' ? currentTheme.colors.primary + '20' : 'transparent'
            }}
          >
            {zone.placeholder}
          </div>
        ))}
      </div>
    );
  };

  const handleConfirm = () => {
    if (selectedTemplate && selectedTheme) {
      onTemplateSelect(selectedTemplate, selectedTheme);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Choose Template & Theme</h2>
          <p className="text-gray-600 mt-2">Select a PowerPoint-style layout and theme for your presentation</p>
          
          <div className="flex space-x-4 mt-4">
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'templates'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              1. Choose Layout
            </button>
            <button
              onClick={() => setActiveTab('themes')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'themes'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              2. Choose Theme
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: '60vh' }}>
          {activeTab === 'templates' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {slideTemplates.map((template) => {
                const Icon = getTemplateIcon(template.layout_type);
                const isSelected = selectedTemplate?.id === template.id;
                
                return (
                  <div
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {/* Premium badge */}
                    {template.is_premium && (
                      <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded-full">
                        Premium
                      </div>
                    )}
                    
                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute top-2 left-2 bg-blue-600 text-white rounded-full p-1">
                        <FiCheck size={12} />
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3 mb-3">
                      <Icon size={20} className={isSelected ? 'text-blue-600' : 'text-gray-600'} />
                      <h3 className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                        {template.name}
                      </h3>
                    </div>
                    
                    <div className="mb-3">
                      {renderTemplatePreview(template, selectedTheme)}
                    </div>
                    
                    <p className="text-sm text-gray-600">
                      {template.zones.length} content zone{template.zones.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'themes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {slideThemes.map((theme) => {
                const isSelected = selectedTheme?.id === theme.id;
                
                return (
                  <div
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme)}
                    className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {/* Premium badge */}
                    {theme.is_premium && (
                      <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded-full">
                        Premium
                      </div>
                    )}
                    
                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute top-2 left-2 bg-blue-600 text-white rounded-full p-1">
                        <FiCheck size={12} />
                      </div>
                    )}
                    
                    <h3 className={`font-medium mb-3 ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                      {theme.name}
                    </h3>
                    
                    {/* Color preview */}
                    <div className="flex gap-1 mb-3">
                      <div 
                        className="w-8 h-8 rounded"
                        style={{ backgroundColor: theme.colors.primary }}
                        title="Primary"
                      />
                      <div 
                        className="w-8 h-8 rounded"
                        style={{ backgroundColor: theme.colors.secondary }}
                        title="Secondary"
                      />
                      <div 
                        className="w-8 h-8 rounded"
                        style={{ backgroundColor: theme.colors.accent }}
                        title="Accent"
                      />
                      <div 
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: theme.colors.background }}
                        title="Background"
                      />
                    </div>
                    
                    {/* Template preview with theme */}
                    {selectedTemplate && (
                      <div className="mb-3">
                        {renderTemplatePreview(selectedTemplate, theme)}
                      </div>
                    )}
                    
                    <div className="text-sm text-gray-600">
                      <p>Font: {theme.fonts.heading}</p>
                      <p>Effects: {theme.effects.shadow ? 'Shadow' : ''} {theme.effects.gradient ? 'Gradient' : ''}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedTemplate ? `Template: ${selectedTemplate.name}` : 'No template selected'} 
            {selectedTemplate && selectedTheme && ' • '}
            {selectedTheme ? `Theme: ${selectedTheme.name}` : ''}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedTemplate || !selectedTheme}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium"
            >
              Create Presentation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlideTemplateSelector;