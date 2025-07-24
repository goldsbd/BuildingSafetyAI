import apiClient from './client';
import type { DocumentFolder } from './types';

export interface FolderTreeNode extends DocumentFolder {
  children?: FolderTreeNode[];
}

export const foldersApi = {
  // Get folder tree for a project
  async getFolderTree(projectId: string): Promise<FolderTreeNode[]> {
    const response = await apiClient.get(`/projects/${projectId}/folders/tree`);
    return response.data;
  },

  // Get folders for a project (flat list)
  async getFolders(projectId: string): Promise<DocumentFolder[]> {
    const response = await apiClient.get(`/projects/${projectId}/folders`);
    return response.data;
  },

  // Get a single folder
  async getFolder(folderId: string): Promise<DocumentFolder> {
    const response = await apiClient.get(`/folders/${folderId}`);
    return response.data;
  },

  // Create a new folder
  async createFolder(projectId: string, data: {
    folder_name: string;
    parent_folder_id?: string;
  }): Promise<DocumentFolder> {
    const response = await apiClient.post(`/projects/${projectId}/folders`, data);
    return response.data;
  },

  // Update a folder
  async updateFolder(folderId: string, data: {
    folder_name?: string;
  }): Promise<DocumentFolder> {
    const response = await apiClient.patch(`/folders/${folderId}`, data);
    return response.data;
  },

  // Delete a folder
  async deleteFolder(folderId: string): Promise<void> {
    await apiClient.delete(`/folders/${folderId}`);
  },

  // Refresh project cache
  async refreshProjectCache(projectId: string): Promise<{ message: string; project_id: string }> {
    const response = await apiClient.post(`/projects/${projectId}/folders/refresh-cache`);
    return response.data;
  },
};