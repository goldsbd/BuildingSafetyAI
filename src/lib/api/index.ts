// Export all API modules
export * from './client';
export * from './types';
export * from './auth';
export * from './companies';
export * from './projects';
export * from './documents';
export * from './assessments';
export * from './folders';
export * from './llm';

// Create a unified API object
import { authApi } from './auth';
import { companiesApi } from './companies';
import { projectsApi } from './projects';
import { documentsApi } from './documents';
import { assessmentsApi } from './assessments';
import { foldersApi } from './folders';
import { llmApi } from './llm';

export const api = {
  auth: authApi,
  companies: companiesApi,
  projects: projectsApi,
  documents: documentsApi,
  assessments: assessmentsApi,
  folders: foldersApi,
  llm: llmApi,
  // Add more API modules as they are implemented
  // users: usersApi,
};