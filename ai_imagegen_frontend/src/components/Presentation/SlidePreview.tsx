// Slide Preview Component
// Beautiful visual previews for slides with template-specific rendering

import React from 'react';
import { ContentSection } from '../../types/Presentation';
import { getTemplateByType } from '../../config/slideTemplates';
import { SlideTemplate, SlideTemplateType } from '../../types/SlideTemplates';

interface SlidePreviewProps {
  section: ContentSection;
  width?: number;
  height?: number;
  showTitle?: boolean;
  className?: string;
  onClick?: () => void;
}

// Map section types to valid slide template types
const mapSectionTypeToSlideType = (sectionType: string): SlideTemplateType => {
  const typeMap: Record<string, SlideTemplateType> = {
    'title': 'title_slide',
    'title_slide': 'title_slide',
    'two_column': 'content_slide', // Map to closest valid type
    'data_visual': 'content_slide',
    'chart': 'content_slide',
    'content_image': 'content_image',
    'image_content': 'image_content',
    'agenda': 'agenda_overview',
    'agenda_overview': 'agenda_overview',
    'quote': 'quote_testimonial',
    'quote_testimonial': 'quote_testimonial',
    'thank_you': 'thank_you',
    'conclusion_cta': 'conclusion_cta',
    'section_divider': 'content_slide', // Map to content_slide as fallback
    'heading': 'content_slide',
    'paragraph': 'content_slide',
    'list': 'content_slide',
    'table': 'content_slide',
    'image': 'content_slide',
    'code': 'content_slide',
    'content_slide': 'content_slide',
    'image_slide': 'content_slide',
    'chart_slide': 'content_slide',
    'comparison_slide': 'comparison',
    'diagram': 'content_slide',
    'video': 'content_slide',
    'audio': 'content_slide',
    'interactive': 'content_slide'
  };

  return typeMap[sectionType] || 'content_slide';
};

