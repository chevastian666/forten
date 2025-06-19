import { IEventRepository } from '../../../domain/repositories/IEventRepository';
import { Event } from '../../../domain/entities/Event';

export interface ResolveEventUseCaseInput {
  eventId: string;
  userId: string;
}

export class ResolveEventUseCase {
  constructor(private eventRepository: IEventRepository) {}

  async execute(input: ResolveEventUseCaseInput): Promise<Event> {
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
    event.resolve(userId);

    // Update in repository
    const updatedEvent = await this.eventRepository.update(eventId, {
      resolved: event.resolved,
      resolvedAt: event.resolvedAt,
      resolvedBy: event.resolvedBy,
      updatedAt: event.updatedAt,
    });

    if (!updatedEvent) {
      throw new Error('Failed to resolve event');
    }

    return updatedEvent;
  }
}