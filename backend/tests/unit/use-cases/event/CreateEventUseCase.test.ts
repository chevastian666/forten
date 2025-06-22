import { CreateEventUseCase } from '../../../../src/application/use-cases/event/CreateEventUseCase';
import { MockEventRepository } from '../../../mocks/repositories/MockEventRepository';
import { MockEventService } from '../../../mocks/services/MockEventService';
import { Event } from '../../../../src/domain/entities/Event';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-event-uuid')
}));

describe('CreateEventUseCase', () => {
  let createEventUseCase: CreateEventUseCase;
  let mockEventRepository: MockEventRepository;
  let mockEventService: MockEventService;

  beforeEach(() => {
    mockEventRepository = new MockEventRepository();
    mockEventService = new MockEventService();
    createEventUseCase = new CreateEventUseCase(
      mockEventRepository,
      mockEventService
    );
  });

  afterEach(() => {
    mockEventRepository.clear();
    mockEventService.clear();
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should create an event with required fields', async () => {
      // Arrange
      const input = {
        buildingId: 'building-1',
        type: 'door_open' as const,
        description: 'Front door opened'
      };

      // Act
      const result = await createEventUseCase.execute(input);

      // Assert
      expect(result).toBeInstanceOf(Event);
      expect(result.id).toBe('mock-event-uuid');
      expect(result.buildingId).toBe(input.buildingId);
      expect(result.type).toBe(input.type);
      expect(result.description).toBe(input.description);
      expect(result.severity).toBe('low');
      expect(result.resolved).toBe(false);
      expect(result.userId).toBeUndefined();
      expect(result.metadata).toBeUndefined();
    });

    it('should create an event with all optional fields', async () => {
      // Arrange
      const input = {
        buildingId: 'building-1',
        userId: 'user-1',
        type: 'alarm' as const,
        description: 'Intrusion alarm triggered',
        metadata: { 
          zone: 'parking', 
          sensor: 'motion-01',
          triggered_at: '2024-01-01T10:00:00Z'
        },
        severity: 'critical' as const
      };

      // Act
      const result = await createEventUseCase.execute(input);

      // Assert
      expect(result.userId).toBe(input.userId);
      expect(result.severity).toBe(input.severity);
      expect(result.metadata).toEqual(input.metadata);
    });

    it('should publish event through event service', async () => {
      // Arrange
      const input = {
        buildingId: 'building-1',
        type: 'visitor_call' as const,
        description: 'Visitor at main entrance'
      };

      // Act
      const result = await createEventUseCase.execute(input);

      // Assert
      const publishedEvents = mockEventService.getPublishedEvents();
      expect(publishedEvents).toHaveLength(1);
      expect(publishedEvents[0]).toBe(result);
    });

    it('should persist event in repository', async () => {
      // Arrange
      const input = {
        buildingId: 'building-1',
        type: 'maintenance' as const,
        description: 'Elevator maintenance required',
        severity: 'medium' as const
      };

      // Act
      const result = await createEventUseCase.execute(input);

      // Assert
      const savedEvent = await mockEventRepository.findById(result.id);
      expect(savedEvent).not.toBeNull();
      expect(savedEvent?.description).toBe(input.description);
    });

    it('should handle different event types correctly', async () => {
      // Arrange
      const eventTypes = [
        'door_open',
        'door_close',
        'visitor_call',
        'resident_call',
        'access_granted',
        'access_denied',
        'camera_view',
        'alarm',
        'maintenance',
        'system'
      ] as const;

      // Act & Assert
      for (const type of eventTypes) {
        const input = {
          buildingId: 'building-1',
          type,
          description: `Test ${type} event`
        };

        const result = await createEventUseCase.execute(input);
        expect(result.type).toBe(type);
      }
    });

    it('should handle different severity levels correctly', async () => {
      // Arrange
      const severityLevels = ['low', 'medium', 'high', 'critical'] as const;

      // Act & Assert
      for (const severity of severityLevels) {
        const input = {
          buildingId: 'building-1',
          type: 'alarm' as const,
          description: 'Test alarm',
          severity
        };

        const result = await createEventUseCase.execute(input);
        expect(result.severity).toBe(severity);
      }
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      const input = {
        buildingId: 'building-1',
        type: 'system' as const,
        description: 'System event'
      };

      mockEventRepository.create = jest.fn().mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(createEventUseCase.execute(input)).rejects.toThrow('Database error');
    });

    it('should continue even if event service fails', async () => {
      // Arrange
      const input = {
        buildingId: 'building-1',
        type: 'system' as const,
        description: 'System event'
      };

      mockEventService.publish = jest.fn().mockRejectedValue(new Error('Service error'));

      // Act
      const result = await createEventUseCase.execute(input);

      // Assert - Event should still be created and saved
      expect(result).toBeInstanceOf(Event);
      const savedEvent = await mockEventRepository.findById(result.id);
      expect(savedEvent).not.toBeNull();
    });

    it('should create events for high-priority scenarios', async () => {
      // Arrange
      const criticalEvent = {
        buildingId: 'building-1',
        type: 'alarm' as const,
        description: 'Fire alarm activated',
        severity: 'critical' as const,
        metadata: {
          location: 'Floor 3',
          alarm_type: 'fire'
        }
      };

      // Act
      const result = await createEventUseCase.execute(criticalEvent);

      // Assert
      expect(result.requiresImmediateAttention()).toBe(true);
    });

    it('should initialize event timestamps correctly', async () => {
      // Arrange
      const beforeTime = new Date();
      const input = {
        buildingId: 'building-1',
        type: 'system' as const,
        description: 'Test event'
      };

      // Act
      const result = await createEventUseCase.execute(input);
      const afterTime = new Date();

      // Assert
      expect(result.createdAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(result.createdAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
      expect(result.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(result.updatedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });
});