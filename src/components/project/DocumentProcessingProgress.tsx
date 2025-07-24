import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { api } from '@/lib/api';

interface DocumentProcessingProgressProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessmentId: string | null;
  documentName: string;
  onComplete?: () => void;
}

interface ProcessingStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentQuestion?: string;
  processedCount: number;
  totalCount: number;
  verdictCounts: {
    satisfactory: number;
    unsatisfactory: number;
    requirement: number;
  };
  aiModel?: string;
}

export function DocumentProcessingProgress({ 
  open, 
  onOpenChange, 
  assessmentId,
  documentName,
  onComplete 
}: DocumentProcessingProgressProps) {
  const [status, setStatus] = useState<ProcessingStatus>({
    status: 'processing',
    progress: 0,
    processedCount: 0,
    totalCount: 107, // Total BSR questions
    verdictCounts: {
      satisfactory: 0,
      unsatisfactory: 0,
      requirement: 0
    }
  });

  useEffect(() => {
    if (!open || !assessmentId) return;

    // Poll for status updates
    const interval = setInterval(async () => {
      try {
        // Get real progress from backend
        const progressResponse = await api.assessments.getProgress(assessmentId);
        const assessment = await api.assessments.getAssessment(assessmentId);
        
        // Log progress for debugging
        console.log('Assessment Progress:', {
          assessmentId,
          status: assessment.status,
          aiModel: assessment.ai_model,
          progress: progressResponse.progress
        });
        
        // Update AI model if available
        if (assessment.ai_model) {
          setStatus(prev => ({ ...prev, aiModel: assessment.ai_model }));
        }
        
        if (assessment.status === 'completed' || progressResponse.status === 'completed') {
          // Get the final report to show summary
          const report = await api.assessments.getReport(assessmentId);
          
          setStatus({
            status: 'completed',
            progress: 100,
            processedCount: report.responses?.length || 0,
            totalCount: report.responses?.length || 107,
            verdictCounts: {
              satisfactory: report.responses?.filter((r: any) => r.verdict === 'satisfactory').length || 0,
              unsatisfactory: report.responses?.filter((r: any) => r.verdict === 'unsatisfactory').length || 0,
              requirement: report.responses?.filter((r: any) => r.verdict === 'requirement').length || 0
            }
          });
          
          clearInterval(interval);
          
          // Auto close after showing completion
          setTimeout(() => {
            onComplete?.();
          }, 2000);
        } else if (assessment.status === 'failed' || progressResponse.status === 'failed') {
          setStatus(prev => ({ ...prev, status: 'failed' }));
          clearInterval(interval);
        } else {
          // Use real progress from backend
          setStatus(prev => ({
            ...prev,
            progress: progressResponse.progress?.percentage || prev.progress,
            processedCount: progressResponse.progress?.current || prev.processedCount,
            totalCount: progressResponse.progress?.total || prev.totalCount,
            status: progressResponse.status || 'processing'
          }));
        }
      } catch (error) {
        console.error('Error checking assessment status:', error);
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [open, assessmentId, onComplete]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Processing Document with AI</DialogTitle>
          <DialogDescription>
            Analyzing "{documentName}" against UK Building Safety Regulations
            {status.aiModel && (
              <span className="block mt-1 text-primary">
                Using model: {status.aiModel}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(status.progress)}%</span>
            </div>
            <Progress value={status.progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{status.processedCount} of {status.totalCount} questions analyzed</span>
              <span>
                {status.status === 'processing' && (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Processing...
                  </span>
                )}
                {status.status === 'completed' && (
                  <span className="flex items-center gap-1 text-success">
                    <CheckCircle className="h-3 w-3" />
                    Complete
                  </span>
                )}
                {status.status === 'failed' && (
                  <span className="flex items-center gap-1 text-destructive">
                    <XCircle className="h-3 w-3" />
                    Failed
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Status Cards */}
          {status.status === 'processing' && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center space-x-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <div>
                    <p className="font-medium">AI Analysis in Progress</p>
                    <p className="text-sm text-muted-foreground">
                      {status.aiModel ? `Using ${status.aiModel} to review` : 'AI model is reviewing'} compliance requirements...
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Summary (shown when complete) */}
          {status.status === 'completed' && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-success mx-auto mb-2" />
                    <h3 className="text-lg font-semibold">Analysis Complete!</h3>
                    <p className="text-sm text-muted-foreground">
                      Document has been assessed against all {status.totalCount} requirements
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-success">
                        {status.verdictCounts.satisfactory}
                      </div>
                      <Badge variant="default" className="mt-1">
                        Satisfactory
                      </Badge>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-destructive">
                        {status.verdictCounts.unsatisfactory}
                      </div>
                      <Badge variant="destructive" className="mt-1">
                        Unsatisfactory
                      </Badge>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-warning">
                        {status.verdictCounts.requirement}
                      </div>
                      <Badge variant="secondary" className="mt-1">
                        Requirements
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {status.status === 'failed' && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center space-x-3">
                  <XCircle className="h-8 w-8 text-destructive" />
                  <div>
                    <p className="font-medium text-destructive">Processing Failed</p>
                    <p className="text-sm text-muted-foreground">
                      An error occurred during AI analysis. Please try again.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}