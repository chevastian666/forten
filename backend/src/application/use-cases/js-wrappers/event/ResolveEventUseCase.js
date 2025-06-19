// JavaScript wrapper for ResolveEventUseCase

class ResolveEventUseCase {
  constructor(eventRepository) {
    this.eventRepository = eventRepository;
  }

  async execute(input) {
    const { eventId, userId } = input;

    // Find event
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    // Check if already resolved
    if (event.resolved) {
      throw new Error('Event already resolved');
    }

    // Resolve event
    const resolvedEvent = await this.eventRepository.resolve(eventId, userId);
    
    if (!resolvedEvent) {
      throw new Error('Failed to resolve event');
    }

    return resolvedEvent;
  }
}

module.exports = { ResolveEventUseCase };