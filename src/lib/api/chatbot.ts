import apiClient from './client';

export interface ChatSession {
  id: string;
  project_id: string;
  user_id: string;
  session_name: string;
  created_at: string;
  last_message_at: string;
  is_active: boolean;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  search_results?: ChunkSource[];
  token_usage?: TokenUsage;
  created_at: string;
}

export interface ChunkSource {
  document_name: string;
  document_id: string;
  page_numbers: number[];
  chunk_content: string;
  relevance_score: number;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatResponse {
  content: string;
  sources: ChunkSource[];
  token_usage: TokenUsage;
}

export interface CreateSessionRequest {
  session_name?: string;
}

export interface SendMessageRequest {
  content: string;
}

export interface UpdateSessionRequest {
  session_name: string;
}

export const chatbotApi = {
  async createChatSession(projectId: string, request: CreateSessionRequest): Promise<{ success: boolean; session: ChatSession }> {
    const response = await apiClient.post(`/chat/projects/${projectId}/sessions`, request);
    return response.data;
  },

  async getProjectSessions(projectId: string): Promise<{ success: boolean; sessions: ChatSession[] }> {
    const response = await apiClient.get(`/chat/projects/${projectId}/sessions`);
    return response.data;
  },

  async sendMessage(sessionId: string, request: SendMessageRequest): Promise<{ success: boolean; response: ChatResponse }> {
    const response = await apiClient.post(`/chat/sessions/${sessionId}/messages`, request);
    return response.data;
  },

  async getChatHistory(sessionId: string, limit = 50, offset = 0): Promise<{ success: boolean; messages: ChatMessage[] }> {
    const response = await apiClient.get(`/chat/sessions/${sessionId}/messages`, {
      params: { limit, offset }
    });
    return response.data;
  },

  async updateSessionName(sessionId: string, request: UpdateSessionRequest): Promise<{ success: boolean; session: ChatSession }> {
    const response = await apiClient.put(`/chat/sessions/${sessionId}`, request);
    return response.data;
  },

  async deleteChatSession(sessionId: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete(`/chat/sessions/${sessionId}`);
    return response.data;
  },

  async getUserSessions(projectId?: string): Promise<{ success: boolean; sessions: ChatSession[] }> {
    const params = projectId ? { project_id: projectId } : {};
    const response = await apiClient.get('/chat/sessions', { params });
    return response.data;
  }
};