import { Dashboard, Widget } from '../entities/Dashboard';

export interface DashboardFilters {
  category?: string;
  tags?: string[];
  isPublic?: boolean;
  createdBy?: string;
  name?: string;
}

export interface IDashboardRepository {
  findById(id: string): Promise<Dashboard | null>;
  findAll(filters?: DashboardFilters, limit?: number, offset?: number): Promise<Dashboard[]>;
  findByUser(userId: string, includeShared?: boolean): Promise<Dashboard[]>;
  findPublicDashboards(category?: string): Promise<Dashboard[]>;
  findByCategory(category: string): Promise<Dashboard[]>;
  findByTags(tags: string[]): Promise<Dashboard[]>;
  save(dashboard: Dashboard): Promise<Dashboard>;
  update(dashboard: Dashboard): Promise<Dashboard>;
  delete(id: string): Promise<boolean>;
  
  // Widget operations
  getWidgetData(widgetId: string, dashboardId: string): Promise<any>;
  refreshWidget(widget: Widget): Promise<any>;
  
  // Permission operations
  findAccessibleByUser(userId: string, userRole?: string): Promise<Dashboard[]>;
  checkAccess(dashboardId: string, userId: string, userRole?: string): Promise<boolean>;
  
  // Sharing operations
  shareDashboard(dashboardId: string, userIds: string[], permissions: any): Promise<boolean>;
  revokeDashboardAccess(dashboardId: string, userId: string): Promise<boolean>;
}