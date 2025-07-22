import axiosClient from './axiosClient';

// GET current user's full profile
export const getMyProfile = () => axiosClient.get('/users/profile/');

export const getPublicUserProfile = (username: string) =>
  axiosClient.get(`/users/profile/${username}/`);
// GET profile edit form data
export const getProfileEditData = () => axiosClient.get('/users/profile/edit/');

// PATCH or POST updated profile info
export const updateUserProfile = (data: FormData | object) => {
  const isFormData = data instanceof FormData;

  return axiosClient.post('/users/profile/edit/', data, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
  });
};

export const getUserImages = (username: string) =>
  axiosClient.get(`/users/profile/${username}/images/`);
// Change password
export const changePassword = (old_password: string, new_password: string) =>
  axiosClient.post('/users/profile/change-password/', { old_password, new_password });

// Delete account
export const deleteAccount = () => axiosClient.post('/users/profile/delete/');

// Get notification settings
export const getNotificationSettings = () => axiosClient.get('/users/profile/notifications/');

// Update notification settings
export const updateNotificationSettings = (data: object) =>
  axiosClient.post('/users/profile/notifications/', data);

export const followUser = (username: string) =>
  axiosClient.post(`/users/follow/${username}/`);

export const unfollowUser = (username: string) =>
  axiosClient.post(`/users/unfollow/${username}/`);

export const submitFeedback = (data: { name: string; email: string; message: string }) =>
  axiosClient.post('/users/feedback/', data);