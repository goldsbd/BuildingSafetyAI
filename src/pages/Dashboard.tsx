import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Building2, 
  FileText, 
  ClipboardCheck, 
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  FolderOpen,
  ArrowRight,
  FileSearch,
  Users
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { api } from "@/lib/api"

interface DashboardData {
  companies: any[]
  projects: any[]
  recentDocuments: any[]
  recentAssessments: any[]
  totalDocumentCount?: number
}

interface StatCard {
  title: string
  value: string | number
  description: string
  icon: React.ElementType
  trend?: {
    value: number
    label: string
  }
  link?: string
}

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData>({
    companies: [],
    projects: [],
    recentDocuments: [],
    recentAssessments: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load real data from API
      const companies = await api.companies.getCompanies()
      
      // Load projects from each company (backend requires company_id)
      const allProjects = []
      for (const company of companies) {
        try {
          const companyProjects = await api.projects.getProjects(company.id)
          allProjects.push(...companyProjects)
        } catch (err) {
          console.error(`Error loading projects for company ${company.id}:`, err)
        }
      }
      
      const recentDocuments = []
      const assessments = []
      
      // Load documents from all projects for accurate count
      let totalDocumentCount = 0
      for (const project of allProjects) {
        try {
          // Use paginated API to get total count and first page of documents
          const response = await api.documents.getDocumentsPaginated(project.id, {
            page: 1,
            page_size: 50
          })
          totalDocumentCount += response.total
          
          // Add to recent documents (for display in activity feed)
          if (recentDocuments.length < 5 && response.data.length > 0) {
            recentDocuments.push(...response.data.slice(0, 5 - recentDocuments.length).map((doc: any) => ({
              ...doc,
              project_name: project.name,
              company_id: project.company_id
            })))
          }
          
          // Load assessments for the first few documents (for recent activity)
          for (const doc of response.data.slice(0, 5)) {
            try {
              const docAssessments = await api.assessments.getDocumentAssessments(doc.id)
              assessments.push(...docAssessments.map((a: any) => ({
                ...a,
                document_name: doc.original_filename || doc.name,
                project_name: project.name
              })))
            } catch (err) {
              console.error(`Error loading assessments for document ${doc.id}:`, err)
            }
          }
        } catch (err) {
          console.error(`Error loading documents for project ${project.id}:`, err)
        }
      }
      
      console.log(`Dashboard stats: ${companies.length} companies, ${allProjects.length} projects, ${totalDocumentCount} documents`)

      setData({
        companies: companies,
        projects: allProjects,
        recentDocuments: recentDocuments.slice(0, 5),
        recentAssessments: assessments.slice(0, 5),
        totalDocumentCount: totalDocumentCount
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const userName = user?.first_name || user?.email?.split('@')[0] || 'User'
  const isConsultant = user?.role === 'bsai_staff' || user?.role === 'admin'
  const isSingleCompanyUser = user?.role === 'company_user' || user?.role === 'company_admin'
  
  // Helper function to safely format dates
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Recently'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Recently'
      return date.toLocaleDateString()
    } catch {
      return 'Recently'
    }
  }

  // Calculate real statistics
  const activeProjects = data.projects.filter(p => !p.status || p.status === 'active').length
  const totalDocuments = data.totalDocumentCount || 0
  const pendingReviews = data.recentAssessments.filter(a => a.status === 'in_progress').length
  const completedAssessments = data.recentAssessments.filter(a => a.status === 'completed').length

  const stats: StatCard[] = [
    {
      title: "Active Projects",
      value: activeProjects,
      description: `${data.projects.length} total projects`,
      icon: FolderOpen,
      link: "/projects"
    },
    {
      title: "Documents",
      value: totalDocuments,
      description: "Total documents",
      icon: FileText,
      link: "/documents"
    },
    {
      title: "Pending Reviews",
      value: pendingReviews,
      description: "Awaiting assessment",
      icon: Clock,
      link: "/evaluations/progress"
    },
    {
      title: "Completed",
      value: completedAssessments,
      description: "This month",
      icon: CheckCircle2,
      link: "/evaluations/reports"
    }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-800">Pending</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getComplianceScore = (score: number) => {
    if (score >= 8) return { color: "text-green-600", label: "Excellent" }
    if (score >= 6) return { color: "text-blue-600", label: "Good" }
    if (score >= 4) return { color: "text-orange-600", label: "Fair" }
    return { color: "text-red-600", label: "Needs Improvement" }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-bsai-blue-700 to-bsai-green-700 bg-clip-text text-transparent">
            Welcome back, {userName}
          </h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString("en-GB", { 
              weekday: "long", 
              year: "numeric", 
              month: "long", 
              day: "numeric" 
            })}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.title} to={stat.link || "#"}>
            <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border-bsai-blue-100">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className="p-2 bg-gradient-to-br from-bsai-blue-100 to-bsai-green-100 rounded-lg">
                  <stat.icon className="h-4 w-4 text-bsai-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold bg-gradient-to-r from-bsai-blue-600 to-bsai-green-600 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity - Left Column */}
        <div className="lg:col-span-2">
          <Card className="h-full border-bsai-blue-100">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest documents and assessments</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="documents" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="assessments">Assessments</TabsTrigger>
                </TabsList>
                
                <TabsContent value="documents" className="space-y-4">
                  {data.recentDocuments.length > 0 ? (
                    data.recentDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{doc.original_filename || doc.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Uploaded {formatDate(doc.uploaded_at || doc.created_at)}
                            </p>
                          </div>
                        </div>
                        <Link to={`/companies/${doc.company_id}/projects/${doc.project_id}/documents`}>
                          <Button variant="ghost" size="sm">
                            View <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No documents uploaded yet</p>
                      <Link to="/documents/upload">
                        <Button variant="link" className="mt-2">Upload your first document</Button>
                      </Link>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="assessments" className="space-y-4">
                  {data.recentAssessments.length > 0 ? (
                    data.recentAssessments.map((assessment) => (
                      <div key={assessment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{assessment.document_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {assessment.project_name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(assessment.status)}
                          {assessment.overall_score && (
                            <span className={`font-medium ${getComplianceScore(assessment.overall_score).color}`}>
                              {assessment.overall_score.toFixed(1)}/10
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No assessments yet</p>
                      <p className="text-sm mt-1">Upload documents to start compliance assessment</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions - Right Column */}
        <div className="space-y-6">
          {/* Quick Links */}
          <Card className="border-bsai-blue-100">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/projects" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <FolderOpen className="mr-2 h-4 w-4" />
                  View All Projects
                </Button>
              </Link>
              <Link to="/documents" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <FileSearch className="mr-2 h-4 w-4" />
                  Document Library
                </Button>
              </Link>
              <Link to="/evaluations/progress" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  Assessment Progress
                </Button>
              </Link>
              {isConsultant && (
                <Link to="/admin/questions" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="mr-2 h-4 w-4" />
                    Manage Questions
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Compliance Overview */}
          {data.projects.length > 0 && (
            <Card className="border-bsai-blue-100">
              <CardHeader>
                <CardTitle>Project Overview</CardTitle>
                <CardDescription>Active projects status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.projects.slice(0, 3).map((project) => (
                  <div key={project.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Link to={`/companies/${project.company_id}/projects`} className="hover:underline">
                        <p className="text-sm font-medium">{project.name}</p>
                      </Link>
                      <Badge variant="outline" className="text-xs">
                        {project.building_type}
                      </Badge>
                    </div>
                    <Progress value={0} className="h-2" />
                  </div>
                ))}
                {data.projects.length > 3 && (
                  <Link to="/projects">
                    <Button variant="link" size="sm" className="p-0 h-auto">
                      View all {data.projects.length} projects
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}