import { User } from '../entities/User';

export interface IUserRepository {
  create(user: User): Promise<User>;
  update(user: User): Promise<User>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByEmailVerificationToken(token: string): Promise<User | null>;
  findByPasswordResetToken(token: string): Promise<User | null>;
  findAll(params?: {
    limit?: number;
    offset?: number;
    search?: string;
    isActive?: boolean;
    roleId?: string;
  }): Promise<{ users: User[]; total: number }>;
  existsByEmail(email: string): Promise<boolean>;
  existsByUsername(username: string): Promise<boolean>;
  countActiveUsers(): Promise<number>;
}