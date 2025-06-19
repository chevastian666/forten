import { IUserRepository } from '../../../src/domain/repositories/IUserRepository';
import { User } from '../../../src/domain/entities/User';

export class MockUserRepository implements IUserRepository {
  private users: User[] = [];

  async findById(id: string): Promise<User | null> {
    return this.users.find(user => user.id === id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find(user => user.email === email) || null;
  }

  async create(user: User): Promise<User> {
    this.users.push(user);
    return user;
  }

  async update(id: string, userData: Partial<User>): Promise<User | null> {
    const index = this.users.findIndex(u => u.id === id);
    if (index < 0) return null;
    
    this.users[index] = { ...this.users[index], ...userData } as User;
    return this.users[index];
  }

  async delete(id: string): Promise<boolean> {
    const initialLength = this.users.length;
    this.users = this.users.filter(user => user.id !== id);
    return this.users.length < initialLength;
  }

  async findAll(filters?: { role?: string; isActive?: boolean }): Promise<User[]> {
    let result = [...this.users];
    
    if (filters?.role) {
      result = result.filter(user => user.role === filters.role);
    }
    
    if (filters?.isActive !== undefined) {
      result = result.filter(user => user.isActive === filters.isActive);
    }
    
    return result;
  }

  async updateLastLogin(id: string): Promise<void> {
    const user = this.users.find(u => u.id === id);
    if (user) {
      user.lastLogin = new Date();
    }
  }

  async updateRefreshToken(id: string, token: string | null): Promise<void> {
    const user = this.users.find(u => u.id === id);
    if (user) {
      user.refreshToken = token;
    }
  }

  // Helper method for tests
  addUser(user: User): void {
    this.users.push(user);
  }

  // Helper method for tests
  clear(): void {
    this.users = [];
  }
}