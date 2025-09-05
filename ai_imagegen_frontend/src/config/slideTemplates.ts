// Beautiful and Flexible Slide Template Configurations
// Real logic for professional presentation templates

import { SlideTemplate, SlideTemplateType, TemplateCategory } from '../types/SlideTemplates';

export const slideTemplateCategories: TemplateCategory[] = [
  {
    id: 'structure',
    name: 'Structure',
    description: 'Title slides, dividers, and organizational templates',
    icon: '📋',
    color: '#3B82F6',
    templates: ['title_slide', 'agenda_overview', 'section_divider', 'thank_you']
  },
  {
    id: 'content',
    name: 'Content',
    description: 'Text-focused layouts for presenting information',
    icon: '📝',
    color: '#10B981',
    templates: ['content_slide', 'two_column', 'quote_testimonial']
  },
  {
    id: 'visual',
    name: 'Visual',
    description: 'Image and media-rich presentation layouts',
    icon: '🖼️',
    color: '#8B5CF6',
    templates: ['content_image', 'image_content', 'full_image']
  },
  {
    id: 'data',
    name: 'Data',
    description: 'Charts, comparisons, and data visualization',
    icon: '📊',
    color: '#F59E0B',
    templates: ['data_visual', 'comparison', 'timeline']
  },
  {
    id: 'special',
    name: 'Special',
    description: 'Specialized layouts for specific purposes',
    icon: '⭐',
    color: '#EF4444',
    templates: ['conclusion_cta', 'blank_slide']
  }
];

