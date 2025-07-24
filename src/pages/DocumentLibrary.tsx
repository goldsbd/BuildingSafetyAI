import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  FileText, 
  Search, 
  Filter, 
  Download,
  Building2,
  FolderOpen,
  Calendar,
  Eye,
  X,
  Folder,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { api } from "@/lib/api"
import { assessmentsApi } from "@/lib/api/assessments"
import { useToast } from "@/hooks/use-toast"
import type { Document, DocumentCategory } from "@/lib/api/types"
import { DocumentReviewModal } from "@/components/project/DocumentReviewModal"
import { DocumentProcessingProgress } from "@/components/project/DocumentProcessingProgress"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DocumentWithProject extends Document {
  project_name?: string
  company_name?: string
}

export default function DocumentLibrary() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const [documents, setDocuments] = useState<DocumentWithProject[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null)
  const [selectedAssessment, setSelectedAssessment] = useState<string | null>(null)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [processingModalOpen, setProcessingModalOpen] = useState(false)
  const [processingDocumentName, setProcessingDocumentName] = useState<string>("")
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | null>(null)
  const [documentAssessments, setDocumentAssessments] = useState<Record<string, string>>({}) // Maps document ID to assessment ID
  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [categoryMap, setCategoryMap] = useState<Record<string, DocumentCategory>>({})
  const [updatingCategory, setUpdatingCategory] = useState<string | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(200) // Show 200 documents per page
  const [loadingMore, setLoadingMore] = useState(false)
  
  // Filter state
  const [companies, setCompanies] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  
  
  const categoryId = searchParams.get('category_id')

  useEffect(() => {
    loadCategories()
    loadCompanies()
    if (categoryId) {
      loadCategoryAndDocuments()
    } else {
      loadAllDocuments()
    }
  }, [categoryId])
  
  useEffect(() => {
    if (selectedCompanyId) {
      loadProjectsForCompany(selectedCompanyId)
    } else {
      setProjects([])
      setSelectedProjectId(null)
    }
  }, [selectedCompanyId])

  const loadCategoryAndDocuments = async () => {
    if (!categoryId) return
    
    try {
      setLoading(true)
      
      // Load category details
      const categories = await assessmentsApi.getCategories()
      const category = categories.find((cat: DocumentCategory) => cat.id === categoryId)
      setSelectedCategory(category)
      
      // Load documents filtered by category
      const allDocuments: DocumentWithProject[] = []
      
      const companies = await api.companies.getCompanies()
      
      for (const company of companies) {
        try {
          const projects = await api.projects.getProjects(company.id)
          
          for (const project of projects) {
            try {
              // Use paginated API with category filter
              const paginatedResponse = await api.documents.getDocumentsPaginated(project.id, {
                page: 1,
                page_size: 1000,
                category_id: categoryId
              })
              
              const docsWithInfo = paginatedResponse.data.map(doc => ({
                ...doc,
                project_name: project.name,
                company_name: company.name
              }))
              
              allDocuments.push(...docsWithInfo)
              
              // If there are more pages, fetch them
              if (paginatedResponse.total_pages > 1) {
                for (let page = 2; page <= paginatedResponse.total_pages; page++) {
                  const nextPage = await api.documents.getDocumentsPaginated(project.id, {
                    page: page,
                    page_size: 1000,
                    category_id: categoryId
                  })
                  
                  const moreDocsWithInfo = nextPage.data.map(doc => ({
                    ...doc,
                    project_name: project.name,
                    company_name: company.name
                  }))
                  
                  allDocuments.push(...moreDocsWithInfo)
                }
              }
            } catch (error) {
              console.error(`Failed to load documents for project ${project.name}:`, error)
            }
          }
        } catch (error) {
          console.error(`Failed to load projects for company ${company.name}:`, error)
        }
      }
      
      setDocuments(allDocuments)
    } catch (error) {
      console.error('Failed to load category documents:', error)
      toast({
        title: 'Error',
        description: 'Failed to load documents for this category',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const loadAllDocuments = async () => {
    try {
      setLoading(true)
      setSelectedCategory(null)
      const allDocuments: DocumentWithProject[] = []
      let totalDocumentCount = 0
      
      // First get all companies
      const companies = await api.companies.getCompanies()
      const totalCompanies = companies.length
      
      // Process companies in batches to show progress
      for (const [companyIndex, company] of companies.entries()) {
        try {
          const projects = await api.projects.getProjects(company.id)
          
          // For each project, get paginated info to know total count
          for (const project of projects) {
            try {
              // Get first page with pagination info to know total count
              const paginatedResponse = await api.documents.getDocumentsPaginated(project.id, {
                page: 1,
                page_size: 1000 // Get up to 1000 docs per request
              })
              
              totalDocumentCount += paginatedResponse.total
              
              // Add project and company info to each document
              const docsWithInfo = paginatedResponse.data.map(doc => ({
                ...doc,
                project_name: project.name,
                company_name: company.name
              }))
              
              allDocuments.push(...docsWithInfo)
              
              // If there are more pages, fetch them
              if (paginatedResponse.total_pages > 1) {
                for (let page = 2; page <= paginatedResponse.total_pages; page++) {
                  const nextPage = await api.documents.getDocumentsPaginated(project.id, {
                    page: page,
                    page_size: 1000
                  })
                  
                  const moreDocsWithInfo = nextPage.data.map(doc => ({
                    ...doc,
                    project_name: project.name,
                    company_name: company.name
                  }))
                  
                  allDocuments.push(...moreDocsWithInfo)
                }
              }
              
              // Update state periodically to show progress
              if (allDocuments.length % 500 === 0 || companyIndex === totalCompanies - 1) {
                setDocuments([...allDocuments])
              }
            } catch (error) {
              console.error(`Failed to load documents for project ${project.name}:`, error)
            }
          }
        } catch (error) {
          console.error(`Failed to load projects for company ${company.name}:`, error)
        }
      }
      
      setDocuments(allDocuments)
      console.log(`Loaded ${allDocuments.length} documents total (counted ${totalDocumentCount})`)
    } catch (error) {
      console.error('Failed to load documents:', error)
      toast({
        title: 'Error',
        description: 'Failed to load documents',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredDocuments = documents.filter(doc => {
    // Search filter
    const matchesSearch = doc.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.project_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Company filter
    const matchesCompany = !selectedCompanyId || companies.find(c => c.id === selectedCompanyId)?.name === doc.company_name
    
    // Project filter
    const matchesProject = !selectedProjectId || projects.find(p => p.id === selectedProjectId)?.name === doc.project_name
    
    // Category filter
    const matchesCategory = !selectedCategoryId || doc.category_id === selectedCategoryId
    
    return matchesSearch && matchesCompany && matchesProject && matchesCategory
  })
  
  // Calculate pagination
  const totalDocuments = filteredDocuments.length
  const totalPages = Math.ceil(totalDocuments / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedDocuments = filteredDocuments.slice(startIndex, endIndex)

  const loadCategories = async () => {
    try {
      const categoriesData = await assessmentsApi.getCategories()
      setCategories(categoriesData)
      
      // Create a map for quick lookup
      const map: Record<string, DocumentCategory> = {}
      categoriesData.forEach(cat => {
        map[cat.id] = cat
      })
      setCategoryMap(map)
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }
  
  const loadCompanies = async () => {
    try {
      const companiesData = await api.companies.getCompanies()
      setCompanies(companiesData)
    } catch (error) {
      console.error('Failed to load companies:', error)
    }
  }
  
  const loadProjectsForCompany = async (companyId: string) => {
    try {
      const projectsData = await api.projects.getProjects(companyId)
      setProjects(projectsData)
    } catch (error) {
      console.error('Failed to load projects:', error)
      setProjects([])
    }
  }

  const updateDocumentCategory = async (documentId: string, categoryId: string) => {
    try {
      setUpdatingCategory(documentId)
      
      await api.documents.updateDocument(documentId, {
        category_id: categoryId
      })
      
      // Update local state
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId ? { ...doc, category_id: categoryId } : doc
      ))
      
      toast({
        title: 'Category Updated',
        description: 'Document category has been updated successfully.',
      })
    } catch (error: any) {
      console.error('Failed to update category:', error)
      toast({
        title: 'Update Failed',
        description: 'Failed to update document category. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setUpdatingCategory(null)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploaded':
        return 'secondary'
      case 'evaluated':
        return 'success'
      case 'reviewing':
        return 'warning'
      default:
        return 'default'
    }
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
    const colors: Record<string, string> = {
      'ACC': 'bg-red-100 text-red-700 hover:bg-red-200',
      'BC': 'bg-blue-100 text-blue-700 hover:bg-blue-200',
      'BUILDING_REGS': 'bg-green-100 text-green-700 hover:bg-green-200',
      'ChangeControlPlan': 'bg-purple-100 text-purple-700 hover:bg-purple-200',
      'CompetenceDeclaration': 'bg-orange-100 text-orange-700 hover:bg-orange-200',
      'ConstructionControlPlan': 'bg-teal-100 text-teal-700 hover:bg-teal-200',
      'DrawingsAndPlans': 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200',
      'EMERGENCY': 'bg-pink-100 text-pink-700 hover:bg-pink-200',
      'FIRE': 'bg-amber-100 text-amber-700 hover:bg-amber-200',
    }
    return colors[code] || 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }

  const handleAssessDocument = async (doc: Document) => {
    try {
      // Create an assessment and trigger AI analysis
      const assessment = await api.assessments.createAssessment(doc.id, 'ai')
      
      // Store the assessment ID immediately
      setDocumentAssessments(prev => ({
        ...prev,
        [doc.id]: assessment.id
      }))
      
      // Show processing dialog
      setSelectedDocument(doc.id)
      setSelectedAssessment(assessment.id)
      setProcessingDocumentName(doc.original_filename)
      setProcessingModalOpen(true)

      // Trigger AI analysis
      await api.assessments.analyzeWithAI(assessment.id)
      
      // The progress dialog will handle completion
    } catch (error: any) {
      toast({
        title: 'Processing Failed',
        description: error.message || 'Failed to process document with AI.',
        variant: 'destructive',
      })
      setProcessingModalOpen(false)
    }
  }

  const handleProcessingComplete = () => {
    setProcessingModalOpen(false)
    // Reload documents to update status
    if (categoryId) {
      loadCategoryAndDocuments()
    } else {
      loadAllDocuments()
    }
    // Open review modal to show results
    setReviewModalOpen(true)
  }
  
  const handleRefreshCache = async () => {
    try {
      setLoading(true)
      
      // Clear cache by reloading all data
      await loadCategories()
      await loadCompanies()
      
      if (categoryId) {
        await loadCategoryAndDocuments()
      } else {
        await loadAllDocuments()
      }
      
      toast({
        title: 'Cache Refreshed',
        description: 'Document library data has been refreshed.',
      })
    } catch (error) {
      console.error('Failed to refresh cache:', error)
      toast({
        title: 'Refresh Failed',
        description: 'Failed to refresh cache. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading && documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Loading documents...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold">Document Library</h1>
          <p className="text-muted-foreground mt-1">
            {selectedCategory 
              ? `Showing documents in category: ${selectedCategory.name}`
              : 'Browse all documents across projects'}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefreshCache}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Redis Cache
        </Button>
      </div>

      {/* Category Filter Badge */}
      {selectedCategory && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="secondary" className="text-sm py-1.5 px-3">
            <FolderOpen className="h-3 w-3 mr-2" />
            {selectedCategory.name}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 ml-2 hover:bg-transparent"
              onClick={() => {
                navigate('/documents')
                setSelectedCategory(null)
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
          <span className="text-sm text-muted-foreground">
            {documents.length} document{documents.length !== 1 ? 's' : ''} found
          </span>
        </div>
      )}

      {/* Search and Filters */}
      <Card className="flex-shrink-0">
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents, projects, or companies..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1) // Reset to first page on search
                }}
                className="pl-10"
              />
            </div>
            
            {/* Filter Row */}
            <div className="flex gap-4">
              <div className="flex-1">
                <Select
                  value={selectedCompanyId || undefined}
                  onValueChange={(value) => {
                    setSelectedCompanyId(value)
                    setSelectedProjectId(null) // Reset project when company changes
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Companies" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <Select
                  value={selectedProjectId || undefined}
                  onValueChange={(value) => {
                    setSelectedProjectId(value)
                    setCurrentPage(1)
                  }}
                  disabled={!selectedCompanyId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedCompanyId ? "All Projects" : "Select a company first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <Select
                  value={selectedCategoryId || undefined}
                  onValueChange={(value) => {
                    setSelectedCategoryId(value)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <span>{getCategoryIcon(category.name)}</span>
                          <span>{category.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                variant="outline"
                onClick={() => {
                  setSelectedCompanyId(null)
                  setSelectedProjectId(null)
                  setSelectedCategoryId(null)
                  setSearchQuery("")
                  setCurrentPage(1)
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table with Pagination */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10">
              <TableRow>
              <TableHead className="w-[35%]">Document Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Upload Date</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedDocuments.length > 0 ? (
              paginatedDocuments.map((doc) => (
                <TableRow key={doc.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <button
                          className="text-sm font-medium truncate max-w-[400px] hover:underline text-left cursor-pointer"
                          title={doc.original_filename}
                          onClick={async () => {
                            // Check if it's actually a file by looking for file extension
                            const isFile = doc.filename && (
                              doc.filename.endsWith('.pdf') || 
                              doc.filename.endsWith('.PDF') ||
                              doc.filename.endsWith('.xlsm') ||
                              doc.filename.endsWith('.XLSM')
                            );
                            
                            if (!isFile) {
                              return;
                            }

                            try {
                              const token = localStorage.getItem('auth_token');
                              if (!token) {
                                return;
                              }
                              
                              const viewUrl = `http://localhost:3001/api/documents/${doc.id}/view`;
                              const response = await fetch(viewUrl, {
                                headers: {
                                  'Authorization': `Bearer ${token}`
                                }
                              });
                              
                              if (!response.ok) {
                                throw new Error('Failed to fetch document');
                              }
                              
                              const blob = await response.blob();
                              const blobUrl = window.URL.createObjectURL(blob);
                              const newTab = window.open(blobUrl, '_blank');
                              
                              if (newTab) {
                                setTimeout(() => {
                                  window.URL.revokeObjectURL(blobUrl);
                                }, 1000);
                              }
                            } catch (error) {
                              console.error('Error opening document:', error);
                            }
                          }}
                        >
                          {doc.original_filename}
                        </button>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-auto px-2 py-1 ${
                            doc.category_id && categoryMap[doc.category_id]
                              ? getCategoryColor(categoryMap[doc.category_id].code)
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                          disabled={updatingCategory === doc.id}
                        >
                          {updatingCategory === doc.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : doc.category_id && categoryMap[doc.category_id] ? (
                            <>
                              <span className="mr-1">{getCategoryIcon(categoryMap[doc.category_id].name)}</span>
                              <span className="text-xs font-medium">{categoryMap[doc.category_id].code}</span>
                            </>
                          ) : (
                            <>
                              <Folder className="h-3 w-3 mr-1" />
                              <span className="text-xs">Uncategorized</span>
                            </>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-96 p-2" align="start" side="bottom" sideOffset={5}>
                        <div className="max-h-[400px] overflow-y-auto">
                          <p className="text-sm font-medium mb-2 sticky top-0 bg-popover pb-2">Select Category</p>
                          <div className="space-y-1">
                            {categories.map((category) => (
                              <Button
                                key={category.id}
                                variant="ghost"
                                size="sm"
                                className={`w-full justify-start text-left ${
                                  doc.category_id === category.id
                                    ? 'bg-primary/10'
                                    : ''
                                }`}
                                onClick={() => updateDocumentCategory(doc.id, category.id)}
                              >
                                <span className="mr-2">{getCategoryIcon(category.name)}</span>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{category.name}</p>
                                  <p className="text-xs text-muted-foreground">{category.code}</p>
                                </div>
                              </Button>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate max-w-[150px]" title={doc.company_name}>
                        {doc.company_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <FolderOpen className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate max-w-[150px]" title={doc.project_name}>
                        {doc.project_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatFileSize(doc.file_size)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(doc.status)}>
                      {doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant={doc.status === 'evaluated' || doc.status === 'reviewed' || documentAssessments[doc.id] ? 'default' : 'outline'}
                        className={doc.status === 'evaluated' || doc.status === 'reviewed' || documentAssessments[doc.id] ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' : ''}
                        onClick={() => {
                          setSelectedDocument(doc.id)
                          setSelectedAssessment(documentAssessments[doc.id] || null)
                          setReviewModalOpen(true)
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {doc.status === 'evaluated' || doc.status === 'reviewed' || documentAssessments[doc.id] ? 'Reviewed' : 'Review'}
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleAssessDocument(doc)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Assess
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No documents found</h3>
                    <p className="text-muted-foreground mb-2">
                      {searchQuery 
                        ? "Try adjusting your search terms" 
                        : selectedCategory
                          ? `No documents have been assigned to the "${selectedCategory.name}" category yet`
                          : "Upload documents to a project to see them here"}
                    </p>
                    {selectedCategory && (
                      <div className="mt-4 space-y-2">
                        <p className="text-sm text-muted-foreground">
                          To add documents to this category:
                        </p>
                        <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                          <li>Go to a project and upload documents</li>
                          <li>Select "{selectedCategory.name}" from the category dropdown</li>
                        </ol>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate('/documents')}
                          className="mt-4"
                        >
                          View All Documents
                        </Button>
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
        
        {/* Pagination Controls - Always Visible */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-white sticky bottom-0 shadow-sm">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(endIndex, totalDocuments)}</span> of <span className="font-medium">{totalDocuments}</span> documents
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {/* First page */}
              {currentPage > 3 && (
                <>
                  <Button
                    variant={currentPage === 1 ? "default" : "outline"}
                    onClick={() => setCurrentPage(1)}
                    className="w-10 h-10"
                  >
                    1
                  </Button>
                  {currentPage > 4 && <span className="px-1">...</span>}
                </>
              )}
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                if (pageNum < 1 || pageNum > totalPages) return null;
                
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === currentPage ? "default" : "outline"}
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-10 h-10"
                  >
                    {pageNum}
                  </Button>
                );
              }).filter(Boolean)}
              
              {/* Last page */}
              {currentPage < totalPages - 2 && (
                <>
                  {currentPage < totalPages - 3 && <span className="px-1">...</span>}
                  <Button
                    variant={currentPage === totalPages ? "default" : "outline"}
                    onClick={() => setCurrentPage(totalPages)}
                    className="w-10 h-10"
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>
            
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Document Review Modal */}
      <DocumentReviewModal
        open={reviewModalOpen}
        onOpenChange={(open) => {
          setReviewModalOpen(open)
          // Refresh data when modal closes to update button states
          if (!open) {
            if (categoryId) {
              loadCategoryAndDocuments()
            } else {
              loadAllDocuments()
            }
          }
        }}
        documentId={selectedDocument}
        assessmentId={selectedAssessment}
      />

      {/* Document Processing Progress */}
      <DocumentProcessingProgress
        open={processingModalOpen}
        onOpenChange={setProcessingModalOpen}
        assessmentId={selectedAssessment}
        documentName={processingDocumentName}
        onComplete={handleProcessingComplete}
      />
    </div>
  )
}