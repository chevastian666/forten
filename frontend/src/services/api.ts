import axios, { AxiosError } from 'axios';
import { store } from '../store';
import { logout, refreshTokens } from '../store/authSlice';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3005/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state.auth.accessToken;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const state = store.getState();
        const refreshToken = state.auth.refreshToken;
        
        if (refreshToken) {
          await store.dispatch(refreshTokens()).unwrap();
          return api(originalRequest);
        }
      } catch (refreshError) {
        store.dispatch(logout());
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;