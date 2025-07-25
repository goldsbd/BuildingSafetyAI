import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Activity,
  Calendar,
  Download,
  Filter
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { llmApi, DailyUsageTrend, HourlyUsageTrend, DetailedUsageLog, DetailedLogsResponse, PeriodUsageTrend } from "@/lib/api/llm";

interface UsageStatistics {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  total_tokens: number;
  total_cost: number;
  average_response_time_ms?: number;
}

interface ModelUsageBreakdown {
  model_id: string;
  model_name: string;
  provider_name: string;
  total_requests: number;
  total_tokens: number;
  total_cost: number;
  percentage_of_total: number;
}

interface HourlyUsageTrendLocal extends HourlyUsageTrend {
  hour_label: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function TokenUsage() {
  const [statistics, setStatistics] = useState<UsageStatistics | null>(null);
  const [modelBreakdown, setModelBreakdown] = useState<ModelUsageBreakdown[]>([]);
  const [dailyTrends, setDailyTrends] = useState<DailyUsageTrend[]>([]);
  const [hourlyTrends, setHourlyTrends] = useState<HourlyUsageTrendLocal[]>([]);
  const [detailedLogs, setDetailedLogs] = useState<DetailedLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  // Period overview state
  const [periodView, setPeriodView] = useState<'monthly' | 'quarterly' | 'yearly' | 'weekly'>('monthly');
  const [periodData, setPeriodData] = useState<DailyUsageTrend[]>([]);
  const [timeRange, setTimeRange] = useState("30");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [viewMode, setViewMode] = useState<'daily' | 'hourly' | 'range'>('daily');
  // Logs filtering state
  const [logsPage, setLogsPage] = useState(1);
  const [logsSearch, setLogsSearch] = useState("");
  const [logsStatus, setLogsStatus] = useState("all");
  const [logsStartDate, setLogsStartDate] = useState("");
  const [logsEndDate, setLogsEndDate] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchUsageData();
  }, [timeRange, viewMode]);

  useEffect(() => {
    if (viewMode === 'hourly') {
      fetchHourlyTrends();
    }
  }, [selectedDate]);

  useEffect(() => {
    if (viewMode === 'range' && startDate && endDate) {
      fetchRangeTrends();
    }
  }, [startDate, endDate]);

  // Fetch detailed logs when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDetailedLogs(1);
    }, 300); // Debounce search
    return () => clearTimeout(timer);
  }, [logsSearch, logsStatus, logsStartDate, logsEndDate]);

  // Initial fetch of detailed logs
  useEffect(() => {
    fetchDetailedLogs(1);
  }, []);

  // Fetch period data when period view changes
  useEffect(() => {
    fetchPeriodData();
  }, [periodView]);

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      const [statsRes, breakdownRes] = await Promise.all([
        llmApi.getUsageStatistics(),
        llmApi.getModelUsageBreakdown(),
      ]);
      setStatistics(statsRes);
      setModelBreakdown(breakdownRes);
      
      // Fetch trends based on view mode
      if (viewMode === 'hourly') {
        await fetchHourlyTrends();
      } else if (viewMode === 'range' && startDate && endDate) {
        await fetchRangeTrends();
      } else {
        await fetchDailyTrends();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch usage data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyTrends = async () => {
    try {
      const trendsRes = await llmApi.getDailyUsageTrends();
      setDailyTrends(trendsRes);
    } catch (error) {
      console.error('Failed to fetch daily trends:', error);
    }
  };

  const fetchHourlyTrends = async () => {
    try {
      const hourlyRes = await llmApi.getHourlyUsageTrends(selectedDate);
      // Add hour labels for better display
      const hourlyWithLabels = hourlyRes.map(trend => ({
        ...trend,
        hour_label: `${trend.hour.toString().padStart(2, '0')}:00`
      }));
      setHourlyTrends(hourlyWithLabels);
    } catch (error) {
      console.error('Failed to fetch hourly trends:', error);
    }
  };

  const fetchRangeTrends = async () => {
    try {
      const rangeRes = await llmApi.getUsageTrendsWithRange(startDate, endDate);
      setDailyTrends(rangeRes);
    } catch (error) {
      console.error('Failed to fetch range trends:', error);
    }
  };

  const fetchDetailedLogs = async (page = 1) => {
    try {
      setLogsLoading(true);
      const logsRes = await llmApi.getDetailedUsageLogs({
        page,
        page_size: 20,
        search: logsSearch || undefined,
        status: (logsStatus && logsStatus !== "all") ? logsStatus : undefined,
        start_date: logsStartDate || undefined,
        end_date: logsEndDate || undefined,
      });
      setDetailedLogs(logsRes);
      setLogsPage(page);
    } catch (error) {
      console.error('Failed to fetch detailed logs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch detailed logs",
        variant: "destructive",
      });
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchPeriodData = async () => {
    try {
      const periodRes = await llmApi.getPeriodUsageTrends(periodView);
      setPeriodData(periodRes);
    } catch (error) {
      console.error('Failed to fetch period data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch period data",
        variant: "destructive",
      });
    }
  };

  const exportUsageData = () => {
    // Create CSV content
    const csvContent = [
      ["Date", "Requests", "Tokens", "Cost"],
      ...dailyTrends.map(trend => [
        trend.date,
        trend.total_requests,
        trend.total_tokens,
        trend.total_cost.toFixed(2)
      ])
    ].map(row => row.join(",")).join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `llm-usage-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const formatCompactNumber = (value: number) => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(value % 1000 === 0 ? 0 : 1) + 'K';
    }
    return value.toString();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  return (
    <div className="w-[95%] mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Token Usage Analytics</h1>
          <p className="text-muted-foreground">
            Monitor AI model usage, costs, and performance metrics
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={viewMode} onValueChange={(value: 'daily' | 'hourly' | 'range') => setViewMode(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily View</SelectItem>
              <SelectItem value="hourly">Hourly View</SelectItem>
              <SelectItem value="range">Date Range</SelectItem>
            </SelectContent>
          </Select>
          
          {viewMode === 'daily' && (
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          )}
          
          {viewMode === 'hourly' && (
            <div className="flex items-center gap-2">
              <Label htmlFor="date-picker" className="text-sm">Date:</Label>
              <Input
                id="date-picker"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-[150px]"
              />
            </div>
          )}
          
          {viewMode === 'range' && (
            <div className="flex items-center gap-2">
              <Label className="text-sm">From:</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[150px]"
              />
              <Label className="text-sm">To:</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[150px]"
              />
            </div>
          )}
          
          <Button variant="outline" onClick={exportUsageData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Compact Summary Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Requests</p>
                  <p className="text-lg font-bold">{formatNumber(statistics.total_requests)}</p>
                  <p className="text-xs text-muted-foreground">
                    {statistics.successful_requests} successful
                    {statistics.failed_requests > 0 && (
                      <span className="text-destructive ml-1">• {statistics.failed_requests} failed</span>
                    )}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-muted-foreground/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Tokens</p>
                  <p className="text-lg font-bold">{formatNumber(statistics.total_tokens)}</p>
                  <p className="text-xs text-muted-foreground">Across all models</p>
                </div>
                <BarChart3 className="h-8 w-8 text-muted-foreground/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Cost</p>
                  <p className="text-lg font-bold">{formatCurrency(parseFloat(statistics.total_cost))}</p>
                  <p className="text-xs text-muted-foreground">Billed to customers</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Avg Response Time</p>
                  <p className="text-lg font-bold">
                    {statistics.average_response_time_ms 
                      ? `${Math.round(statistics.average_response_time_ms)}ms`
                      : 'N/A'}
                  </p>
                  <p className="text-xs text-muted-foreground">Per request</p>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground/60" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends">Usage Trends</TabsTrigger>
          <TabsTrigger value="periods">Period Overview</TabsTrigger>
          <TabsTrigger value="breakdown">Model Breakdown</TabsTrigger>
          <TabsTrigger value="details">Detailed Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          {viewMode === 'hourly' ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Hourly Usage Trends - {selectedDate}</CardTitle>
                  <CardDescription>
                    Hour-by-hour breakdown of requests, tokens, and costs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlyTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour_label" />
                        <YAxis yAxisId="left" tickFormatter={formatCompactNumber} width={60} />
                        <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `$${(value < 1 ? value.toFixed(2) : formatCompactNumber(value))}`} width={60} />
                        <Tooltip 
                          formatter={(value: any, name: string) => {
                            if (name === 'Cost') return formatCurrency(value);
                            return formatNumber(value);
                          }}
                        />
                        <Legend />
                        <Bar
                          yAxisId="left"
                          dataKey="total_requests"
                          fill="#3b82f6"
                          name="Requests"
                        />
                        <Bar
                          yAxisId="left"
                          dataKey="total_tokens"
                          fill="#10b981"
                          name="Tokens"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Cost Breakdown by Hour - {selectedDate}</CardTitle>
                  <CardDescription>
                    Hourly spending on AI model usage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlyTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour_label" />
                        <YAxis tickFormatter={(value) => `$${(value < 1 ? value.toFixed(2) : formatCompactNumber(value))}`} width={60} />
                        <Tooltip 
                          formatter={(value: any) => formatCurrency(value)}
                        />
                        <Bar dataKey="total_cost" fill="#f59e0b" name="Hourly Cost" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {viewMode === 'range' ? `Usage Trends (${startDate} - ${endDate})` : 'Daily Usage Trends'}
                  </CardTitle>
                  <CardDescription>
                    Requests, tokens, and costs over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => new Date(value).toLocaleDateString()}
                        />
                        <YAxis yAxisId="left" tickFormatter={formatCompactNumber} width={60} />
                        <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `$${(value < 1 ? value.toFixed(2) : formatCompactNumber(value))}`} width={60} />
                        <Tooltip 
                          labelFormatter={(value) => new Date(value).toLocaleDateString()}
                          formatter={(value: any, name: string) => {
                            if (name === 'Cost') return formatCurrency(value);
                            return formatNumber(value);
                          }}
                        />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="total_requests"
                          stroke="#3b82f6"
                          name="Requests"
                          strokeWidth={2}
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="total_tokens"
                          stroke="#10b981"
                          name="Tokens"
                          strokeWidth={2}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="total_cost"
                          stroke="#f59e0b"
                          name="Cost"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cost Breakdown by Day</CardTitle>
                  <CardDescription>
                    Daily spending on AI model usage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => new Date(value).toLocaleDateString()}
                        />
                        <YAxis tickFormatter={(value) => `$${(value < 1 ? value.toFixed(2) : formatCompactNumber(value))}`} width={60} />
                        <Tooltip 
                          labelFormatter={(value) => new Date(value).toLocaleDateString()}
                          formatter={(value: any) => formatCurrency(value)}
                        />
                        <Bar dataKey="total_cost" fill="#3b82f6" name="Daily Cost" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="periods" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Period Overview</h2>
              <p className="text-muted-foreground">
                Extended time period analysis for trend identification
              </p>
            </div>
            <Select value={periodView} onValueChange={(value: 'monthly' | 'quarterly' | 'yearly' | 'weekly') => setPeriodView(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly (30 days)</SelectItem>
                <SelectItem value="quarterly">Quarterly (13 weeks)</SelectItem>
                <SelectItem value="yearly">Yearly (12 months)</SelectItem>
                <SelectItem value="weekly">Weekly (52 weeks)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  {periodView === 'monthly' && 'Daily Usage - Last 30 Days'}
                  {periodView === 'quarterly' && 'Weekly Usage - Last 13 Weeks'}
                  {periodView === 'yearly' && 'Monthly Usage - Last 12 Months'}
                  {periodView === 'weekly' && 'Weekly Usage - Last 52 Weeks'}
                </CardTitle>
                <CardDescription>
                  Requests and tokens over extended periods
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={periodData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="period_label" 
                        tick={{ fontSize: 12 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis yAxisId="left" tickFormatter={formatCompactNumber} width={60} />
                      <Tooltip 
                        labelFormatter={(value) => value}
                        formatter={(value: any, name: string) => {
                          if (name === 'Cost') return formatCurrency(value);
                          return formatNumber(value);
                        }}
                      />
                      <Legend />
                      <Bar
                        yAxisId="left"
                        dataKey="total_requests"
                        fill="#3b82f6"
                        name="Requests"
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="total_tokens"
                        fill="#10b981"
                        name="Tokens"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {periodView === 'monthly' && 'Cost Trends - Last 30 Days'}
                  {periodView === 'quarterly' && 'Cost Trends - Last 13 Weeks'}
                  {periodView === 'yearly' && 'Cost Trends - Last 12 Months'}
                  {periodView === 'weekly' && 'Cost Trends - Last 52 Weeks'}
                </CardTitle>
                <CardDescription>
                  Spending patterns over extended periods
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={periodData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="period_label"
                        tick={{ fontSize: 12 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis tickFormatter={(value) => `$${(value < 1 ? value.toFixed(2) : formatCompactNumber(value))}`} width={60} />
                      <Tooltip 
                        labelFormatter={(value) => value}
                        formatter={(value: any) => formatCurrency(value)}
                      />
                      <Bar dataKey="total_cost" fill="#f59e0b" name="Cost" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Stats for the period */}
          <Card>
            <CardHeader>
              <CardTitle>Period Summary</CardTitle>
              <CardDescription>
                Aggregated statistics for the selected time period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatNumber(periodData.reduce((sum, item) => sum + item.total_requests, 0))}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Requests</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCompactNumber(periodData.reduce((sum, item) => sum + item.total_tokens, 0))}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Tokens</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {formatCurrency(periodData.reduce((sum, item) => sum + item.total_cost, 0))}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Cost</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {periodData.length > 0 ? formatCurrency(periodData.reduce((sum, item) => sum + item.total_cost, 0) / periodData.length) : '$0.00'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Average {periodView === 'monthly' ? 'Daily' : periodView === 'quarterly' || periodView === 'weekly' ? 'Weekly' : 'Monthly'} Cost
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Usage by Model</CardTitle>
                <CardDescription>
                  Distribution of requests across different models
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={modelBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ percentage_of_total }) => percentage_of_total ? `${percentage_of_total.toFixed(0)}%` : ''}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="percentage_of_total"
                      >
                        {modelBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => `${value.toFixed(1)}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {modelBreakdown.map((model, index) => (
                    <div key={model.model_id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm">{model.model_name}</span>
                      </div>
                      <span className="text-sm font-medium">
                        {model.percentage_of_total.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Cost by Model</CardTitle>
                <CardDescription>
                  Total spending per model
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={modelBreakdown} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(value) => `$${(value < 1 ? value.toFixed(2) : formatCompactNumber(value))}`} />
                      <YAxis dataKey="model_name" type="category" width={180} />
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                      <Bar dataKey="total_cost" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Model Performance Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead className="text-right">Requests</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">% of Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modelBreakdown.map((model) => (
                    <TableRow key={model.model_id}>
                      <TableCell className="font-medium">{model.model_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{model.provider_name}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(model.total_requests)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(model.total_tokens)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(model.total_cost)}
                      </TableCell>
                      <TableCell className="text-right">
                        {model.percentage_of_total.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Recent Usage Logs</CardTitle>
                  <CardDescription>
                    Detailed logs of recent AI model usage
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <Input
                    placeholder="Search logs..."
                    value={logsSearch}
                    onChange={(e) => setLogsSearch(e.target.value)}
                    className="w-full sm:w-48"
                  />
                  <Select value={logsStatus} onValueChange={setLogsStatus}>
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="timeout">Timeout</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between pt-2">
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <Label className="text-sm whitespace-nowrap">Date Range:</Label>
                  <Input
                    type="date"
                    value={logsStartDate}
                    onChange={(e) => setLogsStartDate(e.target.value)}
                    className="w-full sm:w-36"
                    placeholder="Start date"
                  />
                  <span className="text-sm text-muted-foreground">to</span>
                  <Input
                    type="date"
                    value={logsEndDate}
                    onChange={(e) => setLogsEndDate(e.target.value)}
                    className="w-full sm:w-36"
                    placeholder="End date"
                  />
                  {(logsSearch || (logsStatus && logsStatus !== "all") || logsStartDate || logsEndDate) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setLogsSearch("");
                        setLogsStatus("all");
                        setLogsStartDate("");
                        setLogsEndDate("");
                      }}
                    >
                      <Filter className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
                
                {/* Pagination controls moved here */}
                {detailedLogs && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchDetailedLogs(logsPage - 1)}
                      disabled={!detailedLogs.pagination.has_prev || logsLoading}
                    >
                      Previous
                    </Button>
                    <div className="text-sm">
                      Page {detailedLogs.pagination.page} of {detailedLogs.pagination.total_pages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchDetailedLogs(logsPage + 1)}
                      disabled={!detailedLogs.pagination.has_next || logsLoading}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {logsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Loading logs...</div>
                </div>
              ) : detailedLogs && detailedLogs.logs.length > 0 ? (
                <>
                  <div className="max-h-[500px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-32">Date/Time</TableHead>
                          <TableHead>Model</TableHead>
                          <TableHead className="text-right">Tokens</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                          <TableHead className="text-right">Response Time</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Request Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailedLogs.logs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono text-xs">
                              {new Date(log.created_at).toLocaleDateString()}<br/>
                              <span className="text-muted-foreground">
                                {new Date(log.created_at).toLocaleTimeString()}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="max-w-32 truncate" title={log.model_identifier}>
                                {log.model_identifier}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="text-sm">
                                <div>{formatCompactNumber(log.total_tokens)}</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatCompactNumber(log.input_tokens)}→{formatCompactNumber(log.output_tokens)}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="text-sm">
                                <div>{formatCurrency(parseFloat(log.billed_cost))}</div>
                                <div className="text-xs text-muted-foreground">
                                  Raw: {formatCurrency(parseFloat(log.raw_cost))}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {log.response_time_ms ? `${log.response_time_ms}ms` : 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={log.status === 'success' ? 'default' : 'destructive'}
                                className="text-xs"
                              >
                                {log.status}
                              </Badge>
                              {log.error_message && (
                                <div className="text-xs text-destructive mt-1 max-w-32 truncate" title={log.error_message}>
                                  {log.error_message}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm max-w-24 truncate" title={log.request_type || 'N/A'}>
                                {log.request_type || 'N/A'}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Row count info */}
                  <div className="px-6 py-2 border-t bg-muted/30">
                    <div className="text-sm text-muted-foreground">
                      Showing {((detailedLogs.pagination.page - 1) * detailedLogs.pagination.page_size) + 1} to{' '}
                      {Math.min(detailedLogs.pagination.page * detailedLogs.pagination.page_size, detailedLogs.pagination.total_count)} of{' '}
                      {detailedLogs.pagination.total_count} logs
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No usage logs found</p>
                  <p className="text-sm mt-2">
                    {logsSearch || logsStatus || logsStartDate || logsEndDate
                      ? 'Try adjusting your filters'
                      : 'Logs will appear here as you use AI models'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}