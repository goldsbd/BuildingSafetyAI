import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  MessageCircle, 
  Send, 
  Plus, 
  Trash2, 
  Edit3, 
  Bot, 
  User, 
  FileText,
  AlertTriangle,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { chatbotApi, ChatSession, ChatMessage, ChunkSource } from '@/lib/api/chatbot';
import { vectorApi } from '@/lib/api/vector';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';

interface ProjectChatbotProps {
  projectId: string;
}

export function ProjectChatbot({ projectId }: ProjectChatbotProps) {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isVectorReady, setIsVectorReady] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkVectorStatus();
    loadSessions();
  }, [projectId]);

  useEffect(() => {
    if (activeSession) {
      loadChatHistory(activeSession);
    }
  }, [activeSession]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkVectorStatus = async () => {
    try {
      const stats = await vectorApi.getVectorStats(projectId);
      setIsVectorReady(!!stats);
    } catch (error: any) {
      console.error('Error checking vector status:', error);
      setIsVectorReady(false);
    }
  };

  const loadSessions = async () => {
    setLoading(true);
    try {
      const response = await chatbotApi.getProjectSessions(projectId);
      setSessions(response.sessions);
      
      // Auto-select first session if available
      if (response.sessions.length > 0 && !activeSession) {
        setActiveSession(response.sessions[0].id);
      }
    } catch (error) {
      toast({
        title: "Failed to load chat sessions",
        description: "Unable to retrieve chat sessions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadChatHistory = async (sessionId: string) => {
    try {
      const response = await chatbotApi.getChatHistory(sessionId);
      setMessages(response.messages);
    } catch (error) {
      toast({
        title: "Failed to load chat history",
        description: "Unable to retrieve chat messages.",
        variant: "destructive",
      });
    }
  };

  const createNewSession = async () => {
    try {
      const response = await chatbotApi.createChatSession(projectId, {
        session_name: `Chat ${new Date().toLocaleString()}`
      });
      
      setSessions(prev => [response.session, ...prev]);
      setActiveSession(response.session.id);
      setMessages([]);
      
      toast({
        title: "New chat session created",
        description: "You can now start asking questions about your documents.",
      });
    } catch (error) {
      toast({
        title: "Failed to create session",
        description: "Unable to create a new chat session.",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !activeSession || sendingMessage) return;

    const userMessage = message.trim();
    setMessage('');
    setSendingMessage(true);

    // Add user message immediately
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: activeSession,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      const response = await chatbotApi.sendMessage(activeSession, { content: userMessage });
      
      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        session_id: activeSession,
        role: 'assistant',
        content: response.response.content,
        search_results: response.response.sources,
        token_usage: response.response.token_usage,
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev.slice(0, -1), tempUserMessage, assistantMessage]);
      
      // Update session timestamp
      setSessions(prev => prev.map(s => 
        s.id === activeSession 
          ? { ...s, last_message_at: new Date().toISOString() }
          : s
      ));
    } catch (error) {
      // Remove the temporary user message on error
      setMessages(prev => prev.slice(0, -1));
      
      toast({
        title: "Failed to send message",
        description: "Unable to send your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await chatbotApi.deleteChatSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      if (activeSession === sessionId) {
        const remainingSessions = sessions.filter(s => s.id !== sessionId);
        setActiveSession(remainingSessions.length > 0 ? remainingSessions[0].id : null);
        setMessages([]);
      }
      
      toast({
        title: "Session deleted",
        description: "Chat session has been removed.",
      });
    } catch (error) {
      toast({
        title: "Failed to delete session",
        description: "Unable to delete the chat session.",
        variant: "destructive",
      });
    }
  };

  const MessageBubble = ({ message }: { message: ChatMessage }) => {
    const isUser = message.role === 'user';
    
    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
          <div className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isUser ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            
            <div className={`rounded-lg p-3 ${
              isUser 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-900 border'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              
              {!isUser && message.search_results && message.search_results.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-600 mb-2">Sources:</p>
                  <div className="space-y-1">
                    {message.search_results.map((source, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <FileText className="w-3 h-3 text-gray-400" />
                        <span className="truncate">{source.document_name}</span>
                        {source.page_numbers.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            Page {source.page_numbers.join(', ')}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <p className="text-xs opacity-75 mt-2">
                {formatDate(message.created_at)}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex">
      {/* Session List Sidebar */}
      <div className="w-80 border-r bg-gray-50 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Chat Sessions</h3>
            <Button 
              size="sm" 
              onClick={createNewSession}
              disabled={!isVectorReady}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No chat sessions yet</p>
                <p className="text-xs">Create one to get started</p>
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors ${
                    activeSession === session.id
                      ? 'bg-blue-100 border border-blue-200'
                      : 'bg-white hover:bg-gray-100 border'
                  }`}
                  onClick={() => setActiveSession(session.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {session.session_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(session.last_message_at)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {!isVectorReady ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <Alert className="max-w-md">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Vector database is not ready. Please initialize and index documents in the Vector DB tab first.
              </AlertDescription>
            </Alert>
          </div>
        ) : !activeSession ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
              <p className="text-gray-600 mb-4">
                Create a new chat session to ask questions about your documents
              </p>
              <Button onClick={createNewSession}>
                <Plus className="w-4 h-4 mr-2" />
                New Chat Session
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="max-w-4xl mx-auto">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No messages yet</p>
                    <p className="text-xs">Ask a question about your documents</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))
                )}
                
                {sendingMessage && (
                  <div className="flex justify-start mb-4">
                    <div className="max-w-[80%]">
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 text-gray-600">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div className="rounded-lg p-3 bg-gray-100 border">
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm text-gray-600">Thinking...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="border-t p-4">
              <div className="max-w-4xl mx-auto">
                <div className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ask a question about your documents..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    disabled={sendingMessage}
                  />
                  <Button 
                    onClick={sendMessage}
                    disabled={!message.trim() || sendingMessage}
                  >
                    {sendingMessage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}