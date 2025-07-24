import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  FileText, 
  Bot, 
  User, 
  Save, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  XCircle,
  Info,
  Loader2,
  Eye,
  EyeOff
} from "lucide-react";
import { api } from '@/lib/api';
import type { Document, DocumentAssessment, AssessmentQuestionResponse } from '@/lib/api/types';
import { useToast } from '@/hooks/use-toast';
import { generateAssessmentPDF } from '@/lib/utils/pdfGenerator';

interface DocumentReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string | null;
  assessmentId?: string | null;
  onSave?: () => void;
}

interface AssessmentData {
  assessment: DocumentAssessment;
  responses: AssessmentQuestionResponse[];
  document: Document;
}

const getVerdictColor = (verdict: string) => {
  switch (verdict?.toLowerCase()) {
    case 'satisfactory':
      return 'text-success';
    case 'unsatisfactory':
      return 'text-destructive';
    case 'requirement':
      return 'text-warning';
    default:
      return 'text-muted-foreground';
  }
};

const getVerdictIcon = (verdict: string) => {
  switch (verdict?.toLowerCase()) {
    case 'satisfactory':
      return CheckCircle;
    case 'unsatisfactory':
      return XCircle;
    case 'requirement':
      return AlertTriangle;
    default:
      return Info;
  }
};

const getVerdictBadgeVariant = (verdict: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (verdict?.toLowerCase()) {
    case 'satisfactory':
      return 'default';
    case 'unsatisfactory':
      return 'destructive';
    case 'requirement':
      return 'secondary';
    default:
      return 'outline';
  }
};

