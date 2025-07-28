import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  CheckCircle, 
  Clock,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { assessmentsApi } from '@/lib/api/assessments';

interface DocumentCountersProps {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface DashboardCounters {
  total_docs: number;
  reviewed: number;
  not_reviewed: number;
  processing: number;
}

export function DocumentCounters({ 
  autoRefresh = true, 
  refreshInterval = 10000 // 10 seconds
}: DocumentCountersProps) {
  const [counters, setCounters] = useState<DashboardCounters>({
    total_docs: 0,
    reviewed: 0,
    not_reviewed: 0,
    processing: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadCounters = async () => {
    try {
      setError(null);
      const data = await assessmentsApi.getDashboardCounters();
      setCounters(data);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Failed to load dashboard counters:', err);
      setError(err.message || 'Failed to load dashboard counters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCounters();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(loadCounters, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const getProgressPercentage = () => {
    if (counters.total_docs === 0) return 0;
    return Math.round((counters.reviewed / counters.total_docs) * 100);
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return '';
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(lastUpdated);
  };

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Assessment Status
          </span>
          {loading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardTitle>
        {lastUpdated && (
          <p className="text-xs text-muted-foreground">
            Last updated: {formatLastUpdated()}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Overview */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span className="font-medium">{getProgressPercentage()}%</span>
          </div>
          <Progress value={getProgressPercentage()} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {counters.reviewed} of {counters.total_docs} documents reviewed
          </div>
        </div>

        {/* Counter Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">Total</span>
            </div>
            <div className="text-xl font-bold text-blue-700">
              {counters.total_docs.toLocaleString()}
            </div>
          </div>

          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-green-700">Reviewed</span>
            </div>
            <div className="text-xl font-bold text-green-700">
              {counters.reviewed.toLocaleString()}
            </div>
          </div>

          {counters.processing > 0 && (
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-xs font-medium text-yellow-700">Processing</span>
              </div>
              <div className="text-xl font-bold text-yellow-700">
                {counters.processing.toLocaleString()}
              </div>
            </div>
          )}

          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-gray-600" />
              <span className="text-xs font-medium text-gray-700">Pending</span>
            </div>
            <div className="text-xl font-bold text-gray-700">
              {counters.not_reviewed.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2 pt-2">
          {counters.processing > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3 animate-pulse" />
              {counters.processing} processing
            </Badge>
          )}
          {getProgressPercentage() === 100 && (
            <Badge className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              All documents reviewed
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}