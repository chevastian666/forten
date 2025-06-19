import { User } from '../../domain/entities/User';
import { UserDTO } from '../dtos/UserDTO';

export class UserMapper {
  static toDTO(user: User): UserDTO {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin?.toISOString(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  static toDomain(data: any): User {
    return new User(
      data.id,
      data.email,
      data.password,
      data.firstName,
      data.lastName,
      data.role,
      data.isActive,
      data.lastLogin ? new Date(data.lastLogin) : undefined,
      new Date(data.createdAt),
      new Date(data.updatedAt)
    );
  }
}