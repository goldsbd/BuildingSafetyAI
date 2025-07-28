import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Database, 
  Eye, 
  Play, 
  Square, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Settings,
  MessageCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { vectorApi } from '@/lib/api/vector';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import type { Project } from '@/lib/api/types';

type VectorStatus = 'not_configured' | 'configuring' | 'ready' | 'indexing' | 'offline' | 'error';

interface ProjectVectorInfo extends Project {
  vectorStatus: VectorStatus;
  documentCount: number;
  chunkCount: number;
  lastIndexed?: string;
}

export default function VectorDatabases() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projects, setProjects] = useState<ProjectVectorInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjectsWithVectorInfo();
  }, []);

  const loadProjectsWithVectorInfo = async () => {
    try {
      setLoading(true);
      
      // Get all companies first
      const companies = await api.companies.getCompanies();
      
      // Get all projects across all companies
      const allProjectsPromises = companies.map(async (company) => {
        try {
          const projects = await api.projects.getProjects(company.id);
          return projects.map(project => ({
            ...project,
            company_name: company.name
          }));
        } catch (error) {
          console.error(`Failed to load projects for company ${company.name}:`, error);
          return [];
        }
      });
      
      const allProjectsArrays = await Promise.all(allProjectsPromises);
      const allProjects = allProjectsArrays.flat();
      
      // Get vector status for each project
      const projectsWithVector = await Promise.all(
        allProjects.map(async (project) => {
          let vectorStatus: VectorStatus = 'not_configured';
          let documentCount = 0;
          let chunkCount = 0;
          let lastIndexed;

          try {
            const stats = await vectorApi.getVectorStats(project.id);
            if (stats) {
              vectorStatus = 'ready';
              documentCount = stats.document_count;
              chunkCount = stats.chunk_count;
              lastIndexed = stats.last_indexed_at;
            }
            // If stats is null, vectorStatus remains 'not_configured'
          } catch (error: any) {
            console.error(`Unexpected error checking vector status for project ${project.name}:`, error);
          }

          return {
            ...project,
            vectorStatus,
            documentCount,
            chunkCount,
            lastIndexed
          };
        })
      );

      setProjects(projectsWithVector);
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast({
        title: 'Error Loading Projects',
        description: 'Failed to load project vector database information.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: VectorStatus) => {
    switch (status) {
      case 'ready': return 'bg-green-500';
      case 'indexing': return 'bg-blue-500';
      case 'configuring': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  const getStatusIcon = (status: VectorStatus) => {
    switch (status) {
      case 'ready': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'indexing': return <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />;
      case 'configuring': return <Settings className="w-4 h-4 text-yellow-600" />;
      case 'offline': return <Square className="w-4 h-4 text-gray-600" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Database className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadgeVariant = (status: VectorStatus) => {
    switch (status) {
      case 'ready': return 'default';
      case 'indexing': return 'secondary';
      case 'configuring': return 'secondary';
      case 'offline': return 'outline';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  const handleViewProject = (companyId: string, projectId: string) => {
    navigate(`/companies/${companyId}/projects/${projectId}?tab=vector`);
  };

  const handleChatWithProject = (companyId: string, projectId: string) => {
    navigate(`/companies/${companyId}/projects/${projectId}?tab=chatbot`);
  };

  const quickToggleVectorDB = async (projectId: string, currentStatus: VectorStatus) => {
    try {
      if (currentStatus === 'ready') {
        await vectorApi.unmountVectorDB(projectId);
        toast({
          title: 'Vector DB Unmounted',
          description: 'Vector database has been taken offline.',
        });
      } else if (currentStatus === 'offline') {
        await vectorApi.mountVectorDB(projectId);
        toast({
          title: 'Vector DB Mounted',
          description: 'Vector database is now online.',
        });
      }
      
      // Refresh the data
      loadProjectsWithVectorInfo();
    } catch (error) {
      toast({
        title: 'Operation Failed',
        description: 'Failed to toggle vector database status.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="w-6 h-6" />
            Vector Databases
          </h1>
          <p className="text-muted-foreground">
            Manage document search and AI chat capabilities across all projects
          </p>
        </div>
        <Button onClick={loadProjectsWithVectorInfo} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Vector Database Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>Chunks</TableHead>
                <TableHead>Last Indexed</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p>Loading projects...</p>
                  </TableCell>
                </TableRow>
              ) : projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No projects found
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell>{project.company_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(project.vectorStatus)}`} />
                        <Badge variant={getStatusBadgeVariant(project.vectorStatus)}>
                          {project.vectorStatus.replace('_', ' ').toUpperCase()}
                        </Badge>
                        {getStatusIcon(project.vectorStatus)}
                      </div>
                    </TableCell>
                    <TableCell>{project.documentCount}</TableCell>
                    <TableCell>{project.chunkCount}</TableCell>
                    <TableCell>
                      {project.lastIndexed ? formatDate(project.lastIndexed) : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewProject(project.company_id, project.id)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        {project.vectorStatus === 'ready' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleChatWithProject(project.company_id, project.id)}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        )}
                        
                        {(project.vectorStatus === 'ready' || project.vectorStatus === 'offline') && (
                          <Button
                            variant={project.vectorStatus === 'ready' ? 'outline' : 'default'}
                            size="sm"
                            onClick={() => quickToggleVectorDB(project.id, project.vectorStatus)}
                          >
                            {project.vectorStatus === 'ready' ? (
                              <Square className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}