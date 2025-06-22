// JavaScript wrapper for DeleteAccessUseCase
const { v4: uuidv4 } = require('uuid');

class DeleteAccessUseCase {
  constructor(accessRepository, eventRepository) {
    this.accessRepository = accessRepository;
    this.eventRepository = eventRepository;
  }

  async execute(input) {
    const { id, userId } = input;

    // Find existing access
    const access = await this.accessRepository.findById(id);
    if (!access) {
      return false;
    }

    // Deactivate access (soft delete)
    const success = await this.accessRepository.deactivate(id);
    if (!success) {
      return false;
    }

    // Create system event
    const event = {
      id: uuidv4(),
      buildingId: access.buildingId,
      type: 'system',
      description: `Access deactivated for ${access.name}`,
      severity: 'low',
      resolved: false,
      userId,
      metadata: { accessId: access.id },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.eventRepository.create(event);

    return true;
  }
}

module.exports = { DeleteAccessUseCase };