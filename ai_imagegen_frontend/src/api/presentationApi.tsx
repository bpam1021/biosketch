import axios from "./axiosClient";
import { Presentation, Slide, Document } from "../types/Presentation";

// Create a presentation from a prompt
export const createPresentation = async (data: {
  title: string;
  prompt: string;
  quality: "low" | "medium" | "high";
  presentation_type: "document" | "slide";
  template_style?: string;
  page_layout?: string;
  sections?: string[];
  theme?: any;
}): Promise<Presentation> => {
  const res = await axios.post("users/presentations/", data);
  return res.data;
};

// Get a full presentation (includes all slides/document)
export const getPresentation = async (id: number): Promise<Presentation> => {
  const res = await axios.get(`users/presentations/${id}/`);
  return res.data;
};

export const listPresentations = async (): Promise<Presentation[]> => {
  const res = await axios.get("users/presentations/list/");
  return res.data.results ?? [];
};

// Document-specific APIs
export const updateDocument = async (id: number, data: Partial<Document>): Promise<Document> => {
  const res = await axios.put(`users/documents/${id}/`, data);
  return res.data;
};

export const generateDocumentSection = async (
  documentId: number, 
  sectionType: string, 
  prompt: string
): Promise<any> => {
  const res = await axios.post(`users/documents/${documentId}/generate-section/`, {
    section_type: sectionType,
    prompt
  });
  return res.data;
};

export const convertSectionToDiagram = async (
  sectionId: number, 
  diagramType: string
): Promise<any> => {
  const res = await axios.post(`users/document-sections/${sectionId}/convert-diagram/`, {
    diagram_type: diagramType
  });
  return res.data;
};

// Slide-specific APIs
export const reorderSlides = async (presentationId: number, slideIds: number[]): Promise<void> => {
  await axios.post(`users/presentations/${presentationId}/reorder/`, {
    slide_ids: slideIds,
  });
};

export const updateSlide = async (
  slideId: number,
  data: Partial<Slide> & { data_url?: string }
): Promise<Slide> => {
  const res = await axios.put(`users/slides/${slideId}/`, data);
  return res.data;
};

export const updateCanvasJSON = async (slideId: number, canvas_json: string): Promise<void> => {
  await axios.patch(`users/slides/${slideId}/canvas/`, { canvas_json });
};

export const regenerateSlide = async (slideId: number): Promise<Slide> => {
  const res = await axios.post(`users/slides/${slideId}/regenerate/`);
  return res.data;
};

export const deleteSlide = async (slideId: number): Promise<void> => {
  await axios.delete(`users/slides/${slideId}/delete/`);
};

export const duplicateSlide = async (slideId: number): Promise<Slide> => {
  const res = await axios.post(`users/slides/${slideId}/duplicate/`);
  return res.data;
};

export const uploadSlideImage = async (slideId: number, imageFile: File): Promise<string> => {
  const formData = new FormData();
  formData.append('image', imageFile);
  const res = await axios.post(`users/slides/${slideId}/upload-image/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data.image_url;
};

export const applySlideAnimation = async (
  slideId: number, 
  animationData: {
    animation_type: string;
    duration: number;
    delay: number;
    easing?: string;
  }
): Promise<Slide> => {
  const res = await axios.post(`users/slides/${slideId}/animate/`, animationData);
  return res.data;
};

// Advanced slide features
export const generateSlideTransitions = async (
  presentationId: number,
  transitionType: string
): Promise<void> => {
  await axios.post(`users/presentations/${presentationId}/transitions/`, {
    transition_type: transitionType
  });
};

export const exportPresentationVideo = async (
  presentationId: number,
  settings: {
    resolution: string;
    fps: number;
    duration_per_slide: number;
    include_narration: boolean;
    background_music?: boolean;
    transition_duration: number;
  }
): Promise<void> => {
  await axios.post(`users/presentations/${presentationId}/export-video/`, settings);
};

// Export functions
export const exportPresentation = async (
  presentationId: number,
  format: "pptx" | "pdf" | "mp4" | "docx",
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