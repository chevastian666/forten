// JavaScript wrapper for UpdateBuildingUseCase
const { v4: uuidv4 } = require('uuid');

class UpdateBuildingUseCase {
  constructor(buildingRepository, eventRepository) {
    this.buildingRepository = buildingRepository;
    this.eventRepository = eventRepository;
  }

  async execute(input) {
    const { buildingId, data } = input;

    // Check if building exists
    const existing = await this.buildingRepository.findById(buildingId);
    if (!existing) {
      throw new Error('Building not found');
    }

    // Update building
    const updateData = {
      ...data,
      updatedAt: new Date()
    };

    const updated = await this.buildingRepository.update(buildingId, updateData);
    if (!updated) {
      throw new Error('Failed to update building');
    }

    // Create system event
    if (this.eventRepository) {
      await this.eventRepository.create({
        id: uuidv4(),
        buildingId: updated.id,
        type: 'system',
        description: `Building "${updated.name}" was updated`,
        severity: 'low',
        resolved: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    return updated;
  }
}

module.exports = { UpdateBuildingUseCase };