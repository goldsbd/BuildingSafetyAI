import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, FileText, CheckCircle, Clock, X, FolderOpen, ArrowLeft, Building2, Folder, Trash2, Download, Archive, Layers } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { api } from "@/lib/api"
import { assessmentsApi } from "@/lib/api/assessments"
import type { Company, Project, Document, DocumentCategory } from "@/lib/api/types"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"

interface UploadingFile {
  id: string
  file: File
  name: string
  size: string
  status: "uploading" | "processing" | "categorized" | "queued" | "error"
  progress: number
  category?: string
  error?: string
}


const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getStatusIcon = (status: UploadingFile["status"]) => {
  switch (status) {
    case "categorized":
      return CheckCircle
    case "processing":
      return Clock
    case "uploading":
      return Upload
    case "error":
      return X
    default:
      return FileText
  }
}

const getStatusColor = (status: UploadingFile["status"]) => {
  switch (status) {
    case "categorized":
      return "text-success"
    case "processing":
      return "text-warning"
    case "uploading":
      return "text-info"
    case "error":
      return "text-destructive"
    default:
      return "text-muted-foreground"
  }
}

export default function DocumentUpload() {
  const { companyId, projectId } = useParams<{ companyId: string; projectId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [company, setCompany] = useState<Company | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [loading, setLoading] = useState(true)
  const [bulkMode, setBulkMode] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [bulkCategory, setBulkCategory] = useState<string>("")
  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [zipMode, setZipMode] = useState(false)
  const [zipUploadSessions, setZipUploadSessions] = useState<any[]>([])
  const [uploadingZip, setUploadingZip] = useState<{id: string, filename: string, progress: number, status: string} | null>(null)

  useEffect(() => {
    if (companyId && projectId) {
      loadProjectData()
      loadUploadSessions()
    }
    loadCategories()
  }, [companyId, projectId])

  const loadCategories = async () => {
    try {
      const categoriesData = await assessmentsApi.getCategories()
      setCategories(categoriesData)
    } catch (error: any) {
      console.error('Failed to load categories:', error)
      toast({
        title: 'Warning',
        description: 'Failed to load document categories',
        variant: 'destructive',
      })
    }
  }

  const loadProjectData = async () => {
    try {
      setLoading(true)
      
      // Check if we have project context
      if (!companyId || !projectId) {
        // No project context - this is standalone document view
        setLoading(false)
        return
      }
      
      // Try to load company data
      try {
        const companyData = await api.companies.getCompany(companyId)
        setCompany(companyData)
      } catch (error: any) {
        console.error('Failed to load company:', error)
        // Continue without company data
      }
      
      // Try to load project data
      try {
        const projectData = await api.projects.getProject(projectId)
        setProject(projectData)
      } catch (error: any) {
        console.error('Failed to load project:', error)
        // Continue without project data
      }
      
      // Try to load documents
      try {
        const documentsData = await api.documents.getDocuments(projectId)
        setDocuments(documentsData)
      } catch (error: any) {
        console.error('Failed to load documents:', error)
        // Set empty array if documents endpoint fails
        setDocuments([])
      }
    } catch (error) {
      console.error('Error loading data:', error)
      // Only show toast for unexpected errors
      toast({
        title: 'Note',
        description: 'Some data could not be loaded. The system may be initializing.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }

  const handleFiles = async (files: FileList) => {
    // Check if this is a ZIP file and zip mode is enabled
    const file = files[0]
    if (zipMode && file && file.name.toLowerCase().endsWith('.zip')) {
      await handleZipUpload(file)
      return
    }

    const newFiles: UploadingFile[] = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      size: formatFileSize(file.size),
      status: 'queued' as const,
      progress: 0,
      category: bulkMode ? bulkCategory : undefined
    }))

    let filesToUpload: UploadingFile[]
    if (!bulkMode && uploadingFiles.length > 0) {
      // In single mode, replace existing files
      filesToUpload = newFiles.slice(0, 1)
      setUploadingFiles(filesToUpload)
    } else {
      // In bulk mode, add to existing files
      filesToUpload = newFiles
      setUploadingFiles(prev => [...prev, ...newFiles])
    }

    // Automatically start uploading each file
    for (const file of filesToUpload) {
      await uploadFile(file)
    }
  }

  const uploadFile = async (uploadingFile: UploadingFile) => {
    // Check if we have a project context
    if (!projectId) {
      toast({
        title: 'No project selected',
        description: 'Please select a project to upload documents.',
        variant: 'destructive',
      })
      return
    }
    
    try {
      // Update status to uploading
      setUploadingFiles(prev =>
        prev.map(f =>
          f.id === uploadingFile.id
            ? { ...f, status: 'uploading' as const, progress: 0 }
            : f
        )
      )

      // Upload the file with progress tracking
      const document = await api.documents.uploadDocument(
        projectId, 
        uploadingFile.file, 
        {
          original_filename: uploadingFile.name,
          file_size: uploadingFile.file.size,
          mime_type: uploadingFile.file.type,
          category_id: uploadingFile.category,
        },
        (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadingFiles(prev =>
            prev.map(f =>
              f.id === uploadingFile.id
                ? { ...f, progress: percentCompleted }
                : f
            )
          )
        }
      )

      // Update status to completed
      setUploadingFiles(prev =>
        prev.map(f =>
          f.id === uploadingFile.id
            ? { ...f, status: 'categorized' as const, progress: 100 }
            : f
        )
      )

      // Reload documents
      const updatedDocuments = await api.documents.getDocuments(projectId!)
      setDocuments(updatedDocuments)
    } catch (error: any) {
      const errorMessage = error?.response?.status === 404 
        ? 'Upload endpoint not available yet' 
        : 'Upload failed'
      
      setUploadingFiles(prev =>
        prev.map(f =>
          f.id === uploadingFile.id
            ? { ...f, status: 'error' as const, error: errorMessage }
            : f
        )
      )

      // Only show toast for non-404 errors
      if (error?.response?.status !== 404) {
        toast({
          title: 'Upload failed',
          description: `Failed to upload ${uploadingFile.name}. Please try again.`,
          variant: 'destructive',
        })
      }
    }
  }

  const handleZipUpload = async (file: File) => {
    if (!projectId) {
      toast({
        title: 'No project selected',
        description: 'Please select a project to upload ZIP files.',
        variant: 'destructive',
      })
      return
    }

    try {
      const uploadId = `${Date.now()}-${Math.random()}`
      setUploadingZip({
        id: uploadId,
        filename: file.name,
        progress: 0,
        status: 'uploading'
      })

      // Create FormData for ZIP upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('preserve_structure', 'true')

      // Upload ZIP file using fetch to track progress
      const response = await fetch(`/api/projects/${projectId}/bulk-upload/zip`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('ZIP upload failed')
      }

      const result = await response.json()
      
      setUploadingZip(prev => prev ? {
        ...prev,
        status: 'processing',
        progress: 100
      } : null)

      // Add to sessions list
      setZipUploadSessions(prev => [result, ...prev])

      toast({
        title: 'ZIP uploaded successfully',
        description: `${file.name} has been uploaded and is being processed.`,
      })

      // Load updated sessions
      await loadUploadSessions()

    } catch (error: any) {
      console.error('ZIP upload error:', error)
      setUploadingZip(prev => prev ? {
        ...prev,
        status: 'error',
        progress: 0
      } : null)

      toast({
        title: 'ZIP upload failed',
        description: error.message || 'Failed to upload ZIP file',
        variant: 'destructive',
      })
    }
  }

  const loadUploadSessions = async () => {
    if (!projectId) return
    
    try {
      const response = await fetch(`/api/projects/${projectId}/bulk-upload/sessions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })
      
      if (response.ok) {
        const sessions = await response.json()
        setZipUploadSessions(sessions)
      }
    } catch (error) {
      console.error('Failed to load upload sessions:', error)
    }
  }

  const removeFile = (fileId: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const clearQueue = () => {
    setUploadingFiles([])
  }

  const updateFileCategory = (fileId: string, category: string) => {
    setUploadingFiles(prev =>
      prev.map(f =>
        f.id === fileId ? { ...f, category } : f
      )
    )
  }

  const handleDeleteDocument = async (document: Document) => {
    if (!confirm(`Are you sure you want to delete "${document.original_filename}"?`)) {
      return
    }

    try {
      await api.documents.deleteDocument(document.id)
      
      // Reload documents
      const updatedDocuments = await api.documents.getDocuments(projectId!)
      setDocuments(updatedDocuments)
      
      toast({
        title: 'Document deleted',
        description: `${document.original_filename} has been deleted.`,
      })
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error.message || 'Failed to delete document',
        variant: 'destructive',
      })
    }
  }

  const handleDownloadDocument = async (document: Document) => {
    try {
      const blob = await api.documents.downloadDocument(document.id)
      
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob)
      
      // Create a temporary anchor element and trigger download
      const a = document.createElement('a')
      a.href = url
      a.download = document.original_filename
      document.body.appendChild(a)
      a.click()
      
      // Clean up
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast({
        title: 'Download started',
        description: `Downloading ${document.original_filename}`,
      })
    } catch (error: any) {
      toast({
        title: 'Download failed',
        description: error.message || 'Failed to download document',
        variant: 'destructive',
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

  // Show project selection view when accessed without project context
  if (!projectId || !companyId) {
    return (
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Select a Project</h2>
          <p className="text-muted-foreground mb-6">
            Please select a project to upload documents.
          </p>
          <Button onClick={() => navigate('/projects')}>
            Go to Projects
          </Button>
        </div>
      </div>
    )
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
          <span>/</span>
          <FileText className="h-4 w-4" />
          <span>Documents</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Document Upload</h1>
            <p className="text-muted-foreground">Upload compliance documents for AI evaluation</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch 
                checked={zipMode} 
                onCheckedChange={(checked) => {
                  setZipMode(checked)
                  if (checked) {
                    setBulkMode(false)
                    setBulkCategory("")
                  }
                }}
                id="zip-mode"
              />
              <label htmlFor="zip-mode" className="text-sm font-medium">
                ZIP Import Mode
              </label>
            </div>
            {!zipMode && (
              <div className="flex items-center gap-2">
                <Switch 
                  checked={bulkMode} 
                  onCheckedChange={(checked) => {
                    setBulkMode(checked)
                    if (!checked) setBulkCategory("")
                  }}
                  id="bulk-mode"
                />
                <label htmlFor="bulk-mode" className="text-sm font-medium">
                  Bulk Upload Mode
                </label>
              </div>
            )}
            {bulkMode && (
              <Select value={bulkCategory} onValueChange={setBulkCategory}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select category for all files" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {/* Project Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
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
              <span className="text-muted-foreground">Documents:</span>
              <p className="font-medium">{documents.length} uploaded</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card className="border-2 border-dashed transition-colors duration-200 hover:border-primary">
        <CardContent className="p-12">
          <div
            className={`text-center transition-all duration-200 ${
              dragActive ? "scale-105" : "scale-100"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              {zipMode ? <Archive className="h-8 w-8 text-primary" /> : <Upload className="h-8 w-8 text-primary" />}
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {zipMode ? 'Drag & drop ZIP file here or click to browse' : 'Drag & drop files here or click to browse'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {zipMode 
                ? 'Supports: ZIP files with document folder structure (Max 1GB)' 
                : 'Supports: PDF, DOCX, XLSX (Max 50MB per file)'
              }
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple={!zipMode && bulkMode}
              accept={zipMode ? ".zip" : ".pdf,.docx,.xlsx,.txt"}
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button 
              size="lg" 
              className="mb-4"
              onClick={() => fileInputRef.current?.click()}
            >
              {zipMode ? <Archive className="mr-2 h-4 w-4" /> : <FolderOpen className="mr-2 h-4 w-4" />}
              {zipMode ? 'Choose ZIP File' : 'Choose Files'}
            </Button>
            <div className="text-xs text-muted-foreground">
              {zipMode 
                ? "Upload ZIP file with folder structure preserved" 
                : bulkMode 
                  ? "Upload multiple files at once" 
                  : "Single file upload mode"
              }
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ZIP Upload Progress */}
      {zipMode && (uploadingZip || zipUploadSessions.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="h-5 w-5" />
              ZIP Import Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current uploading ZIP */}
            {uploadingZip && (
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="text-primary">
                  <Archive className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium truncate">{uploadingZip.filename}</h4>
                    <Badge variant={uploadingZip.status === 'error' ? 'destructive' : 'secondary'}>
                      {uploadingZip.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Progress value={uploadingZip.progress} className="h-2" />
                    </div>
                    <span className="text-sm text-muted-foreground min-w-16">
                      {uploadingZip.progress}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Previous upload sessions */}
            {zipUploadSessions.map((session) => (
              <div key={session.id} className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="text-success">
                  <Archive className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium truncate">{session.filename}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {session.file_size_mb ? `${Math.round(session.file_size_mb)}MB` : ''}
                      </span>
                      <Badge 
                        variant={
                          session.status === 'completed' ? 'success' : 
                          session.status === 'failed' ? 'destructive' : 
                          'secondary'
                        }
                      >
                        {session.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {session.total_files ? `${session.total_files} files` : ''} 
                      {session.total_folders ? ` • ${session.total_folders} folders` : ''}
                      {session.processed_files !== undefined ? ` • ${session.processed_files} processed` : ''}
                    </span>
                    <span>
                      {new Date(session.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {session.error_message && (
                    <div className="text-sm text-destructive mt-1">
                      Error: {session.error_message}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Uploads and Documents */}
      {!zipMode && (uploadingFiles.length > 0 || documents.length > 0) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              Recent Uploads ({uploadingFiles.length + documents.length} files)
            </CardTitle>
            {uploadingFiles.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={clearQueue}>
                  Clear Queue
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Show uploading files first */}
            {uploadingFiles.map((file) => {
              const StatusIcon = getStatusIcon(file.status)
              
              return (
                <div key={file.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className={`${getStatusColor(file.status)}`}>
                    <StatusIcon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium truncate">{file.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{file.size}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0"
                          onClick={() => removeFile(file.id)}
                          title="Remove from queue"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Progress value={file.progress} className="h-2" />
                      </div>
                      <span className="text-sm text-muted-foreground min-w-16">
                        {file.progress}%
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-sm capitalize ${getStatusColor(file.status)}`}>
                        {file.status === "categorized" ? "Ready for evaluation" : file.status}
                        {file.error && `: ${file.error}`}
                      </span>
                      <div className="flex items-center gap-2">
                        {!bulkMode && file.status === 'queued' && (
                          <Select 
                            value={file.category || ""} 
                            onValueChange={(value) => updateFileCategory(file.id, value)}
                          >
                            <SelectTrigger className="w-[200px] h-8">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {file.category && (
                          <Badge variant="secondary" className="text-xs">
                            {categories.find(cat => cat.id === file.category)?.name || file.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Show uploaded documents */}
            {documents.map((doc) => {
              const StatusIcon = doc.status === 'evaluated' ? CheckCircle : FileText
              
              return (
                <div key={doc.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="text-success">
                    <StatusIcon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium truncate">{doc.original_filename}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{formatFileSize(doc.file_size)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/documents/${doc.id}/assess`)}
                          title="Assess document"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Assess
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleDownloadDocument(doc)}
                          title="Download document"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteDocument(doc)}
                          title="Delete document"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-success">
                        Ready for evaluation • Uploaded {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                      <Badge variant={doc.status === 'evaluated' ? 'success' : 'secondary'}>
                        {doc.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Upload Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upload Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-2">Supported File Types</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• PDF documents (preferred)</li>
              <li>• Microsoft Word (.docx)</li>
              <li>• Excel spreadsheets (.xlsx)</li>
              <li>• Plain text files (.txt)</li>
              <li>• ZIP archives (with folder structure)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">BSR Document Categories</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Change Control Plan</li>
              <li>• Competence Declaration</li>
              <li>• Construction Control Plan</li>
              <li>• Fire Emergency File</li>
              <li>• Regulation Compliance Statement</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Best Practices</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Use descriptive file names</li>
              <li>• Ensure documents are complete</li>
              <li>• Upload latest versions only</li>
              <li>• Include project reference codes</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Processing Time</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Small files (&lt; 5MB): 2-5 minutes</li>
              <li>• Medium files (5-20MB): 5-15 minutes</li>
              <li>• Large files (20-50MB): 15-30 minutes</li>
              <li>• ZIP archives: 10-60 minutes</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">ZIP Import Features</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Preserves folder structure</li>
              <li>• Supports nested directories</li>
              <li>• Automatic document categorization</li>
              <li>• Progress tracking & resumable</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}