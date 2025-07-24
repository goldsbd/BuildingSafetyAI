import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { 
  ArrowLeft,
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Download,
  Save,
  FileText,
  Info
} from "lucide-react"

// Mock data structures
interface Question {
  id: string
  ref: string
  original_text: string
  improved_text: string
  section: {
    id: string
    title: string
  }
  subsection: {
    title: string
  }
}

interface Response {
  question_id: string
  verdict?: string
  compliance_level?: string
  assessor_notes?: string
  evidence?: string
}

interface Document {
  id: string
  original_filename: string
}

interface Assessment {
  id: string
  assessment_type: string
  created_at: string
  status: string
}

const VERDICT_OPTIONS = [
  { value: "satisfactory", label: "Satisfactory", color: "text-success" },
  { value: "unsatisfactory", label: "Unsatisfactory", color: "text-destructive" },
  { value: "requirement", label: "Requirement", color: "text-warning" }
]

const COMPLIANCE_OPTIONS = [
  { value: "compliant", label: "Compliant", color: "text-success" },
  { value: "partially_compliant", label: "Partially Compliant", color: "text-warning" },
  { value: "non_compliant", label: "Non-Compliant", color: "text-destructive" },
  { value: "not_applicable", label: "Not Applicable", color: "text-muted-foreground" }
]

// Mock questions data
const MOCK_QUESTIONS: Question[] = [
  {
    id: "q1",
    ref: "GW2-1.1",
    original_text: "Does the building have adequate fire escape routes?",
    improved_text: "Verify that all fire escape routes meet minimum width requirements and are clearly marked",
    section: { id: "s1", title: "Fire Safety" },
    subsection: { title: "Escape Routes" }
  },
  {
    id: "q2",
    ref: "GW2-1.2",
    original_text: "Are fire doors installed correctly?",
    improved_text: "Check that fire doors are properly rated and self-closing mechanisms are functional",
    section: { id: "s1", title: "Fire Safety" },
    subsection: { title: "Fire Doors" }
  },
  {
    id: "q3",
    ref: "GW2-2.1",
    original_text: "Is the structural integrity documented?",
    improved_text: "Review structural calculations and ensure they meet current building standards",
    section: { id: "s2", title: "Structural Safety" },
    subsection: { title: "Documentation" }
  }
]

