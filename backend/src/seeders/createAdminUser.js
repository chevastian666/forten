const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function createAdminUser(User) {
  try {
    // Check for both possible email variations
    const adminExistsUy = await User.findOne({ where: { email: 'admin@forten.uy' } });
    const adminExistsCom = await User.findOne({ where: { email: 'admin@forten.com' } });
    
    if (!adminExistsUy) {
      await User.create({
        id: uuidv4(),
        email: 'admin@forten.uy',
        password: 'admin123', // Will be hashed by the model hook
        firstName: 'Admin',
        lastName: 'FORTEN',
        role: 'admin',
        isActive: true
      });
      
      console.log('Admin user created with email admin@forten.uy');
    }
    
    if (!adminExistsCom) {
      await User.create({
        id: uuidv4(),
        email: 'admin@forten.com',
        password: 'admin123', // Will be hashed by the model hook
        firstName: 'Admin',
        lastName: 'FORTEN',
        role: 'admin',
        isActive: true
      });
      
      console.log('Admin user created with email admin@forten.com');
    }
    
    if (adminExistsUy && adminExistsCom) {
      console.log('Admin users already exist');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

module.exports = createAdminUser;