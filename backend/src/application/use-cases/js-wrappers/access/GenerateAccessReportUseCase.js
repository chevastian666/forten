// JavaScript wrapper for GenerateAccessReportUseCase

class GenerateAccessReportUseCase {
  constructor(accessRepository) {
    this.accessRepository = accessRepository;
  }

  async execute(input = {}) {
    const { 
      buildingId, 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
      endDate = new Date() 
    } = input;

    // Get all accesses for the period
    const filters = {};
    if (buildingId) {
      filters.buildingId = buildingId;
    }

    const { data: accesses } = await this.accessRepository.findAll(filters, { page: 1, limit: 1000 });

    // Filter by date range
    const filteredAccesses = accesses.filter(
      (access) => new Date(access.createdAt) >= startDate && new Date(access.createdAt) <= endDate
    );

    // Calculate statistics
    const statistics = {
      totalAccesses: filteredAccesses.length,
      activeAccesses: 0,
      expiredAccesses: 0,
      usedAccesses: 0,
      byType: {
        visitor: 0,
        temporary: 0,
        service: 0,
        emergency: 0
      },
      totalUses: 0,
      averageUsesPerAccess: 0
    };

    filteredAccesses.forEach((access) => {
      // Count active/expired
      const now = new Date();
      const validFrom = new Date(access.validFrom);
      const validUntil = new Date(access.validUntil);
      const isValid = access.isActive && 
                     now >= validFrom && 
                     now <= validUntil && 
                     access.currentUses < access.maxUses;
      
      if (isValid) {
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
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return {
      period: {
        startDate,
        endDate
      },
      buildingId,
      statistics,
      recentAccesses
    };
  }
}

module.exports = { GenerateAccessReportUseCase };