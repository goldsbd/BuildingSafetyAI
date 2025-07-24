import apiClient from './client';

// Types
export interface LLMProvider {
  id: string;
  name: string;
  display_name: string;
  is_active: boolean;
  api_base_url?: string;
  created_at: string;
  updated_at: string;
}

export interface LLMModel {
  id: string;
  provider_id: string;
  model_identifier: string;
  display_name: string;
  max_input_tokens?: number;
  max_output_tokens?: number;
  total_context_window?: number;
  input_token_price: number;
  output_token_price: number;
  price_markup_multiplier: number;
  supports_vision: boolean;
  supports_function_calling: boolean;
  supports_batching: boolean;
  batch_input_token_price?: number;
  batch_output_token_price?: number;
  is_active: boolean;
  is_default: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface LLMModelWithProvider extends LLMModel {
  provider_name: string;
  provider_display_name: string;
}

export interface ApiKey {
  id: string;
  provider_id: string;
  provider_name: string;
  provider_display_name: string;
  key_hint?: string;
  is_active: boolean;
  created_at: string;
  last_used_at?: string;
}

export interface CreateModelRequest {
  provider_id: string;
  model_identifier: string;
  display_name: string;
  max_input_tokens?: number;
  max_output_tokens?: number;
  total_context_window?: number;
  input_token_price: number;
  output_token_price: number;
  price_markup_multiplier?: number;
  supports_vision: boolean;
  supports_function_calling: boolean;
  supports_batching: boolean;
  batch_input_token_price?: number;
  batch_output_token_price?: number;
  is_active: boolean;
  is_default: boolean;
}

export interface UpdateModelRequest {
  display_name?: string;
  max_input_tokens?: number;
  max_output_tokens?: number;
  total_context_window?: number;
  input_token_price?: number;
  output_token_price?: number;
  price_markup_multiplier?: number;
  supports_vision?: boolean;
  supports_function_calling?: boolean;
  supports_batching?: boolean;
  batch_input_token_price?: number;
  batch_output_token_price?: number;
  is_active?: boolean;
  is_default?: boolean;
}

export interface CreateApiKeyRequest {
  provider_id: string;
  api_key: string;
}

export interface UsageStatistics {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  total_tokens: number;
  total_cost: number;
  average_response_time_ms?: number;
}

export interface ModelUsageBreakdown {
  model_id: string;
  model_name: string;
  provider_name: string;
  total_requests: number;
  total_tokens: number;
  total_cost: number;
  percentage_of_total: number;
}

export interface DailyUsageTrend {
  date: string;
  total_requests: number;
  total_tokens: number;
  total_cost: number;
}

export interface ActiveModel {
  id: string;
  model_identifier: string;
  display_name: string;
  supports_vision: boolean;
  supports_function_calling: boolean;
  is_default: boolean;
  provider_name: string;
}

// API methods
export const llmApi = {
  // Provider methods
  getProviders: async (): Promise<LLMProvider[]> => {
    const response = await apiClient.get('/llm/providers');
    return response.data;
  },

  // Model methods
  getModels: async (): Promise<LLMModelWithProvider[]> => {
    const response = await apiClient.get('/llm/models');
    return response.data;
  },

  getActiveModels: async (): Promise<ActiveModel[]> => {
    const response = await apiClient.get('/llm/models/active');
    return response.data;
  },

  createModel: async (data: CreateModelRequest): Promise<LLMModel> => {
    const response = await apiClient.post('/llm/models', data);
    return response.data;
  },

  updateModel: async (modelId: string, data: UpdateModelRequest): Promise<LLMModel> => {
    const response = await apiClient.put(`/llm/models/${modelId}`, data);
    return response.data;
  },

  deleteModel: async (modelId: string): Promise<void> => {
    await apiClient.delete(`/llm/models/${modelId}`);
  },

  // API Key methods
  getApiKeys: async (): Promise<ApiKey[]> => {
    const response = await apiClient.get('/llm/api-keys');
    return response.data;
  },

  createApiKey: async (data: CreateApiKeyRequest): Promise<{ id: string; key_hint: string }> => {
    const response = await apiClient.post('/llm/api-keys', data);
    return response.data;
  },

  deleteApiKey: async (keyId: string): Promise<void> => {
    await apiClient.delete(`/llm/api-keys/${keyId}`);
  },

  // Usage tracking methods
  getUsageStatistics: async (): Promise<UsageStatistics> => {
    const response = await apiClient.get('/llm/usage/statistics');
    return response.data;
  },

  getModelUsageBreakdown: async (): Promise<ModelUsageBreakdown[]> => {
    const response = await apiClient.get('/llm/usage/model-breakdown');
    return response.data;
  },

  getDailyUsageTrends: async (): Promise<DailyUsageTrend[]> => {
    const response = await apiClient.get('/llm/usage/daily-trends');
    return response.data;
  },
};