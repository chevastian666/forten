import { Role } from '../entities/Role';

export interface IRoleRepository {
  create(role: Role): Promise<Role>;
  update(role: Role): Promise<Role>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Role | null>;
  findByName(name: string): Promise<Role | null>;
  findAll(params?: {
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<{ roles: Role[]; total: number }>;
  findByUserId(userId: string): Promise<Role[]>;
  assignToUser(userId: string, roleId: string): Promise<void>;
  removeFromUser(userId: string, roleId: string): Promise<void>;
  existsByName(name: string): Promise<boolean>;
  countRoles(): Promise<number>;
}