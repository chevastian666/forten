import { 
  IBuildingRepository, 
  BuildingFilters, 
  PaginationOptions, 
  PaginatedResult 
} from '../../domain/repositories/IBuildingRepository';
import { Building } from '../../domain/entities/Building';
import { BuildingMapper } from '../mappers/BuildingMapper';
import { Op } from 'sequelize';

// Import the Sequelize model
const BuildingModel = require('../../models/Building');

export class SequelizeBuildingRepository implements IBuildingRepository {
  async findById(id: string): Promise<Building | null> {
    try {
      const buildingRecord = await BuildingModel.findByPk(id);
      if (!buildingRecord) {
        return null;
      }
      return BuildingMapper.toDomain(buildingRecord.toJSON());
    } catch (error) {
      console.error('Error finding building by id:', error);
      throw new Error('Failed to find building');
    }
  }

  async findAll(
    filters?: BuildingFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Building>> {
    try {
      const where: any = {};
      
      if (filters?.status) {
        where.status = filters.status;
      }
      
      if (filters?.city) {
        where.city = filters.city;
      }
      
      if (filters?.search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${filters.search}%` } },
          { address: { [Op.iLike]: `%${filters.search}%` } },
          { city: { [Op.iLike]: `%${filters.search}%` } }
        ];
      }
      
      // Set default pagination values
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const offset = (page - 1) * limit;
      
      const { count, rows } = await BuildingModel.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });
      
      const buildings = rows.map((record: any) => BuildingMapper.toDomain(record.toJSON()));
      
      return {
        data: buildings,
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      console.error('Error finding all buildings:', error);
      throw new Error('Failed to find buildings');
    }
  }

  async create(building: Building): Promise<Building> {
    try {
      const buildingData = BuildingMapper.toPersistence(building);
      const buildingRecord = await BuildingModel.create(buildingData);
      return BuildingMapper.toDomain(buildingRecord.toJSON());
    } catch (error) {
      console.error('Error creating building:', error);
      throw new Error('Failed to create building');
    }
  }

  async update(id: string, building: Partial<Building>): Promise<Building | null> {
    try {
      const buildingRecord = await BuildingModel.findByPk(id);
      if (!buildingRecord) {
        return null;
      }
      
      // Remove undefined values and prepare update data
      const updateData: any = {};
      Object.keys(building).forEach(key => {
        if (building[key as keyof Building] !== undefined) {
          updateData[key] = building[key as keyof Building];
        }
      });
      
      await buildingRecord.update(updateData);
      return BuildingMapper.toDomain(buildingRecord.toJSON());
    } catch (error) {
      console.error('Error updating building:', error);
      throw new Error('Failed to update building');
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await BuildingModel.destroy({
        where: { id }
      });
      return result > 0;
    } catch (error) {
      console.error('Error deleting building:', error);
      throw new Error('Failed to delete building');
    }
  }

  async findByStatus(status: string): Promise<Building[]> {
    try {
      const buildingRecords = await BuildingModel.findAll({
        where: { status },
        order: [['createdAt', 'DESC']]
      });
      return buildingRecords.map((record: any) => BuildingMapper.toDomain(record.toJSON()));
    } catch (error) {
      console.error('Error finding buildings by status:', error);
      throw new Error('Failed to find buildings by status');
    }
  }

  async countByStatus(status: string): Promise<number> {
    try {
      const count = await BuildingModel.count({
        where: { status }
      });
      return count;
    } catch (error) {
      console.error('Error counting buildings by status:', error);
      throw new Error('Failed to count buildings by status');
    }
  }
}