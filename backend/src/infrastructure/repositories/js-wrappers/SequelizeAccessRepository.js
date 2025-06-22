// JavaScript wrapper for SequelizeAccessRepository
// This allows us to use the TypeScript repository from JavaScript code

const Access = require('../../../models/Access');
const Building = require('../../../models/Building');
const { Op } = require('sequelize');

class SequelizeAccessRepository {
  async findById(id) {
    try {
      const access = await Access.findByPk(id, {
        include: [
          { model: Building, attributes: ['id', 'name'] }
        ]
      });
      return access ? access.toJSON() : null;
    } catch (error) {
      console.error('Error finding access by id:', error);
      throw new Error('Failed to find access');
    }
  }

  async findByPin(pin) {
    try {
      const access = await Access.findOne({
        where: { pin },
        include: [
          { model: Building, attributes: ['id', 'name'] }
        ]
      });
      return access ? access.toJSON() : null;
    } catch (error) {
      console.error('Error finding access by pin:', error);
      throw new Error('Failed to find access by pin');
    }
  }

  async findAll(filters = {}, pagination = {}) {
    try {
      const where = {};
      
      if (filters.buildingId) {
        where.buildingId = filters.buildingId;
      }
      
      if (filters.type) {
        where.type = filters.type;
      }
      
      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }
      
      if (filters.validDate) {
        where.validFrom = { [Op.lte]: filters.validDate };
        where.validUntil = { [Op.gte]: filters.validDate };
      }
      
      // Set default pagination values
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const offset = (page - 1) * limit;
      
      const { count, rows } = await Access.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        include: [
          { model: Building, attributes: ['id', 'name'] }
        ]
      });
      
      return {
        data: rows.map(row => row.toJSON()),
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      console.error('Error finding all accesses:', error);
      throw new Error('Failed to find accesses');
    }
  }

  async create(access) {
    try {
      const created = await Access.create(access);
      const withRelations = await Access.findByPk(created.id, {
        include: [
          { model: Building, attributes: ['id', 'name'] }
        ]
      });
      return withRelations.toJSON();
    } catch (error) {
      console.error('Error creating access:', error);
      throw new Error('Failed to create access');
    }
  }

  async update(id, access) {
    try {
      const [updatedCount] = await Access.update(access, {
        where: { id }
      });
      
      if (updatedCount === 0) {
        return null;
      }
      
      const updated = await Access.findByPk(id, {
        include: [
          { model: Building, attributes: ['id', 'name'] }
        ]
      });
      
      return updated.toJSON();
    } catch (error) {
      console.error('Error updating access:', error);
      throw new Error('Failed to update access');
    }
  }

  async delete(id) {
    try {
      const result = await Access.destroy({
        where: { id }
      });
      return result > 0;
    } catch (error) {
      console.error('Error deleting access:', error);
      throw new Error('Failed to delete access');
    }
  }

  async deactivate(id) {
    try {
      const [updatedCount] = await Access.update(
        { isActive: false },
        { where: { id } }
      );
      return updatedCount > 0;
    } catch (error) {
      console.error('Error deactivating access:', error);
      throw new Error('Failed to deactivate access');
    }
  }

  async incrementUsage(id) {
    try {
      const access = await Access.findByPk(id);
      if (!access) {
        return false;
      }
      
      await access.increment('currentUses');
      return true;
    } catch (error) {
      console.error('Error incrementing access usage:', error);
      throw new Error('Failed to increment access usage');
    }
  }

  async generateUniquePin() {
    try {
      let pin;
      let isUnique = false;
      
      while (!isUnique) {
        // Generate a random 6-digit pin
        pin = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Check if pin already exists
        const existing = await Access.findOne({
          where: { pin }
        });
        
        if (!existing) {
          isUnique = true;
        }
      }
      
      return pin;
    } catch (error) {
      console.error('Error generating unique pin:', error);
      throw new Error('Failed to generate unique pin');
    }
  }

  async findActiveByBuilding(buildingId) {
    try {
      const now = new Date();
      const accesses = await Access.findAll({
        where: {
          buildingId,
          isActive: true,
          validFrom: { [Op.lte]: now },
          validUntil: { [Op.gte]: now }
        },
        order: [['createdAt', 'DESC']],
        include: [
          { model: Building, attributes: ['id', 'name'] }
        ]
      });
      
      return accesses.map(access => access.toJSON());
    } catch (error) {
      console.error('Error finding active accesses by building:', error);
      throw new Error('Failed to find active accesses by building');
    }
  }
}

module.exports = { SequelizeAccessRepository };