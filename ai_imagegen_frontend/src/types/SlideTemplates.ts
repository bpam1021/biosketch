// Comprehensive Slide Template System Types
// Beautiful and flexible slide template configurations

export interface SlideTemplate {
  type: SlideTemplateType;
  name: string;
  description: string;
  category: 'structure' | 'content' | 'visual' | 'data' | 'special';
  icon: string;
  preview: SlidePreviewConfig;
  layout: SlideLayoutConfig;
  contentZones: ContentZone[];
  defaultContent: DefaultContent;
  validation: ValidationRules;
}

export type SlideTemplateType = 
  | 'title_slide'           // Title page with main title, subtitle, presenter
  | 'agenda_overview'       // Presentation agenda/outline
  | 'section_divider'       // Section break slides
  | 'content_slide'         // Standard title + bullet points
  | 'two_column'           // Split layout with two columns
  | 'content_image'        // Content with image on right
  | 'image_content'        // Image on left, content on right
  | 'full_image'           // Full-screen image with overlay text
  | 'comparison'           // Side-by-side comparison
  | 'timeline'             // Timeline or process flow
  | 'data_visual'          // Chart/graph with supporting content
  | 'quote_testimonial'    // Large quote with attribution
  | 'conclusion_cta'       // Conclusion with call-to-action
  | 'thank_you'            // Final slide with contact info
  | 'blank_slide';         // Completely customizable blank slide

export interface SlidePreviewConfig {
  backgroundColor: string;
  primaryColor: string;
  accentColor: string;
  textColor: string;
  dimensions: {
    width: number;
    height: number;
  };
  zones: PreviewZone[];
}

export interface PreviewZone {
  id: string;
  type: 'text' | 'image' | 'icon' | 'shape';
  position: { x: number; y: number; width: number; height: number };
  style: {
    backgroundColor?: string;
    borderRadius?: number;
    border?: string;
    fontSize?: number;
    fontWeight?: string;
    textAlign?: 'left' | 'center' | 'right';
    color?: string;
  };
  content?: string;
}

export interface SlideLayoutConfig {
  containerStyle: {
    padding: string;
    display: string;
    flexDirection?: 'row' | 'column';
    alignItems?: string;
    justifyContent?: string;
    height: string;
    background?: string;
  };
  zones: {
    [key: string]: ZoneConfig;
  };
}

export interface ZoneConfig {
  id: string;
  name: string;
  type: 'text' | 'image' | 'media' | 'chart' | 'custom';
  required: boolean;
  placeholder: string;
  style: {
    flex?: string;
    width?: string;
    height?: string;
    padding?: string;
    margin?: string;
    textAlign?: string;
    fontSize?: string;
    fontWeight?: string;
    color?: string;
    backgroundColor?: string;
    borderRadius?: string;
    border?: string;
    display?: string;
    alignItems?: string;
    justifyContent?: string;
  };
  constraints?: {
    maxLength?: number;
    minLength?: number;
    imageFormats?: string[];
    maxImageSize?: number;
    aspectRatio?: string;
  };
}

export interface ContentZone {
  id: string;
  name: string;
  type: 'title' | 'subtitle' | 'content' | 'image' | 'chart' | 'media' | 'custom';
  required: boolean;
  multiline: boolean;
  placeholder: string;
  defaultValue?: string;
  validation?: {
    maxLength?: number;
    minLength?: number;
    pattern?: string;
  };
}

export interface DefaultContent {
  title?: string;
  subtitle?: string;
  content?: string;
  imageUrl?: string;
  mediaFiles?: any[];
  customFields?: { [key: string]: any };
}

export interface ValidationRules {
  requiredZones: string[];
  maxImages: number;
  maxTextLength: number;
  allowedMediaTypes: string[];
}

export interface SlideContentData {
  templateType: SlideTemplateType;
  zones: {
    [zoneId: string]: ZoneContent;
  };
  style: SlideStyleOverrides;
  metadata: SlideMetadata;
}

export interface ZoneContent {
  type: 'text' | 'image' | 'media' | 'chart';
  value: string | MediaFile | ChartData;
  formatting?: {
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    textAlign?: string;
    backgroundColor?: string;
  };
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface MediaFile {
  id: string;
  url: string;
  filename: string;
  type: 'image' | 'video' | 'audio';
  size: number;
  dimensions?: {
    width: number;
    height: number;
  };
  alt?: string;
}

export interface ChartData {
  type: string;
  data: any;
  config: any;
  title?: string;
}

export interface SlideStyleOverrides {
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  fontFamily?: string;
  fontSize?: number;
  padding?: string;
  borderRadius?: string;
}

export interface SlideMetadata {
  createdAt: string;
  updatedAt: string;
  version: number;
  aiGenerated: boolean;
  generationPrompt?: string;
  estimatedDuration: number;
  speakerNotes?: string;
  animations?: AnimationConfig[];
}

export interface AnimationConfig {
  elementId: string;
  type: 'fadeIn' | 'slideIn' | 'zoomIn' | 'bounce' | 'typewriter' | 'reveal';
  duration: number;
  delay: number;
  easing: string;
  direction?: 'left' | 'right' | 'up' | 'down';
}

// Template Category for organization
export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  templates: SlideTemplateType[];
}