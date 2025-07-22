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
  }
  