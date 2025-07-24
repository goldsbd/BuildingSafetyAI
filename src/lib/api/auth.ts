import apiClient, { setAuthToken, clearAuthToken } from './client';
import type { LoginRequest, LoginResponse, User } from './types';

export const authApi = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', data);
    
    // Store the token
    setAuthToken(response.data.token);
    
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  logout() {
    // Clear the token
    clearAuthToken();
    
    // Redirect to login
    window.location.href = '/auth/login';
  },
};