export const slideTemplates: Record<SlideTemplateType, SlideTemplate> = {
  title_slide: {
    type: 'title_slide',
    name: 'Title Slide',
    description: 'Professional title page with main title, subtitle, and presenter information',
    category: 'structure',
    icon: '🎯',
    preview: {
      backgroundColor: '#FFFFFF',
      primaryColor: '#1F2937',
      accentColor: '#3B82F6',
      textColor: '#374151',
      dimensions: { width: 320, height: 180 },
      zones: [
        {
          id: 'title',
          type: 'text',
          position: { x: 20, y: 40, width: 280, height: 40 },
          style: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', color: '#1F2937' },
          content: 'Presentation Title'
        },
        {
          id: 'subtitle',
          type: 'text',
          position: { x: 20, y: 90, width: 280, height: 20 },
          style: { fontSize: 12, textAlign: 'center', color: '#6B7280' },
          content: 'Compelling subtitle that describes value'
        },
        {
          id: 'presenter',
          type: 'text',
          position: { x: 20, y: 130, width: 280, height: 15 },
          style: { fontSize: 10, textAlign: 'center', color: '#9CA3AF' },
          content: 'Presenter Name • Company • Date'
        }
      ]
    },
    layout: {
      containerStyle: {
        padding: '4rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      },
      zones: {
        title: {
          id: 'title',
          name: 'Main Title',
          type: 'text',
          required: true,
          placeholder: 'Enter your presentation title',
          style: {
            fontSize: '3rem',
            fontWeight: '800',
            color: 'white',
            textAlign: 'center',
            margin: '0 0 1rem 0',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
          }
        },
        subtitle: {
          id: 'subtitle',
          name: 'Subtitle',
          type: 'text',
          required: false,
          placeholder: 'Add a compelling subtitle',
          style: {
            fontSize: '1.5rem',
            fontWeight: '400',
            color: 'rgba(255,255,255,0.9)',
            textAlign: 'center',
            margin: '0 0 2rem 0'
          }
        },
        presenter: {
          id: 'presenter',
          name: 'Presenter Info',
          type: 'text',
          required: false,
          placeholder: 'Your Name • Company • Date',
          style: {
            fontSize: '1.1rem',
            fontWeight: '300',
            color: 'rgba(255,255,255,0.8)',
            textAlign: 'center',
            margin: '2rem 0 0 0'
          }
        }
      }
    },
    contentZones: [
      {
        id: 'title',
        name: 'Title',
        type: 'title',
        required: true,
        multiline: false,
        placeholder: 'Enter presentation title',
        validation: { maxLength: 100, minLength: 5 }
      },
      {
        id: 'subtitle',
        name: 'Subtitle',
        type: 'subtitle',
        required: false,
        multiline: false,
        placeholder: 'Add compelling subtitle'
      },
      {
        id: 'presenter',
        name: 'Presenter Information',
        type: 'content',
        required: false,
        multiline: false,
        placeholder: 'Your Name • Company • Date'
      }
    ],
    defaultContent: {
      title: 'Your Presentation Title',
      subtitle: 'Compelling subtitle that captures attention',
      content: 'Presenter Name • Company Name • ' + new Date().toLocaleDateString()
    },
    validation: {
      requiredZones: ['title'],
      maxImages: 0,
      maxTextLength: 200,
      allowedMediaTypes: []
    }
  },

  content_slide: {
    type: 'content_slide',
    name: 'Content Slide',
    description: 'Standard slide with title and bullet points or paragraphs',
    category: 'content',
    icon: '📄',
    preview: {
      backgroundColor: '#FFFFFF',
      primaryColor: '#1F2937',
      accentColor: '#3B82F6',
      textColor: '#374151',
      dimensions: { width: 320, height: 180 },
      zones: [
        {
          id: 'title',
          type: 'text',
          position: { x: 20, y: 20, width: 280, height: 25 },
          style: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
          content: 'Slide Title'
        },
        {
          id: 'content',
          type: 'text',
          position: { x: 20, y: 55, width: 280, height: 100 },
          style: { fontSize: 11, color: '#374151', textAlign: 'left' },
          content: '• Key point one with details\\n• Important insight two\\n• Supporting evidence three\\n• Call to action or summary'
        }
      ]
    },
    layout: {
      containerStyle: {
        padding: '3rem',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#FFFFFF'
      },
      zones: {
        title: {
          id: 'title',
          name: 'Slide Title',
          type: 'text',
          required: true,
          placeholder: 'Enter slide title',
          style: {
            fontSize: '2.5rem',
            fontWeight: '700',
            color: '#1F2937',
            margin: '0 0 2rem 0',
            borderBottom: '3px solid #3B82F6',
            paddingBottom: '1rem'
          }
        },
        content: {
          id: 'content',
          name: 'Content',
          type: 'text',
          required: true,
          placeholder: 'Add your content here...',
          style: {
            fontSize: '1.3rem',
            lineHeight: '1.8',
            color: '#374151',
            flex: '1',
            padding: '1rem 0'
          }
        }
      }
    },
    contentZones: [
      {
        id: 'title',
        name: 'Title',
        type: 'title',
        required: true,
        multiline: false,
        placeholder: 'Enter slide title'
      },
      {
        id: 'content',
        name: 'Content',
        type: 'content',
        required: true,
        multiline: true,
        placeholder: 'Add bullet points, paragraphs, or key information'
      }
    ],
    defaultContent: {
      title: 'Your Slide Title',
      content: '• First key point with supporting details\\n• Second important insight\\n• Third supporting evidence\\n• Conclusion or call to action'
    },
    validation: {
      requiredZones: ['title', 'content'],
      maxImages: 0,
      maxTextLength: 1000,
      allowedMediaTypes: []
    }
  },

  content_image: {
    type: 'content_image',
    name: 'Content + Image',
    description: 'Content on the left with supporting image on the right',
    category: 'visual',
    icon: '📄🖼️',
    preview: {
      backgroundColor: '#FFFFFF',
      primaryColor: '#1F2937',
      accentColor: '#3B82F6',
      textColor: '#374151',
      dimensions: { width: 320, height: 180 },
      zones: [
        {
          id: 'title',
          type: 'text',
          position: { x: 20, y: 15, width: 280, height: 20 },
          style: { fontSize: 14, fontWeight: 'bold', color: '#1F2937' },
          content: 'Content with Image'
        },
        {
          id: 'content',
          type: 'text',
          position: { x: 20, y: 45, width: 140, height: 110 },
          style: { fontSize: 9, color: '#374151' },
          content: '• Key insight one\\n• Important point two\\n• Supporting detail three'
        },
        {
          id: 'image',
          type: 'shape',
          position: { x: 180, y: 45, width: 120, height: 110 },
          style: { backgroundColor: '#E5E7EB', borderRadius: 8, border: '2px dashed #9CA3AF' },
          content: ''
        }
      ]
    },
    layout: {
      containerStyle: {
        padding: '3rem',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#FFFFFF'
      },
      zones: {
        title: {
          id: 'title',
          name: 'Slide Title',
          type: 'text',
          required: true,
          placeholder: 'Enter slide title',
          style: {
            fontSize: '2.5rem',
            fontWeight: '700',
            color: '#1F2937',
            margin: '0 0 2rem 0',
            borderBottom: '3px solid #3B82F6',
            paddingBottom: '1rem'
          }
        },
        contentArea: {
          id: 'contentArea',
          name: 'Content Area',
          type: 'custom',
          required: false,
          placeholder: '',
          style: {
            display: 'flex',
            flex: '1',
            alignItems: 'stretch',
            gap: '3rem'
          }
        },
        content: {
          id: 'content',
          name: 'Content',
          type: 'text',
          required: true,
          placeholder: 'Add your content here...',
          style: {
            flex: '1',
            fontSize: '1.2rem',
            lineHeight: '1.7',
            color: '#374151',
            padding: '1rem 0'
          }
        },
        image: {
          id: 'image',
          name: 'Supporting Image',
          type: 'image',
          required: false,
          placeholder: 'Click to add image',
          style: {
            flex: '1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#F9FAFB',
            border: '2px dashed #D1D5DB',
            borderRadius: '12px',
            minHeight: '300px'
          }
        }
      }
    },
    contentZones: [
      {
        id: 'title',
        name: 'Title',
        type: 'title',
        required: true,
        multiline: false,
        placeholder: 'Enter slide title'
      },
      {
        id: 'content',
        name: 'Content',
        type: 'content',
        required: true,
        multiline: true,
        placeholder: 'Add your main content, bullet points, or key information'
      },
      {
        id: 'image',
        name: 'Image',
        type: 'image',
        required: false,
        multiline: false,
        placeholder: 'Upload supporting image'
      }
    ],
    defaultContent: {
      title: 'Content with Supporting Image',
      content: '• First key point with detailed explanation\\n• Second important insight with context\\n• Third supporting evidence or example\\n• Summary or call to action',
      imageUrl: ''
    },
    validation: {
      requiredZones: ['title', 'content'],
      maxImages: 1,
      maxTextLength: 800,
      allowedMediaTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
    }
  },

  two_column: {
    type: 'two_column',
    name: 'Two Column',
    description: 'Split layout with content in two equal columns',
    category: 'content',
    icon: '📑',
    preview: {
      backgroundColor: '#FFFFFF',
      primaryColor: '#1F2937',
      accentColor: '#3B82F6',
      textColor: '#374151',
      dimensions: { width: 320, height: 180 },
      zones: [
        {
          id: 'title',
          type: 'text',
          position: { x: 20, y: 15, width: 280, height: 20 },
          style: { fontSize: 14, fontWeight: 'bold', color: '#1F2937' },
          content: 'Two Column Layout'
        },
        {
          id: 'leftColumn',
          type: 'text',
          position: { x: 20, y: 45, width: 135, height: 110 },
          style: { fontSize: 9, color: '#374151' },
          content: 'Left Column\\n• Point one\\n• Point two\\n• Point three'
        },
        {
          id: 'rightColumn',
          type: 'text',
          position: { x: 165, y: 45, width: 135, height: 110 },
          style: { fontSize: 9, color: '#374151' },
          content: 'Right Column\\n• Point A\\n• Point B\\n• Point C'
        }
      ]
    },
    layout: {
      containerStyle: {
        padding: '3rem',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#FFFFFF'
      },
      zones: {
        title: {
          id: 'title',
          name: 'Slide Title',
          type: 'text',
          required: true,
          placeholder: 'Enter slide title',
          style: {
            fontSize: '2.5rem',
            fontWeight: '700',
            color: '#1F2937',
            margin: '0 0 2rem 0',
            borderBottom: '3px solid #3B82F6',
            paddingBottom: '1rem'
          }
        },
        columnsContainer: {
          id: 'columnsContainer',
          name: 'Columns Container',
          type: 'custom',
          required: false,
          placeholder: '',
          style: {
            display: 'flex',
            flex: '1',
            gap: '3rem',
            alignItems: 'stretch'
          }
        },
        leftColumn: {
          id: 'leftColumn',
          name: 'Left Column',
          type: 'text',
          required: true,
          placeholder: 'Left column content...',
          style: {
            flex: '1',
            fontSize: '1.2rem',
            lineHeight: '1.7',
            color: '#374151',
            padding: '1.5rem',
            backgroundColor: '#F8FAFC',
            borderRadius: '12px',
            border: '1px solid #E2E8F0'
          }
        },
        rightColumn: {
          id: 'rightColumn',
          name: 'Right Column',
          type: 'text',
          required: true,
          placeholder: 'Right column content...',
          style: {
            flex: '1',
            fontSize: '1.2rem',
            lineHeight: '1.7',
            color: '#374151',
            padding: '1.5rem',
            backgroundColor: '#F0FDF4',
            borderRadius: '12px',
            border: '1px solid #BBF7D0'
          }
        }
      }
    },
    contentZones: [
      {
        id: 'title',
        name: 'Title',
        type: 'title',
        required: true,
        multiline: false,
        placeholder: 'Enter slide title'
      },
      {
        id: 'leftColumn',
        name: 'Left Column',
        type: 'content',
        required: true,
        multiline: true,
        placeholder: 'Add content for the left column'
      },
      {
        id: 'rightColumn',
        name: 'Right Column',
        type: 'content',
        required: true,
        multiline: true,
        placeholder: 'Add content for the right column'
      }
    ],
    defaultContent: {
      title: 'Comparison or Split Content',
      content: 'Left Column Content:\\n• First key point\\n• Supporting detail\\n• Additional insight|Right Column Content:\\n• Contrasting point\\n• Supporting evidence\\n• Conclusion or action'
    },
    validation: {
      requiredZones: ['title', 'leftColumn', 'rightColumn'],
      maxImages: 2,
      maxTextLength: 1200,
      allowedMediaTypes: ['image/jpeg', 'image/png', 'image/webp']
    }
  },

  data_visual: {
    type: 'data_visual',
    name: 'Data Visual',
    description: 'Chart or graph with supporting content and analysis',
    category: 'data',
    icon: '📊',
    preview: {
      backgroundColor: '#FFFFFF',
      primaryColor: '#1F2937',
      accentColor: '#3B82F6',
      textColor: '#374151',
      dimensions: { width: 320, height: 180 },
      zones: [
        {
          id: 'title',
          type: 'text',
          position: { x: 20, y: 15, width: 280, height: 20 },
          style: { fontSize: 14, fontWeight: 'bold', color: '#1F2937' },
          content: 'Data Visualization'
        },
        {
          id: 'chart',
          type: 'shape',
          position: { x: 20, y: 45, width: 180, height: 100 },
          style: { backgroundColor: '#EEF2FF', borderRadius: 8, border: '2px solid #C7D2FE' },
          content: ''
        },
        {
          id: 'insights',
          type: 'text',
          position: { x: 210, y: 45, width: 90, height: 100 },
          style: { fontSize: 8, color: '#374151' },
          content: 'Key Insights:\\n• Trend A\\n• Pattern B\\n• Insight C'
        }
      ]
    },
    layout: {
      containerStyle: {
        padding: '3rem',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#FFFFFF'
      },
      zones: {
        title: {
          id: 'title',
          name: 'Slide Title',
          type: 'text',
          required: true,
          placeholder: 'Enter slide title',
          style: {
            fontSize: '2.5rem',
            fontWeight: '700',
            color: '#1F2937',
            margin: '0 0 2rem 0',
            borderBottom: '3px solid #3B82F6',
            paddingBottom: '1rem'
          }
        },
        dataContainer: {
          id: 'dataContainer',
          name: 'Data Container',
          type: 'custom',
          required: false,
          placeholder: '',
          style: {
            display: 'flex',
            flex: '1',
            gap: '3rem',
            alignItems: 'stretch'
          }
        },
        chart: {
          id: 'chart',
          name: 'Chart/Visual',
          type: 'chart',
          required: true,
          placeholder: 'Add chart or data visualization',
          style: {
            flex: '2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#F8FAFC',
            border: '2px dashed #CBD5E1',
            borderRadius: '12px',
            minHeight: '400px'
          }
        },
        insights: {
          id: 'insights',
          name: 'Key Insights',
          type: 'text',
          required: true,
          placeholder: 'Add key insights and analysis',
          style: {
            flex: '1',
            fontSize: '1.2rem',
            lineHeight: '1.7',
            color: '#374151',
            padding: '2rem',
            backgroundColor: '#FFFBEB',
            borderRadius: '12px',
            border: '1px solid #FED7AA'
          }
        }
      }
    },
    contentZones: [
      {
        id: 'title',
        name: 'Title',
        type: 'title',
        required: true,
        multiline: false,
        placeholder: 'Enter slide title'
      },
      {
        id: 'chart',
        name: 'Chart/Visual',
        type: 'chart',
        required: true,
        multiline: false,
        placeholder: 'Add chart or data visualization'
      },
      {
        id: 'insights',
        name: 'Key Insights',
        type: 'content',
        required: true,
        multiline: true,
        placeholder: 'Add key insights, trends, and analysis'
      }
    ],
    defaultContent: {
      title: 'Data Analysis & Insights',
      content: 'Key Insights:\\n• Primary trend or pattern observed\\n• Secondary insight from the data\\n• Implications for decision making\\n• Recommended next steps'
    },
    validation: {
      requiredZones: ['title', 'chart', 'insights'],
      maxImages: 1,
      maxTextLength: 600,
      allowedMediaTypes: ['image/png', 'image/jpeg', 'image/svg+xml']
    }
  },

  // Add blank slide as a flexible option
  blank_slide: {
    type: 'blank_slide',
    name: 'Blank Slide',
    description: 'Completely customizable blank canvas',
    category: 'special',
    icon: '⚪',
    preview: {
      backgroundColor: '#FFFFFF',
      primaryColor: '#1F2937',
      accentColor: '#3B82F6',
      textColor: '#374151',
      dimensions: { width: 320, height: 180 },
      zones: [
        {
          id: 'canvas',
          type: 'shape',
          position: { x: 20, y: 20, width: 280, height: 140 },
          style: { backgroundColor: '#FAFAFA', borderRadius: 8, border: '1px dashed #D1D5DB' },
          content: ''
        }
      ]
    },
    layout: {
      containerStyle: {
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#FFFFFF'
      },
      zones: {
        canvas: {
          id: 'canvas',
          name: 'Blank Canvas',
          type: 'custom',
          required: false,
          placeholder: 'Design your custom slide layout',
          style: {
            flex: '1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FAFAFA',
            border: '1px dashed #D1D5DB',
            borderRadius: '12px',
            minHeight: '500px',
            position: 'relative'
          }
        }
      }
    },
    contentZones: [
      {
        id: 'canvas',
        name: 'Custom Content',
        type: 'custom',
        required: false,
        multiline: true,
        placeholder: 'Create your custom slide content'
      }
    ],
    defaultContent: {
      content: ''
    },
    validation: {
      requiredZones: [],
      maxImages: 10,
      maxTextLength: 2000,
      allowedMediaTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'video/mp4']
    }
  }
};

// Helper functions for template operations
export const getTemplatesByCategory = (category: string): SlideTemplate[] => {
  return Object.values(slideTemplates).filter(template => template.category === category);
};

export const getTemplateByType = (type: SlideTemplateType): SlideTemplate => {
  return slideTemplates[type];
};

export const getAllTemplates = (): SlideTemplate[] => {
  return Object.values(slideTemplates);
};

export const getDefaultContentForTemplate = (type: SlideTemplateType): any => {
  return slideTemplates[type].defaultContent;
};

export const validateSlideContent = (type: SlideTemplateType, content: any): boolean => {
  const template = slideTemplates[type];
  const validation = template.validation;
  
  // Check required zones
  for (const requiredZone of validation.requiredZones) {
    if (!content[requiredZone] || content[requiredZone].trim() === '') {
      return false;
    }
  }
  
  return true;
};