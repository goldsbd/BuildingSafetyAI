import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Play, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileText, 
  Download, 
  Trash2, 
  MoreHorizontal, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from '@/lib/api';
import type { Document, DocumentCategory } from '@/lib/api/types';
import { useToast } from '@/hooks/use-toast';
import { assessmentsApi } from '@/lib/api/assessments';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CategorizedDocumentListProps {
  companyId: string;
  projectId: string;
  documents: Document[];
  documentStats: Record<string, DocumentStats>;
  selectedDocuments: Set<string>;
  onSelectDocument: (documentId: string, checked: boolean) => void;
  onSingleReview: (documentId: string) => void;
  onDocumentClick: (documentId: string) => void;
  onDownload: (document: Document) => void;
  onDelete: (document: Document) => void;
  onCategoryUpdate: (documentId: string, categoryId: string) => void;
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

interface CategoryWithDocuments extends DocumentCategory {
  documents: Document[];
  totalDocuments: number;
  assessedDocuments: number;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getCategoryIcon = (categoryName: string) => {
  const name = categoryName.toLowerCase();
  if (name.includes('accessibility')) return '♿';
  if (name.includes('building control')) return '🏗️';
  if (name.includes('building regulations')) return '📋';
  if (name.includes('change control')) return '🔄';
  if (name.includes('competence')) return '📝';
  if (name.includes('construction')) return '🏗️';
  if (name.includes('drawings')) return '📐';
  if (name.includes('emergency')) return '🚨';
  if (name.includes('environmental')) return '🌿';
  if (name.includes('fire')) return '🔥';
  if (name.includes('resident')) return '👥';
  if (name.includes('safety')) return '🛡️';
  return '📁';
};

const getCategoryColor = (code: string) => {
  const colors: Record<string, string> = {
    'ACC': 'bg-red-50 text-red-700 border-red-200',
    'BC': 'bg-blue-50 text-blue-700 border-blue-200',
    'BUILDING_REGS': 'bg-green-50 text-green-700 border-green-200',
    'ChangeControlPlan': 'bg-purple-50 text-purple-700 border-purple-200',
    'CompetenceDeclaration': 'bg-orange-50 text-orange-700 border-orange-200',
    'ConstructionControlPlan': 'bg-teal-50 text-teal-700 border-teal-200',
    'DrawingsAndPlans': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'EMERGENCY': 'bg-pink-50 text-pink-700 border-pink-200',
    'ENV': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'FIRE': 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return colors[code] || 'bg-gray-50 text-gray-700 border-gray-200';
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

export default function CategorizedDocumentList({
  companyId,
  projectId,
  documents,
  documentStats,
  selectedDocuments,
  onSelectDocument,
  onSingleReview,
  onDocumentClick,
  onDownload,
  onDelete,
  onCategoryUpdate,
  onRefreshNeeded
}: CategorizedDocumentListProps) {
  const { toast } = useToast();
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [categorizedDocs, setCategorizedDocs] = useState<CategoryWithDocuments[]>([]);
  const [uncategorizedDocs, setUncategorizedDocs] = useState<Document[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, DocumentCategory>>({});
  const [updatingCategory, setUpdatingCategory] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    organizeDocumentsByCategory();
  }, [documents, categories, documentStats]);

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

  const organizeDocumentsByCategory = () => {
    const categoryMap = new Map<string, CategoryWithDocuments>();
    
    // Initialize categories
    categories.forEach(cat => {
      categoryMap.set(cat.id, {
        ...cat,
        documents: [],
        totalDocuments: 0,
        assessedDocuments: 0
      });
    });

    // Organize documents
    const uncategorized: Document[] = [];
    
    documents.forEach(doc => {
      if (doc.category_id && categoryMap.has(doc.category_id)) {
        const category = categoryMap.get(doc.category_id)!;
        category.documents.push(doc);
        category.totalDocuments++;
        
        const stats = documentStats[doc.id];
        if (stats && stats.status === 'reviewed') {
          category.assessedDocuments++;
        }
      } else {
        uncategorized.push(doc);
      }
    });

    setCategorizedDocs(Array.from(categoryMap.values()).filter(cat => cat.documents.length > 0));
    setUncategorizedDocs(uncategorized);
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const isCategorySelected = (category: CategoryWithDocuments) => {
    return category.documents.every(doc => selectedDocuments.has(doc.id));
  };

  const isCategoryPartiallySelected = (category: CategoryWithDocuments) => {
    const selectedCount = category.documents.filter(doc => selectedDocuments.has(doc.id)).length;
    return selectedCount > 0 && selectedCount < category.documents.length;
  };

  const handleCategorySelect = (category: CategoryWithDocuments, checked: boolean) => {
    category.documents.forEach(doc => {
      onSelectDocument(doc.id, checked);
    });
  };

  const updateDocumentCategory = async (documentId: string, categoryId: string) => {
    try {
      setUpdatingCategory(documentId);
      await onCategoryUpdate(documentId, categoryId);
    } finally {
      setUpdatingCategory(null);
    }
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No documents found</h3>
        <p className="text-muted-foreground">
          Upload documents using the "Document Upload" tab to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Categorized Documents */}
      {categorizedDocs.map((category) => {
        const isExpanded = expandedCategories.has(category.id);
        const isSelected = isCategorySelected(category);
        const isPartiallySelected = isCategoryPartiallySelected(category);
        
        return (
          <div key={category.id} className="border rounded-lg overflow-hidden">
            {/* Category Header */}
            <div 
              className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors ${getCategoryColor(category.code)}`}
              onClick={() => toggleCategory(category.id)}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => handleCategorySelect(category, checked as boolean)}
                onClick={(e) => e.stopPropagation()}
                ref={(ref) => {
                  if (ref) ref.indeterminate = isPartiallySelected;
                }}
              />
              
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {isExpanded ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
              </div>
              
              <span className="text-lg">{getCategoryIcon(category.name)}</span>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{category.name}</span>
                  <Badge variant="outline" className={getCategoryColor(category.code)}>
                    {category.code}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">{category.totalDocuments}</span>
                  <span className="text-muted-foreground">Documents</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="font-medium text-success">{category.assessedDocuments}</span>
                  <span className="text-muted-foreground">Assessed</span>
                </div>
                
                <div className="text-2xl font-bold text-primary">
                  107
                  <span className="text-sm font-normal text-muted-foreground ml-1">Questions</span>
                </div>
              </div>
            </div>
            
            {/* Documents Table - Only shown when expanded */}
            {isExpanded && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Review Status</TableHead>
                    <TableHead>Compliance</TableHead>
                    <TableHead>Assessment Results</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {category.documents.map((doc) => {
                    const stats = documentStats[doc.id] || { status: 'not_reviewed' };
                    const ReviewStatusIcon = getReviewStatusIcon(stats.status);
                    
                    return (
                      <TableRow 
                        key={doc.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => onDocumentClick(doc.id)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedDocuments.has(doc.id)}
                            onCheckedChange={(checked) => 
                              onSelectDocument(doc.id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <button
                                className="text-left hover:underline"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  
                                  // Open PDF in new tab
                                  try {
                                    const token = localStorage.getItem('auth_token');
                                    if (!token) {
                                      console.error('No auth token found');
                                      return;
                                    }
                                    
                                    const viewUrl = `http://localhost:3001/api/documents/${doc.id}/view`;
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
                                    const newTab = window.open(blobUrl, '_blank');
                                    
                                    if (newTab) {
                                      setTimeout(() => {
                                        window.URL.revokeObjectURL(blobUrl);
                                      }, 1000);
                                    }
                                  } catch (error) {
                                    console.error('Error opening document:', error);
                                  }
                                }}
                              >
                                <p className="font-medium">{doc.original_filename}</p>
                              </button>
                              <p className="text-sm text-muted-foreground">{doc.mime_type}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-auto px-2 py-1 ${
                                  doc.category_id && categoryMap[doc.category_id]
                                    ? getCategoryColor(categoryMap[doc.category_id].code)
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                                disabled={updatingCategory === doc.id}
                              >
                                {updatingCategory === doc.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : doc.category_id && categoryMap[doc.category_id] ? (
                                  <>
                                    <span className="mr-1">{getCategoryIcon(categoryMap[doc.category_id].name)}</span>
                                    <span className="text-xs font-medium">{categoryMap[doc.category_id].code}</span>
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
                                  {categories.map((categoryOption) => (
                                    <Button
                                      key={categoryOption.id}
                                      variant="ghost"
                                      size="sm"
                                      className={`w-full justify-start text-left ${
                                        doc.category_id === categoryOption.id
                                          ? 'bg-primary/10'
                                          : ''
                                      }`}
                                      onClick={() => updateDocumentCategory(doc.id, categoryOption.id)}
                                    >
                                      <span className="mr-2">{getCategoryIcon(categoryOption.name)}</span>
                                      <div className="flex-1">
                                        <p className="text-sm font-medium">{categoryOption.name}</p>
                                        <p className="text-xs text-muted-foreground">{categoryOption.code}</p>
                                      </div>
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <ReviewStatusIcon className={`h-4 w-4 ${getReviewStatusColor(stats.status)}`} />
                            <Badge variant={getReviewStatusBadgeVariant(stats.status)}>
                              {getReviewStatusText(stats.status)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {stats.complianceScore !== undefined ? (
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold ${
                                stats.complianceScore >= 80 ? 'text-success' : 
                                stats.complianceScore >= 60 ? 'text-warning' : 
                                'text-destructive'
                              }`}>
                                {stats.complianceScore}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {stats.totalQuestions ? (
                            <div className="flex items-center gap-3 text-sm">
                              <div className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3 text-success" />
                                <span className="text-success font-medium">{stats.satisfactoryCount}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <XCircle className="h-3 w-3 text-destructive" />
                                <span className="text-destructive font-medium">{stats.unsatisfactoryCount}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3 text-warning" />
                                <span className="text-warning font-medium">{stats.requirementCount}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No assessment</span>
                          )}
                        </TableCell>
                        <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                        <TableCell>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onSingleReview(doc.id)}
                              title={stats.status === 'not_reviewed' ? "Run AI Review" : "Rerun AI Review"}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onDownload(doc)}>
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => onDelete(doc)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        );
      })}
      
      {/* Uncategorized Documents */}
      {uncategorizedDocs.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div 
            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors bg-gray-50 text-gray-700 border-gray-200"
            onClick={() => toggleCategory('uncategorized')}
          >
            <Checkbox
              checked={uncategorizedDocs.every(doc => selectedDocuments.has(doc.id))}
              onCheckedChange={(checked) => {
                uncategorizedDocs.forEach(doc => {
                  onSelectDocument(doc.id, checked as boolean);
                });
              }}
              onClick={(e) => e.stopPropagation()}
            />
            
            <div className="flex items-center gap-2">
              {expandedCategories.has('uncategorized') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              {expandedCategories.has('uncategorized') ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
            </div>
            
            <span className="text-lg">📁</span>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">Uncategorized</span>
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                  UNCAT
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="font-medium">{uncategorizedDocs.length}</span>
                <span className="text-muted-foreground">Documents</span>
              </div>
              
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="font-medium text-success">
                  {uncategorizedDocs.filter(doc => documentStats[doc.id]?.status === 'reviewed').length}
                </span>
                <span className="text-muted-foreground">Assessed</span>
              </div>
              
              <div className="text-2xl font-bold text-primary">
                0
                <span className="text-sm font-normal text-muted-foreground ml-1">Questions</span>
              </div>
            </div>
          </div>
          
          {expandedCategories.has('uncategorized') && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Review Status</TableHead>
                  <TableHead>Compliance</TableHead>
                  <TableHead>Assessment Results</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uncategorizedDocs.map((doc) => {
                  const stats = documentStats[doc.id] || { status: 'not_reviewed' };
                  const ReviewStatusIcon = getReviewStatusIcon(stats.status);
                  
                  return (
                    <TableRow 
                      key={doc.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onDocumentClick(doc.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedDocuments.has(doc.id)}
                          onCheckedChange={(checked) => 
                            onSelectDocument(doc.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <button
                              className="text-left hover:underline"
                              onClick={async (e) => {
                                e.stopPropagation();
                                
                                // Open PDF in new tab
                                try {
                                  const token = localStorage.getItem('auth_token');
                                  if (!token) {
                                    console.error('No auth token found');
                                    return;
                                  }
                                  
                                  const viewUrl = `http://localhost:3001/api/documents/${doc.id}/view`;
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
                                  const newTab = window.open(blobUrl, '_blank');
                                  
                                  if (newTab) {
                                    setTimeout(() => {
                                      window.URL.revokeObjectURL(blobUrl);
                                    }, 1000);
                                  }
                                } catch (error) {
                                  console.error('Error opening document:', error);
                                }
                              }}
                            >
                              <p className="font-medium">{doc.original_filename}</p>
                            </button>
                            <p className="text-sm text-muted-foreground">{doc.mime_type}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-auto px-2 py-1 ${
                                doc.category_id && categoryMap[doc.category_id]
                                  ? getCategoryColor(categoryMap[doc.category_id].code)
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                              disabled={updatingCategory === doc.id}
                            >
                              {updatingCategory === doc.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : doc.category_id && categoryMap[doc.category_id] ? (
                                <>
                                  <span className="mr-1">{getCategoryIcon(categoryMap[doc.category_id].name)}</span>
                                  <span className="text-xs font-medium">{categoryMap[doc.category_id].code}</span>
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
                                {categories.map((categoryOption) => (
                                  <Button
                                    key={categoryOption.id}
                                    variant="ghost"
                                    size="sm"
                                    className={`w-full justify-start text-left ${
                                      doc.category_id === categoryOption.id
                                        ? 'bg-primary/10'
                                        : ''
                                    }`}
                                    onClick={() => updateDocumentCategory(doc.id, categoryOption.id)}
                                  >
                                    <span className="mr-2">{getCategoryIcon(categoryOption.name)}</span>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">{categoryOption.name}</p>
                                      <p className="text-xs text-muted-foreground">{categoryOption.code}</p>
                                    </div>
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ReviewStatusIcon className={`h-4 w-4 ${getReviewStatusColor(stats.status)}`} />
                          <Badge variant={getReviewStatusBadgeVariant(stats.status)}>
                            {getReviewStatusText(stats.status)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {stats.complianceScore !== undefined ? (
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${
                              stats.complianceScore >= 80 ? 'text-success' : 
                              stats.complianceScore >= 60 ? 'text-warning' : 
                              'text-destructive'
                            }`}>
                              {stats.complianceScore}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {stats.totalQuestions ? (
                          <div className="flex items-center gap-3 text-sm">
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-success" />
                              <span className="text-success font-medium">{stats.satisfactoryCount}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <XCircle className="h-3 w-3 text-destructive" />
                              <span className="text-destructive font-medium">{stats.unsatisfactoryCount}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 text-warning" />
                              <span className="text-warning font-medium">{stats.requirementCount}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No assessment</span>
                        )}
                      </TableCell>
                      <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                      <TableCell>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSingleReview(doc.id)}
                            title={stats.status === 'not_reviewed' ? "Run AI Review" : "Rerun AI Review"}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onDownload(doc)}>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => onDelete(doc)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}