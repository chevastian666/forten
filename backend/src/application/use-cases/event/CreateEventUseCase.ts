import { IEventRepository } from '../../../domain/repositories/IEventRepository';
import { IEventService } from '../../../domain/services/IEventService';
import { Event, EventType, EventSeverity } from '../../../domain/entities/Event';
import { v4 as uuidv4 } from 'uuid';

export interface CreateEventUseCaseInput {
  buildingId: string;
  userId?: string;
  type: EventType;
  description: string;
  metadata?: Record<string, any>;
  severity?: EventSeverity;
}

export class CreateEventUseCase {
  constructor(
    private eventRepository: IEventRepository,
    private eventService: IEventService
  ) {}

  async execute(input: CreateEventUseCaseInput): Promise<Event> {
    // Create event entity
    const event = new Event(
      uuidv4(),
      input.buildingId,
      input.type,
      input.description,
      input.severity || 'low',
      false,
      input.userId,
      input.metadata
    );

    // Save event
    const savedEvent = await this.eventRepository.create(event);

    // Publish event for real-time updates
    try {
      await this.eventService.publish(savedEvent);
    } catch (error) {
      // Log error but don't fail the operation
      console.error('Failed to publish event:', error);
    }

    return savedEvent;
  }
}