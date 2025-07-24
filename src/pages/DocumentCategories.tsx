import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  FolderOpen, 
  FileText, 
  ChevronRight,
  Folder,
  Loader2,
  Building2,
  FileCheck,
  AlertCircle,
  Search,
  Filter
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { assessmentsApi } from "@/lib/api/assessments"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { DocumentCategory } from "@/lib/api/types"

interface CategoryWithStats extends DocumentCategory {
  documentCount: number
  assessmentCount: number
  lastUpdated?: string
  questionCount?: number
}

export default function DocumentCategories() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<CategoryWithStats[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'documents' | 'recent'>('name')
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [uncategorizedDocs, setUncategorizedDocs] = useState<any[]>([])
  
  // Filter states
  const [companies, setCompanies] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [selectedCompany, setSelectedCompany] = useState<string>('all')
  const [selectedProject, setSelectedProject] = useState<string>('all')

  const isAdmin = user?.role === 'admin' || user?.role === 'bsai_staff'

  useEffect(() => {
    loadCategories()
  }, [selectedCompany, selectedProject])

  const loadCategories = async () => {
    try {
      setLoading(true)
      
      // Fetch categories
      const categoriesData = await assessmentsApi.getCategories()
      
      // We need to fetch all documents from all projects to count by category
      // First get all companies and their projects
      const allCompanies = await api.companies.getCompanies()
      setCompanies(allCompanies)
      
      // Filter companies if needed
      const companiesToProcess = selectedCompany === 'all' 
        ? allCompanies 
        : allCompanies.filter(c => c.id === selectedCompany)
      
      // Create a map to store document counts per category
      const categoryDocumentMap: Record<string, any[]> = {}
      const categoryAssessmentMap: Record<string, number> = {}
      const categoryLastUpdatedMap: Record<string, string> = {}
      const allProjects: any[] = []
      const uncategorizedDocuments: any[] = []
      
      // Fetch documents from all projects
      for (const company of companiesToProcess) {
        try {
          const companyProjects = await api.projects.getProjects(company.id)
          allProjects.push(...companyProjects.map((p: any) => ({ ...p, company_name: company.name })))
          
          // Filter projects if needed
          const projectsToProcess = selectedProject === 'all'
            ? companyProjects
            : companyProjects.filter((p: any) => p.id === selectedProject)
          
          for (const project of projectsToProcess) {
            try {
              const documents = await api.documents.getDocuments(project.id)
              console.log(`Found ${documents.length} documents in project ${project.name}`)
              
              // Group documents by category
              for (const doc of documents) {
                const docWithMetadata = {
                  ...doc,
                  project_name: project.name,
                  project_id: project.id,
                  company_name: company.name,
                  company_id: company.id
                }
                
                if (doc.category_id) {
                  if (!categoryDocumentMap[doc.category_id]) {
                    categoryDocumentMap[doc.category_id] = []
                  }
                  categoryDocumentMap[doc.category_id].push(docWithMetadata)
                  
                  // Check for assessments
                  try {
                    const assessments = await api.assessments.getDocumentAssessments(doc.id)
                    
                    if (!categoryAssessmentMap[doc.category_id]) {
                      categoryAssessmentMap[doc.category_id] = 0
                    }
                    categoryAssessmentMap[doc.category_id] += assessments.length
                    
                    // Track last updated
                    for (const assessment of assessments) {
                      if (assessment.created_at) {
                        if (!categoryLastUpdatedMap[doc.category_id] || 
                            new Date(assessment.created_at) > new Date(categoryLastUpdatedMap[doc.category_id])) {
                          categoryLastUpdatedMap[doc.category_id] = assessment.created_at
                        }
                      }
                    }
                  } catch (err) {
                    console.error('Error fetching assessments:', err)
                  }
                } else {
                  // Document has no category
                  uncategorizedDocuments.push(docWithMetadata)
                }
              }
            } catch (err) {
              console.error(`Failed to load documents for project ${project.name}:`, err)
            }
          }
        } catch (err) {
          console.error(`Failed to load projects for company ${company.name}:`, err)
        }
      }
      
      // Update projects list for filter
      if (selectedCompany === 'all') {
        setProjects(allProjects)
      } else {
        setProjects(allProjects.filter(p => p.company_id === selectedCompany))
      }
      
      // Map categories with their stats
      const categoriesWithStats: CategoryWithStats[] = await Promise.all(
        categoriesData.map(async (category: DocumentCategory) => {
          // Get questions count for this category
          let questionCount = 0
          try {
            const questions = await api.assessments.getQuestionsByCategory(category.code)
            questionCount = questions?.length || 0
          } catch (err) {
            // Questions endpoint might not exist for all categories
          }
          
          const documents = categoryDocumentMap[category.id] || []
          console.log(`Category ${category.name} has ${documents.length} documents`)
          
          return { 
            ...category, 
            documentCount: documents.length,
            assessmentCount: categoryAssessmentMap[category.id] || 0,
            lastUpdated: categoryLastUpdatedMap[category.id],
            questionCount
          }
        })
      )
      
      setCategories(categoriesWithStats)
      setUncategorizedDocs(uncategorizedDocuments)
      
      // Log uncategorized documents for debugging
      if (uncategorizedDocuments.length > 0) {
        console.log(`Found ${uncategorizedDocuments.length} uncategorized documents:`, uncategorizedDocuments)
      }
    } catch (error: any) {
      console.error('Failed to load categories:', error)
      toast({
        title: 'Error',
        description: 'Failed to load document categories',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryClick = (categoryId: string) => {
    // Navigate to documents filtered by this category
    const params = new URLSearchParams()
    params.append('category_id', categoryId)
    
    if (selectedCompany !== 'all') {
      params.append('company_id', selectedCompany)
    }
    if (selectedProject !== 'all') {
      params.append('project_id', selectedProject)
    }
    
    navigate(`/documents?${params.toString()}`)
  }

  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase()
    if (name.includes('fire')) return '🔥'
    if (name.includes('strategy') || name.includes('plan')) return '📋'
    if (name.includes('compliance')) return '✅'
    if (name.includes('declaration')) return '📝'
    if (name.includes('construction')) return '🏗️'
    if (name.includes('design')) return '✏️'
    if (name.includes('emergency')) return '🚨'
    if (name.includes('resident')) return '👥'
    if (name.includes('building')) return '🏢'
    if (name.includes('safety')) return '🛡️'
    return '📁'
  }

  const getCategoryColor = (code: string) => {
    const colors = {
      'A': 'text-red-600 bg-red-50 border-red-200',
      'B': 'text-blue-600 bg-blue-50 border-blue-200',
      'C': 'text-green-600 bg-green-50 border-green-200',
      'D': 'text-purple-600 bg-purple-50 border-purple-200',
      'E': 'text-orange-600 bg-orange-50 border-orange-200',
      'F': 'text-teal-600 bg-teal-50 border-teal-200',
    }
    return colors[code.charAt(0)] || 'text-gray-600 bg-gray-50 border-gray-200'
  }

  // Filter and sort categories
  const filteredCategories = categories
    .filter(cat => 
      cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cat.description?.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'documents':
          return b.documentCount - a.documentCount
        case 'recent':
          if (!a.lastUpdated && !b.lastUpdated) return 0
          if (!a.lastUpdated) return 1
          if (!b.lastUpdated) return -1
          return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
        default:
          return a.name.localeCompare(b.name)
      }
    })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const totalDocuments = categories.reduce((sum, cat) => sum + cat.documentCount, 0) + uncategorizedDocs.length
  const totalAssessments = categories.reduce((sum, cat) => sum + cat.assessmentCount, 0)
  const categoriesWithDocuments = categories.filter(cat => cat.documentCount > 0).length
  const maxDocuments = Math.max(...categories.map(cat => cat.documentCount), 1)

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-bsai-blue-700 to-bsai-green-700 bg-clip-text text-transparent">
            Document Categories
          </h1>
          <p className="text-muted-foreground mt-1">
            BSR document categories for building safety compliance
          </p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="space-y-4">
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="documents">Most Documents</SelectItem>
              <SelectItem value="recent">Recently Updated</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Company and Project Filters for Admin */}
        {isAdmin && (
          <div className="flex gap-4 items-center">
            <div className="flex-1 max-w-xs">
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger>
                  <Building2 className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Select Company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 max-w-xs">
              <Select 
                value={selectedProject} 
                onValueChange={setSelectedProject}
                disabled={selectedCompany === 'all'}
              >
                <SelectTrigger>
                  <FolderOpen className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                      {project.company_name && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({project.company_name})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {(selectedCompany !== 'all' || selectedProject !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCompany('all')
                  setSelectedProject('all')
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-bsai-blue-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold bg-gradient-to-r from-bsai-blue-600 to-bsai-green-600 bg-clip-text text-transparent">
              {categories.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              BSR standard categories
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-bsai-blue-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {categoriesWithDocuments}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              With documents
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-bsai-blue-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {totalDocuments}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all categories
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-bsai-blue-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Assessments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {totalAssessments}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Completed reviews
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Categories View */}
      <Tabs defaultValue="grid" className="w-full">
        <TabsList>
          <TabsTrigger value="grid">Grid View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>
        
        <TabsContent value="grid" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map((category) => (
              <Card 
                key={category.id} 
                className={`cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 border-bsai-blue-100 ${
                  selectedCategory === category.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleCategoryClick(category.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{getCategoryIcon(category.name)}</div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{category.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getCategoryColor(category.code)}`}
                          >
                            {category.code}
                          </Badge>
                          {category.documentCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              Active
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  {category.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {category.description}
                    </p>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {category.documentCount} document{category.documentCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {category.assessmentCount > 0 && (
                        <div className="flex items-center gap-1">
                          <FileCheck className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600">
                            {category.assessmentCount}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {category.documentCount > 0 && (
                      <Progress 
                        value={(category.documentCount / maxDocuments) * 100} 
                        className="h-2"
                      />
                    )}
                    
                    {category.lastUpdated && (
                      <p className="text-xs text-muted-foreground">
                        Updated {new Date(category.lastUpdated).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="list" className="mt-6">
          <Card className="border-bsai-blue-100">
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredCategories.map((category) => (
                  <div
                    key={category.id}
                    className="p-4 hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => handleCategoryClick(category.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="text-2xl">{getCategoryIcon(category.name)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{category.name}</h3>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getCategoryColor(category.code)}`}
                            >
                              {category.code}
                            </Badge>
                          </div>
                          {category.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-bsai-blue-600">
                            {category.documentCount}
                          </p>
                          <p className="text-xs text-muted-foreground">Documents</p>
                        </div>
                        {category.assessmentCount > 0 && (
                          <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">
                              {category.assessmentCount}
                            </p>
                            <p className="text-xs text-muted-foreground">Assessed</p>
                          </div>
                        )}
                        {category.questionCount !== undefined && category.questionCount > 0 && (
                          <div className="text-center">
                            <p className="text-2xl font-bold text-purple-600">
                              {category.questionCount}
                            </p>
                            <p className="text-xs text-muted-foreground">Questions</p>
                          </div>
                        )}
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Empty Categories Section */}
      {categories.filter(cat => cat.documentCount === 0).length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-900">Categories Awaiting Documents</CardTitle>
            </div>
            <CardDescription className="text-orange-700">
              These categories need document uploads to begin compliance assessments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {categories
                .filter(cat => cat.documentCount === 0)
                .map(cat => (
                  <Badge 
                    key={cat.id} 
                    variant="outline"
                    className="cursor-pointer hover:bg-orange-100 border-orange-300 text-orange-700"
                    onClick={() => {
                      navigate('/documents/upload', { 
                        state: { preselectedCategory: cat.id } 
                      })
                    }}
                  >
                    {getCategoryIcon(cat.name)} {cat.name}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uncategorized Documents Section */}
      {uncategorizedDocs.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-amber-900">Uncategorized Documents ({uncategorizedDocs.length})</CardTitle>
            </div>
            <CardDescription className="text-amber-700">
              These documents need to be assigned to a category for proper compliance assessment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {uncategorizedDocs.slice(0, 5).map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-amber-600" />
                    <div>
                      <p className="font-medium text-sm">{doc.original_filename || doc.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.company_name} / {doc.project_name}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-amber-700 hover:bg-amber-100"
                    onClick={() => navigate(`/companies/${doc.company_id}/projects/${doc.project_id}/documents`)}
                  >
                    Assign Category
                  </Button>
                </div>
              ))}
              {uncategorizedDocs.length > 5 && (
                <p className="text-sm text-amber-700 mt-2">
                  And {uncategorizedDocs.length - 5} more uncategorized documents...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {filteredCategories.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No categories found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? 'Try adjusting your search terms' : 'No document categories available'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}