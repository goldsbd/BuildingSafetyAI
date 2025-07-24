import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Upload, FileText, CheckCircle, Clock, X, FolderOpen, Trash2, Download, Archive } from "lucide-react";
import { api } from '@/lib/api';
import type { Company, Project, Document } from '@/lib/api/types';
import { useToast } from '@/hooks/use-toast';

interface UploadingFile {
  id: string;
  file: File;
  name: string;
  size: string;
  status: "uploading" | "processing" | "categorized" | "queued" | "error";
  progress: number;
  category?: string;
  error?: string;
}

interface DocumentUploadTabProps {
  companyId: string;
  projectId: string;
  company: Company | null;
  project: Project | null;
  onRefreshNeeded?: () => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getStatusIcon = (status: UploadingFile["status"]) => {
  switch (status) {
    case "categorized":
      return CheckCircle;
    case "processing":
      return Clock;
    case "uploading":
      return Upload;
    case "error":
      return X;
    default:
      return FileText;
  }
};

const getStatusColor = (status: UploadingFile["status"]) => {
  switch (status) {
    case "categorized":
      return "text-success";
    case "processing":
      return "text-warning";
    case "uploading":
      return "text-info";
    case "error":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
};

export default function DocumentUploadTab({ 
  companyId, 
  projectId, 
  company, 
  project, 
  onRefreshNeeded 
}: DocumentUploadTabProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadingZip, setUploadingZip] = useState<{filename: string, progress: number, status: string} | null>(null);
  const [activeUploadSessions, setActiveUploadSessions] = useState<any[]>([]);

  useEffect(() => {
    if (projectId) {
      loadDocuments();
      checkForActiveUploads();
      
      // Set up polling for active uploads
      const interval = setInterval(() => {
        checkForActiveUploads();
      }, 5000); // Check every 5 seconds
      
      return () => clearInterval(interval);
    }
  }, [projectId]);

  const loadDocuments = async () => {
    try {
      const documentsData = await api.documents.getDocuments(projectId);
      setDocuments(documentsData);
    } catch (error: any) {
      console.error('Failed to load documents:', error);
      setDocuments([]);
    }
  };

  const checkForActiveUploads = async () => {
    if (!projectId) return;
    
    try {
      const response = await fetch(`/api/projects/${projectId}/bulk-upload/sessions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      
      if (response.ok) {
        const sessions = await response.json();
        
        // Filter for sessions that are still active (pending, processing)
        const activeSessions = sessions.filter((session: any) => 
          session.status === 'pending' || session.status === 'processing'
        );
        
        setActiveUploadSessions(activeSessions);
        
        // If there are active sessions, set the uploadingZip state for the most recent one
        if (activeSessions.length > 0) {
          const mostRecent = activeSessions[0];
          setUploadingZip({
            filename: mostRecent.filename || 'Unknown file',
            progress: mostRecent.status === 'processing' ? 90 : 50,
            status: mostRecent.status
          });
        } else {
          // Clear uploadingZip if no active sessions
          setUploadingZip(null);
        }

        // Clean up localStorage for completed sessions
        sessions.forEach((session: any) => {
          if (session.status === 'completed' || session.status === 'failed') {
            localStorage.removeItem(`zip-upload-${session.id}`);
          }
        });
      }
    } catch (error) {
      console.error('Failed to check for active uploads:', error);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files: FileList) => {
    const newFiles: UploadingFile[] = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      size: formatFileSize(file.size),
      status: 'queued' as const,
      progress: 0
    }));

    let filesToUpload: UploadingFile[];
    if (!bulkMode && uploadingFiles.length > 0) {
      // In single mode, replace existing files
      filesToUpload = newFiles.slice(0, 1);
      setUploadingFiles(filesToUpload);
    } else {
      // In bulk mode, add to existing files
      filesToUpload = newFiles;
      setUploadingFiles(prev => [...prev, ...newFiles]);
    }

    // Automatically start uploading each file
    for (const file of filesToUpload) {
      await uploadFile(file);
    }
  };

  const uploadFile = async (uploadingFile: UploadingFile) => {
    try {
      // Update status to uploading
      setUploadingFiles(prev =>
        prev.map(f =>
          f.id === uploadingFile.id
            ? { ...f, status: 'uploading' as const, progress: 0 }
            : f
        )
      );

      // Upload the file with progress tracking
      const document = await api.documents.uploadDocument(
        projectId, 
        uploadingFile.file, 
        {
          original_filename: uploadingFile.name,
          file_size: uploadingFile.file.size,
          mime_type: uploadingFile.file.type,
        },
        (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadingFiles(prev =>
            prev.map(f =>
              f.id === uploadingFile.id
                ? { ...f, progress: percentCompleted }
                : f
            )
          );
        }
      );

      // Update status to completed
      setUploadingFiles(prev =>
        prev.map(f =>
          f.id === uploadingFile.id
            ? { ...f, status: 'categorized' as const, progress: 100 }
            : f
        )
      );

      // Reload documents
      await loadDocuments();
      onRefreshNeeded?.();

    } catch (error: any) {
      const errorMessage = error?.response?.status === 404 
        ? 'Upload endpoint not available yet' 
        : 'Upload failed';
      
      setUploadingFiles(prev =>
        prev.map(f =>
          f.id === uploadingFile.id
            ? { ...f, status: 'error' as const, error: errorMessage }
            : f
        )
      );

      // Only show toast for non-404 errors
      if (error?.response?.status !== 404) {
        toast({
          title: 'Upload failed',
          description: `Failed to upload ${uploadingFile.name}. Please try again.`,
          variant: 'destructive',
        });
      }
    }
  };

  const removeFile = (fileId: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const clearQueue = () => {
    setUploadingFiles([]);
  };

  const handleDeleteDocument = async (document: Document) => {
    if (!confirm(`Are you sure you want to delete "${document.original_filename}"?`)) {
      return;
    }

    try {
      await api.documents.deleteDocument(document.id);
      
      // Reload documents
      await loadDocuments();
      onRefreshNeeded?.();
      
      toast({
        title: 'Document deleted',
        description: `${document.original_filename} has been deleted.`,
      });
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error.message || 'Failed to delete document',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadDocument = async (document: Document) => {
    try {
      const blob = await api.documents.downloadDocument(document.id);
      
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = document.original_filename;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Download started',
        description: `Downloading ${document.original_filename}`,
      });
    } catch (error: any) {
      toast({
        title: 'Download failed',
        description: error.message || 'Failed to download document',
        variant: 'destructive',
      });
    }
  };

  const handleZipSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.toLowerCase().endsWith('.zip')) {
        handleZipUpload(file);
      } else {
        toast({
          title: 'Invalid file type',
          description: 'Please select a ZIP file.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleZipUpload = async (file: File) => {
    try {
      setUploadingZip({
        filename: file.name,
        progress: 0,
        status: 'uploading'
      });

      // Create FormData for ZIP upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('preserve_structure', 'true');

      // Upload ZIP file using fetch to track progress
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const response = await fetch(`/api/projects/${projectId}/bulk-upload/zip`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('ZIP upload failed');
      }

      const result = await response.json();
      
      // Store session info in localStorage for persistence
      const sessionInfo = {
        sessionId: result.id,
        filename: file.name,
        projectId: projectId,
        startTime: Date.now()
      };
      localStorage.setItem(`zip-upload-${result.id}`, JSON.stringify(sessionInfo));
      
      setUploadingZip({
        filename: file.name,
        status: 'pending',
        progress: 100
      });

      toast({
        title: 'ZIP uploaded successfully',
        description: `${file.name} has been uploaded and is being processed.`,
      });

      // Reload documents and refresh
      await loadDocuments();
      onRefreshNeeded?.();

      // Don't clear the upload state immediately - let polling handle it
      // The checkForActiveUploads function will clear it when the session is complete

    } catch (error: any) {
      console.error('ZIP upload error:', error);
      setUploadingZip({
        filename: file.name,
        status: 'error',
        progress: 0
      });

      toast({
        title: 'ZIP upload failed',
        description: error.message || 'Failed to upload ZIP file',
        variant: 'destructive',
      });

      // Let polling handle clearing the state after checking backend status
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Upload Settings</CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch 
                  checked={bulkMode} 
                  onCheckedChange={setBulkMode}
                  id="bulk-mode"
                />
                <label htmlFor="bulk-mode" className="text-sm font-medium">
                  Bulk Upload Mode
                </label>
              </div>
            </div>
          </div>
        </CardHeader>
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
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Drag & drop files here or click to browse
            </h3>
            <p className="text-muted-foreground mb-4">
              Supports: PDF, DOCX, XLSX (Max 50MB per file) • ZIP archives (Max 10GB)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple={bulkMode}
              accept=".pdf,.docx,.xlsx,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <input
              ref={zipInputRef}
              type="file"
              accept=".zip"
              onChange={handleZipSelect}
              className="hidden"
            />
            <div className="flex gap-2 mb-4 justify-center">
              <Button 
                size="lg"
                onClick={() => fileInputRef.current?.click()}
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                Choose Files
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => zipInputRef.current?.click()}
              >
                <Archive className="mr-2 h-4 w-4" />
                Import ZIP
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              {bulkMode ? "Upload multiple files at once" : "Single file upload mode"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ZIP Upload Progress */}
      {(uploadingZip || activeUploadSessions.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Archive className="h-5 w-5" />
              ZIP Import Progress
              {activeUploadSessions.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeUploadSessions.length} active
                </Badge>
              )}
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
                    <Badge variant={uploadingZip.status === 'error' ? 'destructive' : uploadingZip.status === 'completed' ? 'success' : 'secondary'}>
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
                  <div className="text-sm text-muted-foreground mt-1">
                    {uploadingZip.status === 'pending' && 'ZIP file uploaded. Preparing for processing...'}
                    {uploadingZip.status === 'processing' && 'Processing ZIP file and extracting documents...'}
                    {uploadingZip.status === 'uploading' && 'Uploading ZIP file...'}
                    {uploadingZip.status === 'completed' && 'ZIP file processed successfully!'}
                    {uploadingZip.status === 'error' && 'ZIP upload failed. Please try again.'}
                  </div>
                </div>
              </div>
            )}

            {/* All active upload sessions */}
            {activeUploadSessions.map((session) => (
              <div key={session.id} className="flex items-center gap-4 p-4 border rounded-lg bg-blue-50/50">
                <div className="text-blue-600">
                  <Archive className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium truncate">{session.filename || 'Processing...'}</h4>
                    <div className="flex items-center gap-2">
                      {session.file_size_mb && (
                        <span className="text-sm text-muted-foreground">
                          {Math.round(session.file_size_mb)}MB
                        </span>
                      )}
                      <Badge variant={session.status === 'processing' ? 'default' : 'secondary'}>
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
                      Started: {new Date(session.created_at).toLocaleTimeString()}
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
      {(uploadingFiles.length > 0 || documents.length > 0) && (
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
              const StatusIcon = getStatusIcon(file.status);
              
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
                      {file.category && (
                        <Badge variant="secondary" className="text-xs">
                          {file.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Show uploaded documents */}
            {documents.map((doc) => {
              const StatusIcon = doc.status === 'evaluated' ? CheckCircle : FileText;
              
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
              );
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
            <h4 className="font-medium mb-2">Document Categories</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Fire Safety Plans & Reports</li>
              <li>• Structural Engineering Documents</li>
              <li>• Building Regulations Compliance</li>
              <li>• Emergency & Safety Systems</li>
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
        </CardContent>
      </Card>
    </div>
  );
}