import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User } from '../../domain/entities/User';
import { UserMapper } from '../mappers/UserMapper';
import { Op } from 'sequelize';

// Import the Sequelize model
const UserModel = require('../../models/User');

export class SequelizeUserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    try {
      const userRecord = await UserModel.findByPk(id);
      if (!userRecord) {
        return null;
      }
      return UserMapper.toDomain(userRecord.toJSON());
    } catch (error) {
      console.error('Error finding user by id:', error);
      throw new Error('Failed to find user');
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const userRecord = await UserModel.findOne({
        where: { email }
      });
      if (!userRecord) {
        return null;
      }
      return UserMapper.toDomain(userRecord.toJSON());
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw new Error('Failed to find user by email');
    }
  }

  async findAll(filters?: { role?: string; isActive?: boolean }): Promise<User[]> {
    try {
      const where: any = {};
      
      if (filters?.role) {
        where.role = filters.role;
      }
      
      if (filters?.isActive !== undefined) {
        where.isActive = filters.isActive;
      }
      
      const userRecords = await UserModel.findAll({ where });
      return userRecords.map((record: any) => UserMapper.toDomain(record.toJSON()));
    } catch (error) {
      console.error('Error finding all users:', error);
      throw new Error('Failed to find users');
    }
  }

  async create(user: User): Promise<User> {
    try {
      const userData = UserMapper.toPersistence(user);
      const userRecord = await UserModel.create(userData);
      return UserMapper.toDomain(userRecord.toJSON());
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  async update(id: string, user: Partial<User>): Promise<User | null> {
    try {
      const userRecord = await UserModel.findByPk(id);
      if (!userRecord) {
        return null;
      }
      
      // Remove undefined values and prepare update data
      const updateData: any = {};
      Object.keys(user).forEach(key => {
        if (user[key as keyof User] !== undefined) {
          updateData[key] = user[key as keyof User];
        }
      });
      
      await userRecord.update(updateData);
      return UserMapper.toDomain(userRecord.toJSON());
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await UserModel.destroy({
        where: { id }
      });
      return result > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }

  async updateLastLogin(id: string): Promise<void> {
    try {
      await UserModel.update(
        { lastLogin: new Date() },
        { where: { id } }
      );
    } catch (error) {
      console.error('Error updating last login:', error);
      throw new Error('Failed to update last login');
    }
  }

  async updateRefreshToken(id: string, token: string | null): Promise<void> {
    try {
      await UserModel.update(
        { refreshToken: token },
        { where: { id } }
      );
    } catch (error) {
      console.error('Error updating refresh token:', error);
      throw new Error('Failed to update refresh token');
    }
  }
}