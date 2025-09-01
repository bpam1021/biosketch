import axios from 'axios';
import { API_BASE } from '../constants/constants';

const baseurl = `${API_BASE}/api/`;

const axiosClient = axios.create({
  baseURL: baseurl,
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Response interceptor to handle authentication errors and token refresh
axiosClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized responses
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return axiosClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE}/api/users/auth/refresh/`, {
            refresh: refreshToken
          });
          
          const { access } = response.data;
          localStorage.setItem('access_token', access);
          
          // Update default headers
          axiosClient.defaults.headers.common['Authorization'] = 'Bearer ' + access;
          originalRequest.headers['Authorization'] = 'Bearer ' + access;
          
          processQueue(null, access);
          
          return axiosClient(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          
          // Refresh failed, clear tokens and redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          
          if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
            window.location.href = '/login';
          }
          
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        // No refresh token, redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosClient;
