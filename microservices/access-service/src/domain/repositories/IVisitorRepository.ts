import { Visitor } from '../entities/Visitor';
import { VisitorStatus, VisitorType } from '../value-objects/VisitorEnums';

export interface VisitorFilter {
  buildingId?: string;
  hostUserId?: string;
  status?: VisitorStatus;
  type?: VisitorType;
  expectedArrivalStart?: Date;
  expectedArrivalEnd?: Date;
  search?: string; // Search by name, email, phone, company
  limit?: number;
  offset?: number;
}

export interface IVisitorRepository {
  create(visitor: Visitor): Promise<Visitor>;
  update(visitor: Visitor): Promise<Visitor>;
  findById(id: string): Promise<Visitor | null>;
  findByEmail(email: string): Promise<Visitor[]>;
  findByPhone(phone: string): Promise<Visitor[]>;
  find(filter: VisitorFilter): Promise<Visitor[]>;
  findExpected(date: Date, buildingId?: string): Promise<Visitor[]>;
  findCheckedIn(buildingId?: string): Promise<Visitor[]>;
  findByBadgeNumber(badgeNumber: string): Promise<Visitor | null>;
  findByDocumentNumber(documentType: string, documentNumber: string): Promise<Visitor | null>;
  
  // Bulk operations
  bulkUpdateStatus(ids: string[], status: VisitorStatus): Promise<void>;
  markNoShows(date: Date): Promise<number>;
  
  // Statistics
  countByStatus(buildingId?: string): Promise<Record<VisitorStatus, number>>;
  countByType(buildingId?: string): Promise<Record<VisitorType, number>>;
  getHostStatistics(hostUserId: string, days: number): Promise<{
    totalVisitors: number;
    checkedIn: number;
    noShows: number;
    averageDuration: number;
  }>;
  
  // Cleanup
  delete(id: string): Promise<void>;
  archiveOlderThan(date: Date): Promise<number>;
}