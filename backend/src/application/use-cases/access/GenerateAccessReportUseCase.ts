import { IAccessRepository, AccessFilters } from '../../../domain/repositories/IAccessRepository';
import { Access } from '../../../domain/entities/Access';

export interface GenerateAccessReportUseCaseInput {
  buildingId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface AccessReportStatistics {
  totalAccesses: number;
  activeAccesses: number;
  expiredAccesses: number;
  usedAccesses: number;
  byType: {
    visitor: number;
    temporary: number;
    service: number;
    emergency: number;
  };
  totalUses: number;
  averageUsesPerAccess: number;
}

export interface GenerateAccessReportUseCaseOutput {
  period: {
    startDate: Date;
    endDate: Date;
  };
  buildingId?: string;
  statistics: AccessReportStatistics;
  recentAccesses: Access[];
}

export class GenerateAccessReportUseCase {
  constructor(private accessRepository: IAccessRepository) {}

  async execute(input: GenerateAccessReportUseCaseInput): Promise<GenerateAccessReportUseCaseOutput> {
    const { buildingId, startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), endDate = new Date() } = input;

    // Get all accesses for the period
    const filters: AccessFilters = {};
    if (buildingId) {
      filters.buildingId = buildingId;
    }

    const { data: accesses } = await this.accessRepository.findAll(filters, { page: 1, limit: 1000 });

    // Filter by date range
    const filteredAccesses = accesses.filter(
      (access) => access.createdAt >= startDate && access.createdAt <= endDate
    );

    // Calculate statistics
    const statistics: AccessReportStatistics = {
      totalAccesses: filteredAccesses.length,
      activeAccesses: 0,
      expiredAccesses: 0,
      usedAccesses: 0,
      byType: {
        visitor: 0,
        temporary: 0,
        service: 0,
        emergency: 0,
      },
      totalUses: 0,
      averageUsesPerAccess: 0,
    };

    filteredAccesses.forEach((access) => {
      // Count active/expired
      if (access.isValid()) {
        statistics.activeAccesses++;
      } else {
        statistics.expiredAccesses++;
      }

      // Count used
      if (access.currentUses > 0) {
        statistics.usedAccesses++;
      }

      // Count by type
      statistics.byType[access.type]++;

      // Sum total uses
      statistics.totalUses += access.currentUses;
    });

    // Calculate average uses
    if (statistics.totalAccesses > 0) {
      statistics.averageUsesPerAccess = statistics.totalUses / statistics.totalAccesses;
    }

    // Get recent accesses
    const recentAccesses = filteredAccesses
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    return {
      period: {
        startDate,
        endDate,
      },
      buildingId,
      statistics,
      recentAccesses,
    };
  }
}