const SlidePreview: React.FC<SlidePreviewProps> = ({
  section,
  width = 300,
  height = 225, // 4:3 aspect ratio
  showTitle = true,
  className = '',
  onClick
}) => {
  // Get template info based on section type
  const getTemplateInfo = (templateType: string) => {
    const templateMap: Record<string, { name: string; icon: string }> = {
      // Core templates
      'title': { name: 'Title Slide', icon: '🎯' },
      'title_content': { name: 'Title + Content', icon: '📄' },
      'two_column': { name: 'Two Column', icon: '📑' },
      'image_content': { name: 'Image + Content', icon: '📄🖼️' },
      'full_image': { name: 'Full Image', icon: '🖼️' },
      'comparison': { name: 'Comparison', icon: '⚖️' },
      'agenda': { name: 'Agenda/List', icon: '📋' },
      'chart': { name: 'Chart/Graph', icon: '📊' },
      'table': { name: 'Table', icon: '📊' },
      'quote': { name: 'Quote/Citation', icon: '💬' },
      // AI-specific templates
      'title_slide': { name: 'AI Title Slide', icon: '🎯' },
      'agenda_overview': { name: 'Agenda Overview', icon: '📋' },
      'section_divider': { name: 'Section Divider', icon: '📑' },
      'content_image': { name: 'AI Content + Image', icon: '📄🖼️' },
      'data_visual': { name: 'Data Visualization', icon: '📊' },
      'quote_testimonial': { name: 'Quote/Testimonial', icon: '💬' },
      'conclusion_cta': { name: 'Conclusion/CTA', icon: '🎬' },
      'thank_you': { name: 'Thank You', icon: '🙏' },
    };
    return templateMap[templateType] || { name: 'Content Slide', icon: '📄' };
  };
  
  const template = getTemplateInfo(section.section_type || 'title_content');
  
  // Helper function to clean HTML content
  const cleanHtmlContent = (htmlContent: string): string => {
    if (!htmlContent) return '';
    
    // Remove HTML tags but preserve line breaks
    const withLineBreaks = htmlContent
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
    
    return withLineBreaks.trim();
  };

  // Parse content based on template type
  const parseContentByTemplate = () => {
    const rawContent = section?.content || '';
    const content = cleanHtmlContent(rawContent);
    const mappedType = mapSectionTypeToSlideType(section?.section_type || 'content_slide');

    switch (mappedType) {
      case 'title_slide': {
        const lines = content.split('\n').filter(Boolean);
        return {
          title: section?.title || lines[0] || 'Title Slide',
          subtitle: lines[1] || '',
          presenter: lines[2] || ''
        };
      }
      
      case 'content_slide': {
        // Handle various content types mapped to content_slide
        if (section?.section_type === 'two_column' as any) {
          let leftColumn = '';
          let rightColumn = '';
          if (content.includes('|')) {
            const [left, right] = content.split('|');
            leftColumn = left.replace(/Left Column Content:\n/, '').trim();
            rightColumn = right.replace(/Right Column Content:\n/, '').trim();
          }
          return { leftColumn, rightColumn };
        }

        if (section?.section_type === 'data_visual' as any || section?.section_type === 'chart' as any) {
          const insights = content.includes('Key Insights:')
            ? content.replace('Key Insights:\n', '').trim()
            : content;
          return { insights };
        }

        return { content };
      }

      case 'content_image':
      case 'image_content':
      case 'agenda_overview':
      case 'quote_testimonial':
      case 'thank_you':
      case 'conclusion_cta':
      case 'comparison': {
        return { content };
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
              parsedContent.leftColumn.split('\n').slice(0, 3).map((line: string, idx: number) => (
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
              parsedContent.rightColumn.split('\n').slice(0, 3).map((line: string, idx: number) => (
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
              parsedContent.insights.split('\n').slice(0, 3).map((line: string, idx: number) => (
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
              parsedContent.content.split('\n').slice(0, 4).map((line: string, idx: number) => (
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
          {section?.media_files && section.media_files.length > 0 ? (
            <img
              src={typeof section.media_files[0] === 'string' ? section.media_files[0] : (section.media_files[0] as any)?.url}
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

  const renderAgendaPreview = () => (
    <div className="h-full p-3 bg-white">
      <div className="text-xs text-gray-700">
        <div className="font-medium mb-2 text-blue-600">📋 Agenda</div>
        {parsedContent.content ? (
          parsedContent.content.split('\n').slice(0, 4).map((line: string, idx: number) => (
            <div key={idx} className="mb-1 flex items-center gap-2">
              <span className="text-blue-500 font-bold">{idx + 1}.</span>
              <span className="truncate">{line.replace(/^[•\d\.]\s*/, '')}</span>
            </div>
          ))
        ) : (
          <div className="text-gray-400 italic">Agenda items...</div>
        )}
      </div>
    </div>
  );

  const renderQuotePreview = () => (
    <div className="h-full p-4 bg-gradient-to-br from-purple-50 to-pink-50 flex flex-col justify-center">
      <div className="text-center">
        <div className="text-2xl text-purple-400 mb-2">"</div>
        <div className="text-xs text-gray-700 italic mb-2">
          {parsedContent.content ? parsedContent.content.slice(0, 80) + '...' : 'Inspirational quote...'}
        </div>
        <div className="text-xs text-purple-600 font-medium">— Author Name</div>
      </div>
    </div>
  );

  const renderThankYouPreview = () => (
    <div className="h-full bg-gradient-to-br from-green-50 to-blue-50 flex flex-col items-center justify-center p-4">
      <div className="text-2xl mb-2">🙏</div>
      <div className="text-sm font-bold text-center text-gray-900 mb-2">Thank You!</div>
      <div className="text-xs text-center text-gray-600">
        <div>Contact Information</div>
        <div className="mt-1 text-blue-600">user@example.com</div>
      </div>
    </div>
  );

  const renderConclusionPreview = () => (
    <div className="h-full p-3 bg-white">
      <div className="text-xs text-gray-700">
        <div className="font-medium mb-2 text-green-600">🎬 Key Takeaways</div>
        {parsedContent.content ? (
          parsedContent.content.split('\n').slice(0, 3).map((line: string, idx: number) => (
            <div key={idx} className="mb-1">
              <span className="text-green-500">• </span>
              <span className="truncate">{line.replace(/^•\s*/, '')}</span>
            </div>
          ))
        ) : (
          <div className="text-gray-400 italic">Conclusions...</div>
        )}
        <div className="mt-2 p-2 bg-blue-50 rounded text-center">
          <div className="text-xs font-medium text-blue-800">Next Steps</div>
        </div>
      </div>
    </div>
  );

  const renderSectionDividerPreview = () => (
    <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="text-lg font-bold">
          {section?.title || 'Section Title'}
        </div>
      </div>
    </div>
  );

  const renderDefaultPreview = () => (
    <div className="h-full p-4 bg-white flex flex-col">
      <div className="text-xs text-gray-700 flex-1">
        {parsedContent.content ? (
          parsedContent.content.split('\n').slice(0, 6).map((line: string, idx: number) => (
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
      {section?.media_files && section.media_files.length > 0 && (
        <div className="flex items-center gap-1 mt-2">
          <div className="w-3 h-2 bg-blue-300 rounded"></div>
          <div className="text-xs text-gray-500">{section.media_files.length} media</div>
        </div>
      )}
    </div>
  );

  const renderSlideContent = () => {
    const mappedType = mapSectionTypeToSlideType(section?.section_type || 'content_slide');
    const originalType = section?.section_type;

    switch (mappedType) {
      case 'title_slide':
        return renderTitleSlidePreview();
      case 'content_slide':
        // Route to specific renders based on original type
        if (originalType === 'two_column' as any) return renderTwoColumnPreview();
        if (originalType === 'data_visual' as any || originalType === 'chart' as any) return renderDataVisualPreview();
        if (originalType === 'section_divider' as any) return renderSectionDividerPreview();
        return renderDefaultPreview();
      case 'content_image':
      case 'image_content':
        return renderContentImagePreview();
      case 'agenda_overview':
        return renderAgendaPreview();
      case 'quote_testimonial':
        return renderQuotePreview();
      case 'thank_you':
        return renderThankYouPreview();
      case 'conclusion_cta':
        return renderConclusionPreview();
      case 'comparison':
        return renderDefaultPreview(); // Fallback for comparison
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
            {section?.title || `Slide ${template.name}`}
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