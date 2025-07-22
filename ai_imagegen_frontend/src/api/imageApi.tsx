import axiosClient from './axiosClient';

// Generate AI image(s)
export const generateImage = (data: object) =>
  axiosClient.post('users/images/generate/', data);

export const generateDescription = (data: { prompt: string, prompt_key: string }) =>
  axiosClient.post('users/images/generate-description/', data);

export const saveImageDescription = (data: { prompt_key: string; description: string }) =>
  axiosClient.post('users/images/save-description/', data);
// Remove background from uploaded image
export const removeBackground = (imageFile: Blob | File) => {
  const formData = new FormData();
  formData.append('image', imageFile, "uploaded_image.png");
  return axiosClient.post('users/images/remove-background/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'blob',
  });
};

// Remove text from uploaded image
export const removeText = (imageFile: Blob | File) => {
  const formData = new FormData();
  formData.append('image', imageFile, "uploaded_image.png");
  return axiosClient.post('users/images/remove-text/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'blob',
  });
};

// Get template images (static ones)
export const getTemplateImages = () => axiosClient.get('users/images/templates/');
