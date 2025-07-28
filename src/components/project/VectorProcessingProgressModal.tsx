import React, { useState, useEffect } from 'react';
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  FileText,
  Zap,
  Timer
} from 'lucide-react';
import { vectorApi, ProcessingProgress, DocumentProcessingStatus } from '@/lib/api/vector';
import { formatDate, formatTime } from '@/lib/utils';

// Custom DialogContent without the built-in close button
const DialogPortal = DialogPrimitive.Portal;
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const CustomDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const describedById = React.useId();
  const hasAriaDescribedBy = 'aria-describedby' in props;
  
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
          className
        )}
        aria-describedby={hasAriaDescribedBy ? props['aria-describedby'] : describedById}
        {...props}
      >
        {!hasAriaDescribedBy && (
          <span id={describedById} className="sr-only">
            Dialog content
          </span>
        )}
        {children}
        {/* No close button here */}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
CustomDialogContent.displayName = "CustomDialogContent";

interface VectorProcessingProgressModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function VectorProcessingProgressModal({ 
  projectId, 
  isOpen, 
  onClose 
}: VectorProcessingProgressModalProps) {
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadProgress = async () => {
    try {
      setLoading(true);
      const data = await vectorApi.getProcessingProgress(projectId);
      setProgress(data);
    } catch (error) {
      console.error('Failed to load processing progress:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadProgress();
    }
  }, [isOpen, projectId]);

  useEffect(() => {
    if (!isOpen || !autoRefresh) return;

    const interval = setInterval(() => {
      if (progress?.status === 'indexing') {
        loadProgress();
      }
    }, 2000); // Poll every 2 seconds during indexing

    return () => clearInterval(interval);
  }, [isOpen, autoRefresh, progress?.status, projectId]);

  const getStatusIcon = (status: DocumentProcessingStatus['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'processing': return <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: DocumentProcessingStatus['status']) => {
    switch (status) {
      case 'completed': return 'default';
      case 'processing': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getEstimatedTimeRemaining = () => {
    // Check if processing is complete
    if (progress?.status === 'ready' && progress.processed_documents === progress.total_documents) {
      // Calculate total processing time from completed documents
      const completedDocs = progress.documents.filter(doc => doc.status === 'completed' && doc.processing_time_ms);
      const totalTime = completedDocs.reduce((sum, doc) => sum + (doc.processing_time_ms || 0), 0);
      const avgTime = completedDocs.length > 0 ? totalTime / completedDocs.length : 0;
      
      return {
        type: 'completed',
        totalTime: formatDuration(totalTime),
        avgTime: formatDuration(avgTime),
        processedDocs: progress.processed_documents,
        totalChunks: progress.processed_chunks
      };
    }
    
    if (!progress?.estimated_completion_time) return null;
    const now = new Date();
    const estimated = new Date(progress.estimated_completion_time);
    const diff = estimated.getTime() - now.getTime();
    
    if (diff <= 0) return 'Almost done';
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `~${hours}h ${minutes % 60}m remaining`;
    } else if (minutes > 0) {
      return `~${minutes}m remaining`;
    } else {
      return '< 1m remaining';
    }
  };

  const overallProgress = progress ? 
    (progress.processed_documents / Math.max(progress.total_documents, 1)) * 100 : 0;

  const chunkProgress = progress ? 
    (progress.processed_chunks / Math.max(progress.total_chunks, 1)) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <CustomDialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Vector Database Import Progress
              </DialogTitle>
              <DialogDescription>
                Real-time processing status for document indexing
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadProgress}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? 'bg-blue-50' : ''}
              >
                {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogHeader>

        {progress ? (
          <div className="space-y-6">
            {/* Overall Progress Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Documents</span>
                </div>
                <div className="text-2xl font-bold text-blue-700">
                  {progress.processed_documents} / {progress.total_documents}
                </div>
                <Progress value={overallProgress} className="mt-2" />
                <div className="text-sm text-blue-600 mt-1">
                  {Math.round(overallProgress)}% complete
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Chunks</span>
                </div>
                <div className="text-2xl font-bold text-green-700">
                  {progress.processed_chunks} / {progress.total_chunks}
                </div>
                <Progress value={chunkProgress} className="mt-2" />
                <div className="text-sm text-green-600 mt-1">
                  {Math.round(chunkProgress)}% complete
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Timer className="w-5 h-5 text-purple-600" />
                  <span className="font-medium">Status</span>
                </div>
                <div className="text-lg font-medium text-purple-700 capitalize">
                  {progress.status.replace('_', ' ')}
                </div>
                {progress.start_time && (
                  <div className="text-sm text-purple-600 mt-1">
                    Started: {formatTime(progress.start_time)}
                  </div>
                )}
              </div>

              {(() => {
                const eta = getEstimatedTimeRemaining();
                const isCompleted = eta && typeof eta === 'object' && eta.type === 'completed';
                return (
                  <div className={`p-4 rounded-lg ${isCompleted ? 'bg-green-50' : 'bg-yellow-50'}`}>
                    {isCompleted ? (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="font-medium text-green-700">Processing Complete</span>
                        </div>
                        <div className="space-y-2">
                          <div className="text-lg font-medium text-green-700">
                            Total Time: {eta.totalTime}
                          </div>
                          <div className="text-sm text-green-600 space-y-1">
                            <div>• {eta.processedDocs} documents processed</div>
                            <div>• {eta.totalChunks} chunks created</div>
                            <div>• Average: {eta.avgTime} per document</div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-5 h-5 text-yellow-600" />
                          <span className="font-medium">ETA</span>
                        </div>
                        <div className="text-lg font-medium text-yellow-700">
                          {eta || 'Calculating...'}
                        </div>
                        {progress?.estimated_completion_time && (
                          <div className="text-sm text-yellow-600 mt-1">
                            {formatTime(progress.estimated_completion_time)}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}
            </div>

            <Separator />

            {/* Document Details Table */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Document Processing Details</h3>
              <ScrollArea className="h-96 border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-white">
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Document Name</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead className="w-20">Progress</TableHead>
                      <TableHead className="w-20">Chunks</TableHead>
                      <TableHead className="w-28">Processing Time</TableHead>
                      <TableHead className="w-32">Started</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {progress.documents.map((doc, index) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(doc.status)}
                            <span className="truncate max-w-64" title={doc.document_name}>
                              {doc.document_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(doc.status)}>
                            {doc.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Progress value={doc.progress_percentage} className="h-2" />
                            <div className="text-xs text-gray-500">
                              {doc.progress_percentage}%
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="text-sm">
                            {doc.processed_chunks}
                            {doc.total_chunks && ` / ${doc.total_chunks}`}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="text-sm">
                            {formatDuration(doc.processing_time_ms)}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {doc.start_time ? formatTime(doc.start_time) : '-'}
                        </TableCell>
                        <TableCell>
                          {doc.error_message && (
                            <div className="text-xs text-red-600 max-w-48 truncate" title={doc.error_message}>
                              {doc.error_message}
                            </div>
                          )}
                          {doc.status === 'processing' && (
                            <div className="text-xs text-blue-600">
                              Processing chunks...
                            </div>
                          )}
                          {doc.status === 'completed' && (
                            <div className="text-xs text-green-600">
                              ✓ Completed successfully
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            <span>Loading progress information...</span>
          </div>
        )}
      </CustomDialogContent>
    </Dialog>
  );
}