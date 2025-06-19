// JavaScript wrapper for GetBuildingByIdUseCase

class GetBuildingByIdUseCase {
  constructor(buildingRepository, eventRepository) {
    this.buildingRepository = buildingRepository;
    this.eventRepository = eventRepository;
  }

  async execute(input) {
    const building = await this.buildingRepository.findById(input.buildingId);
    
    if (!building) {
      throw new Error('Building not found');
    }

    // Get recent events if eventRepository is available
    if (this.eventRepository) {
      const recentEvents = await this.eventRepository.findByBuildingId(building.id, { limit: 10 });
      building.recentEvents = recentEvents;
    }

    return building;
  }
}

module.exports = { GetBuildingByIdUseCase };