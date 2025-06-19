import { LoginUseCase } from '../../../../src/application/use-cases/auth/LoginUseCase';
import { MockUserRepository } from '../../../mocks/repositories/MockUserRepository';
import { MockAuthService } from '../../../mocks/services/MockAuthService';
import { User } from '../../../../src/domain/entities/User';

describe('LoginUseCase', () => {
  let loginUseCase: LoginUseCase;
  let mockUserRepository: MockUserRepository;
  let mockAuthService: MockAuthService;

  beforeEach(() => {
    mockUserRepository = new MockUserRepository();
    mockAuthService = new MockAuthService();
    loginUseCase = new LoginUseCase(mockUserRepository, mockAuthService);
  });

  afterEach(() => {
    mockUserRepository.clear();
    mockAuthService.clear();
  });

  describe('execute', () => {
    it('should successfully login with valid credentials', async () => {
      // Arrange
      const user = new User(
        '1',
        'test@example.com',
        'hashed-password123',
        'Test',
        'User',
        'operator',
        true,
        undefined,
        undefined,
        new Date(),
        new Date()
      );
      mockUserRepository.addUser(user);

      const input = {
        email: 'test@example.com',
        password: 'password123'
      };

      // Mock methods
      mockUserRepository.updateLastLogin = jest.fn();
      mockUserRepository.updateRefreshToken = jest.fn();
      mockAuthService.generateAccessToken = jest.fn().mockReturnValue('access-token');
      mockAuthService.generateRefreshToken = jest.fn().mockReturnValue('refresh-token');

      // Act
      const result = await loginUseCase.execute(input);

      // Assert
      expect(result.user.email).toBe(user.email);
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(mockUserRepository.updateLastLogin).toHaveBeenCalledWith(user.id);
      expect(mockUserRepository.updateRefreshToken).toHaveBeenCalledWith(user.id, 'refresh-token');
    });

    it('should throw error when user not found', async () => {
      // Arrange
      const input = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      // Act & Assert
      await expect(loginUseCase.execute(input)).rejects.toThrow('Invalid credentials');
    });

    it('should throw error when user is inactive', async () => {
      // Arrange
      const user = new User(
        '1',
        'test@example.com',
        'hashed-password123',
        'Test',
        'User',
        'operator',
        false,
        undefined,
        undefined,
        new Date(),
        new Date()
      );
      mockUserRepository.addUser(user);

      const input = {
        email: 'test@example.com',
        password: 'password123'
      };

      // Act & Assert
      await expect(loginUseCase.execute(input)).rejects.toThrow('User account is deactivated');
    });

    it('should throw error when password is incorrect', async () => {
      // Arrange
      const user = new User(
        '1',
        'test@example.com',
        'hashed-password123',
        'Test',
        'User',
        'operator',
        true,
        undefined,
        undefined,
        new Date(),
        new Date()
      );
      mockUserRepository.addUser(user);

      const input = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      // Mock password comparison to return false
      mockAuthService.comparePassword = jest.fn().mockResolvedValue(false);

      // Act & Assert
      await expect(loginUseCase.execute(input)).rejects.toThrow('Invalid credentials');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const input = {
        email: 'test@example.com',
        password: 'password123'
      };

      mockUserRepository.findByEmail = jest.fn().mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(loginUseCase.execute(input)).rejects.toThrow('Database error');
    });
  });
});