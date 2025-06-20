'use client';

import { useState } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { MetricsGrid } from './MetricsGrid';
import { ChartsGrid } from './ChartsGrid';
import { AlertsPanel } from './AlertsPanel';
import { RealtimeMetrics } from './RealtimeMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  BarChart3,
  TrendingUp,
  AlertCircle,
  Activity,
  RefreshCw,
  Download,
  Calendar,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { TimeRange } from '@/services/analytics/types';
import { ANALYTICS_CONFIG } from '@/services/analytics/config';

export function AnalyticsDashboard() {
  const t = useTranslations('Analytics');
  const [selectedDashboard, setSelectedDashboard] = useState('operations');
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const {
    keyMetrics,
    accessAnalytics,
    securityAnalytics,
    residentAnalytics,
    maintenanceAnalytics,
    financialAnalytics,
    alerts,
    realTimeUpdates,
    isLoading,
    isConnected,
    error,
    refreshAllData,
    getDashboard,
    createAlert,
    isCreatingAlert
  } = useAnalytics({
    timeRange,
    autoRefresh,
    onMetricUpdate: (updates) => {
      console.log('Metric updates:', updates);
    },
    onAlertTriggered: (alert) => {
      console.log('Alert triggered:', alert);
    }
  });

  const dashboard = getDashboard(selectedDashboard);

  const handleExportDashboard = () => {
    // Export dashboard data
    const data = {
      dashboard: selectedDashboard,
      timeRange,
      timestamp: new Date().toISOString(),
      metrics: keyMetrics,
      analytics: {
        access: accessAnalytics,
        security: securityAnalytics,
        resident: residentAnalytics,
        maintenance: maintenanceAnalytics,
        financial: financialAnalytics
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-${selectedDashboard}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('error.title')}</AlertTitle>
        <AlertDescription>{t('error.loadingData')}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Connection Status */}
          <Badge variant={isConnected ? 'success' : 'destructive'}>
            {isConnected ? (
              <>
                <Wifi className="mr-1 h-3 w-3" />
                {t('connected')}
              </>
            ) : (
              <>
                <WifiOff className="mr-1 h-3 w-3" />
                {t('disconnected')}
              </>
            )}
          </Badge>

          {/* Auto Refresh Toggle */}
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="mr-2 h-4 w-4" />
            {autoRefresh ? t('autoRefreshOn') : t('autoRefreshOff')}
          </Button>

          {/* Time Range Selector */}
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">{t('timeRange.today')}</SelectItem>
              <SelectItem value="yesterday">{t('timeRange.yesterday')}</SelectItem>
              <SelectItem value="week">{t('timeRange.week')}</SelectItem>
              <SelectItem value="month">{t('timeRange.month')}</SelectItem>
              <SelectItem value="quarter">{t('timeRange.quarter')}</SelectItem>
              <SelectItem value="year">{t('timeRange.year')}</SelectItem>
            </SelectContent>
          </Select>

          {/* Refresh Button */}
          <Button variant="outline" size="icon" onClick={refreshAllData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          {/* Export Button */}
          <Button variant="outline" size="icon" onClick={handleExportDashboard}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Real-time Updates */}
      {Object.keys(realTimeUpdates).length > 0 && (
        <RealtimeMetrics updates={realTimeUpdates} />
      )}

      {/* Dashboard Tabs */}
      <Tabs value={selectedDashboard} onValueChange={setSelectedDashboard}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="operations" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {t('dashboards.operations')}
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t('dashboards.financial')}
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            {t('dashboards.maintenance')}
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {t('dashboards.alerts')}
            {alerts && alerts.filter(a => a.enabled).length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {alerts.filter(a => a.enabled).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-6">
          {isLoading ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <Skeleton className="h-4 w-24" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-16" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Skeleton className="h-[400px] w-full" />
            </div>
          ) : (
            <>
              <MetricsGrid
                metrics={keyMetrics?.find(g => g.id === 'operations')}
                analytics={{
                  access: accessAnalytics,
                  security: securityAnalytics
                }}
              />
              <ChartsGrid
                type="operations"
                data={{
                  access: accessAnalytics,
                  security: securityAnalytics
                }}
                timeRange={timeRange}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          {isLoading ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <Skeleton className="h-4 w-24" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-16" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Skeleton className="h-[400px] w-full" />
            </div>
          ) : (
            <>
              <MetricsGrid
                metrics={keyMetrics?.find(g => g.id === 'financial')}
                analytics={{
                  financial: financialAnalytics
                }}
              />
              <ChartsGrid
                type="financial"
                data={{
                  financial: financialAnalytics
                }}
                timeRange={timeRange}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          {isLoading ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <Skeleton className="h-4 w-24" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-16" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Skeleton className="h-[400px] w-full" />
            </div>
          ) : (
            <>
              <MetricsGrid
                metrics={keyMetrics?.find(g => g.id === 'residents')}
                analytics={{
                  resident: residentAnalytics,
                  maintenance: maintenanceAnalytics
                }}
              />
              <ChartsGrid
                type="maintenance"
                data={{
                  maintenance: maintenanceAnalytics
                }}
                timeRange={timeRange}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="alerts">
          <AlertsPanel
            alerts={alerts || []}
            onCreateAlert={createAlert}
            isCreating={isCreatingAlert}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}