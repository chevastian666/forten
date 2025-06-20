import { Report, ReportStatus, ReportType, ReportFrequency } from '../entities/Report';

export interface ReportFilters {
  type?: ReportType;
  status?: ReportStatus;
  createdBy?: string;
  startDate?: Date;
  endDate?: Date;
  scheduled?: boolean;
  frequency?: ReportFrequency;
}

export interface IReportRepository {
  findById(id: string): Promise<Report | null>;
  findAll(filters?: ReportFilters, limit?: number, offset?: number): Promise<Report[]>;
  findByStatus(status: ReportStatus): Promise<Report[]>;
  findScheduledReports(): Promise<Report[]>;
  findByCreator(userId: string, limit?: number, offset?: number): Promise<Report[]>;
  save(report: Report): Promise<Report>;
  update(report: Report): Promise<Report>;
  delete(id: string): Promise<boolean>;
  countByFilters(filters?: ReportFilters): Promise<number>;
  findReportsToProcess(): Promise<Report[]>;
  findByScheduleTime(time: Date): Promise<Report[]>;
}