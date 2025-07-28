import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Database, 
  Search, 
  Settings, 
  Play, 
  Square, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  HardDrive,
  FileText,
  Zap
} from 'lucide-react';
import { vectorApi, VectorStats, VectorOperationLog } from '@/lib/api/vector';
import { useToast } from '@/hooks/use-toast';
import { formatBytes, formatDate } from '@/lib/utils';
import { VectorProcessingProgressModal } from './VectorProcessingProgressModal';

interface VectorDBManagerProps {
  projectId: string;
}

type VectorStatus = 'not_configured' | 'configuring' | 'ready' | 'indexing' | 'offline' | 'error';

interface VectorDBState {
  status: VectorStatus;
  stats?: VectorStats;
  config?: {
    embedding_model: string;
    chunk_size: number;
    chunk_overlap: number;
    auto_index: boolean;
  };
}

export function VectorDBManager({ projectId }: VectorDBManagerProps) {
  const { toast } = useToast();
  const [state, setState] = useState<VectorDBState>({ status: 'not_configured' });
  const [loading, setLoading] = useState(false);
  const [operations, setOperations] = useState<VectorOperationLog[]>([]);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [initConfig, setInitConfig] = useState({
    embedding_model: 'text-embedding-3-small',
    chunk_size: 1000,
    chunk_overlap: 200,
    auto_index: true
  });

  useEffect(() => {
    loadVectorStats();
    loadOperationsLog();
  }, [projectId]);

  const loadVectorStats = async () => {
    try {
      const stats = await vectorApi.getVectorStats(projectId);
      if (stats) {
        const status = (stats as any).status || 'not_configured';
        setState(prev => ({ ...prev, stats, status: status as VectorStatus }));
      } else {
        setState(prev => ({ ...prev, status: 'not_configured' }));
      }
    } catch (error: any) {
      console.error('Failed to load vector stats:', error);
      setState(prev => ({ ...prev, status: 'not_configured' }));
    }
  };

  const loadOperationsLog = async () => {
    try {
      const response = await vectorApi.getOperationsLog(projectId, 10);
      setOperations(response.operations);
    } catch (error: any) {
      console.error('Failed to load operations log:', error);
      setOperations([]);
    }
  };

  const handleInitialize = async () => {
    setLoading(true);
    try {
      const response = await vectorApi.initializeVectorDB(projectId, initConfig);
      setState(prev => ({ 
        ...prev, 
        status: 'configuring', 
        stats: response.stats,
        config: initConfig 
      }));
      toast({
        title: "Vector Database Initialized",
        description: "Vector database has been configured successfully.",
      });
      loadOperationsLog();
    } catch (error) {
      toast({
        title: "Initialization Failed",
        description: "Failed to initialize vector database. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartIndexing = async () => {
    setLoading(true);
    try {
      await vectorApi.startIndexing(projectId);
      setState(prev => ({ ...prev, status: 'indexing' }));
      toast({
        title: "Indexing Started",
        description: "Document indexing has been started in the background.",
      });
      
      // Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          const stats = await vectorApi.getVectorStats(projectId);
          const status = (stats as any).status || 'ready';
          setState(prev => ({ ...prev, stats, status: status as VectorStatus }));
          loadOperationsLog();
          
          // If indexing is complete, clear the interval and stop loading
          if (status === 'ready' || status === 'error') {
            clearInterval(pollInterval);
            setLoading(false);
            if (status === 'ready') {
              toast({
                title: "Indexing Complete",
                description: "Document indexing has completed successfully.",
              });
            }
          }
        } catch (error) {
          clearInterval(pollInterval);
          setLoading(false);
        }
      }, 2000); // Poll every 2 seconds for faster updates

      setTimeout(() => {
        clearInterval(pollInterval);
        setLoading(false);
      }, 300000); // Stop after 5 minutes
    } catch (error) {
      toast({
        title: "Indexing Failed",
        description: "Failed to start document indexing. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleMount = async () => {
    setLoading(true);
    try {
      const response = await vectorApi.mountVectorDB(projectId);
      setState(prev => ({ 
        ...prev, 
        status: 'ready', 
        stats: response.stats 
      }));
      toast({
        title: "Vector Database Mounted",
        description: "Vector database is now online and ready for search.",
      });
    } catch (error) {
      toast({
        title: "Mount Failed",
        description: "Failed to mount vector database.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnmount = async () => {
    setLoading(true);
    try {
      await vectorApi.unmountVectorDB(projectId);
      setState(prev => ({ ...prev, status: 'offline' }));
      toast({
        title: "Vector Database Unmounted",
        description: "Vector database has been taken offline.",
      });
    } catch (error) {
      toast({
        title: "Unmount Failed",
        description: "Failed to unmount vector database.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await vectorApi.deleteVectorDB(projectId);
      setState({ status: 'not_configured' });
      setOperations([]);
      toast({
        title: "Vector Database Deleted",
        description: "All vector data has been permanently deleted.",
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete vector database.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupMacOSX = async () => {
    setLoading(true);
    try {
      const result = await vectorApi.cleanupMacOSXEntries(projectId);
      toast({
        title: "Cleanup Complete",
        description: result.message,
      });
      // Refresh stats after cleanup
      loadVectorStats();
    } catch (error) {
      toast({
        title: "Cleanup Failed",
        description: "Failed to clean up __MACOSX entries.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: VectorStatus) => {
    switch (status) {
      case 'ready': return 'bg-green-500';
      case 'indexing': return 'bg-blue-500';
      case 'configuring': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  const getStatusIcon = (status: VectorStatus) => {
    switch (status) {
      case 'ready': return <CheckCircle className="w-4 h-4" />;
      case 'indexing': return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'configuring': return <Settings className="w-4 h-4" />;
      case 'offline': return <Square className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      default: return <Database className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Vector Database
              </CardTitle>
              <CardDescription>
                Manage document search and AI-powered question answering
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(state.status)}`} />
                {state.status.replace('_', ' ').toUpperCase()}
              </Badge>
              {getStatusIcon(state.status)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="operations">Operations</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {state.status === 'not_configured' ? (
                <Alert>
                  <Database className="h-4 w-4" />
                  <AlertDescription>
                    Vector database is not configured. Initialize it to enable document search and AI chat features.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="text-2xl font-bold">{state.stats?.document_count || 0}</p>
                          <p className="text-sm text-gray-600">Documents</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-green-500" />
                        <div>
                          <p className="text-2xl font-bold">{state.stats?.chunk_count || 0}</p>
                          <p className="text-sm text-gray-600">Chunks</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-5 h-5 text-purple-500" />
                        <div>
                          <p className="text-2xl font-bold">
                            {formatBytes(state.stats?.storage_size_bytes || 0)}
                          </p>
                          <p className="text-sm text-gray-600">Storage</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <Separator />

              <div className="flex gap-2 flex-wrap">
                {state.status === 'not_configured' && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Settings className="w-4 h-4 mr-2" />
                        Initialize Vector DB
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Initialize Vector Database</DialogTitle>
                        <DialogDescription>
                          Configure the vector database settings for this project.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="embedding_model">Embedding Model</Label>
                          <Select
                            value={initConfig.embedding_model}
                            onValueChange={(value) => setInitConfig(prev => ({ ...prev, embedding_model: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text-embedding-3-small">OpenAI text-embedding-3-small</SelectItem>
                              <SelectItem value="text-embedding-3-large">OpenAI text-embedding-3-large</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="chunk_size">Chunk Size (tokens)</Label>
                          <Input
                            id="chunk_size"
                            type="number"
                            value={initConfig.chunk_size}
                            onChange={(e) => setInitConfig(prev => ({ ...prev, chunk_size: parseInt(e.target.value) }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="chunk_overlap">Chunk Overlap (tokens)</Label>
                          <Input
                            id="chunk_overlap"
                            type="number"
                            value={initConfig.chunk_overlap}
                            onChange={(e) => setInitConfig(prev => ({ ...prev, chunk_overlap: parseInt(e.target.value) }))}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleInitialize} disabled={loading}>
                          {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                          Initialize
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}

                {(state.status === 'configuring' || (state.status === 'ready' && state.stats && state.stats.document_count === 0)) && (
                  <Button onClick={handleStartIndexing} disabled={loading}>
                    <Play className="w-4 h-4 mr-2" />
                    Start Indexing
                  </Button>
                )}

                {state.status === 'indexing' && (
                  <>
                    <Alert className="mb-4">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <AlertDescription>
                        Documents are being indexed. This may take several minutes for large document sets.
                        {state.stats?.chunk_count ? ` Current progress: ${state.stats.chunk_count} chunks processed.` : ''}
                      </AlertDescription>
                    </Alert>
                    
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => setShowProgressModal(true)}
                        variant="default"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        View Detailed Progress
                      </Button>
                      <Button onClick={handleStartIndexing} disabled={loading} variant="outline">
                        <Play className="w-4 h-4 mr-2" />
                        Force Re-index
                      </Button>
                    </div>
                  </>
                )}

                {state.status === 'offline' && (
                  <Button onClick={handleMount} disabled={loading}>
                    <Play className="w-4 h-4 mr-2" />
                    Mount Database
                  </Button>
                )}

                {state.status === 'ready' && state.stats && state.stats.document_count > 0 && (
                  <>
                    <Button onClick={handleStartIndexing} disabled={loading}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Re-index Documents
                    </Button>
                    <Button variant="outline" onClick={handleUnmount} disabled={loading}>
                      <Square className="w-4 h-4 mr-2" />
                      Unmount
                    </Button>
                  </>
                )}

                {state.status !== 'not_configured' && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="destructive" disabled={loading}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Reset Vector DB
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reset Vector Database</DialogTitle>
                        <DialogDescription>
                          This will permanently delete all vector data and reset the database to a clean state. 
                          You will need to re-initialize and re-index all documents.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <DialogTrigger asChild>
                          <Button variant="outline">Cancel</Button>
                        </DialogTrigger>
                        <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                          {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                          Reset Database
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}

                <Button variant="outline" onClick={loadVectorStats} disabled={loading}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                
                <Button 
                  variant="secondary"
                  onClick={() => setShowProgressModal(true)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Processing History
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleCleanupMacOSX}
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clean __MACOSX
                </Button>
                
                {/* Enhanced logging button */}
                <Button variant="outline" onClick={() => {
                  console.log('=== VECTOR DB DEBUG INFO ===');
                  console.log('Project ID:', projectId);
                  console.log('Current State:', state);
                  console.log('Operations:', operations);
                  console.log('Loading:', loading);
                  console.log('========================');
                  toast({
                    title: "Debug Info Logged",
                    description: "Check browser console for detailed vector DB state information.",
                  });
                }}>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Debug Info
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="operations" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Recent Operations</h3>
                <Button variant="outline" size="sm" onClick={loadOperationsLog}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operation</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Chunks</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Started</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operations.map((op) => (
                    <TableRow key={op.id}>
                      <TableCell className="font-medium">{op.operation_type}</TableCell>
                      <TableCell>
                        <Badge variant={op.status === 'completed' ? 'default' : op.status === 'failed' ? 'destructive' : 'secondary'}>
                          {op.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{op.documents_processed}</TableCell>
                      <TableCell>{op.chunks_created}</TableCell>
                      <TableCell>
                        {op.duration_ms ? `${op.duration_ms}ms` : '-'}
                      </TableCell>
                      <TableCell>{formatDate(op.started_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  Vector database settings can only be changed by reinitializing the database.
                </AlertDescription>
              </Alert>

              {state.config && (
                <div className="space-y-4">
                  <div>
                    <Label>Embedding Model</Label>
                    <Input value={state.config.embedding_model} disabled />
                  </div>
                  <div>
                    <Label>Chunk Size</Label>
                    <Input value={state.config.chunk_size} disabled />
                  </div>
                  <div>
                    <Label>Chunk Overlap</Label>
                    <Input value={state.config.chunk_overlap} disabled />
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <VectorProcessingProgressModal
        projectId={projectId}
        isOpen={showProgressModal}
        onClose={() => setShowProgressModal(false)}
      />
    </div>
  );
}