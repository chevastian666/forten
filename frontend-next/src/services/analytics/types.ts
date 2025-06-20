/**
 * Analytics and Reports Types
 * Type definitions for analytics and reporting system
 */

// Time Range Types
export type TimeRange = 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
}

// Metric Types
export interface Metric {
  id: string;
  name: string;
  value: number;
  previousValue?: number;
  change?: number;
  changePercentage?: number;
  trend?: 'up' | 'down' | 'stable';
  unit?: string;
}

export interface MetricGroup {
  id: string;
  name: string;
  metrics: Metric[];
  description?: string;
}

// Dashboard Types
export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'map' | 'list';
  title: string;
  description?: string;
  data: any;
  config: WidgetConfig;
  position: { x: number; y: number; w: number; h: number };
}

export interface WidgetConfig {
  refreshInterval?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  colors?: string[];
  chartType?: 'line' | 'bar' | 'pie' | 'donut' | 'area' | 'scatter';
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  layout: 'grid' | 'freeform';
  refreshInterval?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Analytics Data Types
export interface AccessAnalytics {
  totalAccess: number;
  uniqueVisitors: number;
  averageAccessPerDay: number;
  peakHours: number[];
  accessByType: Record<string, number>;
  accessByBuilding: Record<string, number>;
  accessTrend: TimeSeriesData[];
}

export interface SecurityAnalytics {
  totalAlerts: number;
  alertsByType: Record<string, number>;
  alertsBySeverity: Record<string, number>;
  responseTime: number;
  unresolvedAlerts: number;
  alertsTrend: TimeSeriesData[];
  hotspots: HeatmapData[];
}

export interface ResidentAnalytics {
  totalResidents: number;
  activeResidents: number;
  newResidents: number;
  churnRate: number;
  satisfactionScore: number;
  demographicData: DemographicData;
  engagementMetrics: EngagementMetrics;
}

export interface MaintenanceAnalytics {
  totalRequests: number;
  completedRequests: number;
  pendingRequests: number;
  averageResolutionTime: number;
  requestsByCategory: Record<string, number>;
  satisfactionRating: number;
  costAnalysis: CostData[];
}

export interface FinancialAnalytics {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  outstandingPayments: number;
  collectionRate: number;
  revenueByCategory: Record<string, number>;
  expensesByCategory: Record<string, number>;
  cashFlow: TimeSeriesData[];
}

// Chart Data Types
export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
}

export interface HeatmapData {
  x: number;
  y: number;
  value: number;
  label?: string;
}

export interface DemographicData {
  ageGroups: Record<string, number>;
  gender: Record<string, number>;
  occupation: Record<string, number>;
  familySize: Record<string, number>;
}

export interface EngagementMetrics {
  appUsage: number;
  communicationRate: number;
  paymentOnTime: number;
  maintenanceRequests: number;
  communityParticipation: number;
}

export interface CostData {
  category: string;
  budgeted: number;
  actual: number;
  variance: number;
  percentage: number;
}

// Report Types
export interface Report {
  id: string;
  name: string;
  type: ReportType;
  description?: string;
  template: ReportTemplate;
  schedule?: ReportSchedule;
  recipients?: string[];
  format: ReportFormat[];
  filters?: ReportFilter[];
  createdAt: Date;
  updatedAt: Date;
}

export type ReportType = 
  | 'access'
  | 'security'
  | 'maintenance'
  | 'financial'
  | 'occupancy'
  | 'custom';

export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json';

export interface ReportTemplate {
  id: string;
  name: string;
  sections: ReportSection[];
  header?: ReportHeader;
  footer?: ReportFooter;
  style?: ReportStyle;
}

export interface ReportSection {
  id: string;
  type: 'title' | 'summary' | 'chart' | 'table' | 'text' | 'pagebreak';
  title?: string;
  content?: any;
  config?: any;
}

export interface ReportHeader {
  logo?: string;
  title: string;
  subtitle?: string;
  date?: boolean;
  pageNumbers?: boolean;
}

export interface ReportFooter {
  text?: string;
  showDate?: boolean;
  showPageNumber?: boolean;
}

export interface ReportStyle {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  fontSize?: number;
  margins?: { top: number; right: number; bottom: number; left: number };
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  time?: string; // HH:MM format
  dayOfWeek?: number; // 0-6
  dayOfMonth?: number; // 1-31
  timezone?: string;
  enabled: boolean;
}

export interface ReportFilter {
  field: string;
  operator: 'equals' | 'contains' | 'between' | 'in' | 'notIn';
  value: any;
}

// Alert Types
export interface AnalyticsAlert {
  id: string;
  name: string;
  description?: string;
  metric: string;
  condition: AlertCondition;
  threshold: number;
  actions: AlertAction[];
  enabled: boolean;
  lastTriggered?: Date;
  triggerCount: number;
}

export interface AlertCondition {
  type: 'above' | 'below' | 'equals' | 'change';
  timeWindow?: number; // minutes
  aggregation?: 'avg' | 'sum' | 'count' | 'min' | 'max';
}

export interface AlertAction {
  type: 'email' | 'sms' | 'whatsapp' | 'webhook' | 'notification';
  recipients?: string[];
  template?: string;
  config?: any;
}

// Export Types
export interface ExportOptions {
  format: ReportFormat;
  includeCharts?: boolean;
  includeRawData?: boolean;
  dateRange?: DateRange;
  filters?: ReportFilter[];
  locale?: string;
  timezone?: string;
}