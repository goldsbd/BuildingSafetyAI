import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  FileText, 
  Clock, 
  User,
  Bot,
  Building2,
  FolderOpen,
  Play,
  Pause,
  CheckCircle,
  RefreshCw
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface EvaluationInProgress {
  id: string
  documentId: string
  documentName: string
  projectId: string
  projectName: string
  companyId: string
  companyName: string
  assessmentType: 'ai' | 'manual'
  progress: number
  questionsAnswered: number
  totalQuestions: number
  status: string
  startedAt: string
  estimatedCompletion?: string
  assessor?: string
}

export default function EvaluationsInProgress() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [evaluations, setEvaluations] = useState<EvaluationInProgress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEvaluations()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadEvaluations()
    }, 30000)
    
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadEvaluations = async () => {
    try {
      setLoading(true)
      
      // Load all companies first
      const companies = await api.companies.getCompanies()
      const inProgressEvaluations: EvaluationInProgress[] = []
      
      // For each company, load projects
      for (const company of companies) {
        try {
          const projects = await api.projects.getProjects(company.id)
          
          // For each project, load documents
          for (const project of projects) {
            try {
              const documents = await api.documents.getDocuments(project.id)
              
              // For each document, load assessments
              for (const document of documents) {
                try {
                  const assessments = await api.assessments.getDocumentAssessments(document.id)
                  
                  // Filter for in-progress assessments
                  const inProgressAssessments = assessments.filter(
                    a => a.status === 'in_progress' || a.status === 'processing' || a.status === 'pending'
                  )
                  
                  for (const assessment of inProgressAssessments) {
                    // Get assessment responses to calculate progress
                    const responses = await api.assessments.getAssessmentResponses(assessment.id)
                    
                    // Filter only relevant questions
                    const relevantResponses = responses?.filter(r => r.is_relevant !== false) || []
                    const answeredQuestions = relevantResponses.filter(r => r.verdict !== null && r.verdict !== undefined)
                    const totalQuestions = relevantResponses.length
                    const progress = totalQuestions > 0 ? Math.round((answeredQuestions.length / totalQuestions) * 100) : 0
                    
                    inProgressEvaluations.push({
                      id: assessment.id,
                      documentId: document.id,
                      documentName: document.original_filename || document.name,
                      projectId: project.id,
                      projectName: project.name,
                      companyId: company.id,
                      companyName: company.name,
                      assessmentType: assessment.assessment_type as 'ai' | 'manual',
                      progress: progress,
                      questionsAnswered: answeredQuestions.length,
                      totalQuestions: totalQuestions,
                      status: assessment.status,
                      startedAt: assessment.started_at || assessment.created_at,
                      assessor: assessment.assessor_name
                    })
                  }
                } catch (err) {
                  console.error(`Error loading assessments for document ${document.id}:`, err)
                }
              }
            } catch (err) {
              console.error(`Error loading documents for project ${project.id}:`, err)
            }
          }
        } catch (err) {
          console.error(`Error loading projects for company ${company.id}:`, err)
        }
      }
      
      // Sort by started date (most recent first)
      inProgressEvaluations.sort((a, b) => 
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      )
      
      setEvaluations(inProgressEvaluations)
    } catch (error) {
      console.error('Failed to load evaluations:', error)
      toast({
        title: 'Error',
        description: 'Failed to load evaluations',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-success'
    if (progress >= 50) return 'text-warning'
    return 'text-info'
  }

  const getTimeRemaining = (estimatedCompletion?: string) => {
    if (!estimatedCompletion) return 'Time estimate not available'
    
    const now = new Date()
    const completion = new Date(estimatedCompletion)
    const diffMs = completion.getTime() - now.getTime()
    
    if (diffMs < 0) return 'Overdue'
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m remaining`
    }
    return `${diffMinutes}m remaining`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Evaluations In Progress</h1>
          <p className="text-muted-foreground mt-1">
            Monitor ongoing document assessments
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadEvaluations()}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active Evaluations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{evaluations.length}</div>
            <p className="text-xs text-muted-foreground mt-1">In progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">AI Assessments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {evaluations.filter(e => e.assessmentType === 'ai').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Automated</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Manual Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {evaluations.filter(e => e.assessmentType === 'manual').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Human review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Avg. Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(evaluations.reduce((sum, e) => sum + e.progress, 0) / evaluations.length)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Completion</p>
          </CardContent>
        </Card>
      </div>

      {/* Evaluations List */}
      <div className="space-y-4">
        {evaluations.map((evaluation) => (
          <Card key={evaluation.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{evaluation.documentName}</CardTitle>
                    <Badge variant={evaluation.assessmentType === 'ai' ? 'secondary' : 'default'}>
                      {evaluation.assessmentType === 'ai' ? (
                        <>
                          <Bot className="h-3 w-3 mr-1" />
                          AI Assessment
                        </>
                      ) : (
                        <>
                          <User className="h-3 w-3 mr-1" />
                          Manual Review
                        </>
                      )}
                    </Badge>
                  </div>
                  <CardDescription>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {evaluation.companyName}
                      </span>
                      <span className="flex items-center gap-1">
                        <FolderOpen className="h-3 w-3" />
                        {evaluation.projectName}
                      </span>
                      {evaluation.assessor && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {evaluation.assessor}
                        </span>
                      )}
                    </div>
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate(`/companies/${evaluation.companyId}/projects/${evaluation.projectId}/documents`)}
                >
                  Continue
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">
                    Progress: {evaluation.questionsAnswered} of {evaluation.totalQuestions} questions
                  </span>
                  <span className={`font-medium ${getProgressColor(evaluation.progress)}`}>
                    {evaluation.progress}%
                  </span>
                </div>
                <Progress value={evaluation.progress} className="h-2" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Started {new Date(evaluation.startedAt).toLocaleTimeString()}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {getTimeRemaining(evaluation.estimatedCompletion)}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={async () => {
                    try {
                      // Pause functionality - would need backend support
                      toast({
                        title: 'Feature Coming Soon',
                        description: 'Pause functionality will be available in a future update.',
                      })
                    } catch (error) {
                      toast({
                        title: 'Error',
                        description: 'Failed to pause evaluation',
                        variant: 'destructive',
                      })
                    }
                  }}
                >
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => navigate(`/companies/${evaluation.companyId}/projects/${evaluation.projectId}/documents`)}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Complete Now
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {evaluations.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No evaluations in progress</h3>
            <p className="text-muted-foreground mb-4">
              Start a new evaluation from the document library
            </p>
            <Button onClick={() => navigate('/documents')}>
              Browse Documents
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}