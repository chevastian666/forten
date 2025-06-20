import { NotificationChannel } from './Notification';

export enum TemplateStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived'
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  required: boolean;
  defaultValue?: any;
  description?: string;
  format?: string; // For dates, numbers, etc.
  validation?: string; // Regex pattern or validation rule
}

export interface TemplateContent {
  subject?: string;
  body: string;
  htmlBody?: string;
  locale: string;
  variables?: TemplateVariable[];
}

export interface TemplateMetadata {
  category?: string;
  subcategory?: string;
  version?: number;
  parentId?: string; // For version control
  approvedBy?: string;
  approvedAt?: Date;
  lastUsedAt?: Date;
  usageCount?: number;
  testData?: Record<string, any>;
}

export class Template {
  id: string;
  name: string;
  description?: string;
  channel: NotificationChannel;
  contents: TemplateContent[];
  defaultLocale: string;
  status: TemplateStatus;
  metadata: TemplateMetadata;
  tags?: string[];
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<Template>) {
    this.id = data.id || '';
    this.name = data.name || '';
    this.description = data.description;
    this.channel = data.channel || NotificationChannel.EMAIL;
    this.contents = data.contents || [];
    this.defaultLocale = data.defaultLocale || 'en';
    this.status = data.status || TemplateStatus.DRAFT;
    this.metadata = data.metadata || {};
    this.tags = data.tags;
    this.createdBy = data.createdBy || '';
    this.updatedBy = data.updatedBy;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  getContent(locale?: string): TemplateContent | undefined {
    const targetLocale = locale || this.defaultLocale;
    return this.contents.find(c => c.locale === targetLocale) || 
           this.contents.find(c => c.locale === this.defaultLocale);
  }

  addContent(content: TemplateContent): void {
    const existingIndex = this.contents.findIndex(c => c.locale === content.locale);
    if (existingIndex >= 0) {
      this.contents[existingIndex] = content;
    } else {
      this.contents.push(content);
    }
    this.updatedAt = new Date();
  }

  removeContent(locale: string): void {
    this.contents = this.contents.filter(c => c.locale !== locale);
    this.updatedAt = new Date();
  }

  activate(): void {
    if (this.status === TemplateStatus.DRAFT || this.status === TemplateStatus.INACTIVE) {
      this.status = TemplateStatus.ACTIVE;
      this.updatedAt = new Date();
    }
  }

  deactivate(): void {
    if (this.status === TemplateStatus.ACTIVE) {
      this.status = TemplateStatus.INACTIVE;
      this.updatedAt = new Date();
    }
  }

  archive(): void {
    this.status = TemplateStatus.ARCHIVED;
    this.updatedAt = new Date();
  }

  approve(userId: string): void {
    this.metadata.approvedBy = userId;
    this.metadata.approvedAt = new Date();
    this.activate();
  }

  incrementUsage(): void {
    this.metadata.usageCount = (this.metadata.usageCount || 0) + 1;
    this.metadata.lastUsedAt = new Date();
    this.updatedAt = new Date();
  }

  clone(): Template {
    const cloned = new Template({
      ...this,
      id: '', // New ID will be assigned
      name: `${this.name} (Copy)`,
      status: TemplateStatus.DRAFT,
      metadata: {
        ...this.metadata,
        parentId: this.id,
        version: (this.metadata.version || 1) + 1,
        approvedBy: undefined,
        approvedAt: undefined,
        lastUsedAt: undefined,
        usageCount: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return cloned;
  }

  validateVariables(data: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const content = this.getContent();
    
    if (!content || !content.variables) {
      return { valid: true, errors };
    }

    for (const variable of content.variables) {
      const value = data[variable.name];

      if (variable.required && (value === undefined || value === null || value === '')) {
        errors.push(`Variable '${variable.name}' is required`);
        continue;
      }

      if (value !== undefined && value !== null) {
        // Type validation
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== variable.type && !(variable.type === 'date' && value instanceof Date)) {
          errors.push(`Variable '${variable.name}' must be of type '${variable.type}'`);
        }

        // Pattern validation
        if (variable.validation && typeof value === 'string') {
          const regex = new RegExp(variable.validation);
          if (!regex.test(value)) {
            errors.push(`Variable '${variable.name}' does not match the required format`);
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}