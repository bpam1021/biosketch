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
    content_type: 'slide' | 'document';
    rich_content?: string;
    diagrams?: DiagramElement[];
    animations?: AnimationConfig[];
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
    video_settings?: VideoExportSettings;
  }

  export interface DiagramElement {
    id: string;
    type: 'flowchart' | 'mindmap' | 'timeline' | 'chart' | 'infographic';
    content: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    data?: any;
  }

  export interface AnimationConfig {
    element_id: string;
    type: 'fadeIn' | 'slideIn' | 'zoomIn' | 'bounce';
    duration: number;
    delay: number;
    easing: string;
  }

  export interface VideoExportSettings {
    duration_per_slide: number;
    transition_type: 'fade' | 'slide' | 'zoom' | 'none';
    transition_duration: number;
    background_music?: string;
    narration_enabled: boolean;
    resolution: '720p' | '1080p' | '4k';
  }
  