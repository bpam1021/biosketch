import axios from "./axiosClient";
import { Presentation, Slide } from "../types/Presentation";
import { PresentationOptions, ConversionOptions, ImportableContent } from "../types/Presentation";

// Create a presentation from a prompt
export const createPresentation = async (
  title: string,
  prompt: string,
  quality: "low" | "medium" | "high",
  presentationType: "document" | "slides" = "slides",
  options?: PresentationOptions
): Promise<Presentation> => {
  const res = await axios.post("users/presentations/", {
    title,
    original_prompt: prompt,
    quality,
    presentation_type: presentationType,
    options,
  });
  return res.data;
};


// Get a full presentation (includes all slides)
export const getPresentation = async (id: number): Promise<Presentation> => {
  const res = await axios.get(`users/presentations/${id}/`);
  return res.data;
};

export const listPresentations = async (): Promise<Presentation[]> => {
  const res = await axios.get("users/presentations/list/");
  return res.data.results ?? [];
};
// Reorder slides
export const reorderSlides = async (presentationId: number, slideIds: number[]): Promise<void> => {
  await axios.post(`users/presentations/${presentationId}/reorder/`, {
    slide_ids: slideIds,
  });
};

// Update title/description/canvas_json of a slide
export const updateSlide = async (
  slideId: number,
  data: Partial<Slide> & { data_url?: string }
): Promise<Slide> => {
  const res = await axios.put(`users/slides/${slideId}/`, data);
  return res.data;
};

// Save Fabric.js canvas JSON only
export const updateCanvasJSON = async (slideId: number, canvas_json: string): Promise<void> => {
  await axios.patch(`users/slides/${slideId}/canvas/`, { canvas_json });
};

// Regenerate slide title + description via AI
export const regenerateSlide = async (slideId: number): Promise<Slide> => {
  const res = await axios.post(`users/slides/${slideId}/regenerate/`);
  return res.data;
};

// Delete a slide
export const deleteSlide = async (slideId: number): Promise<void> => {
  await axios.delete(`users/slides/${slideId}/delete/`);
};

// Duplicate a slide
export const duplicateSlide = async (slideId: number): Promise<Slide> => {
  const res = await axios.post(`users/slides/${slideId}/duplicate/`);
  return res.data;
};

export const saveSlideImage = async (slideId: number, dataUrl: string) => {
  return await axios.post(`/users/slides/${slideId}/save_image/`, {
    image_data: dataUrl,
  });
};

// Export a presentation to pptx or pdf
export const exportPresentation = async (
  presentationId: number,
  format: "pptx" | "pdf" | "mp4",
  queryParams: string = ""
): Promise<void> => {
  const base = `users/presentations/${presentationId}/export/${format}/`;
  const url = queryParams ? `${base}${queryParams}` : base;
  await axios.get(url);
};


export const checkExportStatus = async (presentationId: number) => {
  const res = await axios.get(`users/presentations/${presentationId}/export/status/`);
  return res.data;
};

export const getForceDownloadUrl = (presentationId: number): string => {
  const base = axios.defaults.baseURL ?? "";
  return `${base}users/presentations/${presentationId}/export/force-download/`;
};

// Export presentation as video
export const exportPresentationVideo = async (
  presentationId: number,
  settings: any,
  selectedSlideIds?: number[]
): Promise<void> => {
  const queryParams = new URLSearchParams();
  if (selectedSlideIds && selectedSlideIds.length > 0) {
    queryParams.append('slide_ids', selectedSlideIds.join(','));
  }
  Object.entries(settings).forEach(([key, value]) => {
    queryParams.append(key, String(value));
  });
  
  await axios.get(`users/presentations/${presentationId}/export/mp4/?${queryParams.toString()}`);
};

// Convert text to diagram
export const convertTextToDiagram = async (
  text: string,
  options: ConversionOptions
): Promise<{ diagram_url: string; diagram_data: any; diagram_element: any }> => {
  const res = await axios.post("users/presentations/convert-diagram/", {
    text,
    diagram_type: options.diagram_type,
    template: options.template,
    style: options.style,
    auto_layout: options.auto_layout,
  });
  return res.data;
};

// Update slide animations
export const updateSlideAnimations = async (
  slideId: number,
  animations: any[]
): Promise<void> => {
  await axios.patch(`users/slides/${slideId}/animations/`, {
    animations,
  });
};

// Update document content
export const updateDocumentContent = async (
  presentationId: number,
  content: string,
  settings?: any
): Promise<void> => {
  await axios.patch(`users/presentations/${presentationId}/`, {
    document_content: content,
    document_settings: settings,
  });
};

// Get importable content (images, diagrams, presentations)
export const getImportableContent = async (): Promise<ImportableContent> => {
  const res = await axios.get("users/content/importable/");
  return res.data;
};

// Get available diagram templates
export const getDiagramTemplates = async (type?: string): Promise<any[]> => {
  const params = type ? { type } : {};
  const res = await axios.get("users/diagrams/templates/", { params });
  return res.data;
};
// Convert section to diagram
export const convertSectionToDiagram = async (
  sectionId: string,
  options: ConversionOptions
): Promise<{ diagram_element: any; preview_url: string }> => {
  const res = await axios.post("users/presentations/sections/convert-diagram/", {
    section_id: sectionId,
    ...options,
  });
  return res.data;
};

// Reorder sections in document
export const reorderSections = async (
  presentationId: number,
  sectionIds: string[]
): Promise<void> => {
  await axios.post(`users/presentations/${presentationId}/reorder-sections/`, {
    section_ids: sectionIds,
  });
};

// Update document settings
export const updateDocumentSettings = async (
  presentationId: number,
  settings: any
): Promise<void> => {
  await axios.patch(`users/presentations/${presentationId}/settings/`, {
    document_settings: settings,
  });
};

// Import content into presentation
export const importContentToPresentation = async (
  presentationId: number,
  contentType: 'image' | 'diagram' | 'slide',
  contentId: string,
  position?: { slideIndex?: number; sectionId?: string }
): Promise<void> => {
  await axios.post(`users/presentations/${presentationId}/import/`, {
    content_type: contentType,
    content_id: contentId,
    position,
  });
};