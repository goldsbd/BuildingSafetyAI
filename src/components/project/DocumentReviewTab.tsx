import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Play, Square, CheckCircle, Clock, AlertCircle, FileText, Download, Trash2, MoreHorizontal, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from '@/lib/api';
import type { Document, DocumentAssessment, DocumentCategory } from '@/lib/api/types';
import { useToast } from '@/hooks/use-toast';
import { DocumentReviewModal } from './DocumentReviewModal';
import { DocumentProcessingProgress } from './DocumentProcessingProgress';
import { assessmentsApi } from '@/lib/api/assessments';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Folder } from "lucide-react";
import CategorizedDocumentList from './CategorizedDocumentList';
import { DocumentReviewWithFolders } from './DocumentReviewWithFolders';

interface DocumentReviewTabProps {
  companyId: string;
  projectId: string;
  onRefreshNeeded?: () => void;
}

interface DocumentStats {
  assessmentId?: string;
  status: 'not_reviewed' | 'processing' | 'reviewed' | 'pending_review';
  complianceScore?: number;
  satisfactoryCount?: number;
  unsatisfactoryCount?: number;
  requirementCount?: number;
  totalQuestions?: number;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getReviewStatusIcon = (status: DocumentStats['status']) => {
  switch (status) {
    case 'reviewed':
      return CheckCircle;
    case 'processing':
      return Clock;
    case 'pending_review':
      return AlertTriangle;
    case 'not_reviewed':
    default:
      return AlertCircle;
  }
};

const getReviewStatusColor = (status: DocumentStats['status']) => {
  switch (status) {
    case 'reviewed':
      return 'text-success';
    case 'processing':
      return 'text-warning';
    case 'pending_review':
      return 'text-orange-500';
    case 'not_reviewed':
    default:
      return 'text-destructive';
  }
};

const getReviewStatusBadgeVariant = (status: DocumentStats['status']) => {
  switch (status) {
    case 'reviewed':
      return 'success' as const;
    case 'processing':
      return 'warning' as const;
    case 'pending_review':
      return 'secondary' as const;
    case 'not_reviewed':
    default:
      return 'destructive' as const;
  }
};

const getReviewStatusText = (status: DocumentStats['status']) => {
  switch (status) {
    case 'reviewed':
      return 'Reviewed';
    case 'processing':
      return 'Processing';
    case 'pending_review':
      return 'Pending Review';
    case 'not_reviewed':
    default:
      return 'Not Reviewed';
  }
};

const getCategoryIcon = (categoryName: string) => {
  const name = categoryName.toLowerCase();
  if (name.includes('fire')) return '🔥';
  if (name.includes('strategy') || name.includes('plan')) return '📋';
  if (name.includes('compliance')) return '✅';
  if (name.includes('declaration')) return '📝';
  if (name.includes('construction')) return '🏗️';
  if (name.includes('design')) return '✏️';
  if (name.includes('emergency')) return '🚨';
  if (name.includes('resident')) return '👥';
  if (name.includes('building')) return '🏢';
  if (name.includes('safety')) return '🛡️';
  return '📁';
};

const getCategoryColor = (code: string) => {
  const colors: Record<string, string> = {
    'ACC': 'bg-red-100 text-red-700 hover:bg-red-200',
    'BC': 'bg-blue-100 text-blue-700 hover:bg-blue-200',
    'BUILDING_REGS': 'bg-green-100 text-green-700 hover:bg-green-200',
    'ChangeControlPlan': 'bg-purple-100 text-purple-700 hover:bg-purple-200',
    'CompetenceDeclaration': 'bg-orange-100 text-orange-700 hover:bg-orange-200',
    'ConstructionControlPlan': 'bg-teal-100 text-teal-700 hover:bg-teal-200',
    'DrawingsAndPlans': 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200',
    'EMERGENCY': 'bg-pink-100 text-pink-700 hover:bg-pink-200',
    'FIRE': 'bg-amber-100 text-amber-700 hover:bg-amber-200',
  };
  return colors[code] || 'bg-gray-100 text-gray-700 hover:bg-gray-200';
};

export default function DocumentReviewTab({ companyId, projectId, onRefreshNeeded }: DocumentReviewTabProps) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [documentStats, setDocumentStats] = useState<Record<string, DocumentStats>>({});
  const [processingModalOpen, setProcessingModalOpen] = useState(false);
  const [processingAssessmentId, setProcessingAssessmentId] = useState<string | null>(null);
  const [processingDocumentName, setProcessingDocumentName] = useState<string>('');
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, DocumentCategory>>({});
  const [updatingCategory, setUpdatingCategory] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
    loadCategories();
  }, [projectId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const documentsData = await api.documents.getDocuments(projectId);
      setDocuments(documentsData);
      
      // Load assessment data for each document
      const stats: Record<string, DocumentStats> = {};
      
      for (const doc of documentsData) {
        try {
          const assessments = await api.assessments.getDocumentAssessments(doc.id);
          
          if (assessments && assessments.length > 0) {
            // Find the latest completed assessment
            const completedAssessment = assessments.find(a => a.status === 'completed');
            const inProgressAssessment = assessments.find(a => a.status === 'in_progress' || a.status === 'processing');
            const latestAssessment = completedAssessment || inProgressAssessment || assessments[0];
            
            if (latestAssessment) {
              // Get assessment responses to calculate statistics
              const responses = await api.assessments.getAssessmentResponses(latestAssessment.id);
              
              // Filter out non-relevant questions to match the modal calculation
              const relevantResponses = responses?.filter(r => r.is_relevant !== false) || [];
              const satisfactoryCount = relevantResponses.filter(r => r.verdict === 'satisfactory').length;
              const unsatisfactoryCount = relevantResponses.filter(r => r.verdict === 'unsatisfactory').length;
              const requirementCount = relevantResponses.filter(r => r.verdict === 'requirement').length;
              const totalQuestions = relevantResponses.length;
              const complianceScore = totalQuestions > 0 ? Math.round((satisfactoryCount / totalQuestions) * 100) : 0;
              
              stats[doc.id] = {
                assessmentId: latestAssessment.id,
                status: latestAssessment.status === 'completed' ? 'reviewed' : 
                        (latestAssessment.status === 'in_progress' || latestAssessment.status === 'processing') ? 'processing' : 
                        'pending_review',
                complianceScore,
                satisfactoryCount,
                unsatisfactoryCount,
                requirementCount,
                totalQuestions
              };
            } else {
              stats[doc.id] = {
                status: 'not_reviewed'
              };
            }
          } else {
            stats[doc.id] = {
              status: 'not_reviewed'
            };
          }
        } catch (error) {
          console.error(`Failed to load assessment for document ${doc.id}:`, error);
          stats[doc.id] = {
            status: 'not_reviewed'
          };
        }
      }
      
      setDocumentStats(stats);
    } catch (error: any) {
      console.error('Failed to load documents:', error);
      toast({
        title: 'Failed to load documents',
        description: 'Could not load project documents. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const categoriesData = await assessmentsApi.getCategories();
      setCategories(categoriesData);
      
      // Create a map for quick lookup
      const map: Record<string, DocumentCategory> = {};
      categoriesData.forEach(cat => {
        map[cat.id] = cat;
      });
      setCategoryMap(map);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const updateDocumentCategory = async (documentId: string, categoryId: string) => {
    try {
      setUpdatingCategory(documentId);
      
      await api.documents.updateDocument(documentId, {
        category_id: categoryId
      });
      
      // Update local state
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId ? { ...doc, category_id: categoryId } : doc
      ));
      
      toast({
        title: 'Category Updated',
        description: 'Document category has been updated successfully.',
      });
      
      // Refresh if needed
      onRefreshNeeded?.();
    } catch (error: any) {
      console.error('Failed to update category:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update document category. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingCategory(null);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDocuments(new Set(documents.map(doc => doc.id)));
    } else {
      setSelectedDocuments(new Set());
    }
  };

  const handleSelectDocument = (documentId: string, checked: boolean) => {
    const newSelection = new Set(selectedDocuments);
    if (checked) {
      newSelection.add(documentId);
    } else {
      newSelection.delete(documentId);
    }
    setSelectedDocuments(newSelection);
  };

  const handleBulkReview = async () => {
    if (selectedDocuments.size === 0) return;
    
    setBulkProcessing(true);
    try {
      // TODO: Implement bulk AI review API call
      toast({
        title: 'Review Started',
        description: `Starting AI review for ${selectedDocuments.size} document(s)...`,
      });
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update document statuses to 'processing'
      const updatedDocuments = documents.map(doc => 
        selectedDocuments.has(doc.id) 
          ? { ...doc, status: 'processing' }
          : doc
      );
      setDocuments(updatedDocuments);
      setSelectedDocuments(new Set());
      
      toast({
        title: 'Review In Progress',
        description: 'Documents are being analyzed by AI. You\'ll be notified when complete.',
      });
    } catch (error: any) {
      toast({
        title: 'Review Failed',
        description: 'Failed to start AI review. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleSingleReview = async (documentId: string) => {
    const document = documents.find(d => d.id === documentId);
    if (!document) return;
    
    const stats = documentStats[documentId];
    
    // If document has existing assessment, confirm before overwriting
    if (stats && stats.status !== 'not_reviewed') {
      const confirmMessage = `This document already has an assessment with:\n\n` +
        `• Compliance Score: ${stats.complianceScore}%\n` +
        `• ${stats.satisfactoryCount} Satisfactory\n` +
        `• ${stats.unsatisfactoryCount} Unsatisfactory\n` +
        `• ${stats.requirementCount} Requirements\n\n` +
        `Are you sure you want to rerun the assessment? This will overwrite the existing results.`;
      
      if (!confirm(confirmMessage)) {
        return;
      }
    }
    
    // Update status to processing
    const updatedDocuments = documents.map(doc => 
      doc.id === documentId 
        ? { ...doc, status: 'processing' as const }
        : doc
    );
    setDocuments(updatedDocuments);
    
    await handleProcessDocument(document);
  };

  const handleDocumentClick = (documentId: string) => {
    const stats = documentStats[documentId];
    if (stats?.status === 'not_reviewed') {
      toast({
        title: 'No Assessment Available',
        description: 'This document has not been assessed yet. Click the play button to start AI analysis.',
        variant: 'destructive',
      });
      return;
    }
    setSelectedDocumentId(documentId);
    setReviewModalOpen(true);
  };

  const handleDownload = async (document: Document) => {
    try {
      const blob = await api.documents.downloadDocument(document.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.original_filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      toast({
        title: 'Download Failed',
        description: 'Failed to download document.',
        variant: 'destructive',
      });
    }
  };

  const handleProcessDocument = async (document: Document) => {
    try {
      // First create an assessment
      const assessment = await api.assessments.createAssessment(document.id, 'ai');
      
      // Set up progress tracking
      setProcessingAssessmentId(assessment.id);
      setProcessingDocumentName(document.original_filename);
      setProcessingModalOpen(true);

      // Trigger AI analysis
      await api.assessments.analyzeWithAI(assessment.id);
      
    } catch (error: any) {
      toast({
        title: 'Processing Failed',
        description: error.message || 'Failed to process document with AI.',
        variant: 'destructive',
      });
      setProcessingModalOpen(false);
    }
  };

  const handleProcessingComplete = async () => {
    // Update document status and close modal
    await loadDocuments();
    onRefreshNeeded?.();
    setProcessingModalOpen(false);
    
    toast({
      title: 'Processing Complete',
      description: 'Document has been analyzed. Click Review to see results.',
    });
  };

  const handleDelete = async (document: Document) => {
    if (!confirm(`Are you sure you want to delete "${document.original_filename}"?`)) {
      return;
    }

    try {
      await api.documents.deleteDocument(document.id);
      await loadDocuments();
      onRefreshNeeded?.();
      toast({
        title: 'Document Deleted',
        description: `${document.original_filename} has been deleted.`,
      });
    } catch (error: any) {
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete document.',
        variant: 'destructive',
      });
    }
  };

  const isAllSelected = documents.length > 0 && selectedDocuments.size === documents.length;
  const isSomeSelected = selectedDocuments.size > 0 && selectedDocuments.size < documents.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DocumentReviewWithFolders
      companyId={companyId}
      projectId={projectId}
      onRefreshNeeded={onRefreshNeeded}
    />
  );
  
  // Old implementation below (kept for reference)
  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                ref={(ref) => {
                  if (ref) ref.indeterminate = isSomeSelected;
                }}
              />
              <CardTitle className="text-lg">Document Review Dashboard</CardTitle>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {selectedDocuments.size > 0 
                  ? `${selectedDocuments.size} selected`
                  : `${documents.length} documents`}
              </span>
              {selectedDocuments.size > 0 && (
                <Button 
                  onClick={handleBulkReview}
                  disabled={bulkProcessing}
                  className={bulkProcessing ? "bg-orange-600 hover:bg-orange-700" : ""}
                >
                  {bulkProcessing ? (
                    <>
                      <Square className="mr-2 h-4 w-4" />
                      Reviewing...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Run Review
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardContent className="p-0">
          <CategorizedDocumentList
            companyId={companyId}
            projectId={projectId}
            documents={documents}
            documentStats={documentStats}
            selectedDocuments={selectedDocuments}
            onSelectDocument={handleSelectDocument}
            onSingleReview={handleSingleReview}
            onDocumentClick={handleDocumentClick}
            onDownload={handleDownload}
            onDelete={handleDelete}
            onCategoryUpdate={updateDocumentCategory}
            onRefreshNeeded={onRefreshNeeded}
          />
        </CardContent>
      </Card>

      {/* Review Modal */}
      <DocumentReviewModal
        open={reviewModalOpen}
        onOpenChange={setReviewModalOpen}
        documentId={selectedDocumentId}
        assessmentId={selectedDocumentId ? documentStats[selectedDocumentId]?.assessmentId : null}
        onSave={loadDocuments}
      />

      {/* Processing Progress Modal */}
      <DocumentProcessingProgress
        open={processingModalOpen}
        onOpenChange={setProcessingModalOpen}
        assessmentId={processingAssessmentId}
        documentName={processingDocumentName}
        onComplete={handleProcessingComplete}
      />
    </div>
  );
}