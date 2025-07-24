import React, { useState } from 'react';
import { Loader2, Download, Send, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { documentsApi, type ExtractionConfig, type ExtractionResult, type DocumentChunk } from '@/lib/api/documents';
import type { Document } from '@/lib/api/types';

interface DocumentExtractionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document | null;
}

const defaultConfig: ExtractionConfig = {
  target_size: 1024,
  overlap: 256,
  min_size: 512,
  max_size: 2048,
  respect_sections: true,
  extract_references: true,
};

export const DocumentExtractionModal: React.FC<DocumentExtractionModalProps> = ({
  open,
  onOpenChange,
  document,
}) => {
  const [config, setConfig] = useState<ExtractionConfig>(defaultConfig);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentChunk, setCurrentChunk] = useState(0);
  const { toast } = useToast();

  const handleExtract = async () => {
    if (!document) return;

    try {
      setLoading(true);
      setResult(null);
      const extractionResult = await documentsApi.testExtractDocument(document.id, config);
      setResult(extractionResult);
      setCurrentChunk(0);
      
      toast({
        title: 'Extraction Complete',
        description: `Successfully extracted ${extractionResult.chunks.length} chunks from ${extractionResult.stats.pages} pages`,
      });
    } catch (error: any) {
      console.error('Extraction failed:', error);
      toast({
        title: 'Extraction Failed',
        description: error.response?.data?.message || 'Failed to extract document text. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportJson = () => {
    if (!result || !document) {
      toast({
        title: 'Export Failed',
        description: 'No extraction results available to export.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Create enhanced export data with metadata
      const exportData = {
        document: {
          filename: document.original_filename,
          id: document.id,
          project_id: document.project_id,
          extracted_at: new Date().toISOString(),
        },
        extraction: result,
        export_metadata: {
          version: '1.0',
          extraction_method: 'markdown_pdf_extraction',
          chunk_count: result.chunks.length,
          total_pages: result.stats.pages,
          processing_time_ms: result.stats.processing_time_ms,
        }
      };

      const jsonData = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `${document.original_filename.replace(/\.[^/.]+$/, "")}_extraction_${timestamp}.json`;
      
      const a = window.document.createElement('a');
      a.href = url;
      a.download = filename;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: `Extraction data exported as ${filename}`,
        duration: 2000,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export extraction data. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const updateConfig = (key: keyof ExtractionConfig, value: number | boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const currentChunkData = result?.chunks?.[currentChunk];

  const handleClose = () => {
    setResult(null);
    setCurrentChunk(0);
    setConfig(defaultConfig);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] overflow-hidden">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Extraction Test
            {document && (
              <span className="text-sm font-normal text-gray-600">
                - {document.original_filename}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Test PDF text extraction with configurable chunking parameters. Extract text into semantic chunks for vector database processing.
          </DialogDescription>
        </DialogHeader>

        {/* Stats Header - Compact */}
        {result && (
          <div className="flex justify-between items-center pb-2 border-b">
            <div className="flex gap-6 text-sm">
              <span><strong>{result.stats.pages}</strong> pages</span>
              <span><strong>{result.stats.total_chunks}</strong> chunks</span>
              <span><strong>{result.stats.processing_time_ms}ms</strong></span>
              <span><strong>{result.stats.avg_chunk_tokens}</strong> avg tokens</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportJson}>
                <Download className="h-4 w-4 mr-1" />
                Export JSON
              </Button>
              <Button variant="outline" size="sm" disabled>
                <Send className="h-4 w-4 mr-1" />
                Send to Vector DB
              </Button>
            </div>
          </div>
        )}

        {/* Main Content Layout: 30% Left Sidebar + 70% Right Chunk Browser */}
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Left Sidebar - 30% */}
          <div className="w-[30%] flex flex-col gap-4 min-h-0">
            {/* Configuration Panel - Compact */}
            <Card className="flex-shrink-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Chunking Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="target_size" className="text-xs">Target Size</Label>
                    <Input
                      id="target_size"
                      type="number"
                      value={config.target_size}
                      onChange={(e) => updateConfig('target_size', parseInt(e.target.value))}
                      min={256}
                      max={4096}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="overlap" className="text-xs">Overlap</Label>
                    <Input
                      id="overlap"
                      type="number"
                      value={config.overlap}
                      onChange={(e) => updateConfig('overlap', parseInt(e.target.value))}
                      min={0}
                      max={1024}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="min_size" className="text-xs">Min Size</Label>
                    <Input
                      id="min_size"
                      type="number"
                      value={config.min_size}
                      onChange={(e) => updateConfig('min_size', parseInt(e.target.value))}
                      min={128}
                      max={2048}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_size" className="text-xs">Max Size</Label>
                    <Input
                      id="max_size"
                      type="number"
                      value={config.max_size}
                      onChange={(e) => updateConfig('max_size', parseInt(e.target.value))}
                      min={512}
                      max={8192}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <Button onClick={handleExtract} disabled={loading || !document} size="sm" className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Extract & Analyze'
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Document Structure */}
            {result && (
              <Card className="flex-1 min-h-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Document Structure</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 overflow-y-auto">
                  {result.structure.sections.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-sm">Sections ({result.structure.sections.length})</h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {result.structure.sections.map((section, idx) => (
                          <div key={idx} className="text-xs">
                            <span className="font-mono text-gray-600">
                              {'  '.repeat(section.level - 1)}
                            </span>
                            <span className="font-medium">{section.title}</span>
                            <span className="text-gray-500 ml-2">(p{section.page})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.structure.figures.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-sm">Figures ({result.structure.figures.length})</h4>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {result.structure.figures.map((fig, idx) => (
                          <div key={idx} className="text-xs">
                            <span className="font-medium">Fig {fig.number}:</span>
                            <span className="ml-1">{fig.title}</span>
                            <span className="text-gray-500 ml-2">(p{fig.page})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.structure.tables.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-sm">Tables ({result.structure.tables.length})</h4>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {result.structure.tables.map((table, idx) => (
                          <div key={idx} className="text-xs">
                            <span className="font-medium">Table {table.number}:</span>
                            <span className="ml-1">{table.title}</span>
                            <span className="text-gray-500 ml-2">(p{table.page})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.structure.sections.length === 0 && result.structure.figures.length === 0 && result.structure.tables.length === 0 && (
                    <div className="text-xs text-gray-500">No document structure detected</div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Side - Chunk Browser - 70% */}
          {result && (
            <Card className="w-[70%] flex flex-col min-h-0">
              <CardHeader className="pb-2 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base">Chunk Browser</CardTitle>
                  {result.chunks.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentChunk(Math.max(0, currentChunk - 1))}
                        disabled={currentChunk === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-normal">
                        {currentChunk + 1} / {result.chunks.length}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentChunk(Math.min(result.chunks.length - 1, currentChunk + 1))}
                        disabled={currentChunk === result.chunks.length - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* Chunk Metadata - Compact */}
                {currentChunkData && (
                  <div className="grid grid-cols-4 gap-4 text-xs text-gray-600 border-t pt-2">
                    <div>
                      <span className="font-medium">Pages:</span> {currentChunkData.pages.join(', ')}
                    </div>
                    <div>
                      <span className="font-medium">Tokens:</span> {currentChunkData.token_count}
                    </div>
                    <div>
                      <span className="font-medium">Section:</span> {currentChunkData.section_context || 'Unknown'}
                    </div>
                    <div>
                      <span className="font-medium">Contains:</span>
                      <div className="flex gap-1 mt-1">
                        {currentChunkData.metadata.structure.has_figure && (
                          <Badge variant="secondary" className="text-xs">Figure</Badge>
                        )}
                        {currentChunkData.metadata.structure.has_table && (
                          <Badge variant="secondary" className="text-xs">Table</Badge>
                        )}
                        {currentChunkData.metadata.structure.has_list && (
                          <Badge variant="secondary" className="text-xs">List</Badge>
                        )}
                        {!currentChunkData.metadata.structure.has_figure && 
                         !currentChunkData.metadata.structure.has_table && 
                         !currentChunkData.metadata.structure.has_list && (
                          <Badge variant="secondary" className="text-xs">Text</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardHeader>
              
              <CardContent className="flex-1 min-h-0 p-0">
                {currentChunkData ? (
                  <div className="h-full flex flex-col">
                    {/* Chunk Content - Full Height */}
                    <div className="flex-1 min-h-0 p-4">
                      <div className="bg-gray-50 p-4 rounded text-sm font-mono whitespace-pre-wrap h-full overflow-y-auto border">
                        {currentChunkData.content}
                      </div>
                    </div>

                    {/* References Found - Bottom */}
                    {(currentChunkData.metadata.references.documents.length > 0 ||
                      currentChunkData.metadata.references.standards.length > 0 ||
                      currentChunkData.metadata.references.sections.length > 0 ||
                      currentChunkData.metadata.references.figures.length > 0) && (
                      <div className="border-t p-4 bg-gray-50">
                        <h4 className="font-medium mb-2 text-sm">References Found</h4>
                        <div className="space-y-1 text-xs">
                          {currentChunkData.metadata.references.documents.length > 0 && (
                            <div>
                              <span className="font-medium">Documents:</span>
                              <span className="ml-2">{currentChunkData.metadata.references.documents.join(', ')}</span>
                            </div>
                          )}
                          {currentChunkData.metadata.references.standards.length > 0 && (
                            <div>
                              <span className="font-medium">Standards:</span>
                              <span className="ml-2">{currentChunkData.metadata.references.standards.join(', ')}</span>
                            </div>
                          )}
                          {currentChunkData.metadata.references.sections.length > 0 && (
                            <div>
                              <span className="font-medium">Sections:</span>
                              <span className="ml-2">{currentChunkData.metadata.references.sections.join(', ')}</span>
                            </div>
                          )}
                          {currentChunkData.metadata.references.figures.length > 0 && (
                            <div>
                              <span className="font-medium">Figures:</span>
                              <span className="ml-2">{currentChunkData.metadata.references.figures.join(', ')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No chunks to display
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* If no results yet, show placeholder */}
          {!result && (
            <div className="w-[70%] flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-center text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Configure parameters and click "Extract & Analyze" to begin</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};