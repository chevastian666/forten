// JavaScript wrapper for CreateEventUseCase
const { v4: uuidv4 } = require('uuid');

class CreateEventUseCase {
  constructor(eventRepository, eventService) {
    this.eventRepository = eventRepository;
    this.eventService = eventService;
  }

  async execute(input) {
    const event = {
      id: uuidv4(),
      buildingId: input.buildingId,
      userId: input.userId,
      type: input.type,
      description: input.description,
      metadata: input.metadata || {},
      severity: input.severity || 'low',
      resolved: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save event
    const savedEvent = await this.eventRepository.create(event);

    // Publish event for real-time updates
    if (this.eventService) {
      await this.eventService.publish(savedEvent);
    }

    return savedEvent;
  }
}

module.exports = { CreateEventUseCase };