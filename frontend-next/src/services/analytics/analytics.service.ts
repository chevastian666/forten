/**
 * Analytics Service
 * Core service for analytics data aggregation and processing
 */

import { EventEmitter } from 'events';
import {
  TimeRange,
  DateRange,
  Metric,
  MetricGroup,
  AccessAnalytics,
  SecurityAnalytics,
  ResidentAnalytics,
  MaintenanceAnalytics,
  FinancialAnalytics,
  TimeSeriesData,
  ChartData,
  HeatmapData,
  Dashboard,
  DashboardWidget,
  AnalyticsAlert,
  AlertCondition
} from './types';

export class AnalyticsService extends EventEmitter {
  private updateInterval: NodeJS.Timeout | null = null;
  private metricsCache: Map<string, any> = new Map();
  private alertsMap: Map<string, AnalyticsAlert> = new Map();

  constructor() {
    super();
    this.startMetricsUpdate();
  }

  // Time Range Helpers
  getDateRange(timeRange: TimeRange): DateRange {
    const now = new Date();
    const start = new Date();
    
    switch (timeRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        now.setDate(now.getDate() - 1);
        now.setHours(23, 59, 59, 999);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    return { start, end: now };
  }

  // Access Analytics
  async getAccessAnalytics(dateRange: DateRange): Promise<AccessAnalytics> {
    // Simulate data aggregation
    const totalAccess = Math.floor(Math.random() * 1000) + 500;
    const uniqueVisitors = Math.floor(totalAccess * 0.7);
    
    return {
      totalAccess,
      uniqueVisitors,
      averageAccessPerDay: Math.floor(totalAccess / 30),
      peakHours: [8, 9, 17, 18, 19],
      accessByType: {
        'Residentes': Math.floor(totalAccess * 0.6),
        'Visitantes': Math.floor(totalAccess * 0.3),
        'Delivery': Math.floor(totalAccess * 0.1)
      },
      accessByBuilding: {
        'Torre Norte': Math.floor(totalAccess * 0.45),
        'Torre Sur': Math.floor(totalAccess * 0.55)
      },
      accessTrend: this.generateTimeSeriesData(dateRange, 'access')
    };
  }

  // Security Analytics
  async getSecurityAnalytics(dateRange: DateRange): Promise<SecurityAnalytics> {
    const totalAlerts = Math.floor(Math.random() * 50) + 10;
    
    return {
      totalAlerts,
      alertsByType: {
        'Movimiento detectado': Math.floor(totalAlerts * 0.4),
        'Puerta abierta': Math.floor(totalAlerts * 0.3),
        'Acceso no autorizado': Math.floor(totalAlerts * 0.2),
        'Sistema offline': Math.floor(totalAlerts * 0.1)
      },
      alertsBySeverity: {
        'Crítica': Math.floor(totalAlerts * 0.1),
        'Alta': Math.floor(totalAlerts * 0.2),
        'Media': Math.floor(totalAlerts * 0.4),
        'Baja': Math.floor(totalAlerts * 0.3)
      },
      responseTime: Math.floor(Math.random() * 10) + 2, // minutes
      unresolvedAlerts: Math.floor(totalAlerts * 0.1),
      alertsTrend: this.generateTimeSeriesData(dateRange, 'alerts'),
      hotspots: this.generateHeatmapData()
    };
  }

  // Resident Analytics
  async getResidentAnalytics(dateRange: DateRange): Promise<ResidentAnalytics> {
    const totalResidents = 450;
    const activeResidents = Math.floor(totalResidents * 0.85);
    
    return {
      totalResidents,
      activeResidents,
      newResidents: Math.floor(Math.random() * 10) + 5,
      churnRate: 2.5, // percentage
      satisfactionScore: 4.2, // out of 5
      demographicData: {
        ageGroups: {
          '18-25': 15,
          '26-35': 30,
          '36-45': 25,
          '46-55': 20,
          '56+': 10
        },
        gender: {
          'Masculino': 48,
          'Femenino': 52
        },
        occupation: {
          'Profesional': 40,
          'Estudiante': 15,
          'Empresario': 20,
          'Jubilado': 10,
          'Otro': 15
        },
        familySize: {
          '1': 20,
          '2': 35,
          '3-4': 35,
          '5+': 10
        }
      },
      engagementMetrics: {
        appUsage: 78, // percentage
        communicationRate: 65,
        paymentOnTime: 92,
        maintenanceRequests: 3.2, // average per month
        communityParticipation: 45
      }
    };
  }

  // Maintenance Analytics
  async getMaintenanceAnalytics(dateRange: DateRange): Promise<MaintenanceAnalytics> {
    const totalRequests = Math.floor(Math.random() * 100) + 50;
    const completedRequests = Math.floor(totalRequests * 0.85);
    
    return {
      totalRequests,
      completedRequests,
      pendingRequests: totalRequests - completedRequests,
      averageResolutionTime: 48, // hours
      requestsByCategory: {
        'Plomería': Math.floor(totalRequests * 0.25),
        'Electricidad': Math.floor(totalRequests * 0.2),
        'Limpieza': Math.floor(totalRequests * 0.15),
        'Ascensores': Math.floor(totalRequests * 0.1),
        'Aire acondicionado': Math.floor(totalRequests * 0.15),
        'Otros': Math.floor(totalRequests * 0.15)
      },
      satisfactionRating: 4.1,
      costAnalysis: [
        { category: 'Plomería', budgeted: 5000, actual: 4800, variance: 200, percentage: 4 },
        { category: 'Electricidad', budgeted: 4000, actual: 4200, variance: -200, percentage: -5 },
        { category: 'Limpieza', budgeted: 8000, actual: 7500, variance: 500, percentage: 6.25 },
        { category: 'Ascensores', budgeted: 3000, actual: 3000, variance: 0, percentage: 0 },
        { category: 'Aire acondicionado', budgeted: 6000, actual: 6500, variance: -500, percentage: -8.33 }
      ]
    };
  }

  // Financial Analytics
  async getFinancialAnalytics(dateRange: DateRange): Promise<FinancialAnalytics> {
    const totalRevenue = Math.floor(Math.random() * 50000) + 100000;
    const totalExpenses = Math.floor(totalRevenue * 0.7);
    
    return {
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
      outstandingPayments: Math.floor(totalRevenue * 0.05),
      collectionRate: 95, // percentage
      revenueByCategory: {
        'Gastos comunes': Math.floor(totalRevenue * 0.7),
        'Servicios adicionales': Math.floor(totalRevenue * 0.15),
        'Multas': Math.floor(totalRevenue * 0.05),
        'Alquileres': Math.floor(totalRevenue * 0.1)
      },
      expensesByCategory: {
        'Personal': Math.floor(totalExpenses * 0.4),
        'Mantenimiento': Math.floor(totalExpenses * 0.25),
        'Servicios': Math.floor(totalExpenses * 0.2),
        'Administración': Math.floor(totalExpenses * 0.1),
        'Otros': Math.floor(totalExpenses * 0.05)
      },
      cashFlow: this.generateTimeSeriesData(dateRange, 'cashflow')
    };
  }

  // Key Metrics
  async getKeyMetrics(): Promise<MetricGroup[]> {
    const dateRange = this.getDateRange('month');
    
    const accessData = await this.getAccessAnalytics(dateRange);
    const securityData = await this.getSecurityAnalytics(dateRange);
    const residentData = await this.getResidentAnalytics(dateRange);
    const maintenanceData = await this.getMaintenanceAnalytics(dateRange);
    const financialData = await this.getFinancialAnalytics(dateRange);

    return [
      {
        id: 'operations',
        name: 'Operaciones',
        description: 'Métricas operacionales clave',
        metrics: [
          {
            id: 'total-access',
            name: 'Accesos totales',
            value: accessData.totalAccess,
            previousValue: Math.floor(accessData.totalAccess * 0.9),
            change: accessData.totalAccess - Math.floor(accessData.totalAccess * 0.9),
            changePercentage: 10,
            trend: 'up',
            unit: 'accesos'
          },
          {
            id: 'active-alerts',
            name: 'Alertas activas',
            value: securityData.unresolvedAlerts,
            previousValue: securityData.unresolvedAlerts + 2,
            change: -2,
            changePercentage: -20,
            trend: 'down',
            unit: 'alertas'
          },
          {
            id: 'response-time',
            name: 'Tiempo de respuesta',
            value: securityData.responseTime,
            previousValue: securityData.responseTime + 1,
            change: -1,
            changePercentage: -10,
            trend: 'down',
            unit: 'minutos'
          }
        ]
      },
      {
        id: 'residents',
        name: 'Residentes',
        description: 'Métricas de residentes',
        metrics: [
          {
            id: 'total-residents',
            name: 'Total residentes',
            value: residentData.totalResidents,
            previousValue: residentData.totalResidents - 5,
            change: 5,
            changePercentage: 1.1,
            trend: 'up'
          },
          {
            id: 'satisfaction',
            name: 'Satisfacción',
            value: residentData.satisfactionScore,
            previousValue: 4.0,
            change: 0.2,
            changePercentage: 5,
            trend: 'up',
            unit: '/5'
          },
          {
            id: 'app-usage',
            name: 'Uso de app',
            value: residentData.engagementMetrics.appUsage,
            previousValue: 75,
            change: 3,
            changePercentage: 4,
            trend: 'up',
            unit: '%'
          }
        ]
      },
      {
        id: 'financial',
        name: 'Finanzas',
        description: 'Métricas financieras',
        metrics: [
          {
            id: 'revenue',
            name: 'Ingresos',
            value: financialData.totalRevenue,
            previousValue: Math.floor(financialData.totalRevenue * 0.95),
            change: Math.floor(financialData.totalRevenue * 0.05),
            changePercentage: 5,
            trend: 'up',
            unit: 'USD'
          },
          {
            id: 'collection-rate',
            name: 'Tasa de cobro',
            value: financialData.collectionRate,
            previousValue: 93,
            change: 2,
            changePercentage: 2.15,
            trend: 'up',
            unit: '%'
          },
          {
            id: 'net-income',
            name: 'Ingreso neto',
            value: financialData.netIncome,
            previousValue: Math.floor(financialData.netIncome * 0.9),
            change: Math.floor(financialData.netIncome * 0.1),
            changePercentage: 10,
            trend: 'up',
            unit: 'USD'
          }
        ]
      }
    ];
  }

  // Chart Data Generation
  getChartData(type: string, dateRange: DateRange): ChartData {
    const days = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const labels: string[] = [];
    const data: number[] = [];

    for (let i = 0; i < Math.min(days, 30); i++) {
      const date = new Date(dateRange.start);
      date.setDate(date.getDate() + i);
      labels.push(date.toLocaleDateString('es-UY', { day: '2-digit', month: 'short' }));
      
      // Generate sample data based on type
      switch (type) {
        case 'access':
          data.push(Math.floor(Math.random() * 50) + 100);
          break;
        case 'revenue':
          data.push(Math.floor(Math.random() * 5000) + 10000);
          break;
        case 'maintenance':
          data.push(Math.floor(Math.random() * 10) + 5);
          break;
        default:
          data.push(Math.floor(Math.random() * 100));
      }
    }

    return {
      labels,
      datasets: [{
        label: this.getChartLabel(type),
        data,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
        fill: true
      }]
    };
  }

  // Real-time Updates
  private startMetricsUpdate() {
    // Update metrics every 30 seconds
    this.updateInterval = setInterval(() => {
      this.emit('metrics-update', {
        timestamp: new Date(),
        updates: this.generateMetricUpdates()
      });
    }, 30000);
  }

  private generateMetricUpdates() {
    return {
      newAccess: Math.floor(Math.random() * 5),
      newAlerts: Math.floor(Math.random() * 2),
      maintenanceCompleted: Math.random() > 0.7 ? 1 : 0,
      paymentReceived: Math.random() > 0.8 ? Math.floor(Math.random() * 1000) + 500 : 0
    };
  }

  // Alert Management
  async createAlert(alert: Omit<AnalyticsAlert, 'id' | 'lastTriggered' | 'triggerCount'>): Promise<AnalyticsAlert> {
    const newAlert: AnalyticsAlert = {
      ...alert,
      id: `alert-${Date.now()}`,
      triggerCount: 0
    };
    
    this.alertsMap.set(newAlert.id, newAlert);
    this.startAlertMonitoring(newAlert);
    
    return newAlert;
  }

  async updateAlert(id: string, updates: Partial<AnalyticsAlert>): Promise<AnalyticsAlert | null> {
    const alert = this.alertsMap.get(id);
    if (!alert) return null;
    
    const updatedAlert = { ...alert, ...updates };
    this.alertsMap.set(id, updatedAlert);
    
    return updatedAlert;
  }

  async deleteAlert(id: string): Promise<boolean> {
    return this.alertsMap.delete(id);
  }

  async getAlerts(): Promise<AnalyticsAlert[]> {
    return Array.from(this.alertsMap.values());
  }

  private startAlertMonitoring(alert: AnalyticsAlert) {
    if (!alert.enabled) return;
    
    // Check alert condition periodically
    setInterval(async () => {
      const shouldTrigger = await this.checkAlertCondition(alert);
      if (shouldTrigger) {
        this.triggerAlert(alert);
      }
    }, 60000); // Check every minute
  }

  private async checkAlertCondition(alert: AnalyticsAlert): Promise<boolean> {
    // Get current metric value
    const currentValue = await this.getMetricValue(alert.metric);
    
    switch (alert.condition.type) {
      case 'above':
        return currentValue > alert.threshold;
      case 'below':
        return currentValue < alert.threshold;
      case 'equals':
        return currentValue === alert.threshold;
      case 'change':
        // Check percentage change
        const previousValue = this.metricsCache.get(alert.metric) || currentValue;
        const change = ((currentValue - previousValue) / previousValue) * 100;
        return Math.abs(change) > alert.threshold;
      default:
        return false;
    }
  }

  private async getMetricValue(metricId: string): Promise<number> {
    // Simulate getting metric value
    // In real implementation, this would query the actual data source
    return Math.floor(Math.random() * 100);
  }

  private triggerAlert(alert: AnalyticsAlert) {
    alert.lastTriggered = new Date();
    alert.triggerCount++;
    
    // Execute alert actions
    alert.actions.forEach(action => {
      this.executeAlertAction(alert, action);
    });
    
    this.emit('alert-triggered', alert);
  }

  private executeAlertAction(alert: AnalyticsAlert, action: any) {
    // Implement alert action execution
    console.log(`Executing ${action.type} action for alert ${alert.name}`);
  }

  // Helper Methods
  private generateTimeSeriesData(dateRange: DateRange, type: string): TimeSeriesData[] {
    const data: TimeSeriesData[] = [];
    const days = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i < Math.min(days, 30); i++) {
      const date = new Date(dateRange.start);
      date.setDate(date.getDate() + i);
      
      let value: number;
      switch (type) {
        case 'access':
          value = Math.floor(Math.random() * 50) + 100;
          break;
        case 'alerts':
          value = Math.floor(Math.random() * 10) + 5;
          break;
        case 'cashflow':
          value = Math.floor(Math.random() * 10000) + 50000;
          break;
        default:
          value = Math.floor(Math.random() * 100);
      }
      
      data.push({
        timestamp: date,
        value,
        label: date.toLocaleDateString('es-UY')
      });
    }
    
    return data;
  }

  private generateHeatmapData(): HeatmapData[] {
    const data: HeatmapData[] = [];
    
    // Generate 10x10 grid with random values
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        data.push({
          x,
          y,
          value: Math.floor(Math.random() * 100),
          label: `Zona ${x}-${y}`
        });
      }
    }
    
    return data;
  }

  private getChartLabel(type: string): string {
    const labels: Record<string, string> = {
      access: 'Accesos diarios',
      revenue: 'Ingresos diarios',
      maintenance: 'Solicitudes de mantenimiento',
      alerts: 'Alertas de seguridad'
    };
    
    return labels[type] || 'Datos';
  }

  // Cleanup
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.removeAllListeners();
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();