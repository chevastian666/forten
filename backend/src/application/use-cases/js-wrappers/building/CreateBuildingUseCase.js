// JavaScript wrapper for CreateBuildingUseCase
const { v4: uuidv4 } = require('uuid');

class CreateBuildingUseCase {
  constructor(buildingRepository, eventRepository) {
    this.buildingRepository = buildingRepository;
    this.eventRepository = eventRepository;
  }

  async execute(input) {
    const building = {
      id: uuidv4(),
      ...input,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const created = await this.buildingRepository.create(building);

    // Create system event
    if (this.eventRepository) {
      await this.eventRepository.create({
        id: uuidv4(),
        buildingId: created.id,
        type: 'system',
        description: `Building "${created.name}" was created`,
        severity: 'low',
        resolved: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    return created;
  }
}

module.exports = { CreateBuildingUseCase };