// JavaScript wrapper for UpdateEventUseCase

class UpdateEventUseCase {
  constructor(eventRepository) {
    this.eventRepository = eventRepository;
  }

  async execute(input) {
    const { eventId, data } = input;
    
    // Find event to ensure it exists
    const existingEvent = await this.eventRepository.findById(eventId);
    if (!existingEvent) {
      throw new Error('Event not found');
    }
    
    // Update event
    const updatedEvent = await this.eventRepository.update(eventId, {
      ...data,
      updatedAt: new Date()
    });
    
    if (!updatedEvent) {
      throw new Error('Failed to update event');
    }
    
    return updatedEvent;
  }
}

module.exports = { UpdateEventUseCase };