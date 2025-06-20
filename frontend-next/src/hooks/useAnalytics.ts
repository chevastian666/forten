/**
 * Analytics Hook
 * React hook for accessing analytics data and real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  analyticsService,
  TimeRange,
  DateRange,
  MetricGroup,
  AccessAnalytics,
  SecurityAnalytics,
  ResidentAnalytics,
  MaintenanceAnalytics,
  FinancialAnalytics,
  ChartData,
  Dashboard,
  DashboardWidget,
  AnalyticsAlert,
  AlertCondition
} from '@/services/analytics';
import { ANALYTICS_CONFIG } from '@/services/analytics/config';
import { toast } from 'sonner';

interface UseAnalyticsOptions {
  timeRange?: TimeRange;
  dateRange?: DateRange;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onMetricUpdate?: (updates: any) => void;
  onAlertTriggered?: (alert: AnalyticsAlert) => void;
}

export function useAnalytics(options: UseAnalyticsOptions = {}) {
  const queryClient = useQueryClient();
  const [realTimeUpdates, setRealTimeUpdates] = useState<any>({});
  const [isConnected, setIsConnected] = useState(true);

  const {
    timeRange = 'month',
    dateRange,
    autoRefresh = true,
    refreshInterval = ANALYTICS_CONFIG.METRICS_UPDATE_INTERVAL,
    onMetricUpdate,
    onAlertTriggered
  } = options;

  // Get date range
  const effectiveDateRange = dateRange || analyticsService.getDateRange(timeRange);

  // Fetch key metrics
  const {
    data: keyMetrics,
    isLoading: isLoadingMetrics,
    error: metricsError,
    refetch: refetchMetrics
  } = useQuery({
    queryKey: ['analytics', 'keyMetrics', timeRange],
    queryFn: () => analyticsService.getKeyMetrics(),
    staleTime: refreshInterval,
    refetchInterval: autoRefresh ? refreshInterval : false
  });

  // Fetch access analytics
  const {
    data: accessAnalytics,
    isLoading: isLoadingAccess,
    refetch: refetchAccess
  } = useQuery({
    queryKey: ['analytics', 'access', effectiveDateRange],
    queryFn: () => analyticsService.getAccessAnalytics(effectiveDateRange),
    staleTime: refreshInterval,
    refetchInterval: autoRefresh ? refreshInterval : false
  });

  // Fetch security analytics
  const {
    data: securityAnalytics,
    isLoading: isLoadingSecurity,
    refetch: refetchSecurity
  } = useQuery({
    queryKey: ['analytics', 'security', effectiveDateRange],
    queryFn: () => analyticsService.getSecurityAnalytics(effectiveDateRange),
    staleTime: refreshInterval,
    refetchInterval: autoRefresh ? refreshInterval : false
  });

  // Fetch resident analytics
  const {
    data: residentAnalytics,
    isLoading: isLoadingResident,
    refetch: refetchResident
  } = useQuery({
    queryKey: ['analytics', 'resident', effectiveDateRange],
    queryFn: () => analyticsService.getResidentAnalytics(effectiveDateRange),
    staleTime: refreshInterval,
    refetchInterval: autoRefresh ? refreshInterval : false
  });

  // Fetch maintenance analytics
  const {
    data: maintenanceAnalytics,
    isLoading: isLoadingMaintenance,
    refetch: refetchMaintenance
  } = useQuery({
    queryKey: ['analytics', 'maintenance', effectiveDateRange],
    queryFn: () => analyticsService.getMaintenanceAnalytics(effectiveDateRange),
    staleTime: refreshInterval,
    refetchInterval: autoRefresh ? refreshInterval : false
  });

  // Fetch financial analytics
  const {
    data: financialAnalytics,
    isLoading: isLoadingFinancial,
    refetch: refetchFinancial
  } = useQuery({
    queryKey: ['analytics', 'financial', effectiveDateRange],
    queryFn: () => analyticsService.getFinancialAnalytics(effectiveDateRange),
    staleTime: refreshInterval,
    refetchInterval: autoRefresh ? refreshInterval : false
  });

  // Fetch alerts
  const {
    data: alerts,
    isLoading: isLoadingAlerts,
    refetch: refetchAlerts
  } = useQuery({
    queryKey: ['analytics', 'alerts'],
    queryFn: () => analyticsService.getAlerts(),
    staleTime: 60000 // 1 minute
  });

  // Create alert mutation
  const createAlertMutation = useMutation({
    mutationFn: (alert: Omit<AnalyticsAlert, 'id' | 'lastTriggered' | 'triggerCount'>) => 
      analyticsService.createAlert(alert),
    onSuccess: (newAlert) => {
      queryClient.invalidateQueries({ queryKey: ['analytics', 'alerts'] });
      toast.success('Alerta creada exitosamente');
    },
    onError: (error) => {
      toast.error('Error al crear la alerta');
      console.error('Create alert error:', error);
    }
  });

  // Update alert mutation
  const updateAlertMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<AnalyticsAlert> }) =>
      analyticsService.updateAlert(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics', 'alerts'] });
      toast.success('Alerta actualizada');
    },
    onError: (error) => {
      toast.error('Error al actualizar la alerta');
      console.error('Update alert error:', error);
    }
  });

  // Delete alert mutation
  const deleteAlertMutation = useMutation({
    mutationFn: (id: string) => analyticsService.deleteAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics', 'alerts'] });
      toast.success('Alerta eliminada');
    },
    onError: (error) => {
      toast.error('Error al eliminar la alerta');
      console.error('Delete alert error:', error);
    }
  });

  // Get chart data
  const getChartData = useCallback((type: string, customDateRange?: DateRange) => {
    const range = customDateRange || effectiveDateRange;
    return analyticsService.getChartData(type, range);
  }, [effectiveDateRange]);

  // Real-time updates
  useEffect(() => {
    if (!autoRefresh) return;

    const handleMetricsUpdate = (data: any) => {
      setRealTimeUpdates(data.updates);
      if (onMetricUpdate) {
        onMetricUpdate(data.updates);
      }
    };

    const handleAlertTriggered = (alert: AnalyticsAlert) => {
      toast.warning(`Alerta: ${alert.name}`, {
        description: alert.description
      });
      if (onAlertTriggered) {
        onAlertTriggered(alert);
      }
      refetchAlerts();
    };

    analyticsService.on('metrics-update', handleMetricsUpdate);
    analyticsService.on('alert-triggered', handleAlertTriggered);

    return () => {
      analyticsService.off('metrics-update', handleMetricsUpdate);
      analyticsService.off('alert-triggered', handleAlertTriggered);
    };
  }, [autoRefresh, onMetricUpdate, onAlertTriggered, refetchAlerts]);

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    try {
      await Promise.all([
        refetchMetrics(),
        refetchAccess(),
        refetchSecurity(),
        refetchResident(),
        refetchMaintenance(),
        refetchFinancial(),
        refetchAlerts()
      ]);
      toast.success('Datos actualizados');
    } catch (error) {
      toast.error('Error al actualizar datos');
      console.error('Refresh error:', error);
    }
  }, [
    refetchMetrics,
    refetchAccess,
    refetchSecurity,
    refetchResident,
    refetchMaintenance,
    refetchFinancial,
    refetchAlerts
  ]);

  // Dashboard management
  const getDashboard = useCallback((dashboardId: string): Dashboard | null => {
    const dashboards = ANALYTICS_CONFIG.DASHBOARD_LAYOUTS;
    return dashboards[dashboardId as keyof typeof dashboards] || null;
  }, []);

  const updateDashboardWidget = useCallback((
    dashboardId: string,
    widgetId: string,
    data: any
  ) => {
    // In real implementation, this would update the dashboard state
    console.log('Update widget:', dashboardId, widgetId, data);
  }, []);

  return {
    // Data
    keyMetrics,
    accessAnalytics,
    securityAnalytics,
    residentAnalytics,
    maintenanceAnalytics,
    financialAnalytics,
    alerts,
    realTimeUpdates,
    
    // Loading states
    isLoading: isLoadingMetrics || isLoadingAccess || isLoadingSecurity || 
               isLoadingResident || isLoadingMaintenance || isLoadingFinancial,
    isLoadingMetrics,
    isLoadingAccess,
    isLoadingSecurity,
    isLoadingResident,
    isLoadingMaintenance,
    isLoadingFinancial,
    isLoadingAlerts,
    
    // Connection state
    isConnected,
    
    // Errors
    error: metricsError,
    
    // Methods
    refreshAllData,
    getChartData,
    getDashboard,
    updateDashboardWidget,
    
    // Alert management
    createAlert: createAlertMutation.mutate,
    updateAlert: updateAlertMutation.mutate,
    deleteAlert: deleteAlertMutation.mutate,
    isCreatingAlert: createAlertMutation.isPending,
    isUpdatingAlert: updateAlertMutation.isPending,
    isDeletingAlert: deleteAlertMutation.isPending
  };
}