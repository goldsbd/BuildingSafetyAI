// API Response Types

export interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_id: string | null;
  role: 'admin' | 'bsai_staff' | 'customer';
  is_active: boolean;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Company {
  id: string;
  name: string;
  registration_number: string | null;
  contact_email: string | null;
  subscription_tier: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCompanyRequest {
  name: string;
  registration_number?: string;
  contact_email?: string;
  subscription_tier?: string;
}

export interface UpdateCompanyRequest {
  name?: string;
  registration_number?: string;
  contact_email?: string;
  subscription_tier?: string;
}

export interface Project {
  id: string;
  company_id: string;
  name: string;
  project_reference: string | null;
  building_type: string | null;
  location: string | null;
  status: string;
  description?: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectRequest {
  company_id: string;
  name: string;
  project_reference?: string;
  building_type?: string;
  location?: string;
  status?: string;
  metadata?: Record<string, any>;
}

export interface UpdateProjectRequest {
  name?: string;
  project_reference?: string;
  building_type?: string;
  location?: string;
  status?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface DocumentCategory {
  id: string;
  name: string;
  code: string;
  description: string | null;
  parent_id: string | null;
  evaluation_prompt_template: string | null;
  compliance_criteria: Record<string, any> | null;
  created_at: string;
}

export interface Document {
  id: string;
  project_id: string;
  category_id: string | null;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  version: number;
  parent_document_id: string | null;
  status: 'uploaded' | 'processing' | 'evaluated' | 'approved';
  metadata: Record<string, any> | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  latest_assessment_id?: string; // Added to track latest assessment
  latest_assessment_status?: string; // Added to show assessment status
  // Folder-related fields
  parent_folder_id?: string | null;
  full_path?: string;
  folder_depth?: number;
  category_name?: string;
  compliance_score?: number;
}

export interface DocumentFolder {
  id: string;
  project_id: string;
  parent_folder_id: string | null;
  folder_name: string;
  full_path: string;
  depth: number;
  document_count: number;
  total_size_mb: number;
  created_at: string;
  updated_at: string;
}

export interface CreateDocumentRequest {
  project_id: string;
  category_id?: string;
  category?: string; // Category name for easier frontend use
  original_filename: string;
  file_size: number;
  mime_type: string;
  metadata?: Record<string, any>;
}

export interface UpdateDocumentRequest {
  category_id?: string;
  status?: 'uploaded' | 'processing' | 'evaluated' | 'approved';
  metadata?: Record<string, any>;
}

export interface Evaluation {
  id: string;
  document_id: string;
  evaluation_type: string | null;
  score: number | null;
  status: 'in_progress' | 'completed' | 'failed';
  llm_model: string | null;
  prompt_used: string | null;
  response: Record<string, any> | null;
  compliance_issues: Record<string, any> | null;
  recommendations: Record<string, any> | null;
  evaluated_by: string | null;
  is_manual: boolean;
  created_at: string;
  completed_at: string | null;
}

export interface EvaluationComment {
  id: string;
  evaluation_id: string;
  user_id: string;
  comment: string;
  is_internal: boolean;
  created_at: string;
}

// Assessment types
export interface AssessmentSection {
  id: string;
  section_id: string;
  section_title: string;
  assessment_title?: string;
  assessment_description?: string;
  created_at: string;
  updated_at: string;
}

export interface AssessmentSubsection {
  id: string;
  section_id: string;
  subsection_id: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface AssessmentQuestion {
  id: string;
  subsection_id: string;
  ref_: string;
  original_text: string;
  improved_text: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssessmentQuestionResponse {
  question: AssessmentQuestion;
  subsection: AssessmentSubsection;
  section: AssessmentSection;
}

export interface DocumentAssessment {
  id: string;
  document_id: string;
  project_id: string;
  assessment_type: 'manual' | 'ai';
  assessor_id?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'reviewed';
  ai_model?: string;
  assessment_date: string;
  created_at: string;
  updated_at: string;
}

export interface AssessmentResponse {
  id: string;
  assessment_id: string;
  question_id: string;
  verdict?: 'satisfactory' | 'unsatisfactory' | 'requirement';
  compliance_level?: 'compliant' | 'partially_compliant' | 'non_compliant';
  comment?: string;
  improvement_recommendation?: string;
  evidence_reference?: string;
  is_relevant?: boolean;
  consultant_accepted?: boolean;
  consultant_notes?: string;
  vector_context_summary?: string;
  supporting_references?: string;
  enhanced_evidence_reference?: string;
  created_at: string;
  updated_at: string;
}

export interface AssessmentSummary {
  id: string;
  assessment_id: string;
  overall_verdict?: string;
  strengths_count: number;
  improvements_count: number;
  compliance_percentage?: number;
  executive_summary?: string;
  key_findings?: any;
  report_markdown?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AssessmentReport {
  assessment: DocumentAssessment;
  document_name: string;
  category: string;
  responses: Array<{
    response: AssessmentResponse;
    question: AssessmentQuestion;
    subsection: AssessmentSubsection;
    section: AssessmentSection;
  }>;
  summary: AssessmentSummary;
}