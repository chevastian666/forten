import { IEventRepository } from '../../../domain/repositories/IEventRepository';
import { Event } from '../../../domain/entities/Event';

export interface GetEventByIdUseCaseInput {
  eventId: string;
}

export class GetEventByIdUseCase {
  constructor(private eventRepository: IEventRepository) {}

  async execute(input: GetEventByIdUseCaseInput): Promise<Event> {
    const event = await this.eventRepository.findById(input.eventId);
    
    if (!event) {
      throw new Error('Event not found');
    }
    
    return event;
  }
}