'use client';

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Clock, 
  DollarSign, 
  Users, 
  AlertCircle, 
  CheckCircle, 
  TrendingUp,
  Brain,
  FileText,
  Zap,
} from 'lucide-react';

interface DashboardData {
  timeframe: string;
  generatedAt: string;
  overview: {
    totalModelRuns: number;
    avgLatency: number;
    successRate: number;
    totalCost: string;
    totalTokens: number;
  };
  qualityMetrics: Array<{
    name: string;
    averageValue: string;
    passRate: number;
    sampleCount: number;
  }>;
  speechCompletionStats: {
    totalSpeeches: number;
    avgTimeToFinal: number;
    avgEditBurden: number;
    avgQualityScore: string;
    completionRate: number;
  };
  userEngagement: {
    activeUsers: number;
    totalEvents: number;
    avgEventsPerUser: number;
  };
  errorAnalysis: Array<{
    stage: string;
    errorCount: number;
    errorRate: string;
  }>;
  costAnalysis: Array<{
    stage: string;
    model: string;
    totalCost: string;
    avgCost: string;
    runCount: number;
  }>;
  recentFailures: Array<{
    id: string;
    stage: string;
    model: string;
    error: string;
    timestamp: string;
    latency: number;
  }>;
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState('7d');

  const fetchDashboard = async (tf: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/.netlify/functions/admin-dashboard?timeframe=${tf}`,
        {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchDashboard(timeframe);
    }
  }, [session, timeframe]);

  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe);
    fetchDashboard(newTimeframe);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error Loading Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
            <Button 
              onClick={() => fetchDashboard(timeframe)} 
              className="mt-4"
              variant="outline"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const getStatusColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quality Dashboard</h1>
          <p className="text-gray-600">
            System performance and quality metrics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {['24h', '7d', '30d'].map((tf) => (
              <Button
                key={tf}
                variant={timeframe === tf ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleTimeframeChange(tf)}
              >
                {tf}
              </Button>
            ))}
          </div>
          <p className="text-sm text-gray-500">
            Updated: {new Date(dashboardData.generatedAt).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Model Runs</CardTitle>
            <Brain className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.overview.totalModelRuns.toLocaleString()}</div>
            <p className="text-xs text-gray-600">Total AI model executions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className={`h-4 w-4 ${getStatusColor(dashboardData.overview.successRate)}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(dashboardData.overview.successRate)}`}>
              {dashboardData.overview.successRate}%
            </div>
            <Progress value={dashboardData.overview.successRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.overview.avgLatency}ms</div>
            <p className="text-xs text-gray-600">Average response time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${dashboardData.overview.totalCost}</div>
            <p className="text-xs text-gray-600">AI model costs</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="quality" className="space-y-4">
        <TabsList>
          <TabsTrigger value="quality">Quality Metrics</TabsTrigger>
          <TabsTrigger value="speeches">Speech Analytics</TabsTrigger>
          <TabsTrigger value="users">User Engagement</TabsTrigger>
          <TabsTrigger value="errors">Error Analysis</TabsTrigger>
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
        </TabsList>

        {/* Quality Metrics Tab */}
        <TabsContent value="quality">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Quality Metrics Overview</CardTitle>
                <CardDescription>Performance across different quality dimensions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.qualityMetrics.map((metric) => (
                    <div key={metric.name} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <h4 className="font-medium">{metric.name}</h4>
                        <p className="text-sm text-gray-600">
                          Average: {metric.averageValue} | Samples: {metric.sampleCount}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getStatusColor(metric.passRate)}`}>
                          {metric.passRate}%
                        </div>
                        <Progress value={metric.passRate} className="w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Speech Analytics Tab */}
        <TabsContent value="speeches">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Speech Completion Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold">{dashboardData.speechCompletionStats.totalSpeeches}</p>
                    <p className="text-sm text-gray-600">Total Speeches</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{dashboardData.speechCompletionStats.completionRate}%</p>
                    <p className="text-sm text-gray-600">Completion Rate</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold">{Math.round(dashboardData.speechCompletionStats.avgTimeToFinal / 60)}m</p>
                    <p className="text-sm text-gray-600">Avg Time to Final</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{dashboardData.speechCompletionStats.avgEditBurden}</p>
                    <p className="text-sm text-gray-600">Avg Edit Burden</p>
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold">{dashboardData.speechCompletionStats.avgQualityScore}</p>
                  <p className="text-sm text-gray-600">Average Quality Score</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Engagement Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Engagement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-2xl font-bold">{dashboardData.userEngagement.activeUsers}</p>
                  <p className="text-sm text-gray-600">Active Users</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{dashboardData.userEngagement.totalEvents.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Total Events</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{dashboardData.userEngagement.avgEventsPerUser}</p>
                  <p className="text-sm text-gray-600">Avg Events per User</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Error Analysis Tab */}
        <TabsContent value="errors">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  Error Analysis by Stage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData.errorAnalysis.map((error) => (
                    <div key={error.stage} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <h4 className="font-medium capitalize">{error.stage}</h4>
                        <p className="text-sm text-gray-600">{error.errorCount} errors</p>
                      </div>
                      <Badge variant={Number(error.errorRate) > 5 ? 'destructive' : 'secondary'}>
                        {error.errorRate}% error rate
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Failures */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Failures</CardTitle>
                <CardDescription>Latest errors for investigation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dashboardData.recentFailures.map((failure) => (
                    <div key={failure.id} className="p-3 border rounded text-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{failure.stage} - {failure.model}</p>
                          <p className="text-gray-600 mt-1">{failure.error}</p>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          <p>{new Date(failure.timestamp).toLocaleString()}</p>
                          <p>{failure.latency}ms</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cost Analysis Tab */}
        <TabsContent value="costs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Cost Analysis
              </CardTitle>
              <CardDescription>AI model costs by stage and model</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.costAnalysis.map((cost, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <h4 className="font-medium capitalize">{cost.stage} - {cost.model}</h4>
                      <p className="text-sm text-gray-600">{cost.runCount} runs</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${cost.totalCost}</p>
                      <p className="text-sm text-gray-600">${cost.avgCost} avg</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}