export default function DocumentAssessment() {
  const { documentId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [document, setDocument] = useState<Document | null>(null)
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [responses, setResponses] = useState<Map<string, Response>>(new Map())
  const [currentSection, setCurrentSection] = useState<string>("")

  useEffect(() => {
    loadAssessmentData()
  }, [documentId])

  const loadAssessmentData = async () => {
    try {
      setLoading(true)
      
      // Mock data loading
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setDocument({
        id: documentId || "",
        original_filename: "Building Safety Plan.pdf"
      })
      
      setAssessment({
        id: "assessment-1",
        assessment_type: "manual",
        created_at: new Date().toISOString(),
        status: "in_progress"
      })
      
      setQuestions(MOCK_QUESTIONS)
      
      // Set initial section
      const sections = Array.from(new Set(MOCK_QUESTIONS.map(q => q.section.id)))
      if (sections.length > 0) {
        setCurrentSection(sections[0])
      }
      
      // Initialize responses
      const initialResponses = new Map<string, Response>()
      MOCK_QUESTIONS.forEach(q => {
        initialResponses.set(q.id, { question_id: q.id })
      })
      setResponses(initialResponses)
      
    } catch (error) {
      console.error("Failed to load assessment data:", error)
      toast({
        title: "Error",
        description: "Failed to load assessment data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const updateResponse = (questionId: string, field: keyof Response, value: string) => {
    const newResponses = new Map(responses)
    const response = newResponses.get(questionId) || { question_id: questionId }
    newResponses.set(questionId, { ...response, [field]: value })
    setResponses(newResponses)
  }

  const saveProgress = async () => {
    try {
      toast({
        title: "Progress Saved",
        description: "Your assessment progress has been saved"
      })
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save progress",
        variant: "destructive"
      })
    }
  }

  const exportReport = async (format: "json" | "markdown") => {
    try {
      const reportData = {
        document: document,
        assessment: assessment,
        responses: Array.from(responses.entries()).map(([questionId, response]) => {
          const question = questions.find(q => q.id === questionId)
          return {
            question,
            response
          }
        })
      }

      let content: string
      let filename: string
      
      if (format === "json") {
        content = JSON.stringify(reportData, null, 2)
        filename = "assessment-report.json"
      } else {
        content = `# Assessment Report\n\n## Document: ${document?.original_filename}\n\n`
        content += `Assessment Date: ${new Date().toLocaleDateString()}\n\n`
        
        const sections = Array.from(new Set(questions.map(q => q.section.id)))
        sections.forEach(sectionId => {
          const section = questions.find(q => q.section.id === sectionId)?.section
          if (!section) return
          
          content += `### ${section.title}\n\n`
          
          const sectionQuestions = questions.filter(q => q.section.id === sectionId)
          sectionQuestions.forEach(question => {
            const response = responses.get(question.id)
            content += `**${question.ref} - ${question.original_text}**\n`
            content += `- Verdict: ${response?.verdict || "Not assessed"}\n`
            content += `- Compliance: ${response?.compliance_level || "Not assessed"}\n`
            if (response?.assessor_notes) {
              content += `- Notes: ${response.assessor_notes}\n`
            }
            content += "\n"
          })
        })
        
        filename = "assessment-report.md"
      }

      const blob = new Blob([content], { type: "text/plain" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Report Downloaded",
        description: `Assessment report downloaded as ${filename}`
      })
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download report",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Get unique sections
  const sections = Array.from(new Set(questions.map(q => q.section.id))).sort()
  const currentQuestions = questions.filter(q => q.section.id === currentSection)

  // Calculate progress
  const totalQuestions = questions.length
  const answeredQuestions = Array.from(responses.values()).filter(r => r.verdict).length
  const progressPercentage = Math.round((answeredQuestions / totalQuestions) * 100)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Document Assessment</h1>
            <p className="text-muted-foreground">{document?.original_filename}</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => exportReport("json")}
            >
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
            <Button
              variant="outline"
              onClick={() => exportReport("markdown")}
            >
              <FileText className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button onClick={saveProgress}>
              <Save className="h-4 w-4 mr-2" />
              Save Progress
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Card */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Assessment Progress</h3>
              <span className="text-sm text-muted-foreground">
                {answeredQuestions} of {totalQuestions} questions completed
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="flex items-center justify-between text-sm">
              <Badge variant={assessment?.assessment_type === "ai" ? "secondary" : "outline"}>
                Manual Assessment
              </Badge>
              <span className="text-muted-foreground">
                Started {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assessment Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={currentSection} onValueChange={setCurrentSection}>
            <TabsList className="w-full justify-start rounded-none border-b h-auto p-0 bg-transparent">
              {sections.map((sectionId) => {
                const section = questions.find(q => q.section.id === sectionId)?.section
                const sectionQuestions = questions.filter(q => q.section.id === sectionId)
                const answeredCount = sectionQuestions.filter(q => responses.get(q.id)?.verdict).length
                
                return (
                  <TabsTrigger
                    key={`tab-${sectionId}`}
                    value={sectionId}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                  >
                    <span className="mr-2">{section?.title || sectionId}</span>
                    <Badge variant="outline" className="text-xs">
                      {answeredCount}/{sectionQuestions.length}
                    </Badge>
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {sections.map((sectionId) => (
              <TabsContent key={`content-${sectionId}`} value={sectionId} className="p-6 space-y-6">
                {questions
                  .filter(q => q.section.id === sectionId)
                  .map((question) => {
                    const response = responses.get(question.id) || { question_id: question.id }
                    const verdictOption = VERDICT_OPTIONS.find(v => v.value === response.verdict)
                    
                    return (
                      <Card key={`question-${question.id}`} className="overflow-hidden">
                        <CardHeader className="bg-muted/50">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{question.ref}</Badge>
                                <span className="font-medium">{question.original_text}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">{question.subsection.title}</p>
                            </div>
                            {response.verdict && (
                              <Badge className={verdictOption?.color}>
                                {response.verdict === "satisfactory" && <CheckCircle className="mr-1 h-3 w-3" />}
                                {response.verdict === "unsatisfactory" && <XCircle className="mr-1 h-3 w-3" />}
                                {response.verdict === "requirement" && <AlertCircle className="mr-1 h-3 w-3" />}
                                {verdictOption?.label}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Assessment Criteria:</p>
                            <p className="text-sm text-muted-foreground">{question.improved_text}</p>
                          </div>

                          <Separator />

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Verdict</label>
                              <Select
                                value={response.verdict || ""}
                                onValueChange={(value) => updateResponse(question.id, "verdict", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select verdict" />
                                </SelectTrigger>
                                <SelectContent>
                                  {VERDICT_OPTIONS.map((option) => (
                                    <SelectItem key={`verdict-${question.id}-${option.value}`} value={option.value}>
                                      <span className={option.color}>{option.label}</span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <label className="text-sm font-medium">Compliance Level</label>
                              <Select
                                value={response.compliance_level || ""}
                                onValueChange={(value) => updateResponse(question.id, "compliance_level", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select compliance level" />
                                </SelectTrigger>
                                <SelectContent>
                                  {COMPLIANCE_OPTIONS.map((option) => (
                                    <SelectItem key={`compliance-${question.id}-${option.value}`} value={option.value}>
                                      <span className={option.color}>{option.label}</span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">Assessor Notes</label>
                            <Textarea
                              placeholder="Add your assessment notes here..."
                              value={response.assessor_notes || ""}
                              onChange={(e) => updateResponse(question.id, "assessor_notes", e.target.value)}
                              className="min-h-24"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">Evidence/References</label>
                            <Textarea
                              placeholder="Reference specific sections, page numbers, or upload evidence..."
                              value={response.evidence || ""}
                              onChange={(e) => updateResponse(question.id, "evidence", e.target.value)}
                              className="min-h-16"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Help Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Assess each question based on the provided criteria. Your responses are automatically saved as you work.
          Export your assessment as a report when complete.
        </AlertDescription>
      </Alert>
    </div>
  )
}