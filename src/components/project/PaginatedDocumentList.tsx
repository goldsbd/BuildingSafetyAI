import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, FileText, Folder, Search, Eye, Loader2, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { documentsApi, type PaginatedResponse } from '@/lib/api/documents';
import { api } from '@/lib/api';
import { assessmentsApi } from '@/lib/api/assessments';
import type { Document, DocumentCategory } from '@/lib/api/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { DocumentProcessingProgress } from './DocumentProcessingProgress';
import { DocumentReviewModal } from './DocumentReviewModal';
import { DocumentExtractionModal } from './DocumentExtractionModal';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface PaginatedDocumentListProps {
  projectId: string;
  viewMode?: 'list' | 'folder';
  folderId?: string;
  categoryId?: string;
  rootOnly?: boolean;
  onDocumentSelect?: (document: Document) => void;
  onDocumentReview?: (document: Document, assessmentId?: string) => void;
  compact?: boolean;
  search?: string;
}

export const PaginatedDocumentList: React.FC<PaginatedDocumentListProps> = ({
  projectId,
  viewMode = 'list',
  folderId,
  categoryId,
  rootOnly,
  onDocumentSelect,
  onDocumentReview,
  compact = false,
  search: externalSearch,
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState(externalSearch || '');
  const [searchInput, setSearchInput] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [documentAssessments, setDocumentAssessments] = useState<Record<string, string>>({});
  const [documentComplianceScores, setDocumentComplianceScores] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, DocumentCategory>>({});
  const [updatingCategory, setUpdatingCategory] = useState<string | null>(null);
  const [processingModalOpen, setProcessingModalOpen] = useState(false);
  const [processingDocumentName, setProcessingDocumentName] = useState<string>("");
  const [selectedAssessment, setSelectedAssessment] = useState<string | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [extractionModalOpen, setExtractionModalOpen] = useState(false);
  const [selectedDocumentForExtraction, setSelectedDocumentForExtraction] = useState<Document | null>(null);
  const { toast } = useToast();

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await documentsApi.getDocumentsPaginated(projectId, {
        page: currentPage,
        page_size: pageSize,
        folder_id: folderId,
        category_id: categoryId,
        search: search || undefined,
        root_only: rootOnly,
      });
      
      setDocuments(response.data);
      setTotal(response.total);
      setTotalPages(response.total_pages);
      
      // Load assessments and compliance scores for all documents
      const assessmentPromises = response.data.map(async (doc) => {
        try {
          const assessments = await api.assessments.getDocumentAssessments(doc.id);
          if (assessments && assessments.length > 0) {
            // Prefer completed assessments over pending ones
            const completedAssessment = assessments.find(a => a.status === 'completed');
            const assessmentId = completedAssessment ? completedAssessment.id : assessments[0].id;
            
            // Try to get the assessment report to calculate compliance score
            try {
              const report = await api.assessments.getReport(assessmentId);
              if (report && report.responses) {
                // Calculate compliance score from responses - exclude not_applicable
                const relevantResponses = report.responses.filter((r: any) => 
                  r.response && r.response.is_relevant !== false && r.response.verdict !== 'not_applicable'
                );
                
                // Calculate weighted compliance score
                let compliancePoints = 0;
                relevantResponses.forEach((r: any) => {
                  if (r.response.compliance_level === 'compliant') {
                    compliancePoints += 1.0; // Full credit
                  } else if (r.response.compliance_level === 'partially_compliant') {
                    compliancePoints += 0.5; // Half credit
                  }
                  // non_compliant gets 0 points
                });
                
                const totalRelevant = relevantResponses.length;
                const complianceScore = totalRelevant > 0 
                  ? Math.round((compliancePoints / totalRelevant) * 100) 
                  : 0;
                
                return { 
                  documentId: doc.id, 
                  assessmentId, 
                  complianceScore 
                };
              }
            } catch (error) {
              console.error(`Failed to load report for assessment ${assessmentId}:`, error);
            }
            
            return { documentId: doc.id, assessmentId, complianceScore: null };
          }
        } catch (error) {
          console.error(`Failed to load assessments for document ${doc.id}:`, error);
        }
        return null;
      });
      
      const assessmentResults = await Promise.all(assessmentPromises);
      const newAssessments: Record<string, string> = {};
      const newComplianceScores: Record<string, number> = {};
      
      assessmentResults.forEach(result => {
        if (result) {
          newAssessments[result.documentId] = result.assessmentId;
          if (result.complianceScore !== null) {
            newComplianceScores[result.documentId] = result.complianceScore;
          }
        }
      });
      
      setDocumentAssessments(newAssessments);
      setDocumentComplianceScores(newComplianceScores);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load documents',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, currentPage, pageSize, folderId, categoryId, search, rootOnly, toast]);

  useEffect(() => {
    fetchDocuments();
    loadCategories();
  }, [fetchDocuments]);

  useEffect(() => {
    if (externalSearch !== undefined) {
      setSearch(externalSearch);
      setCurrentPage(1);
    }
  }, [externalSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleDocumentPreview = useCallback(async (document: Document) => {
    // Check if it's actually a file by looking for file extension in filename
    const isFile = document.filename && (
      document.filename.endsWith('.pdf') || 
      document.filename.endsWith('.PDF') ||
      document.filename.endsWith('.xlsm') ||
      document.filename.endsWith('.XLSM')
    );
    
    if (!isFile) {
      // If it's a folder, use the original selection behavior
      onDocumentSelect?.(document);
      return;
    }

    try {
      // Construct the view URL with authentication token
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        toast({
          title: 'Error',
          description: 'Please log in to view documents.',
          variant: 'destructive',
        });
        return;
      }

      // Open document in new tab using the view endpoint
      const viewUrl = `http://localhost:3001/api/documents/${document.id}/view`;
      
      // For now, we'll use a simple approach with token in header via fetch
      // then create blob URL
      const response = await fetch(viewUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch document');
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Open in new tab
      const newTab = window.open(blobUrl, '_blank');
      
      // Clean up the blob URL after a delay
      if (newTab) {
        setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
        }, 1000);
      }
    } catch (error) {
      console.error('Error opening document:', error);
      toast({
        title: 'Error',
        description: 'Failed to open document. Please try downloading instead.',
        variant: 'destructive',
      });
    }
  }, [toast, onDocumentSelect]);

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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
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

  const handleProcessingComplete = () => {
    setProcessingModalOpen(false);
    // Reload documents to update status and compliance scores
    fetchDocuments();
  };

  const handleReviewDocument = async (document: Document) => {
    // Set the selected document
    setSelectedDocumentId(document.id);
    
    // Check if there's an existing assessment for this document
    const assessmentId = documentAssessments[document.id];
    
    if (assessmentId) {
      // Open review modal directly with assessment ID
      setSelectedAssessment(assessmentId);
      setReviewModalOpen(true);
    } else {
      // Try to find a completed assessment first
      try {
        const assessments = await api.assessments.getDocumentAssessments(document.id);
        const completedAssessment = assessments.find(a => a.status === 'completed');
        
        if (completedAssessment) {
          // Use the completed assessment
          setDocumentAssessments(prev => ({
            ...prev,
            [document.id]: completedAssessment.id
          }));
          setSelectedAssessment(completedAssessment.id);
          setReviewModalOpen(true);
        } else {
          // Create a new assessment if none completed exists
          const assessment = await api.assessments.createAssessment(document.id, 'manual');
          setDocumentAssessments(prev => ({
            ...prev,
            [document.id]: assessment.id
          }));
          setSelectedAssessment(assessment.id);
          setReviewModalOpen(true);
        }
      } catch (error) {
        console.error('Error creating assessment for review:', error);
        toast({
          title: 'Review Failed',
          description: 'Failed to prepare document for review. Please try again.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleAssessDocument = async (document: Document) => {
    try {
      // First check if there's an existing completed assessment
      const existingAssessments = await api.assessments.getDocumentAssessments(document.id);
      const completedAssessment = existingAssessments.find(a => a.status === 'completed');
      
      if (completedAssessment) {
        // Ask user if they want to re-assess
        const confirmReassess = window.confirm(
          'This document has already been assessed. Do you want to run a new assessment? This will overwrite the existing results.'
        );
        
        if (!confirmReassess) {
          // User cancelled, show existing assessment
          setDocumentAssessments(prev => ({
            ...prev,
            [document.id]: completedAssessment.id
          }));
          setSelectedAssessment(completedAssessment.id);
          setSelectedDocumentId(document.id);
          setReviewModalOpen(true);
          return;
        }
      }
      
      // Create an assessment and trigger AI analysis
      const assessment = await api.assessments.createAssessment(document.id, 'ai');
      
      // Store the assessment ID immediately
      setDocumentAssessments(prev => ({
        ...prev,
        [document.id]: assessment.id
      }));
      
      // Show processing dialog
      setSelectedAssessment(assessment.id);
      setProcessingDocumentName(document.original_filename);
      setProcessingModalOpen(true);

      // Trigger AI analysis
      await api.assessments.analyzeWithAI(assessment.id);
      
      // The progress dialog will handle completion
    } catch (error: any) {
      toast({
        title: 'Processing Failed',
        description: error.message || 'Failed to process document with AI.',
        variant: 'destructive',
      });
      setProcessingModalOpen(false);
    }
  };

  const handleExtractDocument = (document: Document) => {
    // Only allow extraction on PDF files
    if (!document.mime_type?.startsWith('application/pdf')) {
      toast({
        title: 'Extraction Not Supported',
        description: 'Document extraction is only supported for PDF files.',
        variant: 'destructive',
      });
      return;
    }
    
    setSelectedDocumentForExtraction(document);
    setExtractionModalOpen(true);
  };

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <Button
          key={i}
          variant={i === currentPage ? 'default' : 'outline'}
          size="sm"
          onClick={() => handlePageChange(i)}
          className="h-8 w-8 p-0"
        >
          {i}
        </Button>
      );
    }
    
    return pageNumbers;
  };

  return (
    <div className={compact ? "flex flex-col h-full" : "space-y-4"}>
      {/* Search Bar - only show when not in compact mode or when search is not externally controlled */}
      {(!compact || externalSearch === undefined) && (
        <div className={compact ? "p-3 border-b bg-gray-50 flex-shrink-0" : ""}>
          <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search documents..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <Button type="submit" size="sm" className="h-9">Search</Button>
          </form>
          
          {/* Results Summary - inline for compact mode */}
          <div className={`text-sm text-gray-600 ${compact ? 'mt-2' : 'mt-4'}`}>
            Showing <span className="font-medium text-gray-900">{documents.length}</span> of <span className="font-medium text-gray-900">{total}</span> documents
            {selectedDocuments.size > 0 && <span className="text-gray-900"> ({selectedDocuments.size} selected)</span>}
          </div>
        </div>
      )}
      
      {/* Results Summary for compact mode with external search */}
      {compact && externalSearch !== undefined && (
        <div className="px-3 py-2 border-b bg-gray-50 flex-shrink-0 text-sm text-gray-600">
          Showing <span className="font-medium text-gray-900">{documents.length}</span> of <span className="font-medium text-gray-900">{total}</span> documents
          {selectedDocuments.size > 0 && <span className="text-gray-900"> ({selectedDocuments.size} selected)</span>}
        </div>
      )}

      {/* Document Table */}
      <div className={compact ? "flex-1 min-h-0 overflow-auto border-0" : "border rounded-lg"}>
        <Table className="border-0">
          <TableHeader className={compact ? "sticky top-0 bg-white z-10 border-b shadow-sm" : ""}>
            <TableRow className={compact ? "h-10" : ""}>
              <TableHead className={`w-12 ${compact ? 'py-2' : ''}`}>
                <Checkbox
                  checked={documents.length > 0 && selectedDocuments.size === documents.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className={compact ? 'py-2 font-semibold text-gray-700' : ''}>Document</TableHead>
              <TableHead className={compact ? 'py-2 font-semibold text-gray-700' : ''}>Category</TableHead>
              <TableHead className={compact ? 'py-2 font-semibold text-gray-700' : ''}>Review Status</TableHead>
              <TableHead className={compact ? 'py-2 font-semibold text-gray-700' : ''}>Compliance</TableHead>
              <TableHead className={`text-right ${compact ? 'py-2 font-semibold text-gray-700' : ''}`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Loading skeletons
              Array.from({ length: 10 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No documents found
                </TableCell>
              </TableRow>
            ) : (
              documents.map((document) => (
                <TableRow key={document.id} className={compact ? "h-10" : ""}>
                  <TableCell className={compact ? "py-1" : ""}>
                    <Checkbox
                      checked={selectedDocuments.has(document.id)}
                      onCheckedChange={(checked) => 
                        handleSelectDocument(document.id, checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell className={compact ? "py-1" : ""}>
                    <div className="flex items-center gap-2">
                      {document.parent_folder_id ? (
                        <Folder className="h-4 w-4 text-gray-400" />
                      ) : (
                        <FileText className="h-4 w-4 text-gray-400" />
                      )}
                      <button
                        className="text-left hover:underline text-gray-900 font-medium text-sm cursor-pointer relative z-10"
                        onClick={async (e) => {
                          // If Alt/Option key is pressed, use the original selection behavior
                          if (e.altKey) {
                            onDocumentSelect?.(document);
                          } else {
                            // Preview document in new tab
                            await handleDocumentPreview(document);
                          }
                        }}
                        title={document.parent_folder_id ? "Click to open folder" : "Click to preview PDF (Alt+Click for details)"}
                      >
                        {document.original_filename}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className={compact ? "py-1" : ""}>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-auto px-2 py-1 ${
                            document.category_id && categoryMap[document.category_id]
                              ? getCategoryColor(categoryMap[document.category_id].code)
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                          disabled={updatingCategory === document.id}
                        >
                          {updatingCategory === document.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : document.category_id && categoryMap[document.category_id] ? (
                            <>
                              <span className="mr-1">{getCategoryIcon(categoryMap[document.category_id].name)}</span>
                              <span className="text-xs font-medium">{categoryMap[document.category_id].code}</span>
                            </>
                          ) : (
                            <>
                              <Folder className="h-3 w-3 mr-1" />
                              <span className="text-xs">Uncategorized</span>
                            </>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-96 p-2" align="start" side="bottom" sideOffset={5}>
                        <div className="max-h-[400px] overflow-y-auto">
                          <p className="text-sm font-medium mb-2 sticky top-0 bg-popover pb-2">Select Category</p>
                          <div className="space-y-1">
                            {categories.map((category) => (
                              <Button
                                key={category.id}
                                variant="ghost"
                                size="sm"
                                className={`w-full justify-start text-left ${
                                  document.category_id === category.id
                                    ? 'bg-primary/10'
                                    : ''
                                }`}
                                onClick={() => updateDocumentCategory(document.id, category.id)}
                              >
                                <span className="mr-2">{getCategoryIcon(category.name)}</span>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{category.name}</p>
                                  <p className="text-xs text-muted-foreground">{category.code}</p>
                                </div>
                              </Button>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell className={compact ? "py-1" : ""}>
                    <Badge 
                      variant={documentAssessments[document.id] ? 'default' : 'destructive'}
                      className={`${compact ? "text-xs" : ""} ${
                        documentAssessments[document.id] 
                          ? "bg-green-600 hover:bg-green-700 text-white" 
                          : ""
                      }`}
                    >
                      {documentAssessments[document.id] ? 'Reviewed' : 'Not Reviewed'}
                    </Badge>
                  </TableCell>
                  <TableCell className={compact ? "py-1 text-gray-700" : ""}>
                    {documentComplianceScores[document.id] !== undefined ? (
                      <span className={`font-semibold ${documentComplianceScores[document.id] >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                        {documentComplianceScores[document.id]}%
                      </span>
                    ) : document.compliance_score ? (
                      <span className={`font-semibold ${document.compliance_score >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                        {document.compliance_score}%
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className={`text-right ${compact ? "py-1" : ""}`}>
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExtractDocument(document)}
                        disabled={!document.mime_type?.startsWith('application/pdf')}
                        title={document.mime_type?.startsWith('application/pdf') ? 'Test PDF extraction' : 'Only PDF files can be extracted'}
                      >
                        <Scissors className="h-4 w-4 mr-1" />
                        Extract
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReviewDocument(document)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleAssessDocument(document)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Assess
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls - Fixed at bottom for compact mode */}
      {totalPages > 1 && (
        <div className={`flex items-center justify-center gap-1 ${compact ? 'py-2 border-t bg-gray-50 flex-shrink-0' : 'mt-4'}`}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-7 w-7 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {currentPage > 3 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(1)}
                className="h-7 w-7 p-0"
              >
                1
              </Button>
              <span className="px-2">...</span>
            </>
          )}
          
          {renderPageNumbers()}
          
          {currentPage < totalPages - 2 && (
            <>
              <span className="px-2">...</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(totalPages)}
                className="h-7 w-7 p-0"
              >
                {totalPages}
              </Button>
            </>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Document Processing Progress */}
      <DocumentProcessingProgress
        open={processingModalOpen}
        onOpenChange={setProcessingModalOpen}
        assessmentId={selectedAssessment}
        documentName={processingDocumentName}
        onComplete={handleProcessingComplete}
      />

      {/* Document Review Modal */}
      <DocumentReviewModal
        open={reviewModalOpen}
        onOpenChange={setReviewModalOpen}
        documentId={selectedDocumentId}
        assessmentId={selectedAssessment}
        onSave={() => {
          setReviewModalOpen(false);
          fetchDocuments(); // Refresh documents after review
        }}
      />

      {/* Document Extraction Modal */}
      <DocumentExtractionModal
        open={extractionModalOpen}
        onOpenChange={(open) => {
          setExtractionModalOpen(open);
          if (!open) {
            setSelectedDocumentForExtraction(null);
          }
        }}
        document={selectedDocumentForExtraction}
      />
    </div>
  );
};