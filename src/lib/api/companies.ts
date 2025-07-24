import apiClient from './client';
import type { Company, CreateCompanyRequest, UpdateCompanyRequest } from './types';

export const companiesApi = {
  async getCompanies(): Promise<Company[]> {
    const response = await apiClient.get<Company[]>('/companies');
    return response.data;
  },

  async getCompany(id: string): Promise<Company> {
    const response = await apiClient.get<Company>(`/companies/${id}`);
    return response.data;
  },

  async createCompany(data: CreateCompanyRequest): Promise<Company> {
    const response = await apiClient.post<Company>('/companies', data);
    return response.data;
  },

  async updateCompany(id: string, data: UpdateCompanyRequest): Promise<Company> {
    const response = await apiClient.put<Company>(`/companies/${id}`, data);
    return response.data;
  },

  async deleteCompany(id: string): Promise<void> {
    await apiClient.delete(`/companies/${id}`);
  },
};