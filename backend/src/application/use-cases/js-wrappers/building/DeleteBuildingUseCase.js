// JavaScript wrapper for DeleteBuildingUseCase
const { v4: uuidv4 } = require('uuid');

class DeleteBuildingUseCase {
  constructor(buildingRepository, eventRepository) {
    this.buildingRepository = buildingRepository;
    this.eventRepository = eventRepository;
  }

  async execute(input) {
    const { buildingId } = input;

    // Check if building exists
    const existing = await this.buildingRepository.findById(buildingId);
    if (!existing) {
      throw new Error('Building not found');
    }

    // Delete building
    const deleted = await this.buildingRepository.delete(buildingId);
    if (!deleted) {
      throw new Error('Failed to delete building');
    }

    // Create system event
    if (this.eventRepository) {
      await this.eventRepository.create({
        id: uuidv4(),
        buildingId,
        type: 'system',
        description: `Building "${existing.name}" was deleted`,
        severity: 'medium',
        resolved: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    return { success: true };
  }
}

module.exports = { DeleteBuildingUseCase };