import { 
  IAccessRepository, 
  AccessFilters 
} from '../../domain/repositories/IAccessRepository';
import { PaginationOptions, PaginatedResult } from '../../domain/repositories/IBuildingRepository';
import { Access } from '../../domain/entities/Access';
import { AccessMapper } from '../mappers/AccessMapper';
import { Op } from 'sequelize';

// Import the Sequelize model
const AccessModel = require('../../models/Access');

export class SequelizeAccessRepository implements IAccessRepository {
  async findById(id: string): Promise<Access | null> {
    try {
      const accessRecord = await AccessModel.findByPk(id);
      if (!accessRecord) {
        return null;
      }
      return AccessMapper.toDomain(accessRecord.toJSON());
    } catch (error) {
      console.error('Error finding access by id:', error);
      throw new Error('Failed to find access');
    }
  }

  async findByPin(pin: string): Promise<Access | null> {
    try {
      const accessRecord = await AccessModel.findOne({
        where: { pin }
      });
      if (!accessRecord) {
        return null;
      }
      return AccessMapper.toDomain(accessRecord.toJSON());
    } catch (error) {
      console.error('Error finding access by pin:', error);
      throw new Error('Failed to find access by pin');
    }
  }

  async findAll(
    filters?: AccessFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Access>> {
    try {
      const where: any = {};
      
      if (filters?.buildingId) {
        where.buildingId = filters.buildingId;
      }
      
      if (filters?.type) {
        where.type = filters.type;
      }
      
      if (filters?.isActive !== undefined) {
        where.isActive = filters.isActive;
      }
      
      if (filters?.validDate) {
        where.validFrom = {
          [Op.lte]: filters.validDate
        };
        where.validUntil = {
          [Op.gte]: filters.validDate
        };
      }
      
      // Set default pagination values
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const offset = (page - 1) * limit;
      
      const { count, rows } = await AccessModel.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });
      
      const accesses = rows.map((record: any) => AccessMapper.toDomain(record.toJSON()));
      
      return {
        data: accesses,
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      console.error('Error finding all accesses:', error);
      throw new Error('Failed to find accesses');
    }
  }

  async create(access: Access): Promise<Access> {
    try {
      const accessData = AccessMapper.toPersistence(access);
      const accessRecord = await AccessModel.create(accessData);
      return AccessMapper.toDomain(accessRecord.toJSON());
    } catch (error) {
      console.error('Error creating access:', error);
      throw new Error('Failed to create access');
    }
  }

  async update(id: string, access: Partial<Access>): Promise<Access | null> {
    try {
      const accessRecord = await AccessModel.findByPk(id);
      if (!accessRecord) {
        return null;
      }
      
      // Remove undefined values and prepare update data
      const updateData: any = {};
      Object.keys(access).forEach(key => {
        if (access[key as keyof Access] !== undefined) {
          updateData[key] = access[key as keyof Access];
        }
      });
      
      await accessRecord.update(updateData);
      return AccessMapper.toDomain(accessRecord.toJSON());
    } catch (error) {
      console.error('Error updating access:', error);
      throw new Error('Failed to update access');
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await AccessModel.destroy({
        where: { id }
      });
      return result > 0;
    } catch (error) {
      console.error('Error deleting access:', error);
      throw new Error('Failed to delete access');
    }
  }

  async deactivate(id: string): Promise<boolean> {
    try {
      const result = await AccessModel.update(
        { isActive: false },
        { where: { id } }
      );
      return result[0] > 0;
    } catch (error) {
      console.error('Error deactivating access:', error);
      throw new Error('Failed to deactivate access');
    }
  }

  async incrementUsage(id: string): Promise<boolean> {
    try {
      const accessRecord = await AccessModel.findByPk(id);
      if (!accessRecord) {
        return false;
      }
      
      await accessRecord.increment('currentUses');
      return true;
    } catch (error) {
      console.error('Error incrementing access usage:', error);
      throw new Error('Failed to increment access usage');
    }
  }

  async generateUniquePin(): Promise<string> {
    try {
      let pin: string;
      let isUnique = false;
      
      while (!isUnique) {
        // Generate a random 6-digit pin
        pin = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Check if pin already exists
        const existing = await AccessModel.findOne({
          where: { pin }
        });
        
        if (!existing) {
          isUnique = true;
        }
      }
      
      return pin!;
    } catch (error) {
      console.error('Error generating unique pin:', error);
      throw new Error('Failed to generate unique pin');
    }
  }

  async findActiveByBuilding(buildingId: string): Promise<Access[]> {
    try {
      const now = new Date();
      const accessRecords = await AccessModel.findAll({
        where: {
          buildingId,
          isActive: true,
          validFrom: {
            [Op.lte]: now
          },
          validUntil: {
            [Op.gte]: now
          }
        },
        order: [['createdAt', 'DESC']]
      });
      
      return accessRecords.map((record: any) => AccessMapper.toDomain(record.toJSON()));
    } catch (error) {
      console.error('Error finding active accesses by building:', error);
      throw new Error('Failed to find active accesses by building');
    }
  }
}