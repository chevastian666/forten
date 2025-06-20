import { AccessLog } from '../entities/AccessLog';
import { AccessResult, AccessMethod } from '../value-objects/AccessEnums';

export interface AccessLogFilter {
  buildingId?: string;
  doorId?: string;
  userId?: string;
  visitorId?: string;
  accessMethod?: AccessMethod;
  accessResult?: AccessResult;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AccessLogStatistics {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  uniqueUsers: number;
  uniqueVisitors: number;
  byMethod: Record<AccessMethod, number>;
  byResult: Record<AccessResult, number>;
  byHour: Record<number, number>;
  byDoor: Record<string, number>;
}

export interface IAccessLogRepository {
  create(log: AccessLog): Promise<AccessLog>;
  createBatch(logs: AccessLog[]): Promise<void>;
  findById(id: string): Promise<AccessLog | null>;
  find(filter: AccessLogFilter): Promise<AccessLog[]>;
  findByEntity(entityId: string, entityType: 'user' | 'visitor'): Promise<AccessLog[]>;
  findRecent(limit: number, buildingId?: string): Promise<AccessLog[]>;
  findFailures(startDate: Date, endDate: Date, buildingId?: string): Promise<AccessLog[]>;
  
  // Analytics
  getStatistics(filter: AccessLogFilter): Promise<AccessLogStatistics>;
  getHourlyDistribution(date: Date, buildingId?: string): Promise<Record<number, number>>;
  getTopAccessPoints(limit: number, startDate: Date, endDate: Date): Promise<Array<{doorId: string, count: number}>>;
  getAccessPatterns(userId: string, days: number): Promise<any>;
  
  // Audit trail
  exportForAudit(startDate: Date, endDate: Date, format: 'json' | 'csv'): Promise<string>;
  
  // Cleanup
  deleteOlderThan(date: Date): Promise<number>;
}