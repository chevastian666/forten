export enum WidgetType {
  CHART = 'CHART',
  TABLE = 'TABLE',
  METRIC_CARD = 'METRIC_CARD',
  MAP = 'MAP',
  TIMELINE = 'TIMELINE',
  HEATMAP = 'HEATMAP',
  GAUGE = 'GAUGE',
  TEXT = 'TEXT'
}

export enum ChartType {
  LINE = 'LINE',
  BAR = 'BAR',
  PIE = 'PIE',
  DOUGHNUT = 'DOUGHNUT',
  RADAR = 'RADAR',
  AREA = 'AREA',
  SCATTER = 'SCATTER',
  BUBBLE = 'BUBBLE',
  MIXED = 'MIXED'
}

export enum RefreshInterval {
  NONE = 0,
  SECONDS_30 = 30,
  MINUTE_1 = 60,
  MINUTES_5 = 300,
  MINUTES_15 = 900,
  MINUTES_30 = 1800,
  HOUR_1 = 3600
}

export interface WidgetConfig {
  dataSource: string;
  query?: string;
  metricIds?: string[];
  chartType?: ChartType;
  chartOptions?: Record<string, any>;
  columns?: string[];
  filters?: Record<string, any>;
  aggregation?: string;
  groupBy?: string[];
  orderBy?: string[];
  limit?: number;
  timeRange?: {
    start: Date;
    end: Date;
  };
}

export interface WidgetLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  description?: string;
  config: WidgetConfig;
  layout: WidgetLayout;
  refreshInterval?: RefreshInterval;
  customStyles?: Record<string, any>;
}

export interface DashboardPermission {
  userId?: string;
  role?: string;
  department?: string;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
}

export class Dashboard {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly widgets: Widget[],
    public readonly category: string,
    public readonly tags: string[],
    public readonly isPublic: boolean,
    public readonly createdBy: string,
    public readonly permissions: DashboardPermission[],
    public readonly refreshInterval: RefreshInterval,
    public readonly theme?: Record<string, any>,
    public readonly filters?: Record<string, any>,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {}

  static create(
    name: string,
    description: string,
    category: string,
    createdBy: string,
    isPublic: boolean = false,
    refreshInterval: RefreshInterval = RefreshInterval.NONE
  ): Dashboard {
    const id = `dashboard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return new Dashboard(
      id,
      name,
      description,
      [],
      category,
      [],
      isPublic,
      createdBy,
      [
        {
          userId: createdBy,
          canView: true,
          canEdit: true,
          canDelete: true,
          canShare: true
        }
      ],
      refreshInterval
    );
  }

  addWidget(widget: Widget): Dashboard {
    const updatedWidgets = [...this.widgets, widget];
    
    return new Dashboard(
      this.id,
      this.name,
      this.description,
      updatedWidgets,
      this.category,
      this.tags,
      this.isPublic,
      this.createdBy,
      this.permissions,
      this.refreshInterval,
      this.theme,
      this.filters,
      this.createdAt,
      new Date()
    );
  }

  removeWidget(widgetId: string): Dashboard {
    const updatedWidgets = this.widgets.filter(w => w.id !== widgetId);
    
    return new Dashboard(
      this.id,
      this.name,
      this.description,
      updatedWidgets,
      this.category,
      this.tags,
      this.isPublic,
      this.createdBy,
      this.permissions,
      this.refreshInterval,
      this.theme,
      this.filters,
      this.createdAt,
      new Date()
    );
  }

  updateWidget(widgetId: string, updates: Partial<Widget>): Dashboard {
    const updatedWidgets = this.widgets.map(w =>
      w.id === widgetId ? { ...w, ...updates } : w
    );
    
    return new Dashboard(
      this.id,
      this.name,
      this.description,
      updatedWidgets,
      this.category,
      this.tags,
      this.isPublic,
      this.createdBy,
      this.permissions,
      this.refreshInterval,
      this.theme,
      this.filters,
      this.createdAt,
      new Date()
    );
  }

  updateLayout(layouts: { widgetId: string; layout: WidgetLayout }[]): Dashboard {
    const layoutMap = new Map(layouts.map(l => [l.widgetId, l.layout]));
    
    const updatedWidgets = this.widgets.map(w => {
      const newLayout = layoutMap.get(w.id);
      return newLayout ? { ...w, layout: newLayout } : w;
    });
    
    return new Dashboard(
      this.id,
      this.name,
      this.description,
      updatedWidgets,
      this.category,
      this.tags,
      this.isPublic,
      this.createdBy,
      this.permissions,
      this.refreshInterval,
      this.theme,
      this.filters,
      this.createdAt,
      new Date()
    );
  }

  addPermission(permission: DashboardPermission): Dashboard {
    const updatedPermissions = [...this.permissions, permission];
    
    return new Dashboard(
      this.id,
      this.name,
      this.description,
      this.widgets,
      this.category,
      this.tags,
      this.isPublic,
      this.createdBy,
      updatedPermissions,
      this.refreshInterval,
      this.theme,
      this.filters,
      this.createdAt,
      new Date()
    );
  }

  canUserEdit(userId: string, userRole?: string): boolean {
    if (this.createdBy === userId) return true;
    
    return this.permissions.some(p =>
      (p.userId === userId || p.role === userRole) && p.canEdit
    );
  }

  canUserView(userId: string, userRole?: string): boolean {
    if (this.isPublic) return true;
    if (this.createdBy === userId) return true;
    
    return this.permissions.some(p =>
      (p.userId === userId || p.role === userRole) && p.canView
    );
  }
}