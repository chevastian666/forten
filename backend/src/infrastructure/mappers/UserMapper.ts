import { User, UserRole } from '../../domain/entities/User';

export class UserMapper {
  static toDomain(raw: any): User {
    return new User(
      raw.id,
      raw.email,
      raw.password,
      raw.firstName,
      raw.lastName,
      raw.role as UserRole,
      raw.isActive,
      raw.lastLogin ? new Date(raw.lastLogin) : undefined,
      new Date(raw.createdAt),
      new Date(raw.updatedAt)
    );
  }

  static toPersistence(user: User): any {
    return {
      id: user.id,
      email: user.email,
      password: user.password,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}