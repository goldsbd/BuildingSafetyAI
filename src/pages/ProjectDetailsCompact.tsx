import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Upload as UploadIcon, Folder, Grid, List, Search, RefreshCw } from "lucide-react";
import { api } from '@/lib/api';
import type { Company, Project } from '@/lib/api/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import '@/styles/project-details.css';

// Import tab components
import { PaginatedDocumentList } from '@/components/project/PaginatedDocumentList';
import { FolderTreeView } from '@/components/project/FolderTreeView';
import DocumentUploadTab from '@/components/project/DocumentUploadTab';
import { DocumentReviewModal } from '@/components/project/DocumentReviewModal';
import { DocumentProcessingProgress } from '@/components/project/DocumentProcessingProgress';
import type { Document } from '@/lib/api/types';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export default function ProjectDetailsCompact() {
  const { companyId, projectId } = useParams<{ companyId: string; projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [company, setCompany] = useState<Company | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('review');
  const [viewMode, setViewMode] = useState<'folder' | 'list'>('folder');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedRoot, setSelectedRoot] = useState<boolean>(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [documentStats, setDocumentStats] = useState({
    total: 0,
    reviewed: 0,
    notReviewed: 0,
    processing: 0,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (companyId && projectId) {
      loadProjectData();
    }
  }, [companyId, projectId]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      
      // Load company data
      try {
        const companyData = await api.companies.getCompany(companyId!);
        setCompany(companyData);
      } catch (error: any) {
        console.error('Failed to load company:', error);
      }
      
      // Load project data
      try {
        const projectData = await api.projects.getProject(projectId!);
        setProject(projectData);
      } catch (error: any) {
        console.error('Failed to load project:', error);
      }
      
      // Load document stats
      try {
        const documentsResponse = await api.documents.getDocumentsPaginated(projectId!, {
          page: 1,
          pageSize: 100, // Get first 100 docs to sample status
        });
        
        // For now, we'll estimate based on the first page
        // TODO: Add a backend endpoint to get document statistics efficiently
        let reviewedCount = 0;
        let processingCount = 0;
        
        // Check status of documents in the first page
        for (const doc of documentsResponse.data) {
          if (doc.status === 'processing') {
            processingCount++;
          }
          
          // We'll check if the status indicates it's been evaluated
          if (doc.status === 'evaluated' || doc.status === 'reviewed') {
            reviewedCount++;
          }
        }
        
        // If we have documents, estimate the total based on the sample
        if (documentsResponse.data.length > 0) {
          const reviewedPercentage = reviewedCount / documentsResponse.data.length;
          const processingPercentage = processingCount / documentsResponse.data.length;
          
          reviewedCount = Math.round(documentsResponse.total * reviewedPercentage);
          processingCount = Math.round(documentsResponse.total * processingPercentage);
        }
        
        setDocumentStats({
          total: documentsResponse.total,
          reviewed: reviewedCount,
          notReviewed: documentsResponse.total - reviewedCount,
          processing: processingCount,
        });
      } catch (error: any) {
        console.error('Failed to load document stats:', error);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Note',
        description: 'Some data could not be loaded. The system may be initializing.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshCache = async () => {
    if (!projectId) return;
    
    setIsRefreshing(true);
    try {
      await api.folders.refreshProjectCache(projectId);
      
      // Reload data after cache refresh
      await loadProjectData();
      
      toast({
        title: 'Cache Refreshed',
        description: 'Folder and document data has been refreshed successfully.',
      });
    } catch (error) {
      console.error('Failed to refresh cache:', error);
      toast({
        title: 'Refresh Failed',
        description: 'Failed to refresh cache. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDocumentSelect = (document: Document) => {
    setSelectedDocument(document);
  };

  const handleDocumentReview = (document: Document) => {
    setSelectedDocument(document);
    setIsReviewModalOpen(true);
  };

  const handleReviewComplete = () => {
    setIsReviewModalOpen(false);
    setSelectedDocument(null);
    loadProjectData();
  };

  const handleFolderSelect = (folderId: string | null, rootOnly?: boolean) => {
    if (rootOnly) {
      setSelectedRoot(true);
      setSelectedFolderId(null);
    } else {
      setSelectedRoot(false);
      setSelectedFolderId(folderId);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Fixed Header - Project Documents */}
      <div className="border-b px-4 py-2 bg-background flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(`/companies/${companyId}/projects`)}
              className="h-8 px-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <FileText className="h-4 w-4 text-gray-600" />
            
            <div className="text-sm">
              <span className="font-medium text-gray-900">{project?.name}</span>
            </div>
          </div>

          {/* Right side stats */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Total Documents</span>
              <span className="font-bold text-lg">{documentStats.total.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Reviewed</span>
              <span className="font-bold text-lg text-green-600">{documentStats.reviewed}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Not Reviewed</span>
              <span className="font-bold text-lg text-red-600">{documentStats.notReviewed.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Processing</span>
              <span className="font-bold text-lg text-yellow-600">{documentStats.processing}</span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshCache}
              disabled={isRefreshing}
              className="ml-4 h-8 px-3"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="border-b px-4 bg-white flex-shrink-0">
            <div className="flex items-center justify-between">
              <TabsList className="h-10 p-0 bg-transparent border-0">
                <TabsTrigger 
                  value="review" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  AI Review Dashboard
                </TabsTrigger>
                <TabsTrigger 
                  value="upload" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4"
                >
                  <UploadIcon className="h-4 w-4 mr-2" />
                  Document Upload
                </TabsTrigger>
              </TabsList>

              {activeTab === 'review' && (
                <div className="flex items-center gap-3">
                  {/* Search Box */}
                  <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2 h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Search documents..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="pl-8 h-8 w-64"
                      />
                    </div>
                    <Button type="submit" size="sm" className="h-8">Search</Button>
                  </form>
                  
                  {/* View Mode Buttons */}
                  <div className="flex items-center gap-2 border-l pl-3">
                    <Button
                      variant={viewMode === 'folder' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('folder')}
                      className="h-8"
                    >
                      <Folder className="h-4 w-4 mr-1" />
                      Folder View
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="h-8"
                    >
                      <List className="h-4 w-4 mr-1" />
                      List View
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <TabsContent value="review" className="flex-1 m-0 p-0 overflow-hidden">
            <div className="h-full flex flex-col overflow-hidden">
              <div className="flex-shrink-0">
                <DocumentProcessingProgress projectId={projectId!} />
              </div>
              
              {viewMode === 'folder' ? (
                <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0 overflow-hidden">
                  <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
                    <div className="h-full flex flex-col border-r overflow-hidden">
                      <div className="p-2 border-b bg-gray-50 flex-shrink-0">
                        <h3 className="text-sm font-medium">Folders</h3>
                      </div>
                      <div className="flex-1 overflow-auto min-h-0">
                        <FolderTreeView
                          projectId={projectId!}
                          selectedFolderId={selectedFolderId}
                          selectedRoot={selectedRoot}
                          onFolderSelectCallback={handleFolderSelect}
                        />
                      </div>
                    </div>
                  </ResizablePanel>
                  <ResizableHandle />
                  <ResizablePanel defaultSize={80} className="flex overflow-hidden">
                    <div className="flex flex-col h-full w-full">
                      <PaginatedDocumentList
                        projectId={projectId!}
                        viewMode="folder"
                        folderId={selectedFolderId || undefined}
                        rootOnly={selectedRoot}
                        onDocumentSelect={handleDocumentSelect}
                        onDocumentReview={handleDocumentReview}
                        compact={true}
                        search={search}
                      />
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <PaginatedDocumentList
                    projectId={projectId!}
                    viewMode="list"
                    onDocumentSelect={handleDocumentSelect}
                    onDocumentReview={handleDocumentReview}
                    compact={true}
                    search={search}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="upload" className="flex-1 m-0 p-4">
            <DocumentUploadTab 
              companyId={companyId!} 
              projectId={projectId!}
              company={company}
              project={project}
              onRefreshNeeded={loadProjectData}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Review Modal */}
      {selectedDocument && (
        <DocumentReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          document={selectedDocument}
          projectId={projectId!}
          onReviewComplete={handleReviewComplete}
        />
      )}
    </div>
  );
}