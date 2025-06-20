export enum ReportType {
  SALES = 'SALES',
  INVENTORY = 'INVENTORY',
  FINANCIAL = 'FINANCIAL',
  CUSTOMER = 'CUSTOMER',
  PERFORMANCE = 'PERFORMANCE',
  CUSTOM = 'CUSTOM'
}

export enum ReportFormat {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  CSV = 'CSV',
  JSON = 'JSON'
}

export enum ReportStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SCHEDULED = 'SCHEDULED'
}

export enum ReportFrequency {
  ONCE = 'ONCE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY'
}

export interface ReportParameters {
  startDate: Date;
  endDate: Date;
  filters?: Record<string, any>;
  groupBy?: string[];
  orderBy?: string[];
  limit?: number;
  includeCharts?: boolean;
  customQuery?: string;
}

export interface ReportSchedule {
  frequency: ReportFrequency;
  time?: string; // HH:mm format
  dayOfWeek?: number; // 0-6 (Sunday-Saturday)
  dayOfMonth?: number; // 1-31
  recipients: string[];
  enabled: boolean;
  nextRunAt?: Date;
  lastRunAt?: Date;
}

export class Report {
  constructor(
    public readonly id: string,
    public readonly type: ReportType,
    public readonly name: string,
    public readonly description: string,
    public readonly format: ReportFormat,
    public readonly parameters: ReportParameters,
    public readonly status: ReportStatus,
    public readonly createdBy: string,
    public readonly schedule?: ReportSchedule,
    public readonly fileUrl?: string,
    public readonly error?: string,
    public readonly processedAt?: Date,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {}

  static create(
    type: ReportType,
    name: string,
    description: string,
    format: ReportFormat,
    parameters: ReportParameters,
    createdBy: string,
    schedule?: ReportSchedule
  ): Report {
    const id = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const status = schedule ? ReportStatus.SCHEDULED : ReportStatus.PENDING;

    return new Report(
      id,
      type,
      name,
      description,
      format,
      parameters,
      status,
      createdBy,
      schedule
    );
  }

  markAsProcessing(): Report {
    return new Report(
      this.id,
      this.type,
      this.name,
      this.description,
      this.format,
      this.parameters,
      ReportStatus.PROCESSING,
      this.createdBy,
      this.schedule,
      this.fileUrl,
      this.error,
      this.processedAt,
      this.createdAt,
      new Date()
    );
  }

  markAsCompleted(fileUrl: string): Report {
    return new Report(
      this.id,
      this.type,
      this.name,
      this.description,
      this.format,
      this.parameters,
      ReportStatus.COMPLETED,
      this.createdBy,
      this.schedule,
      fileUrl,
      undefined,
      new Date(),
      this.createdAt,
      new Date()
    );
  }

  markAsFailed(error: string): Report {
    return new Report(
      this.id,
      this.type,
      this.name,
      this.description,
      this.format,
      this.parameters,
      ReportStatus.FAILED,
      this.createdBy,
      this.schedule,
      this.fileUrl,
      error,
      new Date(),
      this.createdAt,
      new Date()
    );
  }

  updateSchedule(schedule: ReportSchedule): Report {
    return new Report(
      this.id,
      this.type,
      this.name,
      this.description,
      this.format,
      this.parameters,
      ReportStatus.SCHEDULED,
      this.createdBy,
      schedule,
      this.fileUrl,
      this.error,
      this.processedAt,
      this.createdAt,
      new Date()
    );
  }

  isScheduled(): boolean {
    return this.status === ReportStatus.SCHEDULED && !!this.schedule;
  }

  canBeProcessed(): boolean {
    return this.status === ReportStatus.PENDING || this.status === ReportStatus.SCHEDULED;
  }
}