export function DocumentReviewModal({ 
  open, 
  onOpenChange, 
  documentId, 
  assessmentId,
  onSave 
}: DocumentReviewModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null);
  const [humanReview, setHumanReview] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('ai-analysis');
  const [showNonRelevant, setShowNonRelevant] = useState(false);

  useEffect(() => {
    if (open && documentId) {
      loadAssessmentData();
    }
  }, [open, documentId, assessmentId]);

  const loadAssessmentData = async () => {
    if (!documentId) return;
    
    try {
      setLoading(true);
      
      // Get document details
      const document = await api.documents.getDocument(documentId);
      
      let latestAssessment: DocumentAssessment;
      
      if (assessmentId) {
        // Use the provided assessment ID
        latestAssessment = await api.assessments.getAssessment(assessmentId);
      } else {
        // Try to find existing assessments
        const assessments = await api.assessments.getDocumentAssessments(documentId);
        
        if (!assessments || assessments.length === 0) {
          toast({
            title: 'No Assessment Found',
            description: 'This document has not been assessed yet. Click "Assess" to start AI analysis.',
            variant: 'destructive',
          });
          onOpenChange(false);
          return;
        }
        
        // First try to find a completed assessment
        const completedAssessment = assessments.find(a => a.status === 'completed');
        
        if (completedAssessment) {
          latestAssessment = completedAssessment;
        } else {
          // If no completed assessment, check if there's one in progress
          const inProgressAssessment = assessments.find(a => a.status === 'in_progress' || a.status === 'processing');
          
          if (inProgressAssessment) {
            toast({
              title: 'Assessment In Progress',
              description: 'The document is still being processed. Please wait a moment and try again.',
              variant: 'destructive',
            });
            onOpenChange(false);
            return;
          }
          
          // Otherwise just take the latest one
          latestAssessment = assessments[0];
        }
      }
      
      // Get assessment responses
      const responses = await api.assessments.getAssessmentResponses(latestAssessment.id);
      
      setAssessmentData({
        assessment: latestAssessment,
        responses: responses || [],
        document: document
      });
      
      // Load human review if exists
      const humanReviewData = await api.assessments.getHumanReview(latestAssessment.id);
      if (humanReviewData && humanReviewData.content) {
        setHumanReview(humanReviewData.content);
      }
      
    } catch (error: any) {
      console.error('Failed to load assessment data:', error);
      toast({
        title: 'Failed to load assessment',
        description: 'Could not load assessment details. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!assessmentData) return;
    
    try {
      setSaving(true);
      
      await api.assessments.saveHumanReview(assessmentData.assessment.id, humanReview);
      
      toast({
        title: 'Review Saved',
        description: 'Human review has been saved successfully.',
      });
      
      setIsEditing(false);
      onSave?.();
    } catch (error: any) {
      toast({
        title: 'Save Failed',
        description: 'Failed to save human review. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConsultantReview = async (responseId: string, value: string) => {
    try {
      const accepted = value === 'accepted' ? true : value === 'rejected' ? false : null;
      
      // Update the consultant review status via API
      await api.assessments.updateConsultantReview(assessmentId!, responseId, {
        consultant_accepted: accepted,
        consultant_notes: null
      });
      
      // Update local state
      if (assessmentData) {
        const updatedResponses = assessmentData.responses.map(r => 
          r.id === responseId ? { ...r, consultant_accepted: accepted } : r
        );
        setAssessmentData({
          ...assessmentData,
          responses: updatedResponses
        });
      }
      
      toast({
        title: 'Review Updated',
        description: `Response marked as ${value}`,
      });
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update consultant review status.',
        variant: 'destructive',
      });
    }
  };

  // Calculate statistics - only count relevant questions
  const relevantResponses = assessmentData?.responses.filter(r => r.is_relevant !== false) || [];
  const totalRelevantQuestions = relevantResponses.length;
  const satisfactoryCount = relevantResponses.filter(r => r.verdict === 'satisfactory').length;
  const unsatisfactoryCount = relevantResponses.filter(r => r.verdict === 'unsatisfactory').length;
  const requirementCount = relevantResponses.filter(r => r.verdict === 'requirement').length;
  const complianceScore = totalRelevantQuestions > 0 ? Math.round((satisfactoryCount / totalRelevantQuestions) * 100) : 0;

  const handleDownload = async () => {
    if (!assessmentData) return;
    
    try {
      // Generate PDF directly from the assessment data
      await generateAssessmentPDF(
        assessmentData.assessment,
        assessmentData.responses,
        assessmentData.document.original_filename,
        complianceScore,
        satisfactoryCount,
        unsatisfactoryCount,
        requirementCount,
        showNonRelevant
      );
      
      toast({
        title: 'PDF Generated',
        description: 'Assessment report has been downloaded as PDF.',
      });
    } catch (error: any) {
      toast({
        title: 'Download Failed',
        description: 'Failed to generate PDF report.',
        variant: 'destructive',
      });
    }
  };

  if (!open) return null;

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Loading Assessment</DialogTitle>
            <DialogDescription>Please wait while we load the assessment data...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!assessmentData) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {assessmentData.document.original_filename}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={activeTab === 'ai-analysis' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('ai-analysis')}
              >
                <Bot className="h-4 w-4 mr-2" />
                AI Analysis
              </Button>
              <Button
                variant={activeTab === 'human-review' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('human-review')}
              >
                <User className="h-4 w-4 mr-2" />
                Manual Review
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
            </div>
          </div>
          <DialogDescription>
            AI Assessment Results - {new Date(assessmentData.assessment.assessment_date).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col mt-4">
          {activeTab === 'ai-analysis' ? (
            <div className="h-full flex flex-col gap-2">
                  {/* Compact Score Summary */}
                  <Card className="p-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Compliance:</span>
                          <span className="text-2xl font-bold">{complianceScore}%</span>
                        </div>
                        <Progress value={complianceScore} className="w-32" />
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-success" />
                          <span className="text-sm"><span className="font-bold text-success">{satisfactoryCount}</span> Satisfactory</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-destructive" />
                          <span className="text-sm"><span className="font-bold text-destructive">{unsatisfactoryCount}</span> Unsatisfactory</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-warning" />
                          <span className="text-sm"><span className="font-bold text-warning">{requirementCount}</span> Requirements</span>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* All Assessment Results in Single Table */}
                  <div className="border rounded-lg bg-card" style={{ height: 'calc(100vh - 350px)' }}>
                    <div className="p-4 border-b flex items-center justify-between">
                      <h3 className="text-base font-semibold">Assessment Results</h3>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="show-non-relevant" className="text-sm font-normal">
                          Show non-relevant questions
                        </Label>
                        <Switch
                          id="show-non-relevant"
                          checked={showNonRelevant}
                          onCheckedChange={setShowNonRelevant}
                        />
                        {showNonRelevant ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </div>
                    </div>
                    <div className="overflow-auto" style={{ height: 'calc(100% - 60px)' }}>
                      <Table>
                          <TableHeader className="sticky top-0 bg-card border-b">
                            <TableRow>
                              <TableHead className="w-[40px] px-4">#</TableHead>
                              <TableHead className="min-w-[200px] max-w-[250px] px-4">Question</TableHead>
                              <TableHead className="min-w-[120px] px-4">Section</TableHead>
                              <TableHead className="min-w-[300px] px-4">AI Comment</TableHead>
                              <TableHead className="min-w-[400px] px-4">Recommendation</TableHead>
                              <TableHead className="min-w-[120px] px-4">Evidence</TableHead>
                              <TableHead className="w-[110px] px-4">Compliance</TableHead>
                              <TableHead className="w-[100px] px-4">Verdict</TableHead>
                              <TableHead className="w-[120px] px-4">Consultant Review</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {assessmentData.responses
                              .filter(response => {
                                // If showNonRelevant is true, show all
                                // If false, only show relevant questions (is_relevant === true or undefined)
                                if (showNonRelevant) return true;
                                return response.is_relevant !== false;
                              })
                              .map((response, index) => {
                              const VerdictIcon = getVerdictIcon(response.verdict);
                              const question = response.question || {};
                              const subsection = response.subsection || {};
                              
                              return (
                                <TableRow key={response.id}>
                                  <TableCell className="font-mono text-sm px-4">
                                    {index + 1}
                                  </TableCell>
                                  <TableCell className="px-4">
                                    <div className="space-y-1 max-w-[250px]">
                                      <p className="font-medium">{question.original_text || 'N/A'}</p>
                                      {question.ref && (
                                        <p className="text-xs text-muted-foreground">
                                          Ref: {question.ref}
                                        </p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="px-4">
                                    <p className="text-sm">{subsection.title || 'N/A'}</p>
                                  </TableCell>
                                  <TableCell>
                                    <p className="text-sm whitespace-pre-wrap">{response.comment || 'No comment'}</p>
                                  </TableCell>
                                  <TableCell>
                                    <p className="text-sm whitespace-pre-wrap">
                                      {response.improvement_recommendation || 'No recommendation'}
                                    </p>
                                  </TableCell>
                                  <TableCell className="px-4">
                                    <p className="text-sm">
                                      {response.evidence_reference || 'No evidence cited'}
                                    </p>
                                  </TableCell>
                                  <TableCell className="px-4">
                                    <Badge 
                                      variant={response.compliance_level === 'compliant' ? 'default' : 
                                              response.compliance_level === 'partially_compliant' ? 'secondary' : 
                                              'destructive'}
                                      className="text-xs"
                                    >
                                      {response.compliance_level?.replace(/_/g, ' ') || 'N/A'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="px-4">
                                    <Badge 
                                      variant={getVerdictBadgeVariant(response.verdict)}
                                      className="flex items-center gap-1"
                                    >
                                      <VerdictIcon className="h-3 w-3" />
                                      {response.verdict || 'N/A'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="px-4">
                                    <Select
                                      value={response.consultant_accepted === true ? 'accepted' : 
                                             response.consultant_accepted === false ? 'rejected' : 
                                             'pending'}
                                      onValueChange={(value) => handleConsultantReview(response.id, value)}
                                    >
                                      <SelectTrigger 
                                        className={`w-[110px] text-white ${
                                          response.consultant_accepted === true ? 'bg-green-600 hover:bg-green-700 border-green-600' : 
                                          response.consultant_accepted === false ? 'bg-red-600 hover:bg-red-700 border-red-600' : 
                                          'bg-orange-500 hover:bg-orange-600 border-orange-500'
                                        }`}
                                      >
                                        <SelectValue placeholder="Select..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="pending">
                                          <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3 text-warning" />
                                            Pending
                                          </span>
                                        </SelectItem>
                                        <SelectItem value="accepted">
                                          <span className="flex items-center gap-1">
                                            <CheckCircle className="h-3 w-3 text-success" />
                                            Accepted
                                          </span>
                                        </SelectItem>
                                        <SelectItem value="rejected">
                                          <span className="flex items-center gap-1">
                                            <XCircle className="h-3 w-3 text-destructive" />
                                            Rejected
                                          </span>
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                    </div>
                  </div>
            </div>
          ) : (
            <div className="h-full">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Manual Review & Analysis
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {!isEditing ? (
                          <Button onClick={() => setIsEditing(true)}>
                            Edit Review
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              onClick={() => setIsEditing(false)}
                              disabled={saving}
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={handleSave}
                              disabled={saving}
                            >
                              {saving ? (
                                <>
                                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="h-4 w-4 mr-2" />
                                  Save Review
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <Textarea
                        value={humanReview}
                        onChange={(e) => setHumanReview(e.target.value)}
                        className="min-h-96 font-mono text-sm"
                        placeholder="Enter your review in Markdown format..."
                      />
                    ) : (
                      <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap font-mono text-sm bg-muted/30 p-4 rounded-lg">
                          {humanReview || 'No human review available yet.'}
                        </div>
                      </div>
                    )}
                    {isEditing && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Supports full Markdown formatting. Changes are versioned and tracked.
                      </p>
                    )}
                  </CardContent>
                </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}