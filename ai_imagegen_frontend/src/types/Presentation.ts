// Updated types to match new backend models

export interface PresentationTemplate {
  id: string;
  name: string;
  description: string;
  template_type: 'document' | 'slide';
  category: 'academic' | 'business' | 'creative' | 'technical' | 'medical' | 'educational' | 'marketing';
  thumbnail_url?: string;
  template_data: any;
  style_config: any;
  layout_config: any;
  is_premium: boolean;
  is_active: boolean;
  usage_count: number;
  created_at: string;
}

export interface ChartTemplate {
  id: string;
  name: string;
  description: string;
  category: 'data_viz' | 'process' | 'hierarchy' | 'comparison' | 'timeline' | 'geographic' | 'scientific' | 'flowchart' | 'mindmap' | 'infographic';
  chart_type: 'bar_chart' | 'line_chart' | 'pie_chart' | 'scatter_plot' | 'flowchart' | 'process_diagram' | 'org_chart' | 'timeline' | 'venn_diagram' | 'mindmap' | 'network_diagram' | 'infographic';
  template_config: any;
  style_options: any[];
  data_requirements: any;
  sample_data: any;
  generation_prompts: any;
  content_keywords: string[];
  thumbnail_url?: string;
  usage_count: number;
  is_premium: boolean;
  is_active: boolean;
  created_at: string;
}

export interface DiagramElement {
  id: string;
  chart_template?: string;
  chart_template_name?: string;
  title: string;
  chart_type: string;
  chart_data: any;
  style_config: any;
  source_content: string;
  generation_prompt?: string;
  ai_suggestions: any[];
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  z_index: number;
  rendered_image_url?: string;
  svg_data?: string;
  created_at: string;
  updated_at: string;
}

export interface ContentSection {
  id: string;
  section_type: 'heading' | 'paragraph' | 'list' | 'table' | 'image' | 'code' | 'quote' | 
                 'title_slide' | 'content_slide' | 'image_slide' | 'chart_slide' | 'comparison_slide' |
                 'diagram' | 'video' | 'audio' | 'interactive';
  title: string;
  order: number;
  content: string;
  rich_content: string;
  content_data: any;
  image_url?: string;
  image_prompt?: string;
  media_files: string[];
  layout_config: any;
  style_config: any;
  animation_config: any;
  interaction_config: any;
  ai_generated: boolean;
  generation_prompt?: string;
  generation_metadata: any;
  canvas_json?: string;
  rendered_image?: string;
  comments: any[];
  version_history: any[];
  diagrams: DiagramElement[];
  comments_count: number;
  created_at: string;
  updated_at: string;
}

export interface PresentationComment {
  id: string;
  author: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  position_data: any;
  parent?: string;
  is_resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  replies: PresentationComment[];
  created_at: string;
  updated_at: string;
}

export interface PresentationVersion {
  id: string;
  version_number: number;
  changes_summary: string;
  created_by: string;
  created_by_name: string;
  is_auto_save: boolean;
  created_at: string;
}

export interface PresentationExportJob {
  id: string;
  export_format: 'pdf' | 'docx' | 'pptx' | 'html' | 'mp4' | 'png' | 'json';
  export_settings: any;
  selected_sections: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  output_file_url?: string;
  output_url?: string;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  expires_at?: string;
  created_at: string;
}

export interface Presentation {
  id: string;
  title: string;
  description: string;
  presentation_type: 'document' | 'slide';
  original_prompt: string;
  quality: 'low' | 'medium' | 'high';
  generated_outline: any;
  generation_settings: any;
  template?: PresentationTemplate;
  theme_settings: any;
  brand_settings: any;
  document_content: string;
  document_settings: any;
  page_layout: 'single_column' | 'two_column' | 'three_column';
  collaborators: string[];
  is_public: boolean;
  allow_comments: boolean;
  sharing_settings: any;
  status: 'draft' | 'generating' | 'ready' | 'error' | 'archived';
  word_count: number;
  estimated_duration: number;
  export_settings: any;
  published_url?: string;
  is_exported: boolean;
  export_format?: string;
  video_settings: any;
  view_count: number;
  analytics_data: any;
  generation_cost: number;
  total_credits_used: number;
  sections: ContentSection[];
  versions: PresentationVersion[];
  comments: PresentationComment[];
  export_jobs: PresentationExportJob[];
  is_owner: boolean;
  can_edit: boolean;
  created_at: string;
  updated_at: string;
  last_accessed: string;
  published_at?: string;
}

// Create presentation request types
export interface CreatePresentationRequest {
  title: string;
  description?: string;
  presentation_type: 'document' | 'slide';
  original_prompt: string;
  quality: 'low' | 'medium' | 'high';
  template_id?: string;
  theme_settings?: any;
  brand_settings?: any;
  document_settings?: any;
  page_layout?: 'single_column' | 'two_column' | 'three_column';
  sections_config?: any;
  is_public?: boolean;
  allow_comments?: boolean;
  sharing_settings?: any;
}

// AI Generation types
export interface AIGenerationRequest {
  generation_type: 'presentation_outline' | 'section_content' | 'chart_generation' | 'image_generation' | 'content_enhancement' | 'summary_generation';
  prompt: string;
  presentation_id?: string;
  section_id?: string;
  content_length?: 'short' | 'medium' | 'long';
  tone?: 'professional' | 'casual' | 'academic' | 'creative' | 'technical';
  image_style?: string;
  image_dimensions?: string;
  chart_type?: string;
  data_source?: string;
}

// Export types
export interface ExportRequest {
  export_format: 'pdf' | 'docx' | 'pptx' | 'html' | 'mp4' | 'png' | 'json';
  selected_sections?: string[];
  export_settings?: {
    resolution?: '720p' | '1080p' | '4k';
    fps?: 24 | 30 | 60;
    duration_per_slide?: number;
    include_narration?: boolean;
    background_music?: boolean;
    transition_duration?: number;
    voice_type?: 'male' | 'female' | 'neutral';
    music_style?: 'none' | 'corporate' | 'inspiring' | 'calm' | 'energetic';
    export_quality?: 'draft' | 'standard' | 'high';
  };
}

// List response types
export interface PresentationListItem {
  id: string;
  title: string;
  description: string;
  presentation_type: 'document' | 'slide';
  status: string;
  template_name?: string;
  sections_count: number;
  is_public: boolean;
  last_export?: {
    format: string;
    created_at: string;
  };
  word_count: number;
  estimated_duration: number;
  view_count: number;
  created_at: string;
  updated_at: string;
  last_accessed: string;
}

// Animation types for slides
export interface AnimationConfig {
  element_id: string;
  type: 'fadeIn' | 'slideIn' | 'zoomIn' | 'bounce' | 'typewriter' | 'reveal';
  duration: number;
  delay: number;
  easing: string;
  direction?: 'left' | 'right' | 'up' | 'down';
}

// Chart suggestion types
export interface ChartSuggestion {
  chart_type: string;
  confidence: number;
  reason: string;
}

export interface ChartSuggestionRequest {
  content_text: string;
  current_section_type?: string;
}

// Search and filter types
export interface PresentationSearchParams {
  query?: string;
  presentation_type?: 'all' | 'document' | 'slide';
  category?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: 'updated' | 'created' | 'title' | 'type';
  order?: 'asc' | 'desc';
}

// Legacy types for backward compatibility
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
  animation_type?: 'fadeIn' | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown' | 'zoomIn' | 'zoomOut' | 'rotate' | 'bounce';
  animation_duration?: number;
  animation_delay?: number;
  transition_type?: 'fade' | 'slide' | 'push' | 'cover' | 'uncover';
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