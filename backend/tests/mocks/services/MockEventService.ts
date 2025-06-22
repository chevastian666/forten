import { IEventService } from '../../../src/domain/services/IEventService';
import { Event } from '../../../src/domain/entities/Event';

export class MockEventService implements IEventService {
  private publishedEvents: Event[] = [];
  private subscribers: Map<string, (event: Event) => void> = new Map();

  async publish(event: Event): Promise<void> {
    this.publishedEvents.push(event);
    
    // Notify subscribers for this building
    const callback = this.subscribers.get(event.buildingId);
    if (callback) {
      callback(event);
    }
  }

  subscribe(buildingId: string, callback: (event: Event) => void): void {
    this.subscribers.set(buildingId, callback);
  }

  unsubscribe(buildingId: string): void {
    this.subscribers.delete(buildingId);
  }

  // Helper method for tests
  getPublishedEvents(): Event[] {
    return this.publishedEvents;
  }

  // Helper method for tests
  clear(): void {
    this.publishedEvents = [];
    this.subscribers.clear();
  }
}