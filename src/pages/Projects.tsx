import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Calendar, FileText, Building2, Folder } from "lucide-react"
import { api } from '@/lib/api';
import type { Project, Company } from '@/lib/api/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function Projects() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');
  const [documentCounts, setDocumentCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load companies first
      const companiesData = await api.companies.getCompanies();
      setCompanies(companiesData);
      
      // For admin users, load projects from all companies
      // For regular users, this would only show their company's projects
      const allProjects: Project[] = [];
      const counts: Record<string, number> = {};
      
      for (const company of companiesData) {
        try {
          const companyProjects = await api.projects.getProjects(company.id);
          allProjects.push(...companyProjects);
          
          // Load document counts for each project using paginated API to get total count
          for (const project of companyProjects) {
            try {
              const paginatedResponse = await api.documents.getDocumentsPaginated(project.id, {
                page: 1,
                page_size: 1 // We only need the total count, not the documents
              });
              counts[project.id] = paginatedResponse.total;
            } catch (error) {
              console.error(`Failed to load documents for project ${project.name}:`, error);
              counts[project.id] = 0;
            }
          }
        } catch (error) {
          console.error(`Failed to load projects for company ${company.name}:`, error);
        }
      }
      
      setProjects(allProjects);
      setDocumentCounts(counts);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: 'Error loading projects',
        description: 'Some data could not be loaded. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getCompanyName = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    return company?.name || 'Unknown Company';
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
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "text-success"
    if (progress >= 50) return "text-warning"
    return "text-destructive"
  };

  const filteredProjects = projects
    .filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.project_reference && project.project_reference.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      const matchesCompany = companyFilter === 'all' || project.company_id === companyFilter;
      return matchesSearch && matchesStatus && matchesCompany;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'company':
          return getCompanyName(a.company_id).localeCompare(getCompanyName(b.company_id));
        default:
          return 0;
      }
    });

  const handleProjectClick = (project: Project) => {
    navigate(`/companies/${project.company_id}/projects/${project.id}/documents`);
  };

  const handleNewProject = () => {
    // If user is admin, they need to select a company first
    if (user?.role === 'admin') {
      navigate('/companies');
      toast({
        title: 'Select a company',
        description: 'Please select a company to create a project for.',
      });
    } else if (user?.company_id) {
      // Regular users go directly to their company's projects
      navigate(`/companies/${user.company_id}/projects`);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">All Projects</h1>
          <p className="text-muted-foreground">
            {user?.role === 'admin' 
              ? 'View and manage all projects across companies' 
              : 'Manage your building safety compliance projects'}
          </p>
        </div>
        <Button 
          className="flex items-center gap-2"
          onClick={handleNewProject}
        >
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Filters and Search */}
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
        
        {/* Company Filter - Only show for admin users */}
        {user?.role === 'admin' && companies.length > 0 && (
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filter by company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map(company => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
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
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="name">Name A-Z</SelectItem>
            {user?.role === 'admin' && <SelectItem value="company">Company</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Card className="p-12">
          <CardContent className="text-center">
            <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No projects found</h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== 'all' || companyFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Get started by creating your first project'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredProjects.map((project) => {
            const daysActive = Math.floor((new Date().getTime() - new Date(project.created_at).getTime()) / (1000 * 60 * 60 * 24));
            const documentsCount = documentCounts[project.id] || 0;
            const progress = 0; // TODO: Calculate from evaluations
            
            return (
              <Card 
                key={project.id} 
                className="hover:shadow-lg transition-all duration-200 cursor-pointer"
                onClick={() => handleProjectClick(project)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Reference: {project.project_reference || 'N/A'}
                      </p>
                      {/* Show company name */}
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span>{getCompanyName(project.company_id)}</span>
                      </div>
                    </div>
                    <Badge className={getStatusColor(project.status)}>
                      {project.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Project Info */}
                  {project.building_type && (
                    <div className="text-sm text-muted-foreground">
                      Building Type: {project.building_type}
                    </div>
                  )}
                  {project.location && (
                    <div className="text-sm text-muted-foreground">
                      Location: {project.location}
                    </div>
                  )}

                  {/* Stats Row */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{documentsCount} docs</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{daysActive} days</span>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Progress</span>
                      <span className={`text-sm font-medium ${getProgressColor(progress)}`}>
                        {progress}%
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {/* Last Activity */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-3">
                    <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProjectClick(project);
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination Info */}
      <div className="flex items-center justify-between border-t pt-4">
        <p className="text-sm text-muted-foreground">
          Showing {filteredProjects.length} of {projects.length} projects
        </p>
      </div>
    </div>
  );
}