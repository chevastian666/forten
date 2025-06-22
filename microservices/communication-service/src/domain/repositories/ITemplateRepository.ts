import { Template, TemplateStatus } from '../entities/Template';
import { NotificationChannel } from '../entities/Notification';
import { PaginatedResult, PaginationOptions } from './INotificationRepository';

export interface TemplateFilter {
  ids?: string[];
  name?: string;
  channel?: NotificationChannel;
  status?: TemplateStatus | TemplateStatus[];
  category?: string;
  subcategory?: string;
  tags?: string[];
  createdBy?: string;
  locale?: string;
  searchTerm?: string; // Search in name and description
}

export interface ITemplateRepository {
  create(template: Template): Promise<Template>;
  findById(id: string): Promise<Template | null>;
  findByIds(ids: string[]): Promise<Template[]>;
  findByName(name: string): Promise<Template | null>;
  find(filter: TemplateFilter, options?: PaginationOptions): Promise<PaginatedResult<Template>>;
  update(id: string, template: Partial<Template>): Promise<Template | null>;
  delete(id: string): Promise<boolean>;
  
  // Version control
  getVersionHistory(templateId: string): Promise<Template[]>;
  revertToVersion(templateId: string, versionId: string): Promise<Template | null>;
  
  // Usage tracking
  incrementUsage(id: string): Promise<void>;
  getMostUsedTemplates(limit: number, channel?: NotificationChannel): Promise<Template[]>;
  
  // Validation
  checkNameUniqueness(name: string, excludeId?: string): Promise<boolean>;
}