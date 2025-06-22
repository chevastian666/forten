// JavaScript wrapper for SequelizeBuildingRepository
// This allows us to use the TypeScript repository from JavaScript code

const Building = require('../../../models/Building');
const Event = require('../../../models/Event');
const { Op } = require('sequelize');

class SequelizeBuildingRepository {
  async findById(id) {
    try {
      const building = await Building.findByPk(id);
      return building ? building.toJSON() : null;
    } catch (error) {
      console.error('Error finding building by id:', error);
      throw new Error('Failed to find building');
    }
  }

  async findAll(filters = {}, pagination = {}) {
    try {
      const where = {};
      
      if (filters.search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${filters.search}%` } },
          { address: { [Op.iLike]: `%${filters.search}%` } }
        ];
      }
      
      if (filters.city) {
        where.city = filters.city;
      }
      
      if (filters.hasAccess !== undefined) {
        // This would require a join with Access model
      }
      
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const offset = (page - 1) * limit;
      
      const { count, rows } = await Building.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });
      
      return {
        items: rows.map(row => row.toJSON()),
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      console.error('Error finding all buildings:', error);
      throw new Error('Failed to find buildings');
    }
  }

  async create(building) {
    try {
      const created = await Building.create(building);
      return created.toJSON();
    } catch (error) {
      console.error('Error creating building:', error);
      throw new Error('Failed to create building');
    }
  }

  async update(id, building) {
    try {
      const [updatedCount, updatedBuildings] = await Building.update(building, {
        where: { id },
        returning: true
      });
      
      if (updatedCount === 0) {
        return null;
      }
      
      return updatedBuildings[0].toJSON();
    } catch (error) {
      console.error('Error updating building:', error);
      throw new Error('Failed to update building');
    }
  }

  async delete(id) {
    try {
      const deleted = await Building.destroy({
        where: { id }
      });
      
      return deleted > 0;
    } catch (error) {
      console.error('Error deleting building:', error);
      throw new Error('Failed to delete building');
    }
  }
}

module.exports = { SequelizeBuildingRepository };