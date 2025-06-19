// JavaScript wrapper for GetEventByIdUseCase

class GetEventByIdUseCase {
  constructor(eventRepository) {
    this.eventRepository = eventRepository;
  }

  async execute(input) {
    const event = await this.eventRepository.findById(input.eventId);
    
    if (!event) {
      throw new Error('Event not found');
    }
    
    return event;
  }
}

module.exports = { GetEventByIdUseCase };