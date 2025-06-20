import { EventEmitter } from 'events';
import { Logger } from '../logging/Logger';
import { CacheService } from '../cache/CacheService';
import { AnalyticsEngine } from './AnalyticsEngine';
import { Sequelize } from 'sequelize';
import {
  Analytics,
  AnalyticsQuery,
  AnalyticsReport,
  DashboardWidget,
  TimeRange,
  RealtimeMetric
} from './types';

export class AnalyticsService extends EventEmitter {
  private readonly logger: Logger;
  private readonly engine: AnalyticsEngine;
  private dashboards: Map<string, DashboardWidget[]> = new Map();
  private reports: Map<string, AnalyticsReport> = new Map();
  private reportScheduler?: NodeJS.Timeout;
  
  constructor(
    sequelize: Sequelize,
    private readonly cache: CacheService
  ) {
    super();
    this.logger = new Logger('AnalyticsService');
    this.engine = new AnalyticsEngine(sequelize, cache);
    
    this.setupEventHandlers();
  }

  /**
   * Start analytics service
   */
  async start(): Promise<void> {
    this.logger.info('Starting analytics service');
    
    // Start real-time analytics engine
    this.engine.start();
    
    // Start report scheduler
    this.startReportScheduler();
    
    // Load saved dashboards and reports
    await this.loadConfigurations();
    
    this.logger.info('Analytics service started');
  }

  /**
   * Stop analytics service
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping analytics service');
    
    // Stop engine
    this.engine.stop();
    
    // Stop report scheduler
    if (this.reportScheduler) {
      clearInterval(this.reportScheduler);
    }
    
    this.logger.info('Analytics service stopped');
  }

  /**
   * Get analytics data
   */
  async getAnalytics(query: AnalyticsQuery): Promise<Analytics> {
    try {
      return await this.engine.getAnalytics(query);
    } catch (error) {
      this.logger.error('Failed to get analytics', error);
      throw error;
    }
  }

  /**
   * Get real-time metrics
   */
  getRealtimeMetrics(): RealtimeMetric[] {
    return this.engine.getRealtimeMetrics();
  }

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(buildingId?: string): Promise<any> {
    return this.engine.getDashboardMetrics(buildingId);
  }

  /**
   * Create custom dashboard
   */
  async createDashboard(
    name: string,
    widgets: DashboardWidget[]
  ): Promise<string> {
    const dashboardId = `dashboard_${Date.now()}`;
    
    this.dashboards.set(dashboardId, widgets);
    
    // Save to cache
    await this.cache.set(
      `analytics:dashboard:${dashboardId}`,
      { name, widgets },
      { ttl: 86400 * 30 } // 30 days
    );
    
    this.logger.info('Dashboard created', { dashboardId, name });
    
    return dashboardId;
  }

  /**
   * Get dashboard configuration
   */
  async getDashboard(dashboardId: string): Promise<{
    name: string;
    widgets: DashboardWidget[];
  } | null> {
    const widgets = this.dashboards.get(dashboardId);
    if (widgets) {
      return { name: dashboardId, widgets };
    }
    
    // Try to load from cache
    const cached = await this.cache.get(
      `analytics:dashboard:${dashboardId}`,
      'analytics'
    );
    
    if (cached) {
      this.dashboards.set(dashboardId, cached.widgets);
      return cached;
    }
    
    return null;
  }

  /**
   * Update dashboard widget
   */
  async updateDashboardWidget(
    dashboardId: string,
    widgetId: string,
    updates: Partial<DashboardWidget>
  ): Promise<void> {
    const widgets = this.dashboards.get(dashboardId);
    if (!widgets) {
      throw new Error('Dashboard not found');
    }
    
    const widgetIndex = widgets.findIndex(w => w.id === widgetId);
    if (widgetIndex === -1) {
      throw new Error('Widget not found');
    }
    
    widgets[widgetIndex] = { ...widgets[widgetIndex], ...updates };
    
    // Update cache
    await this.cache.set(
      `analytics:dashboard:${dashboardId}`,
      { name: dashboardId, widgets },
      { ttl: 86400 * 30 }
    );
  }

  /**
   * Create analytics report
   */
  async createReport(report: Omit<AnalyticsReport, 'id'>): Promise<string> {
    const reportId = `report_${Date.now()}`;
    
    const fullReport: AnalyticsReport = {
      id: reportId,
      ...report,
      lastGenerated: undefined,
      nextScheduled: this.calculateNextScheduled(report.schedule)
    };
    
    this.reports.set(reportId, fullReport);
    
    // Save to cache
    await this.cache.set(
      `analytics:report:${reportId}`,
      fullReport,
      { ttl: 86400 * 30 }
    );
    
    this.logger.info('Report created', { reportId, name: report.name });
    
    return reportId;
  }

  /**
   * Generate report
   */
  async generateReport(reportId: string): Promise<Buffer> {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error('Report not found');
    }
    
    this.logger.info('Generating report', { reportId, name: report.name });
    
