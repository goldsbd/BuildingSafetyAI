import apiClient from './client';
import type { Project, CreateProjectRequest, UpdateProjectRequest } from './types';

export const projectsApi = {
  async getProjects(companyId?: string): Promise<Project[]> {
    const params = companyId ? { company_id: companyId } : {};
    const response = await apiClient.get<Project[]>('/projects', { params });
    return response.data;
  },

  async getProject(id: string): Promise<Project> {
    const response = await apiClient.get<Project>(`/projects/${id}`);
    return response.data;
  },

  async createProject(data: CreateProjectRequest): Promise<Project> {
    const response = await apiClient.post<Project>('/projects', data);
    return response.data;
  },

  async updateProject(id: string, data: UpdateProjectRequest): Promise<Project> {
    const response = await apiClient.put<Project>(`/projects/${id}`, data);
    return response.data;
  },

  async deleteProject(id: string): Promise<void> {
    await apiClient.delete(`/projects/${id}`);
  },
};