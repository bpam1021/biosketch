import axios from "axios";
import { API_BASE } from "../../constants/constants";

const API = axios.create({
  baseURL: `${API_BASE}/admin-api/`, // Adjust if your base path differs
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach admin token to all requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// === USER MANAGEMENT ===
export const fetchAllUsers = () => API.get("/users/");
export const fetchUserDetail = (userId: number) => API.get(`/users/${userId}/`);
export const fetchUserActivity = (userId: number) => API.get(`/users/${userId}/activity/`);
export const suspendUser = (userId: number) => API.post(`/users/${userId}/suspend/`);
export const deleteUser = (userId: number) => API.delete(`/users/${userId}/delete/`);

// === COMMUNITY GROUPS ===
export const fetchAllCommunities = () => API.get("/community-groups/");
export const fetchCommunityDetail = (groupId: number) => API.get(`/community-groups/${groupId}/`);
export const approveCommunity = (groupId: number) => API.post(`/community-groups/${groupId}/approve/`);
export const fetchCommunityStats = (groupId: number) => API.get(`/community-groups/${groupId}/stats/`);
export const banCommunity = (groupId: number) => API.post(`/community-groups/${groupId}/ban/`);
export const deleteCommunity = (groupId: number) => API.delete(`/community-groups/${groupId}/delete/`);

// === POSTS & COMMENTS ===
export const fetchAllPosts = () => API.get("/posts/");
export const deletePost = (postId: number) => API.delete(`/posts/${postId}/delete/`);
export const fetchAllComments = () => API.get("/comments/");
export const deleteComment = (commentId: number) => API.delete(`/comments/${commentId}/delete/`);

// === CHALLENGES ===
export const fetchChallenges = () => API.get("/challenges/");
export const createChallenge = (data: any) => API.post("/challenges/", data);
export const updateChallenge = (id: number, data: any) => API.put(`/challenges/${id}/`, data);
export const deleteChallenge = (id: number) => API.delete(`/challenges/${id}/`);

// === ACHIEVEMENTS ===
export const fetchAchievements = () => API.get("/achievements/");
export const createAchievement = (data: FormData) =>
    API.post("/achievements/", data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  
  export const updateAchievement = (id: number, data: FormData) =>
    API.put(`/achievements/${id}/`, data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
export const deleteAchievement = (id: number) => API.delete(`/achievements/${id}/`);
export const awardAchievement = (userId: number, achievementId: number) =>
    API.post(`/achievements/${achievementId}/award/${userId}/`);

export const searchUsers = (query: string) => API.get(`/users/search/?q=${query}`);

// === PAYMENTS & CREDITS ===
export const getCreditSummary = () => API.get("/transactions/summary/");
export const fetchUserTransactions = (userId: number) =>
    API.get(`/users/${userId}/transactions/`);
  

// === SETTINGS ===
export const fetchSystemSettings = () => API.get("/settings/system/");
export const updateSystemSettings = (data: any) => API.post("/settings/system/", data);

// === ANALYTICS ===
export const fetchPlatformStats = () => API.get("analytics/overview/");
export const fetchLeaderboardStats = () => API.get("analytics/leaderboard/");
export const fetchChallengeAnalytics = () => API.get("/analytics/challenges/");
export const fetchCreditAnalytics = () => API.get("/analytics/transactions/");
export const fetchUserGrowth = (granularity = "month") =>
    API.get(`/analytics/user-growth/?granularity=${granularity}`);
  export const fetchImageTrends = (granularity = "month") =>
    API.get(`/analytics/image-generation-trend/?granularity=${granularity}`);
  export const fetchCreditUserTrends = (granularity = "month") =>
    API.get(`/analytics/credit-user-trend/?granularity=${granularity}`);
  export const fetchCreditBreakdown = () =>
    API.get(`/analytics/credit-user-summary/`);

  // === TEMPLATE CATEGORIES ===
export const fetchTemplateCategories = () => API.get("/templates/categories/");
export const createTemplateCategory = (data: any) => API.post("/templates/categories/", data);
export const updateTemplateCategory = (id: number, data: any) => API.put(`/templates/categories/${id}/`, data);
export const deleteTemplateCategory = (id: number) => API.delete(`/templates/categories/${id}/`);

// === TEMPLATE IMAGES ===
export const fetchTemplateImages = () => API.get("/templates/images/");
export const createTemplateImage = (formData: FormData) =>
  API.post("/templates/images/", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
export const updateTemplateImage = (id: number, formData: FormData) =>
  API.put(`/templates/images/${id}/`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
export const deleteTemplateImage = (id: number) => API.delete(`/templates/images/${id}/`);

// === TEMPLATE REQUESTS ===
export const fetchTemplateRequests = () => API.get("/templates/requests/");
export const updateTemplateRequestStatus = (
  id: number,
  status: string,
  admin_response: string
) =>
  API.put("/templates/requests/", {
    id,
    status,
    admin_response,
  });

export const getDonationSummary = async () => {
  const res = await fetch('/donations/summary', {
    credentials: 'include',
  });
  return res.json();
};

export const fetchAllFeedback = (params: Record<string, any> = {}) =>
  API.get("/feedback/", { params });

// Get detail for one feedback entry
export const fetchFeedbackDetail = (id: number) =>
  API.get(`/feedback/${id}/`);

export const deleteFeedback = (id: number) =>
  API.delete(`/feedback/${id}/`);