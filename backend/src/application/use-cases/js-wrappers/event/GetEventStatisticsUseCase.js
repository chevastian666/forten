// JavaScript wrapper for GetEventStatisticsUseCase

class GetEventStatisticsUseCase {
  constructor(eventRepository) {
    this.eventRepository = eventRepository;
  }

  async execute(input = {}) {
    return await this.eventRepository.getStats(input.buildingId);
  }
}

module.exports = { GetEventStatisticsUseCase };