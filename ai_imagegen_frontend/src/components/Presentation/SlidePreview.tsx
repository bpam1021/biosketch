// Slide Preview Component
// Beautiful visual previews for slides with template-specific rendering

import React from 'react';
import { ContentSection } from '../../types/Presentation';
import { SlideTemplate, getTemplateByType } from '../../config/slideTemplates';
import { SlideTemplateType } from '../../types/SlideTemplates';

interface SlidePreviewProps {
  section: ContentSection;
  width?: number;
  height?: number;
  showTitle?: boolean;
  className?: string;
  onClick?: () => void;
}

const SlidePreview: React.FC<SlidePreviewProps> = ({
  section,
  width = 300,
  height = 225, // 4:3 aspect ratio
  showTitle = true,
  className = '',
  onClick
}) => {
  const template = getTemplateByType((section.section_type as SlideTemplateType) || 'content_slide');
  
  // Parse content based on template type
  const parseContentByTemplate = () => {
    const content = section.content || '';
    
    switch (template.type) {
      case 'title_slide': {
        const lines = content.split('\\n').filter(Boolean);
        return {
          title: section.title || lines[0] || 'Title Slide',
          subtitle: lines[1] || '',
          presenter: lines[2] || ''
        };
      }
      
      case 'two_column': {
        let leftColumn = '';
        let rightColumn = '';
        if (content.includes('|')) {
          const [left, right] = content.split('|');
          leftColumn = left.replace(/Left Column Content:\\n/, '').trim();
          rightColumn = right.replace(/Right Column Content:\\n/, '').trim();
        }
        return { leftColumn, rightColumn };
      }
      
      case 'data_visual': {
        const insights = content.includes('Key Insights:') 
          ? content.replace('Key Insights:\\n', '').trim()
          : content;
        return { insights };
      }
      
      default:
        return { content };
    }
  };

  const parsedContent = parseContentByTemplate();

  const renderTitleSlidePreview = () => (
    <div 
      className="h-full flex flex-col items-center justify-center text-white relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-2 left-2 w-6 h-6 border border-white rounded-full"></div>
        <div className="absolute bottom-2 right-2 w-4 h-4 border border-white rounded-full"></div>
      </div>
      
      <div className="relative z-10 text-center px-4">
        <h1 className="text-lg font-bold mb-2 leading-tight">
          {parsedContent.title}
        </h1>
        {parsedContent.subtitle && (
          <p className="text-sm mb-2 text-white/90 font-light">
            {parsedContent.subtitle}
          </p>
        )}
        {parsedContent.presenter && (
          <p className="text-xs text-white/80">
            {parsedContent.presenter}
          </p>
        )}
      </div>
    </div>
  );

  const renderTwoColumnPreview = () => (
    <div className="h-full p-3 bg-white">
      <div className="h-full flex gap-2">
        <div className="flex-1 bg-blue-50 rounded p-2 border border-blue-200">
          <div className="text-xs text-gray-700">
            {parsedContent.leftColumn ? (
              parsedContent.leftColumn.split('\\n').slice(0, 3).map((line: string, idx: number) => (
                <div key={idx} className="mb-1 truncate">
                  {line.startsWith('•') ? (
                    <span className="text-blue-500">• {line.substring(1).trim()}</span>
                  ) : (
                    line
                  )}
                </div>
              ))
            ) : (
              <div className="text-gray-400 italic">Left column...</div>
            )}
          </div>
        </div>
        <div className="flex-1 bg-green-50 rounded p-2 border border-green-200">
          <div className="text-xs text-gray-700">
            {parsedContent.rightColumn ? (
              parsedContent.rightColumn.split('\\n').slice(0, 3).map((line: string, idx: number) => (
                <div key={idx} className="mb-1 truncate">
                  {line.startsWith('•') ? (
                    <span className="text-green-500">• {line.substring(1).trim()}</span>
                  ) : (
                    line
                  )}
                </div>
              ))
            ) : (
              <div className="text-gray-400 italic">Right column...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderDataVisualPreview = () => (
    <div className="h-full p-3 bg-white">
      <div className="flex gap-2 h-full">
        {/* Mock Chart Area */}
        <div className="flex-1 bg-gray-50 rounded border border-gray-200 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-8 bg-orange-200 rounded mb-1 mx-auto"></div>
            <div className="text-xs text-gray-500">Chart</div>
          </div>
        </div>
        
        {/* Insights */}
        <div className="flex-1 bg-yellow-50 rounded p-2 border border-yellow-200">
          <div className="text-xs font-medium text-gray-900 mb-1 flex items-center gap-1">
            <span className="text-yellow-600">💡</span>
            Insights
          </div>
          <div className="text-xs text-gray-700">
            {parsedContent.insights ? (
              parsedContent.insights.split('\\n').slice(0, 3).map((line: string, idx: number) => (
                <div key={idx} className="mb-1 truncate">
                  {line.startsWith('•') ? (
                    <span className="text-orange-500">• {line.substring(1).trim()}</span>
                  ) : (
                    line
                  )}
                </div>
              ))
            ) : (
              <div className="text-gray-400 italic">Key insights...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderContentImagePreview = () => (
    <div className="h-full p-3 bg-white">
      <div className="flex gap-2 h-full">
        {/* Content */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="text-xs text-gray-700">
            {parsedContent.content ? (
              parsedContent.content.split('\\n').slice(0, 4).map((line: string, idx: number) => (
                <div key={idx} className="mb-1 truncate">
                  {line.startsWith('•') ? (
                    <span className="text-blue-500">• {line.substring(1).trim()}</span>
                  ) : (
                    line
                  )}
                </div>
              ))
            ) : (
              <div className="text-gray-400 italic">Slide content...</div>
            )}
          </div>
        </div>
        
        {/* Image Area */}
        <div className="flex-1 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
          {section.media_files && section.media_files.length > 0 ? (
            <img
              src={section.media_files[0].url}
              alt="Preview"
              className="max-w-full max-h-full object-cover rounded"
            />
          ) : (
            <div className="text-center">
              <div className="w-8 h-6 bg-gray-300 rounded mb-1 mx-auto"></div>
              <div className="text-xs text-gray-500">Image</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderDefaultPreview = () => (
    <div className="h-full p-4 bg-white flex flex-col">
      <div className="text-xs text-gray-700 flex-1">
        {parsedContent.content ? (
          parsedContent.content.split('\\n').slice(0, 6).map((line: string, idx: number) => (
            <div key={idx} className="mb-1 truncate">
              {line.startsWith('•') ? (
                <span className="text-blue-500">• {line.substring(1).trim()}</span>
              ) : (
                line
              )}
            </div>
          ))
        ) : (
          <div className="text-gray-400 italic">Slide content...</div>
        )}
      </div>
      
      {/* Media indicator */}
      {section.media_files && section.media_files.length > 0 && (
        <div className="flex items-center gap-1 mt-2">
          <div className="w-3 h-2 bg-blue-300 rounded"></div>
          <div className="text-xs text-gray-500">{section.media_files.length} media</div>
        </div>
      )}
    </div>
  );

  const renderSlideContent = () => {
    switch (template.type) {
      case 'title_slide':
        return renderTitleSlidePreview();
      case 'two_column':
        return renderTwoColumnPreview();
      case 'data_visual':
        return renderDataVisualPreview();
      case 'content_image':
      case 'image_content':
        return renderContentImagePreview();
      default:
        return renderDefaultPreview();
    }
  };

  return (
    <div 
      className={`relative bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden ${
        onClick ? 'cursor-pointer hover:border-blue-300 hover:shadow-md' : ''
      } transition-all duration-200 ${className}`}
      style={{ width, height }}
      onClick={onClick}
    >
      {/* Template indicator */}
      <div className="absolute top-1 right-1 z-10">
        <div className="bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
          {template.icon}
        </div>
      </div>
      
      {/* Slide content */}
      <div className="h-full">
        {renderSlideContent()}
      </div>
      
      {/* Title overlay */}
      {showTitle && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
          <div className="text-white text-xs font-medium truncate">
            {section.title || `Slide ${template.name}`}
          </div>
          <div className="text-white/70 text-xs truncate">
            {template.name}
          </div>
        </div>
      )}
    </div>
  );
};

export default SlidePreview;