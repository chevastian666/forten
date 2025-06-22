import { Event } from '../entities/Event';

export interface IEventService {
  publish(event: Event): Promise<void>;
  subscribe(buildingId: string, callback: (event: Event) => void): void;
  unsubscribe(buildingId: string): void;
}