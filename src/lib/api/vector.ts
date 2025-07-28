import apiClient from './client';

export interface VectorConfig {
  embedding_model: string;
  chunk_size: number;
  chunk_overlap: number;
  auto_index: boolean;
}

export interface VectorStats {
  status?: string;
  chunk_count: number;
  document_count: number;
  storage_size_bytes: number;
  last_indexed?: string;
  index_duration_ms?: number;
}

export interface VectorOperationLog {
  id: string;
  project_id: string;
  operation_type: string;
  status: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  documents_processed: number;
  chunks_created: number;
  error_message?: string;
  metadata?: any;
}

export interface ChunkResult {
  chunk_id: string;
  document_id: string;
  document_name: string;
  content: string;
  page_numbers: number[];
  similarity_score: number;
  chunk_metadata?: any;
}

export interface SearchRequest {
  query: string;
  limit?: number;
  similarity_threshold?: number;
}

export interface SearchResponse {
  success: boolean;
  results: ChunkResult[];
  count: number;
}

export interface DocumentProcessingStatus {
  id: string;
  project_id: string;
  document_id: string;
  document_name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress_percentage: number;
  total_pages?: number;
  processed_pages: number;
  total_chunks?: number;
  processed_chunks: number;
  start_time?: string;
  end_time?: string;
  processing_time_ms?: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ProcessingProgress {
  project_id: string;
  status: string;
  total_documents: number;
  processed_documents: number;
  total_chunks: number;
  processed_chunks: number;
  start_time?: string;
  estimated_completion_time?: string;
  documents: DocumentProcessingStatus[];
}

export const vectorApi = {
  async initializeVectorDB(projectId: string, config: VectorConfig): Promise<{ success: boolean; stats: VectorStats }> {
    const response = await apiClient.post(`/projects/${projectId}/vector-db/initialize`, config);
    return response.data;
  },

  async startIndexing(projectId: string): Promise<{ success: boolean; operation_id: string }> {
    const response = await apiClient.post(`/projects/${projectId}/vector-db/start-indexing`);
    return response.data;
  },


  async getVectorStats(projectId: string): Promise<VectorStats | null> {
    try {
      const response = await apiClient.get(`/projects/${projectId}/vector-db/stats`);
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return null; // Vector DB not configured
      }
      if (error?.response?.status === 401) {
        console.error('Authentication failed for vector stats');
        return null; // Return null for auth errors to prevent UI errors
      }
      console.error('Vector stats API error:', error);
      return null; // Return null for any other errors to prevent UI crashes
    }
  },

  async searchDocuments(projectId: string, searchRequest: SearchRequest): Promise<SearchResponse> {
    const response = await apiClient.post(`/projects/${projectId}/vector-db/search`, searchRequest);
    return response.data;
  },

  async getOperationsLog(projectId: string, limit = 50, offset = 0): Promise<{ success: boolean; operations: VectorOperationLog[] }> {
    try {
      const response = await apiClient.get(`/projects/${projectId}/vector-db/operations-log`, {
        params: { limit, offset }
      });
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return { success: true, operations: [] }; // Return empty operations when not configured
      }
      if (error?.response?.status === 401) {
        console.error('Authentication failed for operations log');
        return { success: true, operations: [] }; // Return empty for auth errors
      }
      console.error('Operations log API error:', error);
      return { success: true, operations: [] }; // Return empty for any other errors
    }
  },

  async deleteVectorDB(projectId: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete(`/projects/${projectId}/vector-db`);
    return response.data;
  },

  async getProcessingProgress(projectId: string): Promise<ProcessingProgress> {
    const response = await apiClient.get(`/projects/${projectId}/vector-db/progress`);
    return response.data;
  },

  async cleanupMacOSXEntries(projectId: string): Promise<{ success: boolean; message: string; deleted_count: number }> {
    const response = await apiClient.delete(`/projects/${projectId}/vector-db/cleanup-macosx`);
    return response.data;
  }
};