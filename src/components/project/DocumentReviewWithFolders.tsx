import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderTree, List, Grid } from 'lucide-react';
import { PaginatedDocumentList } from './PaginatedDocumentList';
import { FolderTreeView } from './FolderTreeView';
import CategorizedDocumentList from './CategorizedDocumentList';
import { DocumentReviewModal } from './DocumentReviewModal';
import { DocumentProcessingProgress } from './DocumentProcessingProgress';
import type { Document } from '@/lib/api/types';
import { api } from '@/lib/api';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

interface DocumentReviewWithFoldersProps {
  companyId: string;
  projectId: string;
  onRefreshNeeded?: () => void;
}

export const DocumentReviewWithFolders: React.FC<DocumentReviewWithFoldersProps> = ({
  companyId,
  projectId,
  onRefreshNeeded,
}) => {
  const [viewMode, setViewMode] = useState<'folder' | 'category' | 'list'>('folder');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedRoot, setSelectedRoot] = useState<boolean>(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [documentStats, setDocumentStats] = useState({
    total: 0,
    reviewed: 0,
    notReviewed: 0,
    processing: 0,
  });

  useEffect(() => {
    const loadDocumentStats = async () => {
      try {
        const documentsResponse = await api.documents.getDocumentsPaginated(projectId, {
          page: 1,
          pageSize: 1, // We only need the total count
        });
        
        setDocumentStats({
          total: documentsResponse.total,
          reviewed: 0, // TODO: Calculate from actual data
          notReviewed: documentsResponse.total,
          processing: 0, // TODO: Calculate from actual data  
        });
      } catch (error: any) {
        console.error('Failed to load document stats:', error);
      }
    };

    if (projectId) {
      loadDocumentStats();
    }
  }, [projectId]);


  const handleDocumentSelect = (document: Document) => {
    setSelectedDocument(document);
  };

  const handleDocumentReview = (document: Document, assessmentId?: string) => {
    setSelectedDocument(document);
    setSelectedAssessmentId(assessmentId || null);
    setIsReviewModalOpen(true);
  };

  const handleReviewComplete = () => {
    setIsReviewModalOpen(false);
    setSelectedDocument(null);
    setSelectedAssessmentId(null);
    onRefreshNeeded?.();
  };

  const handleFolderSelect = useCallback((folderId: string | null, rootOnly?: boolean) => {
    if (rootOnly) {
      setSelectedRoot(true);
      setSelectedFolderId(null);
    } else {
      setSelectedRoot(false);
      setSelectedFolderId(folderId);
    }
  }, []);

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Processing Progress */}
      <DocumentProcessingProgress projectId={projectId} />

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{documentStats.total.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-sm font-medium">Reviewed</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-green-600">{documentStats.reviewed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-sm font-medium">Not Reviewed</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-red-600">{documentStats.notReviewed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-yellow-600">{documentStats.processing}</div>
          </CardContent>
        </Card>
      </div>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="flex-1 flex flex-col">
        <TabsList className="grid w-fit grid-cols-3">
          <TabsTrigger value="folder" className="flex items-center gap-2">
            <FolderTree className="h-4 w-4" />
            Folder View
          </TabsTrigger>
          <TabsTrigger value="category" className="flex items-center gap-2">
            <Grid className="h-4 w-4" />
            Category View
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            List View
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 mt-4">
          {/* Folder View */}
          <TabsContent value="folder" className="h-full mt-0">
            <Card className="h-full">
              <ResizablePanelGroup direction="horizontal" className="h-full">
                <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                  <FolderTreeView
                    projectId={projectId}
                    selectedFolderId={selectedFolderId}
                    selectedRoot={selectedRoot}
                    onFolderSelectCallback={handleFolderSelect}
                  />
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel defaultSize={75}>
                  <div className="p-6">
                    <PaginatedDocumentList
                      projectId={projectId}
                      viewMode="folder"
                      folderId={selectedFolderId || undefined}
                      rootOnly={selectedRoot}
                      onDocumentSelect={handleDocumentSelect}
                      onDocumentReview={handleDocumentReview}
                    />
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </Card>
          </TabsContent>

          {/* Category View */}
          <TabsContent value="category" className="h-full mt-0">
            <Card className="h-full p-6">
              <div className="text-muted-foreground">
                Category view is temporarily disabled while we migrate to the new paginated system.
                Please use Folder View or List View.
              </div>
            </Card>
          </TabsContent>

          {/* List View */}
          <TabsContent value="list" className="h-full mt-0">
            <Card className="h-full p-6">
              <PaginatedDocumentList
                projectId={projectId}
                viewMode="list"
                onDocumentSelect={handleDocumentSelect}
                onDocumentReview={handleDocumentReview}
              />
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Review Modal */}
      {isReviewModalOpen && (
        <DocumentReviewModal
          open={isReviewModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              handleReviewComplete();
            }
          }}
          documentId={selectedDocument?.id || null}
          assessmentId={selectedAssessmentId}
          onSave={handleReviewComplete}
        />
      )}
    </div>
  );
};