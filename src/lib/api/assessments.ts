import apiClient from './client';
import type { AssessmentQuestionResponse, DocumentAssessment, AssessmentResponse, AssessmentReport } from './types';

export const assessmentsApi = {
  // Get document categories
  async getCategories() {
    const response = await apiClient.get('/assessments/categories');
    return response.data;
  },

  // Get questions by category
  async getQuestionsByCategory(category: string): Promise<AssessmentQuestionResponse[]> {
    const response = await apiClient.get(`/assessments/questions/${category}`);
    return response.data;
  },

  // Create a new assessment
  async createAssessment(documentId: string, assessmentType: string = 'manual'): Promise<DocumentAssessment> {
    const response = await apiClient.post('/assessments', {
      document_id: documentId,
      assessment_type: assessmentType
    });
    return response.data;
  },

  // Get assessment by ID
  async getAssessment(assessmentId: string): Promise<DocumentAssessment> {
    const response = await apiClient.get(`/assessments/${assessmentId}`);
    return response.data;
  },

  // Save assessment response
  async saveResponse(assessmentId: string, questionId: string, data: any): Promise<AssessmentResponse> {
    const response = await apiClient.post(
      `/assessments/${assessmentId}/responses?question_id=${questionId}`,
      data
    );
    return response.data;
  },

  // Run AI analysis
  async analyzeWithAI(assessmentId: string): Promise<any> {
    const response = await apiClient.post(`/assessments/${assessmentId}/analyze`);
    return response.data;
  },

  // Get assessment report
  async getReport(assessmentId: string): Promise<AssessmentReport> {
    const response = await apiClient.get(`/assessments/${assessmentId}/report`);
    return response.data;
  },

  // Get markdown report
  async getMarkdownReport(assessmentId: string): Promise<string> {
    const response = await apiClient.get(`/assessments/${assessmentId}/report/markdown`);
    return response.data;
  },

  // Get assessment summary
  async getSummary(assessmentId: string): Promise<any> {
    const response = await apiClient.get(`/assessments/${assessmentId}/summary`);
    return response.data;
  },

  // Complete assessment
  async completeAssessment(assessmentId: string): Promise<DocumentAssessment> {
    const response = await apiClient.post(`/assessments/${assessmentId}/complete`);
    return response.data;
  },

  // Review assessment
  async reviewAssessment(assessmentId: string): Promise<DocumentAssessment> {
    const response = await apiClient.post(`/assessments/${assessmentId}/review`);
    return response.data;
  },

  // Get assessments for a document
  async getDocumentAssessments(documentId: string): Promise<DocumentAssessment[]> {
    const response = await apiClient.get(`/assessments/document/${documentId}`);
    return response.data;
  },

  // Get assessment responses (part of the report)
  async getAssessmentResponses(assessmentId: string): Promise<any[]> {
    const report = await this.getReport(assessmentId);
    // The backend returns responses with nested structure
    // We need to flatten it for the frontend
    if (report.responses) {
      return report.responses.map((item: any) => ({
        id: item.response.id,
        assessment_id: item.response.assessment_id,
        question_id: item.response.question_id,
        verdict: item.response.verdict,
        compliance_level: item.response.compliance_level,
        comment: item.response.comment,
        improvement_recommendation: item.response.improvement_recommendation,
        evidence_reference: item.response.evidence_reference,
        is_relevant: item.response.is_relevant,
        consultant_accepted: item.response.consultant_accepted,
        consultant_notes: item.response.consultant_notes,
        created_at: item.response.created_at,
        updated_at: item.response.updated_at,
        question: item.question,
        section: item.section,
        subsection: item.subsection
      }));
    }
    return [];
  },

  // Get human review
  async getHumanReview(assessmentId: string): Promise<any> {
    const response = await apiClient.get(`/assessments/${assessmentId}/human-review`);
    return response.data;
  },

  // Save human review
  async saveHumanReview(assessmentId: string, content: string): Promise<any> {
    const response = await apiClient.post(`/assessments/${assessmentId}/human-review`, {
      human_review: content
    });
    return response.data;
  },

  // Get assessment progress
  async getProgress(assessmentId: string): Promise<any> {
    const response = await apiClient.get(`/assessments/${assessmentId}/progress`);
    return response.data;
  },

  // Get assessment progress
  async getAssessmentProgress(assessmentId: string): Promise<{
    status: string;
    progress: {
      current: number;
      total: number;
      percentage: number;
    };
  }> {
    const response = await apiClient.get(`/assessments/${assessmentId}/progress`);
    return response.data;
  },

  // Update consultant review for a specific response
  async updateConsultantReview(assessmentId: string, responseId: string, data: {
    consultant_accepted: boolean | null;
    consultant_notes: string | null;
  }): Promise<any> {
    const response = await apiClient.patch(
      `/assessments/${assessmentId}/responses/${responseId}/consultant-review`,
      data
    );
    return response.data;
  }
};