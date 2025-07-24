import apiClient from './client';
import type { Document, CreateDocumentRequest, UpdateDocumentRequest } from './types';

export interface ExtractionConfig {
  target_size: number;
  overlap: number;
  min_size: number;
  max_size: number;
  respect_sections: boolean;
  extract_references: boolean;
}

export interface DocumentChunk {
  chunk_id: string;
  index: number;
  content: string;
  token_count: number;
  pages: number[];
  section_context?: string;
  metadata: {
    structure: {
      headings: string[];
      has_figure: boolean;
      has_table: boolean;
      has_list: boolean;
      text_formatting: string[];
    };
    references: {
      documents: string[];
      sections: string[];
      figures: string[];
      standards: string[];
    };
    positioning?: {
      start_coords?: { x: number; y: number; page: number };
      end_coords?: { x: number; y: number; page: number };
    };
    text_features: {
      avg_font_size: number;
      primary_font: string;
      emphasis_count: number;
      language: string;
    };
  };
}

export interface DocumentStructure {
  sections: Array<{
    level: number;
    title: string;
    page: number;
    start_pos: number;
  }>;
  figures: Array<{
    number: string;
    title: string;
    page: number;
  }>;
  tables: Array<{
    number: string;
    title: string;
    page: number;
  }>;
}

export interface ExtractionStats {
  pages: number;
  processing_time_ms: number;
  total_chunks: number;
  avg_chunk_tokens: number;
  figures_found: number;
  tables_found: number;
  references_extracted: number;
}

export interface ExtractionResult {
  stats: ExtractionStats;
  structure: DocumentStructure;
  chunks: DocumentChunk[];
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
  folder_id?: string;
  category_id?: string;
  search?: string;
  root_only?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const documentsApi = {
  // Get all documents for a project (legacy - for backward compatibility)
  async getDocuments(projectId: string): Promise<Document[]> {
    const response = await apiClient.get(`/projects/${projectId}/documents`);
    // Handle both old array response and new paginated response
    return Array.isArray(response.data) ? response.data : response.data.data;
  },

  // Get paginated documents for a project
  async getDocumentsPaginated(
    projectId: string, 
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<Document>> {
    const response = await apiClient.get(`/projects/${projectId}/documents`, { params });
    return response.data;
  },

  // Get a single document
  async getDocument(documentId: string): Promise<Document> {
    const response = await apiClient.get(`/documents/${documentId}`);
    return response.data;
  },

  // Upload a document
  async uploadDocument(
    projectId: string, 
    file: File, 
    data: Partial<CreateDocumentRequest>,
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add other fields to form data
    if (data.category_id) formData.append('category_id', data.category_id);
    if (data.metadata) formData.append('metadata', JSON.stringify(data.metadata));

    const response = await apiClient.post(`/projects/${projectId}/documents/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress
    });
    return response.data;
  },

  // Update a document
  async updateDocument(documentId: string, data: UpdateDocumentRequest): Promise<Document> {
    const response = await apiClient.patch(`/documents/${documentId}`, data);
    return response.data;
  },

  // Delete a document
  async deleteDocument(documentId: string): Promise<void> {
    await apiClient.delete(`/documents/${documentId}`);
  },

  // Download a document
  async downloadDocument(documentId: string): Promise<Blob> {
    const response = await apiClient.get(`/documents/${documentId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Test PDF extraction
  async testExtractDocument(documentId: string, config: ExtractionConfig): Promise<ExtractionResult> {
    const response = await apiClient.post(`/documents/${documentId}/extract-test`, config);
    return response.data;
  },
};