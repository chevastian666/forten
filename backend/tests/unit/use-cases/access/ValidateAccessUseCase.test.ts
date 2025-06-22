import { ValidateAccessUseCase } from '../../../../src/application/use-cases/access/ValidateAccessUseCase';
import { MockAccessRepository } from '../../../mocks/repositories/MockAccessRepository';
import { MockEventRepository } from '../../../mocks/repositories/MockEventRepository';
import { Access } from '../../../../src/domain/entities/Access';
import { Event } from '../../../../src/domain/entities/Event';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-validation-uuid')
}));

describe('ValidateAccessUseCase', () => {
  let validateAccessUseCase: ValidateAccessUseCase;
  let mockAccessRepository: MockAccessRepository;
  let mockEventRepository: MockEventRepository;

  beforeEach(() => {
    mockAccessRepository = new MockAccessRepository();
    mockEventRepository = new MockEventRepository();
    validateAccessUseCase = new ValidateAccessUseCase(
      mockAccessRepository,
      mockEventRepository
    );
  });

  afterEach(() => {
    mockAccessRepository.clear();
    mockEventRepository.clear();
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should validate a valid PIN successfully', async () => {
      // Arrange
      const validFrom = new Date();
      validFrom.setDate(validFrom.getDate() - 1);
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 1);

      const access = new Access(
        'access-1',
        'building-1',
        '123456',
        'John Doe',
        'visitor',
        validFrom,
        validUntil,
        5,
        0,
        true
      );
      mockAccessRepository.addAccess(access);

      const input = {
        pin: '123456',
        buildingId: 'building-1'
      };

      // Act
      const result = await validateAccessUseCase.execute(input);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.access).toBeDefined();
      expect(result.access?.name).toBe('John Doe');
      expect(result.access?.type).toBe('visitor');
      expect(result.access?.remainingUses).toBe(4); // 5 - 1
      expect(result.error).toBeUndefined();
    });

    it('should increment usage count on successful validation', async () => {
      // Arrange
      const validFrom = new Date();
      validFrom.setDate(validFrom.getDate() - 1);
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 1);

      const access = new Access(
        'access-1',
        'building-1',
        '123456',
        'John Doe',
        'visitor',
        validFrom,
        validUntil,
        3,
        1,
        true
      );
      mockAccessRepository.addAccess(access);

      // Act
      await validateAccessUseCase.execute({ pin: '123456' });

      // Assert
      const updatedAccess = await mockAccessRepository.findById('access-1');
      expect(updatedAccess?.currentUses).toBe(2);
    });

    it('should create a success event on valid access', async () => {
      // Arrange
      const validFrom = new Date();
      validFrom.setDate(validFrom.getDate() - 1);
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 1);

      const access = new Access(
        'access-1',
        'building-1',
        '123456',
        'Jane Smith',
        'temporary',
        validFrom,
        validUntil,
        10,
        3,
        true
      );
      mockAccessRepository.addAccess(access);

      // Act
      await validateAccessUseCase.execute({ pin: '123456' });

      // Assert
      const events = await mockEventRepository.findAll();
      expect(events.data).toHaveLength(1);
      const event = events.data[0];
      expect(event.type).toBe('access_granted');
      expect(event.description).toBe('Access granted to Jane Smith');
      expect(event.buildingId).toBe('building-1');
      expect(event.severity).toBe('low');
      expect(event.metadata).toEqual({
        accessId: 'access-1',
        currentUses: 4,
        maxUses: 10
      });
    });

    it('should reject invalid PIN', async () => {
      // Arrange
      const input = {
        pin: '999999',
        buildingId: 'building-1'
      };

      // Act
      const result = await validateAccessUseCase.execute(input);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid PIN');
      expect(result.access).toBeUndefined();
    });

    it('should create a failure event for invalid PIN', async () => {
      // Arrange
      const input = {
        pin: '999999',
        buildingId: 'building-1'
      };

      // Act
      await validateAccessUseCase.execute(input);

      // Assert
      const events = await mockEventRepository.findAll();
      expect(events.data).toHaveLength(1);
      const event = events.data[0];
      expect(event.type).toBe('access_denied');
      expect(event.description).toBe('Invalid PIN attempted');
      expect(event.severity).toBe('medium');
      expect(event.metadata).toEqual({ pin: '999999' });
    });

    it('should reject PIN for wrong building', async () => {
      // Arrange
      const validFrom = new Date();
      validFrom.setDate(validFrom.getDate() - 1);
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 1);

      const access = new Access(
        'access-1',
        'building-1',
        '123456',
        'John Doe',
        'visitor',
        validFrom,
        validUntil,
        5,
        0,
        true
      );
      mockAccessRepository.addAccess(access);

      const input = {
        pin: '123456',
        buildingId: 'building-2' // Different building
      };

      // Act
      const result = await validateAccessUseCase.execute(input);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.error).toBe('PIN not valid for this building');
    });

    it('should reject expired access', async () => {
      // Arrange
      const validFrom = new Date();
      validFrom.setDate(validFrom.getDate() - 10);
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() - 1); // Expired yesterday

      const access = new Access(
        'access-1',
        'building-1',
        '123456',
        'John Doe',
        'visitor',
        validFrom,
        validUntil,
        5,
        0,
        true
      );
      mockAccessRepository.addAccess(access);

      // Act
      const result = await validateAccessUseCase.execute({ pin: '123456' });

      // Assert
      expect(result.valid).toBe(false);
      expect(result.error).toBe('PIN expired or inactive');
    });

    it('should reject inactive access', async () => {
      // Arrange
      const validFrom = new Date();
      validFrom.setDate(validFrom.getDate() - 1);
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 1);

      const access = new Access(
        'access-1',
        'building-1',
        '123456',
        'John Doe',
        'visitor',
        validFrom,
        validUntil,
        5,
        0,
        false // Inactive
      );
      mockAccessRepository.addAccess(access);

      // Act
      const result = await validateAccessUseCase.execute({ pin: '123456' });

      // Assert
      expect(result.valid).toBe(false);
      expect(result.error).toBe('PIN expired or inactive');
    });

    it('should reject access with no remaining uses', async () => {
      // Arrange
      const validFrom = new Date();
      validFrom.setDate(validFrom.getDate() - 1);
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 1);

      const access = new Access(
        'access-1',
        'building-1',
        '123456',
        'John Doe',
        'visitor',
        validFrom,
        validUntil,
        3,
        3, // All uses consumed
        true
      );
      mockAccessRepository.addAccess(access);

      // Act
      const result = await validateAccessUseCase.execute({ pin: '123456' });

      // Assert
      expect(result.valid).toBe(false);
      expect(result.error).toBe('PIN expired or inactive');
    });

    it('should create appropriate event for rejected access with reason', async () => {
      // Arrange
      const validFrom = new Date();
      validFrom.setDate(validFrom.getDate() - 1);
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 1);

      const access = new Access(
        'access-1',
        'building-1',
        '123456',
        'John Doe',
        'visitor',
        validFrom,
        validUntil,
        1,
        1, // No remaining uses
        true
      );
      mockAccessRepository.addAccess(access);

      // Act
      await validateAccessUseCase.execute({ pin: '123456' });

      // Assert
      const events = await mockEventRepository.findAll();
      const event = events.data[0];
      expect(event.type).toBe('access_denied');
      expect(event.description).toBe('Expired or inactive PIN used by John Doe');
      expect(event.metadata?.reason).toBe('no_remaining_uses');
    });

    it('should work without buildingId parameter', async () => {
      // Arrange
      const validFrom = new Date();
      validFrom.setDate(validFrom.getDate() - 1);
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 1);

      const access = new Access(
        'access-1',
        'building-1',
        '123456',
        'John Doe',
        'visitor',
        validFrom,
        validUntil,
        5,
        0,
        true
      );
      mockAccessRepository.addAccess(access);

      // Act
      const result = await validateAccessUseCase.execute({ pin: '123456' });

      // Assert
      expect(result.valid).toBe(true);
      expect(result.access?.name).toBe('John Doe');
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      mockAccessRepository.findByPin = jest.fn().mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(validateAccessUseCase.execute({ pin: '123456' }))
        .rejects.toThrow('Database error');
    });

    it('should validate different access types', async () => {
      // Arrange
      const accessTypes = ['visitor', 'temporary', 'service', 'emergency'] as const;
      const validFrom = new Date();
      validFrom.setDate(validFrom.getDate() - 1);
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 1);

      for (let i = 0; i < accessTypes.length; i++) {
        const access = new Access(
          `access-${i}`,
          'building-1',
          `00000${i}`,
          `Test ${accessTypes[i]}`,
          accessTypes[i],
          validFrom,
          validUntil,
          5,
          0,
          true
        );
        mockAccessRepository.addAccess(access);
      }

      // Act & Assert
      for (let i = 0; i < accessTypes.length; i++) {
        const result = await validateAccessUseCase.execute({ pin: `00000${i}` });
        expect(result.valid).toBe(true);
        expect(result.access?.type).toBe(accessTypes[i]);
      }
    });
  });
});