import { IEventRepository } from '../../../domain/repositories/IEventRepository';
import { Event } from '../../../domain/entities/Event';

export interface UpdateEventUseCaseInput {
  eventId: string;
  data: Partial<{
    type: string;
    description: string;
    metadata: Record<string, any>;
    severity: string;
    resolved: boolean;
  }>;
}

export class UpdateEventUseCase {
  constructor(private eventRepository: IEventRepository) {}

  async execute(input: UpdateEventUseCaseInput): Promise<Event> {
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