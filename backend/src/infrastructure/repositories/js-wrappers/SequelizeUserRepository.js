// JavaScript wrapper for TypeScript SequelizeUserRepository
// This allows us to use the TypeScript repository in our JavaScript container

// Since we can't directly import TypeScript in JavaScript without compilation,
// we'll need to use the compiled version or set up ts-node
// For now, we'll create a simplified JavaScript version

const { User } = require('../../../models');
const bcrypt = require('bcryptjs');

class SequelizeUserRepository {
  async findById(id) {
    const user = await User.findByPk(id);
    return user ? user.toJSON() : null;
  }

  async findByEmail(email) {
    const user = await User.findOne({ where: { email } });
    return user ? user.toJSON() : null;
  }

  async findByUsername(username) {
    const user = await User.findOne({ where: { username } });
    return user ? user.toJSON() : null;
  }

  async create(userData) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = await User.create({
      ...userData,
      password: hashedPassword
    });
    return user.toJSON();
  }

  async update(id, userData) {
    const user = await User.findByPk(id);
    if (!user) return null;
    
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }
    
    await user.update(userData);
    return user.toJSON();
  }

  async findAll(filters = {}, pagination = {}) {
    const { page = 1, limit = 10 } = pagination;
    const offset = (page - 1) * limit;
    
    const where = {};
    if (filters.role) where.role = filters.role;
    if (filters.active !== undefined) where.active = filters.active;
    
    const { count, rows } = await User.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });
    
    return {
      data: rows.map(user => user.toJSON()),
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    };
  }
}

module.exports = { SequelizeUserRepository };