    // Get analytics data for report
    const timeRange = this.getReportTimeRange(report.schedule);
    const analytics = await this.engine.getAnalytics({
      timeRange,
      metrics: ['all'],
      filters: report.filters
    });
    
    // Generate report based on format
    let buffer: Buffer;
    
    switch (report.format) {
      case 'pdf':
        buffer = await this.generatePDFReport(report, analytics);
        break;
      case 'excel':
        buffer = await this.generateExcelReport(report, analytics);
        break;
      case 'csv':
        buffer = await this.generateCSVReport(report, analytics);
        break;
      default:
        throw new Error(`Unsupported format: ${report.format}`);
    }
    
    // Update report metadata
    report.lastGenerated = new Date();
    report.nextScheduled = this.calculateNextScheduled(report.schedule);
    
    await this.cache.set(
      `analytics:report:${reportId}`,
      report,
      { ttl: 86400 * 30 }
    );
    
    this.logger.info('Report generated', { 
      reportId, 
      name: report.name,
      size: buffer.length 
    });
    
    return buffer;
  }

  /**
   * Get scheduled reports
   */
  getScheduledReports(): AnalyticsReport[] {
    return Array.from(this.reports.values())
      .filter(report => report.schedule !== undefined);
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(
    query: AnalyticsQuery,
    format: 'json' | 'csv' | 'excel'
  ): Promise<Buffer> {
    const analytics = await this.engine.getAnalytics(query);
    
    switch (format) {
      case 'json':
        return Buffer.from(JSON.stringify(analytics, null, 2));
      case 'csv':
        return this.analyticsToCSV(analytics);
      case 'excel':
        return this.analyticsToExcel(analytics);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Get analytics summary
   */
  async getAnalyticsSummary(
    buildingId?: string,
    period: 'day' | 'week' | 'month' = 'day'
  ): Promise<{
    highlights: Array<{
      metric: string;
      value: number;
      change: number;
      trend: 'up' | 'down' | 'stable';
    }>;
    insights: string[];
    recommendations: string[];
  }> {
    const timeRange = this.getPeriodTimeRange(period);
    const analytics = await this.engine.getAnalytics({
      buildingId,
      timeRange,
      metrics: ['all']
    });
    
    // Extract highlights
    const highlights = [
      {
        metric: 'Accesos totales',
        value: analytics.accessMetrics.totalToday,
        change: ((analytics.accessMetrics.totalToday - analytics.accessMetrics.totalYesterday) / 
                 analytics.accessMetrics.totalYesterday) * 100,
        trend: analytics.accessMetrics.totalToday > analytics.accessMetrics.totalYesterday ? 'up' : 'down'
      },
      {
        metric: 'Ocupación actual',
        value: analytics.buildingOccupancy.percentage,
        change: analytics.buildingOccupancy.trend.changePercent,
        trend: analytics.buildingOccupancy.trend.trend
      },
      {
        metric: 'Eventos de seguridad',
        value: analytics.securityEvents.totalToday,
        change: 0, // Would calculate from previous period
        trend: 'stable'
      },
      {
        metric: 'Cámaras activas',
        value: analytics.cameraMetrics.availability,
        change: 0,
        trend: 'stable'
      }
    ];
    
    // Generate insights
    const insights = this.generateInsights(analytics);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(analytics);
    
    return {
      highlights,
      insights,
      recommendations
    };
  }

  // Private methods

  private setupEventHandlers(): void {
    // Handle real-time metric updates
    this.engine.on('metricsUpdated', (metrics: RealtimeMetric[]) => {
      this.emit('realtimeUpdate', metrics);
    });
  }

  private async loadConfigurations(): Promise<void> {
    // Load dashboards from cache
    // This would scan for saved dashboards and load them
    
    // Load reports from cache
    // This would scan for saved reports and load them
  }

  private startReportScheduler(): void {
    // Check every hour for scheduled reports
    this.reportScheduler = setInterval(async () => {
      const now = new Date();
      
      for (const report of this.getScheduledReports()) {
        if (report.nextScheduled && report.nextScheduled <= now) {
          try {
            const buffer = await this.generateReport(report.id);
            await this.sendReport(report, buffer);
          } catch (error) {
            this.logger.error('Failed to generate scheduled report', error, {
              reportId: report.id,
              name: report.name
            });
          }
        }
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  private calculateNextScheduled(
    schedule?: AnalyticsReport['schedule']
  ): Date | undefined {
    if (!schedule) return undefined;
    
    const now = new Date();
    const next = new Date();
    
    switch (schedule.frequency) {
      case 'daily':
        next.setDate(now.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(now.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(now.getMonth() + 1);
        break;
    }
    
    // Set time
    const [hours, minutes] = schedule.time.split(':').map(Number);
    next.setHours(hours, minutes, 0, 0);
    
    return next;
  }

  private getReportTimeRange(
    schedule?: AnalyticsReport['schedule']
  ): TimeRange {
    const end = new Date();
    const start = new Date();
    
    switch (schedule?.frequency) {
      case 'daily':
        start.setDate(end.getDate() - 1);
        break;
      case 'weekly':
        start.setDate(end.getDate() - 7);
        break;
      case 'monthly':
        start.setMonth(end.getMonth() - 1);
        break;
      default:
        start.setDate(end.getDate() - 1);
    }
    
    return {
      start,
      end,
      granularity: schedule?.frequency === 'monthly' ? 'day' : 'hour'
    };
  }

  private getPeriodTimeRange(period: 'day' | 'week' | 'month'): TimeRange {
    const end = new Date();
    const start = new Date();
    
    switch (period) {
      case 'day':
        start.setDate(end.getDate() - 1);
        break;
      case 'week':
        start.setDate(end.getDate() - 7);
        break;
      case 'month':
        start.setMonth(end.getMonth() - 1);
        break;
    }
    
    return {
      start,
      end,
      granularity: period === 'month' ? 'day' : 'hour'
    };
  }

  private generateInsights(analytics: Analytics): string[] {
    const insights: string[] = [];
    
    // Access insights
    if (analytics.accessMetrics.totalToday > analytics.accessMetrics.totalYesterday * 1.2) {
      insights.push('El tráfico de acceso ha aumentado significativamente hoy');
    }
    
    // Occupancy insights
    if (analytics.buildingOccupancy.percentage > 90) {
      insights.push('La ocupación del edificio está cerca de su capacidad máxima');
    }
    
    // Security insights
    if (analytics.securityEvents.criticalEvents.length > 0) {
      insights.push(`Se detectaron ${analytics.securityEvents.criticalEvents.length} eventos críticos de seguridad`);
    }
    
    // Camera insights
    if (analytics.cameraMetrics.availability < 95) {
      insights.push('La disponibilidad de cámaras está por debajo del objetivo del 95%');
    }
    
    return insights;
  }

  private generateRecommendations(analytics: Analytics): string[] {
    const recommendations: string[] = [];
    
    // Access recommendations
    const peakHour = analytics.accessMetrics.peakHours[0];
    if (peakHour && peakHour.count > 50) {
      recommendations.push(`Considerar personal adicional durante las ${peakHour.hour}:00`);
    }
    
    // Security recommendations
    if (analytics.securityEvents.resolvedRate < 0.8) {
      recommendations.push('Mejorar el tiempo de respuesta para resolver alertas de seguridad');
    }
    
    // Camera recommendations
    if (analytics.cameraMetrics.offlineCameras > 0) {
      recommendations.push(`Revisar ${analytics.cameraMetrics.offlineCameras} cámaras fuera de línea`);
    }
    
    // Maintenance recommendations
    if (analytics.maintenanceMetrics.overdueeTasks > 0) {
      recommendations.push(`Completar ${analytics.maintenanceMetrics.overdueeTasks} tareas de mantenimiento atrasadas`);
    }
    
    return recommendations;
  }

  private async generatePDFReport(
    report: AnalyticsReport,
    analytics: Analytics
  ): Promise<Buffer> {
    // This would use a PDF generation library like puppeteer or pdfkit
    // For now, return a placeholder
    return Buffer.from('PDF Report');
  }

  private async generateExcelReport(
    report: AnalyticsReport,
    analytics: Analytics
  ): Promise<Buffer> {
    // This would use an Excel generation library like exceljs
    // For now, return a placeholder
    return Buffer.from('Excel Report');
  }

  private async generateCSVReport(
    report: AnalyticsReport,
    analytics: Analytics
  ): Promise<Buffer> {
    // Convert analytics data to CSV format
    const csv: string[] = [];
    
    // Header
    csv.push('Metric,Value,Change,Trend');
    
    // Access metrics
    csv.push(`Total Access Today,${analytics.accessMetrics.totalToday},,`);
    csv.push(`Unique Visitors,${analytics.accessMetrics.uniqueVisitors},,`);
    csv.push(`Denied Access,${analytics.accessMetrics.deniedAccess},,`);
    
    // Add more metrics...
    
    return Buffer.from(csv.join('\n'));
  }

  private analyticsToCSV(analytics: Analytics): Buffer {
    // Convert analytics object to CSV
    const csv: string[] = [];
    
    // Flatten the analytics object and convert to CSV
    // This is a simplified implementation
    
    return Buffer.from(csv.join('\n'));
  }

  private analyticsToExcel(analytics: Analytics): Buffer {
    // Convert analytics to Excel format
    // This would use a library like exceljs
    return Buffer.from('Excel data');
  }

  private async sendReport(
    report: AnalyticsReport,
    buffer: Buffer
  ): Promise<void> {
    // This would integrate with email or other delivery services
    this.logger.info('Sending report', {
      reportId: report.id,
      name: report.name,
      recipients: report.recipients.length
    });
    
    // Send to recipients
    for (const recipient of report.recipients) {
      // Send email with attachment
      this.emit('reportGenerated', {
        report,
        recipient,
        buffer
      });
    }
  }
}