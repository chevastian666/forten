require('dotenv').config();
const { sequelize, User, Building } = require('../models');

const seedDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    
    await sequelize.sync({ force: true });
    console.log('Database synced');
    
    // Create admin user
    const admin = await User.create({
      email: 'admin@forten.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'FORTEN',
      role: 'admin'
    });
    
    // Create demo users
    const operator = await User.create({
      email: 'operator@forten.com',
      password: 'operator123',
      firstName: 'Juan',
      lastName: 'Pérez',
      role: 'operator'
    });
    
    const supervisor = await User.create({
      email: 'supervisor@forten.com',
      password: 'supervisor123',
      firstName: 'María',
      lastName: 'González',
      role: 'supervisor'
    });
    
    // Create demo buildings
    const buildings = await Building.bulkCreate([
      {
        name: 'Torre Oceanía',
        address: 'Rambla República de México 6125',
        city: 'Montevideo',
        phone: '099123456',
        email: 'administracion@torreoceania.com',
        status: 'active',
        totalUnits: 120,
        totalCameras: 8
      },
      {
        name: 'Edificio Plaza Central',
        address: 'Plaza Independencia 848',
        city: 'Montevideo',
        phone: '099234567',
        email: 'plaza.central@gmail.com',
        status: 'active',
        totalUnits: 80,
        totalCameras: 6
      },
      {
        name: 'Residencial del Parque',
        address: 'Av. Brasil 2950',
        city: 'Montevideo',
        status: 'quoting',
        totalUnits: 45
      }
    ]);
    
    console.log('Seed data created successfully!');
    console.log('\\nLogin credentials:');
    console.log('Admin: admin@forten.com / admin123');
    console.log('Operator: operator@forten.com / operator123');
    console.log('Supervisor: supervisor@forten.com / supervisor123');
    
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seedDatabase();