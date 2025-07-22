import API from './axiosClient';

// === PUBLIC TEMPLATE CATEGORIES ===
export const getTemplateCategories = (query?: string, type?: string) =>
  API.get('/users/templates/categories/', {
    params: {
      ...(query ? { q: query } : {}),
      ...(type ? { type } : {}),
    },
  });

// === TEMPLATE REQUESTS ===
export const submitTemplateRequest = (message: string) =>
  API.post('/users/templates/request/', { message });

export const getUserTemplateRequests = () =>
  API.get('/users/templates/request/status/');