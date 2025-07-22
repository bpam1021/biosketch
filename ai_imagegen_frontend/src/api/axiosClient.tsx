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

export default axiosClient;
