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
import { Plus, Edit, Trash2, Save, X, Eye } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/api/client';

interface SystemPrompt {
  id: string;
  name: string;
  description: string | null;
  prompt_text: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EditingPrompt {
  name: string;
  description: string | null;
  prompt_text: string;
  is_active: boolean;
}

export default function AdminPrompts() {
  const { toast } = useToast();
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<EditingPrompt | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPrompt, setNewPrompt] = useState<EditingPrompt>({
    name: '',
    description: '',
    prompt_text: '',
    is_active: true,
  });
  const [viewingPrompt, setViewingPrompt] = useState<SystemPrompt | null>(null);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/prompts');
      setPrompts(response.data);
    } catch (error) {
      console.error('Failed to load prompts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load system prompts. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (prompt: SystemPrompt) => {
    setEditingId(prompt.id);
    setEditingPrompt({
      name: prompt.name,
      description: prompt.description,
      prompt_text: prompt.prompt_text,
      is_active: prompt.is_active,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingPrompt(null);
  };

  const savePrompt = async () => {
    if (!editingPrompt || !editingId) return;

    try {
      await apiClient.put(`/admin/prompts/${editingId}`, editingPrompt);

      toast({
        title: 'Success',
        description: 'System prompt updated successfully.',
      });

      await loadPrompts();
      cancelEditing();
    } catch (error) {
      console.error('Failed to update prompt:', error);
      toast({
        title: 'Error',
        description: 'Failed to update system prompt. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const createPrompt = async () => {
    try {
      await apiClient.post('/admin/prompts', newPrompt);

      toast({
        title: 'Success',
        description: 'System prompt created successfully.',
      });

      await loadPrompts();
      setIsCreateModalOpen(false);
      setNewPrompt({
        name: '',
        description: '',
        prompt_text: '',
        is_active: true,
      });
    } catch (error) {
      console.error('Failed to create prompt:', error);
      toast({
        title: 'Error',
        description: 'Failed to create system prompt. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const deletePrompt = async (promptId: string) => {
    if (!confirm('Are you sure you want to delete this system prompt? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.delete(`/admin/prompts/${promptId}`);

      toast({
        title: 'Success',
        description: 'System prompt deleted successfully.',
      });

      await loadPrompts();
    } catch (error) {
      console.error('Failed to delete prompt:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete system prompt. Please try again.',
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
          <h1 className="text-3xl font-bold">System Prompts Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage the system prompts used for AI document analysis and assessment
          </p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Prompt
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Create New System Prompt</DialogTitle>
              <DialogDescription>
                Create a new system prompt that will be used for AI document analysis and assessment.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newPrompt.name}
                    onChange={(e) => setNewPrompt(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., assessment_document_analysis"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newPrompt.description || ''}
                    onChange={(e) => setNewPrompt(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the prompt's purpose"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="prompt_text">Prompt Text</Label>
                <Textarea
                  id="prompt_text"
                  value={newPrompt.prompt_text}
                  onChange={(e) => setNewPrompt(prev => ({ ...prev, prompt_text: e.target.value }))}
                  placeholder="Enter the system prompt text..."
                  className="min-h-[300px]"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={newPrompt.is_active}
                  onCheckedChange={(checked) => setNewPrompt(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createPrompt}>
                  Create Prompt
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Prompts ({prompts.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-48">Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-32">Updated</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prompts.map((prompt) => (
                <TableRow key={prompt.id}>
                  <TableCell>
                    {editingId === prompt.id ? (
                      <Switch
                        checked={editingPrompt?.is_active || false}
                        onCheckedChange={(checked) => 
                          setEditingPrompt(prev => prev ? { ...prev, is_active: checked } : null)
                        }
                      />
                    ) : (
                      <Badge variant={prompt.is_active ? 'default' : 'secondary'}>
                        {prompt.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === prompt.id ? (
                      <Input
                        value={editingPrompt?.name || ''}
                        onChange={(e) => 
                          setEditingPrompt(prev => prev ? { ...prev, name: e.target.value } : null)
                        }
                        className="w-full"
                      />
                    ) : (
                      <code className="bg-muted px-2 py-1 rounded text-sm">
                        {prompt.name}
                      </code>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === prompt.id ? (
                      <Input
                        value={editingPrompt?.description || ''}
                        onChange={(e) => 
                          setEditingPrompt(prev => prev ? { ...prev, description: e.target.value } : null)
                        }
                        className="w-full"
                      />
                    ) : (
                      <div className="text-sm">{prompt.description || 'No description'}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground">
                      {new Date(prompt.updated_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {editingId === prompt.id ? (
                        <>
                          <Button size="sm" variant="ghost" onClick={savePrompt}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEditing}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => setViewingPrompt(prompt)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => startEditing(prompt)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => deletePrompt(prompt.id)}
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
        </CardContent>
      </Card>

      {/* View Prompt Dialog */}
      <Dialog open={!!viewingPrompt} onOpenChange={(open) => !open && setViewingPrompt(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>System Prompt: {viewingPrompt?.name}</DialogTitle>
            <DialogDescription>
              View the complete system prompt configuration and content.
            </DialogDescription>
          </DialogHeader>
          {viewingPrompt && (
            <div className="space-y-4">
              <div>
                <Label>Description</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {viewingPrompt.description || 'No description provided'}
                </p>
              </div>
              <div>
                <Label>Prompt Text</Label>
                <Textarea
                  value={viewingPrompt.prompt_text}
                  readOnly
                  className="min-h-[400px] mt-2"
                />
              </div>
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Created: {new Date(viewingPrompt.created_at).toLocaleString()}</span>
                <span>Updated: {new Date(viewingPrompt.updated_at).toLocaleString()}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Prompt Dialog */}
      <Dialog open={!!editingId} onOpenChange={(open) => !open && cancelEditing()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit System Prompt</DialogTitle>
            <DialogDescription>
              Modify the system prompt configuration and content.
            </DialogDescription>
          </DialogHeader>
          {editingPrompt && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_name">Name</Label>
                  <Input
                    id="edit_name"
                    value={editingPrompt.name}
                    onChange={(e) => setEditingPrompt(prev => prev ? { ...prev, name: e.target.value } : null)}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_description">Description</Label>
                  <Input
                    id="edit_description"
                    value={editingPrompt.description || ''}
                    onChange={(e) => setEditingPrompt(prev => prev ? { ...prev, description: e.target.value } : null)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit_prompt_text">Prompt Text</Label>
                <Textarea
                  id="edit_prompt_text"
                  value={editingPrompt.prompt_text}
                  onChange={(e) => setEditingPrompt(prev => prev ? { ...prev, prompt_text: e.target.value } : null)}
                  className="min-h-[300px]"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit_is_active"
                  checked={editingPrompt.is_active}
                  onCheckedChange={(checked) => setEditingPrompt(prev => prev ? { ...prev, is_active: checked } : null)}
                />
                <Label htmlFor="edit_is_active">Active</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={cancelEditing}>
                  Cancel
                </Button>
                <Button onClick={savePrompt}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}