import axiosClient from './axiosClient';

// 🔍 Community Groups
export const getAllCommunities = () =>
  axiosClient.get('/community/communities/');

export const getCommunityDetail = (groupId: number) =>
  axiosClient.get(`/community/communities/${groupId}/`);

export const createCommunity = (data: FormData) => {
  return axiosClient.post('/community/communities/', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};


export const joinCommunity = (groupId: number) =>
  axiosClient.post(`/community/communities/${groupId}/join/`);

export const inviteToPrivateCommunity = (groupId: number, username: string) =>
  axiosClient.post(`/community/communities/${groupId}/invite/`, { username });

// 📫 Memberships
export const getMyCommunities = () =>
  axiosClient.get('/community/communities/mine/');

export const leaveCommunity = (groupId: number) =>
  axiosClient.post(`/community/communities/${groupId}/leave/`);

// 📝 Community Posts
export const getCommunityPosts = (groupId: number, page = 1) =>
  axiosClient.get(`/community/communities/${groupId}/posts/?page=${page}`);

export const createCommunityPost = (groupId: number, data: FormData) =>
  axiosClient.post(`/community/communities/${groupId}/posts/`, data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

export const getPostComments = (postId: number) =>
  axiosClient.get(`/community/communities/posts/${postId}/comments/`);
  
export const addCommentToPost = (postId: number, content: string) =>
  axiosClient.post(`/community/communities/posts/${postId}/comments/`, { content });

// 💬 Community Chat
export const getChatHistory = (roomName: string) =>
  axiosClient.get(`/community/chat/${roomName}/`);

export const uploadChatMedia = (roomName: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return axiosClient.post(`/community/chat/${roomName}/upload/`, formData);
};

export const getFieldCategories = () =>
  axiosClient.get('/community/fields/');

export const publishImageToCommunity = (data: {
  image_url: string;
  image_name: string;
  prompt: string;
  field: number;
}) => axiosClient.post("/community/images/publish/", data);

export const getPublicImages = () =>
  axiosClient.get("/community/images/public/");

export const getImageDetail = (imageId: string) =>
  axiosClient.get(`/community/images/${imageId}/`);

export const toggleUpvote = (imageId: string) =>
  axiosClient.post(`/community/images/${imageId}/upvote/`);

export const toggleCommunityPostLike = (postId: number) =>
  axiosClient.post(`/community/community-posts/${postId}/like/`);

export const remixImage = (imageId: string, remixedId: string) =>
  axiosClient.post(`/community/images/${imageId}/remix/`, { remixed_id: remixedId });

// 💬 Image Comments
export const getImageComments = (imageId: string) =>
  axiosClient.get(`/community/images/${imageId}/comments/`);

export const postImageComment = (imageId: string, content: string) =>
  axiosClient.post(`/community/images/${imageId}/comments/`, { content });

// 🖼️ Filtered Image Search (public images)
export const getFilteredImages = (params: {
  field?: string;
  prompt?: string;
  date?: string;
  sort?: 'upvotes' | 'comments' | 'newest';
}) => axiosClient.get('/community/images/filtered/', { params });
