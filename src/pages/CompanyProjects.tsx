import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Calendar, FileText, TrendingUp, Building2, ArrowLeft, Upload, Edit2, Trash2, MoreVertical, Grid3X3, List, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { api } from '@/lib/api';
import type { Project, Company, Document } from '@/lib/api/types';
import { useToast } from '@/hooks/use-toast';
import { AddProjectDialog } from '@/components/projects/AddProjectDialog';
import { EditProjectDialog } from '@/components/projects/EditProjectDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SortField = 'name' | 'reference' | 'buildingType' | 'location' | 'status' | 'documents' | 'progress' | 'created';
type SortDirection = 'asc' | 'desc';

export default function CompanyProjects() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectDocuments, setProjectDocuments] = useState<Record<string, Document[]>>({});
  const [projectTotalCounts, setProjectTotalCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [tableSortField, setTableSortField] = useState<SortField>('created');
  const [tableSortDirection, setTableSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    if (companyId) {
      loadCompanyAndProjects();
    }
  }, [companyId]);

  const loadCompanyAndProjects = async () => {
    try {
      setLoading(true);
      
      // Try to load company data
      try {
        const companyData = await api.companies.getCompany(companyId!);
        setCompany(companyData);
      } catch (error) {
        console.error('Failed to load company:', error);
        // Continue without company data
      }
      
      // Try to load projects
      try {
        const projectsData = await api.projects.getProjects(companyId!);
        setProjects(projectsData);
        
        // Load document counts for each project
        const documentCounts: Record<string, Document[]> = {};
        for (const project of projectsData) {
          try {
            // Use paginated API to get the total count
            const response = await api.documents.getDocumentsPaginated(project.id, {
              page: 1,
              page_size: 1 // We only need the total count
            });
            
            // For now, we'll store an empty array since we only need the count
            documentCounts[project.id] = [];
            
            // Store the total count separately
            setProjectTotalCounts(prev => ({
              ...prev,
              [project.id]: response.total
            }));
          } catch (error) {
            console.error(`Failed to load documents for project ${project.id}:`, error);
            documentCounts[project.id] = [];
          }
        }
        setProjectDocuments(documentCounts);
      } catch (error) {
        console.error('Failed to load projects:', error);
        // Set empty array if projects endpoint fails
        setProjects([]);
        setProjectDocuments({});
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-primary text-primary-foreground"
      case "completed":
        return "bg-success text-success-foreground"
      case "pending":
        return "bg-warning text-warning-foreground"
      case "archived":
        return "bg-muted text-muted-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "text-success"
    if (progress >= 50) return "text-warning"
    return "text-destructive"
  }

  const handleTableSort = (field: SortField) => {
    if (tableSortField === field) {
      setTableSortDirection(tableSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setTableSortField(field);
      setTableSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (tableSortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return tableSortDirection === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const filteredProjects = projects
    .filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.project_reference && project.project_reference.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      // For grid view, use the existing sort
      if (viewMode === 'grid') {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'recent':
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          default:
            return 0;
        }
      }
      
      // For table view, use table-specific sorting
      const direction = tableSortDirection === 'asc' ? 1 : -1;
      switch (tableSortField) {
        case 'name':
          return direction * a.name.localeCompare(b.name);
        case 'reference':
          return direction * (a.project_reference || '').localeCompare(b.project_reference || '');
        case 'buildingType':
          return direction * (a.building_type || '').localeCompare(b.building_type || '');
        case 'location':
          return direction * (a.location || '').localeCompare(b.location || '');
        case 'status':
          return direction * a.status.localeCompare(b.status);
        case 'documents':
          const aCount = projectDocuments[a.id]?.length || 0;
          const bCount = projectDocuments[b.id]?.length || 0;
          return direction * (aCount - bCount);
        case 'progress':
          const aProgress = projectDocuments[a.id]?.length > 0 
            ? Math.round((projectDocuments[a.id].filter(doc => doc.status === 'evaluated').length / projectDocuments[a.id].length) * 100) 
            : 0;
          const bProgress = projectDocuments[b.id]?.length > 0 
            ? Math.round((projectDocuments[b.id].filter(doc => doc.status === 'evaluated').length / projectDocuments[b.id].length) * 100) 
            : 0;
          return direction * (aProgress - bProgress);
        case 'created':
          return direction * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        default:
          return 0;
      }
    });

  const handleProjectClick = (projectId: string) => {
    navigate(`/companies/${companyId}/projects/${projectId}/documents`);
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setShowEditDialog(true);
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      await api.projects.deleteProject(projectToDelete.id);
      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
      loadCompanyAndProjects();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete project",
        variant: "destructive",
      });
    } finally {
      setShowDeleteDialog(false);
      setProjectToDelete(null);
    }
  };

  const confirmDeleteProject = (project: Project) => {
    setProjectToDelete(project);
    setShowDeleteDialog(true);
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
      {/* Header with Company Info */}
      <div className="space-y-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/companies')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Companies
        </Button>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{company?.name} - Projects</h1>
              <p className="text-muted-foreground">Manage building safety compliance projects for {company?.name}</p>
            </div>
          </div>
          <Button 
            className="flex items-center gap-2"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search projects..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
            </SelectContent>
          </Select>
          {/* View Mode Toggle */}
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="px-3"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="px-3"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Projects View */}
      {filteredProjects.length === 0 ? (
        <Card className="p-12">
          <CardContent className="text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No projects found</h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Get started by creating your first project'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredProjects.map((project) => {
            // Calculate real data
            const documentsCount = projectTotalCounts[project.id] || 0;
            // TODO: To show accurate progress, we'd need to fetch all documents or get evaluated count from API
            const evaluatedCount = 0;
            const progress = 0; // Temporarily set to 0 until we have a better solution
            const daysActive = Math.floor((new Date().getTime() - new Date(project.created_at).getTime()) / (1000 * 60 * 60 * 24));
            
            return (
              <Card 
                key={project.id} 
                className="hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col h-full"
                onClick={() => handleProjectClick(project.id)}
              >
                <CardHeader className="p-3 pb-2 flex-1">
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-medium leading-tight">{project.name}</CardTitle>
                      {project.project_reference && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {project.project_reference}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleEditProject(project);
                          }}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmDeleteProject(project);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Badge className={`${getStatusColor(project.status)} text-xs px-1.5 py-0`}>
                        {project.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0 flex flex-col justify-end space-y-2">
                  {/* Building info */}
                  <div className="text-sm text-muted-foreground space-y-1">
                    {project.building_type && (
                      <div className="truncate">
                        <span className="capitalize">{project.building_type.replace('_', ' ')}</span>
                      </div>
                    )}
                    {project.location && (
                      <div className="truncate">{project.location}</div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{documentsCount} docs</span>
                    </div>
                    <div className={`font-medium ${getProgressColor(progress)}`}>
                      {progress}%
                    </div>
                  </div>
                </CardContent>
                {/* Progress bar pinned to bottom */}
                <div className="w-full">
                  <Progress value={progress} className="h-1.5 rounded-b-lg rounded-t-none" />
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleTableSort('name')}
                >
                  <div className="flex items-center">
                    Project Name
                    {getSortIcon('name')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleTableSort('reference')}
                >
                  <div className="flex items-center">
                    Reference
                    {getSortIcon('reference')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleTableSort('buildingType')}
                >
                  <div className="flex items-center">
                    Building Type
                    {getSortIcon('buildingType')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleTableSort('location')}
                >
                  <div className="flex items-center">
                    Location
                    {getSortIcon('location')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleTableSort('status')}
                >
                  <div className="flex items-center">
                    Status
                    {getSortIcon('status')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 text-center"
                  onClick={() => handleTableSort('documents')}
                >
                  <div className="flex items-center justify-center">
                    Documents
                    {getSortIcon('documents')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 text-center"
                  onClick={() => handleTableSort('progress')}
                >
                  <div className="flex items-center justify-center">
                    Progress
                    {getSortIcon('progress')}
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project) => {
                const documentsCount = projectTotalCounts[project.id] || 0;
                // TODO: To show accurate progress, we'd need to fetch all documents or get evaluated count from API
                const evaluatedCount = 0;
                const progress = 0; // Temporarily set to 0 until we have a better solution
                
                return (
                  <TableRow 
                    key={project.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleProjectClick(project.id)}
                  >
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell>{project.project_reference || '-'}</TableCell>
                    <TableCell className="capitalize">{project.building_type?.replace('_', ' ') || '-'}</TableCell>
                    <TableCell>{project.location || '-'}</TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(project.status)} text-xs`}>
                        {project.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{documentsCount}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="flex-1 h-2" />
                        <span className={`text-sm font-medium ${getProgressColor(progress)}`}>
                          {progress}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleEditProject(project);
                          }}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmDeleteProject(project);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination Info */}
      <div className="flex items-center justify-between border-t pt-4">
        <p className="text-sm text-muted-foreground">
          Showing {filteredProjects.length} of {projects.length} projects
        </p>
      </div>

      {/* Add Project Dialog */}
      {companyId && (
        <AddProjectDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          companyId={companyId}
          companyName={company?.name}
          onSuccess={loadCompanyAndProjects}
        />
      )}

      {/* Edit Project Dialog */}
      <EditProjectDialog
        project={selectedProject}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={loadCompanyAndProjects}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project "{projectToDelete?.name}" and all associated documents. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteProject}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}