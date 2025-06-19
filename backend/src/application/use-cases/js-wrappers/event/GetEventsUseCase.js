// JavaScript wrapper for GetEventsUseCase

class GetEventsUseCase {
  constructor(eventRepository) {
    this.eventRepository = eventRepository;
  }

  async execute(input = {}) {
    const { filters = {}, pagination = { page: 1, limit: 20 } } = input;
    return await this.eventRepository.findAll(filters, pagination);
  }
}

module.exports = { GetEventsUseCase };