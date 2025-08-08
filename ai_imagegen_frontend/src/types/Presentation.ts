export interface Slide {
  id: number;
  presentation: number;
  order: number;
  title: string;
  description: string;
  image_prompt: string;
  image_url: string;
  canvas_json: string;
  created_at: string;
  updated_at: string;
  content_type: 'slide' | 'section';
  rich_content?: string;
  diagrams?: DiagramElement[];
  animations?: AnimationConfig[];
  rendered_image?: string;
}

export interface Presentation {
  id: number;
  user: number;
  title: string;
  original_prompt: string;
  created_at: string;
  updated_at: string;
  is_exported: boolean;
  export_format: string | null;
  slides: Slide[];
  presentation_type: 'slides' | 'document';
  document_content?: string;
  document_settings?: DocumentSettings;
  video_settings?: VideoExportSettings;
  is_public: boolean;
  allow_comments: boolean;
  collaborators?: string[];
  is_template: boolean;
  template_category?: string;
  is_owner?: boolean;
}

export interface DiagramElement {
  id: string;
  type: 'flowchart' | 'mindmap' | 'timeline' | 'chart' | 'infographic' | 'process' | 'hierarchy';
  content: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  data?: any;
  template?: string;
  style?: DiagramStyle;
}

export interface DiagramStyle {
  theme: 'professional' | 'creative' | 'minimal' | 'academic';
  colorScheme: string[];
  fontSize: number;
  spacing: number;
}

export interface AnimationConfig {
  element_id: string;
  type: 'fadeIn' | 'slideIn' | 'zoomIn' | 'bounce' | 'typewriter' | 'reveal';
  duration: number;
  delay: number;
  easing: string;
  direction?: 'left' | 'right' | 'up' | 'down';
}

export interface VideoExportSettings {
  duration_per_slide: number;
  transition_type: 'fade' | 'slide' | 'zoom' | 'none';
  transition_duration: number;
  background_music?: string;
  narration_enabled: boolean;
  resolution: '720p' | '1080p' | '4k';
  quality: 'low' | 'medium' | 'high';
}

export interface ContentBlock {
  id: string;
  type: 'text' | 'image' | 'diagram' | 'table' | 'code' | 'quote' | 'list' | 'chart';
  content: any;
  position: { x: number; y: number };
  size: { width: number; height: number };
  styling: Record<string, any>;
  order: number;
}

export interface DocumentSettings {
  page_size: 'A4' | 'Letter' | 'Legal' | 'Custom';
  margins: { top: number; right: number; bottom: number; left: number };
  font_family: string;
  font_size: number;
  line_height: number;
  theme: 'default' | 'professional' | 'academic' | 'creative';
  header_footer: boolean;
  page_numbers: boolean;
  custom_css?: string;
}

export interface SectionData {
  id: string;
  title: string;
  content: string;
  type: 'heading' | 'paragraph' | 'list' | 'table' | 'image' | 'diagram';
  level?: number; // for headings
  order: number;
  metadata?: Record<string, any>;
}

export interface DiagramTemplate {
  id: string;
  name: string;
  type: 'flowchart' | 'mindmap' | 'timeline' | 'chart' | 'infographic';
  template: any;
  preview: string;
  description: string;
}

export interface PresentationOptions {
  slide_size: 'standard' | 'widescreen' | 'custom';
  custom_dimensions?: { width: number; height: number };
  theme: 'professional' | 'creative' | 'minimal' | 'academic';
  include_title_slide: boolean;
  include_conclusion: boolean;
  auto_generate_outline: boolean;
  content_depth: 'basic' | 'detailed' | 'comprehensive';
  include_references: boolean;
}

export interface ImportableContent {
  images: GeneratedImage[];
  diagrams: DiagramElement[];
  presentations: Presentation[];
}

export interface GeneratedImage {
  id: string;
  image_url: string;
  image_name: string;
  prompt: string;
  created_at: string;
  field?: string;
}

export interface ConversionOptions {
  diagram_type: 'flowchart' | 'mindmap' | 'timeline' | 'chart' | 'infographic';
  template: string;
  style: DiagramStyle;
  auto_layout: boolean;
}