export interface TimeRange {
  start: Date;
  end: Date;
  granularity: 'minute' | 'hour' | 'day' | 'week' | 'month';
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
    fill?: boolean;
  }>;
}

export interface TrendData {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface AccessMetrics {
  totalToday: number;
  totalYesterday: number;
  totalWeek: number;
  totalMonth: number;
  byHour: ChartData;
  byDayOfWeek: ChartData;
  byType: {
    resident: number;
    visitor: number;
    delivery: number;
    service: number;
    contractor: number;
  };
  averageResponseTime: number;
  peakHours: Array<{
    hour: number;
    count: number;
  }>;
  deniedAccess: number;
  uniqueVisitors: number;
}

export interface BuildingOccupancy {
  current: number;
  capacity: number;
  percentage: number;
  trend: TrendData;
  byFloor: Array<{
    floor: number;
    occupied: number;
    capacity: number;
  }>;
  averageStayDuration: number;
  predictions: Array<{
    time: Date;
    predicted: number;
    confidence: number;
  }>;
}

export interface SecurityEvents {
  alerts: Alert[];
  totalToday: number;
  byType: Record<string, number>;
  bySeverity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  resolvedRate: number;
  averageResolutionTime: number;
  criticalEvents: Event[];
  trends: ChartData;
}

export interface Alert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  location: string;
  description: string;
  status: 'active' | 'acknowledged' | 'resolved';
  assignedTo?: string;
  resolvedAt?: Date;
  actions?: string[];
}

export interface Event {
  id: string;
  type: string;
  subType?: string;
  timestamp: Date;
  buildingId: string;
  location?: string;
  deviceId?: string;
  userId?: string;
  description: string;
  metadata?: Record<string, any>;
  images?: string[];
  videoClip?: string;
}

export interface CameraMetrics {
  totalCameras: number;
  onlineCameras: number;
  offlineCameras: number;
  availability: number;
  byStatus: Record<string, number>;
  motionEvents: number;
  storageUsed: number;
  storageTotal: number;
  recordingHours: number;
  bandwidthUsage: ChartData;
}

export interface ResidentMetrics {
  totalResidents: number;
  activeResidents: number;
  newThisMonth: number;
  byBuilding: Record<string, number>;
  satisfaction: {
    score: number;
    responses: number;
    trend: TrendData;
  };
  appUsage: {
    daily: number;
    weekly: number;
    monthly: number;
    features: Record<string, number>;
  };
  communicationPreferences: {
    whatsapp: number;
    email: number;
    app: number;
    sms: number;
  };
}

export interface MaintenanceMetrics {
  scheduledTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueeTasks: number;
  averageCompletionTime: number;
  byCategory: Record<string, number>;
  upcomingSchedule: Array<{
    date: Date;
    type: string;
    location: string;
    duration: number;
  }>;
  vendorPerformance: Array<{
    vendor: string;
    tasks: number;
    onTime: number;
    rating: number;
  }>;
}

export interface FinancialMetrics {
  revenue: {
    current: number;
    previous: number;
    trend: TrendData;
    bySource: Record<string, number>;
  };
  expenses: {
    current: number;
    previous: number;
    trend: TrendData;
    byCategory: Record<string, number>;
  };
  collections: {
    rate: number;
    outstanding: number;
    overdue: number;
    byAge: ChartData;
  };
  occupancy: {
    rate: number;
    vacant: number;
    trend: TrendData;
  };
}

export interface Analytics {
  timestamp: Date;
  buildingId?: string;
  timeRange: TimeRange;
  accessMetrics: AccessMetrics;
  securityEvents: SecurityEvents;
  buildingOccupancy: BuildingOccupancy;
  cameraMetrics: CameraMetrics;
  residentMetrics: ResidentMetrics;
  maintenanceMetrics: MaintenanceMetrics;
  financialMetrics: FinancialMetrics;
  alerts: {
    active: Alert[];
    recent: Alert[];
  };
  kpis: {
    securityScore: number;
    operationalEfficiency: number;
    residentSatisfaction: number;
    financialHealth: number;
  };
}

export interface RealtimeMetric {
  id: string;
  type: string;
  value: number;
  unit?: string;
  timestamp: Date;
  trend?: 'up' | 'down' | 'stable';
  alert?: boolean;
  threshold?: {
    min?: number;
    max?: number;
  };
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'map' | 'alert' | 'video';
  title: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: any;
  refreshInterval?: number;
  dataSource: string;
}

export interface AnalyticsQuery {
  buildingId?: string;
  timeRange: TimeRange;
  metrics: string[];
  filters?: Record<string, any>;
  groupBy?: string[];
  orderBy?: Array<{
    field: string;
    direction: 'asc' | 'desc';
  }>;
  limit?: number;
}

export interface AnalyticsReport {
  id: string;
  name: string;
  description?: string;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
  };
  recipients: string[];
  format: 'pdf' | 'excel' | 'csv';
  sections: Array<{
    type: string;
    config: any;
  }>;
  filters?: Record<string, any>;
  lastGenerated?: Date;
  nextScheduled?: Date;
}