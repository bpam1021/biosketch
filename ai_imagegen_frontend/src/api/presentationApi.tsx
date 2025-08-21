import axios from "./axiosClient";
import { 
  Presentation, 
  PresentationListItem, 
  ContentSection, 
  CreatePresentationRequest,
  PresentationTemplate,
  ChartTemplate,
  DiagramElement,
  ExportRequest,
  PresentationExportJob,
  AIGenerationRequest,
  ChartSuggestionRequest,
  PresentationSearchParams,
  PresentationComment
} from "../types/Presentation";

// ============================================================================
// PRESENTATION CRUD OPERATIONS
// ============================================================================

export const listPresentations = async (params?: PresentationSearchParams): Promise<{ results: PresentationListItem[]; count: number }> => {
  const searchParams = new URLSearchParams();
  if (params?.query) searchParams.append('search', params.query);
  if (params?.presentation_type && params.presentation_type !== 'all') searchParams.append('presentation_type', params.presentation_type);
  if (params?.category) searchParams.append('category', params.category);
  if (params?.date_from) searchParams.append('created_at__gte', params.date_from);
  if (params?.date_to) searchParams.append('created_at__lte', params.date_to);
  if (params?.sort_by) {
    const ordering = params.order === 'asc' ? params.sort_by : `-${params.sort_by}`;
    searchParams.append('ordering', ordering);
  }
  
  const url = `presentations/${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
  const res = await axios.get(url);
  return res.data;
};

export const getPresentation = async (id: string): Promise<Presentation> => {
  const res = await axios.get(`presentations/${id}/`);
  return res.data;
};

export const createPresentation = async (data: CreatePresentationRequest): Promise<Presentation> => {
  const res = await axios.post("presentations/", data);
  return res.data;
};

export const updatePresentation = async (id: string, data: Partial<Presentation>): Promise<Presentation> => {
  const res = await axios.patch(`presentations/${id}/`, data);
  return res.data;
};

export const deletePresentation = async (id: string): Promise<void> => {
  await axios.delete(`presentations/${id}/`);
};

export const duplicatePresentation = async (id: string): Promise<Presentation> => {
  const res = await axios.post(`presentations/${id}/duplicate/`);
  return res.data;
};

// ============================================================================
// CONTENT SECTION OPERATIONS
// ============================================================================

export const listSections = async (presentationId: string): Promise<ContentSection[]> => {
  const res = await axios.get(`presentations/${presentationId}/sections/`);
  return res.data.results || res.data;
};

export const getSection = async (presentationId: string, sectionId: string): Promise<ContentSection> => {
  const res = await axios.get(`presentations/${presentationId}/sections/${sectionId}/`);
  return res.data;
};

export const createSection = async (presentationId: string, data: Partial<ContentSection>): Promise<ContentSection> => {
  const res = await axios.post(`presentations/${presentationId}/sections/`, data);
  return res.data;
};

export const updateSection = async (presentationId: string, sectionId: string, data: Partial<ContentSection>): Promise<ContentSection> => {
  const res = await axios.patch(`presentations/${presentationId}/sections/${sectionId}/`, data);
  return res.data;
};

export const deleteSection = async (presentationId: string, sectionId: string): Promise<void> => {
  await axios.delete(`presentations/${presentationId}/sections/${sectionId}/`);
};

export const reorderSections = async (presentationId: string, sectionOrders: { id: string; order: number }[]): Promise<void> => {
  await axios.post(`presentations/${presentationId}/reorder-sections/`, {
    section_orders: sectionOrders
  });
};

export const bulkUpdateSections = async (presentationId: string, sections: Partial<ContentSection>[]): Promise<void> => {
  await axios.post(`presentations/${presentationId}/bulk-update-sections/`, {
    sections
  });
};

// ============================================================================
// AI GENERATION
// ============================================================================

export const generateAIContent = async (data: AIGenerationRequest): Promise<any> => {
  const res = await axios.post("ai/generate/", data);
  return res.data;
};

export const generateSectionContent = async (sectionId: string, data: Partial<AIGenerationRequest>): Promise<ContentSection> => {
  const res = await axios.post(`sections/${sectionId}/generate-content/`, data);
  return res.data;
};

export const enhanceContent = async (sectionId: string, data: {
  enhancement_type: 'grammar' | 'clarity' | 'expand' | 'summarize' | 'rephrase' | 'format';
  target_audience?: 'general' | 'technical' | 'academic' | 'business' | 'students';
  additional_instructions?: string;
}): Promise<ContentSection> => {
  const res = await axios.post(`sections/${sectionId}/enhance/`, data);
  return res.data;
};

export const suggestCharts = async (data: ChartSuggestionRequest): Promise<{
  suggestions: Array<{ chart_type: string; confidence: number; reason: string }>;
  templates: ChartTemplate[];
}> => {
  const res = await axios.post("ai/suggest-charts/", data);
  return res.data;
};

// ============================================================================
// DIAGRAMS AND CHARTS
// ============================================================================

export const createDiagram = async (presentationId: string, sectionId: string, data: {
  chart_template?: string;
  title: string;
  chart_type: string;
  chart_data?: any;
  style_config?: any;
  content_text: string;
  generation_prompt?: string;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
}): Promise<DiagramElement> => {
  const res = await axios.post(`presentations/${presentationId}/sections/${sectionId}/diagrams/`, data);
  return res.data;
};

export const updateDiagram = async (presentationId: string, sectionId: string, diagramId: string, data: Partial<DiagramElement>): Promise<DiagramElement> => {
  const res = await axios.patch(`presentations/${presentationId}/sections/${sectionId}/diagrams/${diagramId}/`, data);
  return res.data;
};

export const deleteDiagram = async (presentationId: string, sectionId: string, diagramId: string): Promise<void> => {
  await axios.delete(`presentations/${presentationId}/sections/${sectionId}/diagrams/${diagramId}/`);
};

export const regenerateDiagram = async (diagramId: string, additionalPrompt?: string): Promise<DiagramElement> => {
  const res = await axios.post(`diagrams/${diagramId}/regenerate/`, {
    additional_prompt: additionalPrompt
  });
  return res.data;
};

// ============================================================================
// TEMPLATES
// ============================================================================

export const listPresentationTemplates = async (params?: {
  template_type?: 'document' | 'slide';
  category?: string;
  search?: string;
}): Promise<PresentationTemplate[]> => {
  const searchParams = new URLSearchParams();
  if (params?.template_type) searchParams.append('template_type', params.template_type);
  if (params?.category) searchParams.append('category', params.category);
  if (params?.search) searchParams.append('search', params.search);
  
  const url = `presentation-templates/${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
  const res = await axios.get(url);
  return res.data.results || res.data;
};

export const listChartTemplates = async (params?: {
  category?: string;
  chart_type?: string;
  search?: string;
}): Promise<ChartTemplate[]> => {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.append('category', params.category);
  if (params?.chart_type) searchParams.append('chart_type', params.chart_type);
  if (params?.search) searchParams.append('search', params.search);
  
  const url = `chart-templates/${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
  const res = await axios.get(url);
  return res.data.results || res.data;
};

export const applyTemplate = async (presentationId: string, templateId: string): Promise<{ message: string }> => {
  const res = await axios.post(`presentations/${presentationId}/apply-template/`, {
    template_id: templateId
  });
  return res.data;
};

// ============================================================================
// EXPORT FUNCTIONALITY
// ============================================================================

export const exportPresentation = async (presentationId: string, data: ExportRequest): Promise<{ job_id: string; message: string }> => {
  const res = await axios.post(`presentations/${presentationId}/export/`, data);
  return res.data;
};

export const getExportStatus = async (presentationId: string): Promise<{ jobs: PresentationExportJob[] }> => {
  const res = await axios.get(`presentations/${presentationId}/export-status/`);
  return res.data;
};

export const downloadExport = async (presentationId: string, format: string): Promise<void> => {
  const response = await axios.get(`presentations/${presentationId}/export/force-download/`, {
    responseType: 'blob',
    withCredentials: true,
  });

  const blob = new Blob([response.data]);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `presentation.${format}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// ============================================================================
// COMMENTS AND COLLABORATION
// ============================================================================

export const listComments = async (presentationId: string): Promise<PresentationComment[]> => {
  const res = await axios.get(`presentations/${presentationId}/comments/`);
  return res.data.results || res.data;
};

export const createComment = async (presentationId: string, data: {
  content: string;
  content_section?: string;
  position_data?: any;
  parent?: string;
}): Promise<PresentationComment> => {
  const res = await axios.post(`presentations/${presentationId}/comments/`, data);
  return res.data;
};

export const updateComment = async (presentationId: string, commentId: string, data: {
  content?: string;
  is_resolved?: boolean;
}): Promise<PresentationComment> => {
  const res = await axios.patch(`presentations/${presentationId}/comments/${commentId}/`, data);
  return res.data;
};

export const deleteComment = async (presentationId: string, commentId: string): Promise<void> => {
  await axios.delete(`presentations/${presentationId}/comments/${commentId}/`);
};

// ============================================================================
// ANALYTICS
// ============================================================================

export const getPresentationAnalytics = async (presentationId: string): Promise<{
  views_count: number;
  unique_viewers: number;
  average_time_spent: number;
  export_count: number;
  comment_count: number;
  collaboration_stats: {
    collaborators_count: number;
    active_collaborators: number;
  };
  section_engagement: any;
  word_count: number;
  estimated_duration: number;
  credits_used: number;
}> => {
  const res = await axios.get(`presentations/${presentationId}/analytics/`);
  return res.data;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const uploadImage = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append('image', file);
  const res = await axios.post('images/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const saveCanvasImage = async (sectionId: string, canvasJson: string, dataUrl: string): Promise<ContentSection> => {
  const res = await axios.patch(`sections/${sectionId}/`, {
    canvas_json: canvasJson,
    rendered_image: dataUrl
  });
  return res.data;
};

// ============================================================================
// LEGACY COMPATIBILITY FUNCTIONS (for backward compatibility)
// ============================================================================

// These functions maintain compatibility with old slide-based components
export const reorderSlides = async (presentationId: string, slideIds: string[]): Promise<void> => {
  const sectionOrders = slideIds.map((id, index) => ({ id, order: index }));
  await reorderSections(presentationId, sectionOrders);
};

export const updateSlide = async (slideId: string, data: any): Promise<any> => {
  // Convert slide data to section data if needed
  const sectionData = {
    title: data.title,
    content: data.description,
    canvas_json: data.canvas_json,
    image_url: data.image_url,
    ...data
  };
  
  // This would need the presentation ID - you might need to track this in your component state
  // For now, this is a placeholder that would need to be updated based on your component structure
  throw new Error("updateSlide needs to be called with presentation context");
};

export const regenerateSlide = async (slideId: string): Promise<any> => {
  // Similar to updateSlide, this needs presentation context
  throw new Error("regenerateSlide needs to be updated to use new section-based approach");
};

export const deleteSlide = async (slideId: string): Promise<void> => {
  // Similar to updateSlide, this needs presentation context
  throw new Error("deleteSlide needs to be updated to use new section-based approach");
};

export const duplicateSlide = async (slideId: string): Promise<any> => {
  // Similar to updateSlide, this needs presentation context
  throw new Error("duplicateSlide needs to be updated to use new section-based approach");
};

// Updated versions that require presentation context
export const updateSectionAsSlide = async (presentationId: string, sectionId: string, data: any): Promise<ContentSection> => {
  return updateSection(presentationId, sectionId, {
    title: data.title,
    content: data.description,
    canvas_json: data.canvas_json,
    image_url: data.image_url,
    section_type: 'content_slide',
    ...data
  });
};

export const regenerateSectionAsSlide = async (presentationId: string, sectionId: string): Promise<ContentSection> => {
  return generateSectionContent(sectionId, {
    generation_type: 'section_content',
    prompt: 'Regenerate this slide content',
    content_length: 'medium',
    tone: 'professional'
  });
};

export const deleteSectionAsSlide = async (presentationId: string, sectionId: string): Promise<void> => {
  return deleteSection(presentationId, sectionId);
};

export const duplicateSectionAsSlide = async (presentationId: string, sectionId: string): Promise<ContentSection> => {
  const section = await getSection(presentationId, sectionId);
  return createSection(presentationId, {
    ...section,
    title: `${section.title} (Copy)`,
    order: section.order + 1
  });
};

export const checkAccessibility = async (presentationId: string) => {
  const res = await axios.get(`presentations/${presentationId}/accessibility-check/`);
  return res.data;
};

export const analyzePresentationPerformance = async (presentationId: string) => {
  const res = await axios.get(`presentations/${presentationId}/performance-analysis/`);
  return res.data;
};