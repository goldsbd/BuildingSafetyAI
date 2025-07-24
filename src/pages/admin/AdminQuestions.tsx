import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/api/client';

interface AssessmentQuestion {
  question: {
    id: string;
    ref_: string;
    original_text: string;
    improved_text: string;
    is_active: boolean;
  };
  subsection: {
    id: string;
    subsection_id: string;
    title: string;
    description: string;
  };
  section: {
    id: string;
    section_id: string;
    section_title: string;
  };
}

interface EditingQuestion {
  id: string;
  ref_: string;
  original_text: string;
  improved_text: string;
  is_active: boolean;
}

interface NewQuestion {
  ref_: string;
  original_text: string;
  improved_text: string;
  is_active: boolean;
  subsection_id: string;
}

interface Section {
  id: string;
  section_id: string;
  section_title: string;
}

interface Subsection {
  id: string;
  subsection_id: string;
  title: string;
  description: string;
  section_id: string;
}

export default function AdminQuestions() {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<EditingQuestion | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [subsections, setSubsections] = useState<Subsection[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [newQuestion, setNewQuestion] = useState<NewQuestion>({
    ref_: '',
    original_text: '',
    improved_text: '',
    is_active: true,
    subsection_id: '',
  });

  useEffect(() => {
    loadQuestions();
    loadSectionsAndSubsections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/questions');
      setQuestions(response.data);
    } catch (error) {
      console.error('Failed to load questions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load assessment questions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSectionsAndSubsections = async () => {
    try {
      const response = await apiClient.get('/admin/questions');
      const questionsData: AssessmentQuestion[] = response.data;
      
      // Extract unique sections
      const sectionsMap = new Map<string, Section>();
      const subsectionsMap = new Map<string, Subsection>();
      
      questionsData.forEach(item => {
        if (!sectionsMap.has(item.section.id)) {
          sectionsMap.set(item.section.id, item.section);
        }
        
        if (!subsectionsMap.has(item.subsection.id)) {
          subsectionsMap.set(item.subsection.id, {
            ...item.subsection,
            section_id: item.section.id
          });
        }
      });
      
      setSections(Array.from(sectionsMap.values()));
      setSubsections(Array.from(subsectionsMap.values()));
    } catch (error) {
      console.error('Failed to load sections/subsections:', error);
    }
  };

  const startEditing = (question: AssessmentQuestion) => {
    setEditingId(question.question.id);
    setEditingQuestion({
      id: question.question.id,
      ref_: question.question.ref_,
      original_text: question.question.original_text,
      improved_text: question.question.improved_text,
      is_active: question.question.is_active,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingQuestion(null);
  };

  const saveQuestion = async () => {
    if (!editingQuestion) return;

    try {
      await apiClient.put(`/admin/questions/${editingQuestion.id}`, editingQuestion);

      toast({
        title: 'Success',
        description: 'Question updated successfully.',
      });

      await loadQuestions();
      cancelEditing();
    } catch (error) {
      console.error('Failed to update question:', error);
      toast({
        title: 'Error',
        description: 'Failed to update question. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const deleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.delete(`/admin/questions/${questionId}`);

      toast({
        title: 'Success',
        description: 'Question deleted successfully.',
      });

      await loadQuestions();
    } catch (error) {
      console.error('Failed to delete question:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete question. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const createQuestion = async () => {
    if (!newQuestion.ref_ || !newQuestion.original_text || !newQuestion.improved_text || !newQuestion.subsection_id) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await apiClient.post('/admin/questions', newQuestion);

      toast({
        title: 'Success',
        description: 'Question created successfully.',
      });

      await loadQuestions();
      setIsCreateModalOpen(false);
      
      // Reset form
      setNewQuestion({
        ref_: '',
        original_text: '',
        improved_text: '',
        is_active: true,
        subsection_id: '',
      });
      setSelectedSectionId('');
    } catch (error) {
      console.error('Failed to create question:', error);
      toast({
        title: 'Error',
        description: 'Failed to create question. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Assessment Questions Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage the assessment questions used for document compliance evaluation
          </p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Assessment Question</DialogTitle>
              <DialogDescription>
                Create a new assessment question for document compliance evaluation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="section">Section</Label>
                  <Select 
                    value={selectedSectionId} 
                    onValueChange={(value) => {
                      setSelectedSectionId(value);
                      // Reset subsection when section changes
                      setNewQuestion(prev => ({ ...prev, subsection_id: '' }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a section" />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          {section.section_title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="subsection">Subsection</Label>
                  <Select 
                    value={newQuestion.subsection_id} 
                    onValueChange={(value) => setNewQuestion(prev => ({ ...prev, subsection_id: value }))}
                    disabled={!selectedSectionId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a subsection" />
                    </SelectTrigger>
                    <SelectContent>
                      {subsections
                        .filter(sub => sub.section_id === selectedSectionId)
                        .map((subsection) => (
                          <SelectItem key={subsection.id} value={subsection.id}>
                            {subsection.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="reference">Reference</Label>
                  <Input
                    id="reference"
                    value={newQuestion.ref_}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, ref_: e.target.value }))}
                    placeholder="e.g., Reg 7, Part B3"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="original-text">Original Question Text</Label>
                  <Textarea
                    id="original-text"
                    value={newQuestion.original_text}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, original_text: e.target.value }))}
                    placeholder="Enter the original question text"
                    className="min-h-[100px]"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="improved-text">Improved Question Text</Label>
                  <Textarea
                    id="improved-text"
                    value={newQuestion.improved_text}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, improved_text: e.target.value }))}
                    placeholder="Enter the improved question text with more specific criteria"
                    className="min-h-[100px]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="active"
                    checked={newQuestion.is_active}
                    onCheckedChange={(checked) => setNewQuestion(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label htmlFor="active">Active</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createQuestion}>
                  Create Question
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Questions ({questions.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-32">Reference</TableHead>
                  <TableHead className="w-48">Section</TableHead>
                  <TableHead>Original Question</TableHead>
                  <TableHead>Improved Question</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((item) => (
                  <TableRow key={item.question.id}>
                    <TableCell>
                      {editingId === item.question.id ? (
                        <Switch
                          checked={editingQuestion?.is_active || false}
                          onCheckedChange={(checked) => 
                            setEditingQuestion(prev => prev ? { ...prev, is_active: checked } : null)
                          }
                        />
                      ) : (
                        <Badge variant={item.question.is_active ? 'default' : 'secondary'}>
                          {item.question.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === item.question.id ? (
                        <Input
                          value={editingQuestion?.ref_ || ''}
                          onChange={(e) => 
                            setEditingQuestion(prev => prev ? { ...prev, ref_: e.target.value } : null)
                          }
                          className="w-full"
                        />
                      ) : (
                        <code className="bg-muted px-2 py-1 rounded text-sm">
                          {item.question.ref_}
                        </code>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{item.section.section_title}</div>
                        <div className="text-xs text-muted-foreground">{item.subsection.title}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {editingId === item.question.id ? (
                        <Textarea
                          value={editingQuestion?.original_text || ''}
                          onChange={(e) => 
                            setEditingQuestion(prev => prev ? { ...prev, original_text: e.target.value } : null)
                          }
                          className="w-full min-h-[80px]"
                        />
                      ) : (
                        <div className="text-sm">{item.question.original_text}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === item.question.id ? (
                        <Textarea
                          value={editingQuestion?.improved_text || ''}
                          onChange={(e) => 
                            setEditingQuestion(prev => prev ? { ...prev, improved_text: e.target.value } : null)
                          }
                          className="w-full min-h-[80px]"
                        />
                      ) : (
                        <div className="text-sm">{item.question.improved_text}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {editingId === item.question.id ? (
                          <>
                            <Button size="sm" variant="ghost" onClick={saveQuestion}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelEditing}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => startEditing(item)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => deleteQuestion(item.question.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}