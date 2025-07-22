import axios from "./axiosClient";

/**
 * Send an image and a text prompt to OpenAI (via backend) for AI-powered image editing.
 * Returns the edited image as a base64-encoded PNG.
 */
export const editImageWithPrompt = async (
  image: File,
  prompt: string
): Promise<string> => {
  const formData = new FormData();
  formData.append("image", image);
  formData.append("prompt", prompt);

  const res = await axios.post("users/ai/image-edit/", formData);
  return res.data.image_base64; // base64 string
};
