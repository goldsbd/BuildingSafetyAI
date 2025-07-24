import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Brain, Key, Plus, Edit, Trash2, Eye, EyeOff, Copy, Check } from "lucide-react";
import { llmApi } from "@/lib/api/llm";

interface LLMProvider {
  id: string;
  name: string;
  display_name: string;
  is_active: boolean;
  api_base_url?: string;
}

interface LLMModel {
  id: string;
  provider_id: string;
  provider_name: string;
  provider_display_name: string;
  model_identifier: string;
  display_name: string;
  max_input_tokens?: number;
  max_output_tokens?: number;
  total_context_window?: number;
  input_token_price: number | string;
  output_token_price: number | string;
  price_markup_multiplier: number | string;
  supports_vision: boolean;
  supports_function_calling: boolean;
  supports_batching: boolean;
  questions_per_batch: number;
  batch_input_token_price?: number | string;
  batch_output_token_price?: number | string;
  is_active: boolean;
  is_default: boolean;
}

interface ApiKey {
  id: string;
  provider_id: string;
  provider_name: string;
  provider_display_name: string;
  key_hint?: string;
  is_active: boolean;
  created_at: string;
  last_used_at?: string;
}

export default function ModelConfiguration() {
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [models, setModels] = useState<LLMModel[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModelDialog, setShowModelDialog] = useState(false);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [editingModel, setEditingModel] = useState<LLMModel | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const { toast } = useToast();

  // Form states
  const [modelForm, setModelForm] = useState({
    provider_id: "",
    model_identifier: "",
    display_name: "",
    max_input_tokens: 0,
    max_output_tokens: 0,
    total_context_window: 0,
    input_token_price: 0,
    output_token_price: 0,
    price_markup_multiplier: 1.5,
    supports_vision: false,
    supports_function_calling: false,
    supports_batching: false,
    questions_per_batch: 10,
    batch_input_token_price: 0,
    batch_output_token_price: 0,
    is_active: true,
    is_default: false,
  });

  const [keyForm, setKeyForm] = useState({
    provider_id: "",
    api_key: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [providersRes, modelsRes, keysRes] = await Promise.all([
        llmApi.getProviders(),
        llmApi.getModels(),
        llmApi.getApiKeys(),
      ]);
      setProviders(providersRes);
      setModels(modelsRes);
      setApiKeys(keysRes);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch LLM configuration data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveModel = async () => {
    // Form validation
    if (!modelForm.model_identifier?.trim()) {
      toast({
        title: "Validation Error",
        description: "Model identifier is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!modelForm.display_name?.trim()) {
      toast({
        title: "Validation Error", 
        description: "Display name is required",
        variant: "destructive",
      });
      return;
    }
    
    if (modelForm.supports_batching && (modelForm.questions_per_batch < 1 || modelForm.questions_per_batch > 50)) {
      toast({
        title: "Validation Error",
        description: "Questions per batch must be between 1 and 50",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingModel) {
        await llmApi.updateModel(editingModel.id, modelForm);
        toast({
          title: "Success",
          description: "Model updated successfully",
        });
      } else {
        await llmApi.createModel(modelForm);
        toast({
          title: "Success",
          description: "Model created successfully",
        });
      }
      setShowModelDialog(false);
      setEditingModel(null);
      fetchData();
    } catch (error) {
      console.error("Model save error:", error);
      toast({
        title: "Error",
        description: "Failed to save model. Please check your input and try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    if (!confirm("Are you sure you want to delete this model?")) return;
    
    try {
      await llmApi.deleteModel(modelId);
      toast({
        title: "Success",
        description: "Model deleted successfully",
      });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete model",
        variant: "destructive",
      });
    }
  };

  const handleSaveApiKey = async () => {
    try {
      await llmApi.createApiKey(keyForm);
      toast({
        title: "Success",
        description: "API key saved successfully",
      });
      setShowKeyDialog(false);
      setKeyForm({ provider_id: "", api_key: "" });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save API key",
        variant: "destructive",
      });
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to delete this API key?")) return;
    
    try {
      await llmApi.deleteApiKey(keyId);
      toast({
        title: "Success",
        description: "API key deleted successfully",
      });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete API key",
        variant: "destructive",
      });
    }
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(keyForm.api_key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return `$${numPrice.toFixed(2)} / MTok`;
  };

  const formatTokens = (tokens?: number) => {
    if (!tokens) return "N/A";
    return tokens.toLocaleString();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Model Configuration</h1>
          <p className="text-muted-foreground">
            Manage language models, pricing, and API keys
          </p>
        </div>
      </div>

      <Tabs defaultValue="models" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="keys">API Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Configured Models</h2>
            <Button onClick={() => {
              setEditingModel(null);
              setModelForm({
                provider_id: providers[0]?.id || "",
                model_identifier: "",
                display_name: "",
                max_input_tokens: 0,
                max_output_tokens: 0,
                total_context_window: 0,
                input_token_price: 0,
                output_token_price: 0,
                price_markup_multiplier: 1.5,
                supports_vision: false,
                supports_function_calling: false,
                supports_batching: false,
                questions_per_batch: 10,
                batch_input_token_price: 0,
                batch_output_token_price: 0,
                is_active: true,
                is_default: false,
              });
              setShowModelDialog(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Model
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Context Window</TableHead>
                    <TableHead>Input Price</TableHead>
                    <TableHead>Output Price</TableHead>
                    <TableHead>Features</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.map((model) => (
                    <TableRow key={model.id}>
                      <TableCell>{model.provider_display_name}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{model.display_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {model.model_identifier}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatTokens(model.total_context_window)}</TableCell>
                      <TableCell>{formatPrice(model.input_token_price)}</TableCell>
                      <TableCell>{formatPrice(model.output_token_price)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {model.supports_vision && (
                            <Badge variant="secondary" className="text-xs">Vision</Badge>
                          )}
                          {model.supports_function_calling && (
                            <Badge variant="secondary" className="text-xs">Functions</Badge>
                          )}
                          {model.supports_batching && (
                            <Badge variant="secondary" className="text-xs">Batch</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {model.is_active ? (
                            <Badge variant="success">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                          {model.is_default && (
                            <Badge variant="default">Default</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingModel(model);
                              setModelForm({
                                provider_id: model.provider_id,
                                model_identifier: model.model_identifier,
                                display_name: model.display_name,
                                max_input_tokens: model.max_input_tokens || 0,
                                max_output_tokens: model.max_output_tokens || 0,
                                total_context_window: model.total_context_window || 0,
                                input_token_price: typeof model.input_token_price === 'string' ? parseFloat(model.input_token_price) : model.input_token_price,
                                output_token_price: typeof model.output_token_price === 'string' ? parseFloat(model.output_token_price) : model.output_token_price,
                                price_markup_multiplier: typeof model.price_markup_multiplier === 'string' ? parseFloat(model.price_markup_multiplier) : model.price_markup_multiplier,
                                supports_vision: model.supports_vision,
                                supports_function_calling: model.supports_function_calling,
                                supports_batching: model.supports_batching,
                                questions_per_batch: model.questions_per_batch,
                                batch_input_token_price: model.batch_input_token_price ? (typeof model.batch_input_token_price === 'string' ? parseFloat(model.batch_input_token_price) : model.batch_input_token_price) : 0,
                                batch_output_token_price: model.batch_output_token_price ? (typeof model.batch_output_token_price === 'string' ? parseFloat(model.batch_output_token_price) : model.batch_output_token_price) : 0,
                                is_active: model.is_active,
                                is_default: model.is_default,
                              });
                              setShowModelDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteModel(model.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="providers" className="space-y-4">
          <h2 className="text-xl font-semibold">Available Providers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers.map((provider) => (
              <Card key={provider.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    {provider.display_name}
                  </CardTitle>
                  <CardDescription>{provider.api_base_url}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Provider ID: {provider.name}
                    </span>
                    {provider.is_active ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">
                      Models: {models.filter(m => m.provider_id === provider.id).length}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="keys" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">API Keys</h2>
            <Button onClick={() => {
              setKeyForm({ provider_id: providers[0]?.id || "", api_key: "" });
              setShowKeyDialog(true);
            }}>
              <Key className="h-4 w-4 mr-2" />
              Add API Key
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Key Hint</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell>{key.provider_display_name}</TableCell>
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded text-sm">
                          ****{key.key_hint}
                        </code>
                      </TableCell>
                      <TableCell>
                        {new Date(key.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {key.last_used_at
                          ? new Date(key.last_used_at).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        {key.is_active ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteApiKey(key.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Model Dialog */}
      <Dialog open={showModelDialog} onOpenChange={setShowModelDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingModel ? "Edit Model" : "Add New Model"}
            </DialogTitle>
            <DialogDescription>
              Configure the model settings and pricing
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Provider</Label>
                <Select
                  value={modelForm.provider_id}
                  onValueChange={(value) =>
                    setModelForm({ ...modelForm, provider_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Model Identifier</Label>
                <Input
                  value={modelForm.model_identifier}
                  onChange={(e) =>
                    setModelForm({ ...modelForm, model_identifier: e.target.value })
                  }
                  placeholder="e.g., gpt-4o-mini"
                />
              </div>

              <div className="space-y-1">
                <Label>Display Name</Label>
                <Input
                  value={modelForm.display_name}
                  onChange={(e) =>
                    setModelForm({ ...modelForm, display_name: e.target.value })
                  }
                  placeholder="e.g., GPT-4o Mini"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Max Input Tokens</Label>
                <Input
                  type="number"
                  value={modelForm.max_input_tokens}
                  onChange={(e) =>
                    setModelForm({
                      ...modelForm,
                      max_input_tokens: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>Max Output Tokens</Label>
                <Input
                  type="number"
                  value={modelForm.max_output_tokens}
                  onChange={(e) =>
                    setModelForm({
                      ...modelForm,
                      max_output_tokens: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>Context Window</Label>
                <Input
                  type="number"
                  value={modelForm.total_context_window}
                  onChange={(e) =>
                    setModelForm({
                      ...modelForm,
                      total_context_window: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Input Price ($/MTok)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={modelForm.input_token_price}
                  onChange={(e) =>
                    setModelForm({
                      ...modelForm,
                      input_token_price: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Output Price ($/MTok)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={modelForm.output_token_price}
                  onChange={(e) =>
                    setModelForm({
                      ...modelForm,
                      output_token_price: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Markup Multiplier</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={modelForm.price_markup_multiplier}
                  onChange={(e) =>
                    setModelForm({
                      ...modelForm,
                      price_markup_multiplier: parseFloat(e.target.value) || 1,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={modelForm.supports_vision}
                  onCheckedChange={(checked) =>
                    setModelForm({ ...modelForm, supports_vision: !!checked })
                  }
                />
                <Label>Supports Vision</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={modelForm.supports_function_calling}
                  onCheckedChange={(checked) =>
                    setModelForm({
                      ...modelForm,
                      supports_function_calling: !!checked,
                    })
                  }
                />
                <Label>Supports Function Calling</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={modelForm.supports_batching}
                  onCheckedChange={(checked) =>
                    setModelForm({ ...modelForm, supports_batching: !!checked })
                  }
                />
                <Label>Supports Batching</Label>
              </div>
            </div>

            {modelForm.supports_batching && (
              <div className="space-y-2">
                <Label>Questions Per Batch</Label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={modelForm.questions_per_batch}
                  onChange={(e) =>
                    setModelForm({
                      ...modelForm,
                      questions_per_batch: parseInt(e.target.value) || 10,
                    })
                  }
                  placeholder="10"
                />
                <p className="text-sm text-muted-foreground">
                  Optimal number of questions to process per batch for this model (1-50)
                </p>
              </div>
            )}

            {modelForm.supports_batching && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Batch Input Price ($/MTok)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={modelForm.batch_input_token_price}
                    onChange={(e) =>
                      setModelForm({
                        ...modelForm,
                        batch_input_token_price: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Batch Output Price ($/MTok)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={modelForm.batch_output_token_price}
                    onChange={(e) =>
                      setModelForm({
                        ...modelForm,
                        batch_output_token_price: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={modelForm.is_active}
                  onCheckedChange={(checked) =>
                    setModelForm({ ...modelForm, is_active: checked })
                  }
                />
                <Label>Active</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={modelForm.is_default}
                  onCheckedChange={(checked) =>
                    setModelForm({ ...modelForm, is_default: checked })
                  }
                />
                <Label>Set as Default</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModelDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveModel}>
              {editingModel ? "Update" : "Create"} Model
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Key Dialog */}
      <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add API Key</DialogTitle>
            <DialogDescription>
              Enter the API key for the selected provider. The key will be encrypted and stored securely.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={keyForm.provider_id}
                onValueChange={(value) =>
                  setKeyForm({ ...keyForm, provider_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={keyForm.api_key}
                  onChange={(e) =>
                    setKeyForm({ ...keyForm, api_key: e.target.value })
                  }
                  placeholder="sk-..."
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyApiKey}
                >
                  {copiedKey ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKeyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveApiKey}>Save API Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}