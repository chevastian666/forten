import { CreateBuildingUseCase } from '../../../../src/application/use-cases/building/CreateBuildingUseCase';
import { MockBuildingRepository } from '../../../mocks/repositories/MockBuildingRepository';
import { MockEventRepository } from '../../../mocks/repositories/MockEventRepository';
import { Building } from '../../../../src/domain/entities/Building';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid')
}));

describe('CreateBuildingUseCase', () => {
  let createBuildingUseCase: CreateBuildingUseCase;
  let mockBuildingRepository: MockBuildingRepository;
  let mockEventRepository: MockEventRepository;

  beforeEach(() => {
    mockBuildingRepository = new MockBuildingRepository();
    mockEventRepository = new MockEventRepository();
    createBuildingUseCase = new CreateBuildingUseCase(
      mockBuildingRepository, 
      mockEventRepository
    );
  });

  afterEach(() => {
    mockBuildingRepository.clear();
    mockEventRepository.clear();
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should create a building with all required fields', async () => {
      // Arrange
      const input = {
        name: 'Test Building',
        address: '123 Test Street',
        city: 'Test City',
        userId: 'user-1'
      };

      // Act
      const result = await createBuildingUseCase.execute(input);

      // Assert
      expect(result).toBeInstanceOf(Building);
      expect(result.id).toBe('mock-uuid');
      expect(result.name).toBe(input.name);
      expect(result.address).toBe(input.address);
      expect(result.city).toBe(input.city);
      expect(result.country).toBe('Uruguay');
      expect(result.status).toBe('prospect');
      expect(result.totalUnits).toBe(0);
      expect(result.totalCameras).toBe(0);
    });

    it('should create a building with all optional fields', async () => {
      // Arrange
      const input = {
        name: 'Test Building',
        address: '123 Test Street',
        city: 'Test City',
        country: 'Argentina',
        postalCode: '12345',
        phone: '+5491234567890',
        email: 'building@test.com',
        totalUnits: 50,
        totalCameras: 10,
        notes: 'Test notes',
        userId: 'user-1'
      };

      // Act
      const result = await createBuildingUseCase.execute(input);

      // Assert
      expect(result.country).toBe(input.country);
      expect(result.postalCode).toBe(input.postalCode);
      expect(result.phone).toBe(input.phone);
      expect(result.email).toBe(input.email);
      expect(result.totalUnits).toBe(input.totalUnits);
      expect(result.totalCameras).toBe(input.totalCameras);
      expect(result.notes).toBe(input.notes);
    });

    it('should create a system event when building is created', async () => {
      // Arrange
      const input = {
        name: 'Test Building',
        address: '123 Test Street',
        city: 'Test City',
        userId: 'user-1'
      };

      // Act
      await createBuildingUseCase.execute(input);

      // Assert
      const events = await mockEventRepository.findAll();
      expect(events.data).toHaveLength(1);
      const event = events.data[0];
      expect(event.buildingId).toBe('mock-uuid');
      expect(event.type).toBe('system');
      expect(event.description).toBe('Building Test Building created');
      expect(event.severity).toBe('low');
      expect(event.userId).toBe(input.userId);
      expect(event.metadata).toEqual({ action: 'building_created' });
    });

    it('should persist the building in the repository', async () => {
      // Arrange
      const input = {
        name: 'Test Building',
        address: '123 Test Street',
        city: 'Test City',
        userId: 'user-1'
      };

      // Act
      const result = await createBuildingUseCase.execute(input);

      // Assert
      const savedBuilding = await mockBuildingRepository.findById(result.id);
      expect(savedBuilding).not.toBeNull();
      expect(savedBuilding?.name).toBe(input.name);
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      const input = {
        name: 'Test Building',
        address: '123 Test Street',
        city: 'Test City',
        userId: 'user-1'
      };

      mockBuildingRepository.create = jest.fn().mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(createBuildingUseCase.execute(input)).rejects.toThrow('Database error');
    });

    it('should handle event creation errors without failing building creation', async () => {
      // Arrange
      const input = {
        name: 'Test Building',
        address: '123 Test Street',
        city: 'Test City',
        userId: 'user-1'
      };

      mockEventRepository.create = jest.fn().mockRejectedValue(new Error('Event error'));

      // Act
      const result = await createBuildingUseCase.execute(input);

      // Assert - Building should still be created even if event fails
      expect(result).toBeInstanceOf(Building);
      expect(result.name).toBe(input.name);
    });

    it('should use default values when optional fields are not provided', async () => {
      // Arrange
      const input = {
        name: 'Test Building',
        address: '123 Test Street',
        city: 'Test City',
        userId: 'user-1'
      };

      // Act
      const result = await createBuildingUseCase.execute(input);

      // Assert
      expect(result.country).toBe('Uruguay');
      expect(result.status).toBe('prospect');
      expect(result.totalUnits).toBe(0);
      expect(result.totalCameras).toBe(0);
      expect(result.postalCode).toBeUndefined();
      expect(result.phone).toBeUndefined();
      expect(result.email).toBeUndefined();
      expect(result.notes).toBeUndefined();
    });
  });
});