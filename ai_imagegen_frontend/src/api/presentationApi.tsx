import axios from "./axiosClient";
import { Presentation, Slide } from "../types/Presentation";

// Create a presentation from a prompt
export const createPresentation = async (
  title: string,
  prompt: string,
  quality: "low" | "medium" | "high"
): Promise<Presentation> => {
  const res = await axios.post("users/presentations/", {
    title,
    original_prompt: prompt,
    quality,
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