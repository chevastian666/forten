// JavaScript wrapper for UpdateAccessUseCase
const { v4: uuidv4 } = require('uuid');

class UpdateAccessUseCase {
  constructor(accessRepository, eventRepository) {
    this.accessRepository = accessRepository;
    this.eventRepository = eventRepository;
  }

  async execute(input) {
    const { id, userId, ...updateData } = input;

    // Find existing access
    const existingAccess = await this.accessRepository.findById(id);
    if (!existingAccess) {
      return null;
    }

    // Update access
    const updatedAccess = await this.accessRepository.update(id, updateData);
    if (!updatedAccess) {
      return null;
    }

    // Create system event
    const event = {
      id: uuidv4(),
      buildingId: updatedAccess.buildingId,
      type: 'system',
      description: `Access updated for ${updatedAccess.name}`,
      severity: 'low',
      resolved: false,
      userId,
      metadata: {
        accessId: updatedAccess.id,
        updates: Object.keys(updateData)
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.eventRepository.create(event);

    return updatedAccess;
  }
}

module.exports = { UpdateAccessUseCase };