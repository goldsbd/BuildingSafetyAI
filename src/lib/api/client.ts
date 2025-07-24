import axios, { AxiosInstance, AxiosError } from 'axios';

// Base API URL
const API_BASE_URL = 'http://localhost:3001/api';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Token management
let authToken: string | null = localStorage.getItem('auth_token');

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('auth_token');
      authToken = null;
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

// Export functions to manage token
export const setAuthToken = (token: string) => {
  authToken = token;
  localStorage.setItem('auth_token', token);
};

export const clearAuthToken = () => {
  authToken = null;
  localStorage.removeItem('auth_token');
};

export const getAuthToken = () => authToken;

// Error response type
export interface ApiError {
  error: string;
  message: string;
}

// Helper to extract error message
export const getErrorMessage = (error: any): string => {
  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data as ApiError;
    return data.message || 'An error occurred';
  }
  return error.message || 'An unexpected error occurred';
};

export default apiClient;