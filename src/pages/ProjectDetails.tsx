import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Folder, FileText, Upload as UploadIcon, Bot } from "lucide-react";
import { api } from '@/lib/api';
import type { Company, Project } from '@/lib/api/types';
import { useToast } from '@/hooks/use-toast';

// Import tab components
import DocumentReviewTab from '@/components/project/DocumentReviewTab';
import DocumentUploadTab from '@/components/project/DocumentUploadTab';

export default function ProjectDetails() {
  const { companyId, projectId } = useParams<{ companyId: string; projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [company, setCompany] = useState<Company | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('review');

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header with Breadcrumb */}
      <div className="space-y-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate(`/companies/${companyId}/projects`)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Button>
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="h-4 w-4" />
          <span>{company?.name}</span>
          <span>/</span>
          <Folder className="h-4 w-4" />
          <span>{project?.name}</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Project: {project?.name}</h1>
            <p className="text-muted-foreground">
              AI-powered building safety compliance review and management
            </p>
          </div>
        </div>
      </div>

      {/* Project Info Card */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Project Reference:</span>
            <p className="font-medium">{project?.project_reference || 'N/A'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Building Type:</span>
            <p className="font-medium">{project?.building_type || 'N/A'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Location:</span>
            <p className="font-medium">{project?.location || 'N/A'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Status:</span>
            <p className="font-medium capitalize">{project?.status || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="review" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI Review Dashboard
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <UploadIcon className="h-4 w-4" />
            Document Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="review" className="mt-6">
          <DocumentReviewTab 
            companyId={companyId!} 
            projectId={projectId!}
            onRefreshNeeded={loadProjectData}
          />
        </TabsContent>

        <TabsContent value="upload" className="mt-6">
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
  );
}