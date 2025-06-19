import { User } from '../entities/User';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(filters?: {
    role?: string;
    isActive?: boolean;
  }): Promise<User[]>;
  create(user: User): Promise<User>;
  update(id: string, user: Partial<User>): Promise<User | null>;
  delete(id: string): Promise<boolean>;
  updateLastLogin(id: string): Promise<void>;
  updateRefreshToken(id: string, token: string | null): Promise<void>;
}