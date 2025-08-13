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
  // Animation properties
  animation_type?: 'fadeIn' | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown' | 'zoomIn' | 'zoomOut' | 'rotate' | 'bounce';
  animation_duration?: number;
  animation_delay?: number;
  transition_type?: 'fade' | 'slide' | 'push' | 'cover' | 'uncover';
}
export interface AnimationConfig {
  element_id: string;
  type: 'fadeIn' | 'slideIn' | 'zoomIn' | 'bounce' | 'typewriter' | 'reveal';
  duration: number;
  delay: number;
  easing: string;
  direction?: 'left' | 'right' | 'up' | 'down';
}

export interface DocumentSection {
  id: number;
  document_id: number;
  section_type: 'heading' | 'paragraph' | 'list' | 'image' | 'diagram' | 'table' | 'code';
  content: string;
  order: number;
  formatting?: {
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    backgroundColor?: string;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  };
  image_url?: string;
  diagram_data?: any;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: number;
  user: number;
  title: string;
  original_prompt: string;
  created_at: string;
  updated_at: string;
  is_exported: boolean;
  export_format: string | null;
  sections: DocumentSection[];
  template_style?: 'academic' | 'business' | 'creative' | 'technical' | 'medical';
  page_layout?: 'single_column' | 'two_column' | 'three_column';
  header_footer?: {
    header?: string;
    footer?: string;
    page_numbers?: boolean;
  };
}

export interface Presentation {
  id: number;
  user: number;
  title: string;
  original_prompt: string;
  presentation_type: 'document' | 'slide';
  created_at: string;
  updated_at: string;
  is_exported: boolean;
  export_format: string | null;
  slides: Slide[];
  document?: Document;
  theme?: {
    primary_color?: string;
    secondary_color?: string;
    background_color?: string;
    font_family?: string;
  };
  animation_settings?: {
    global_transition?: string;
    slide_duration?: number;
    auto_advance?: boolean;
  };
}