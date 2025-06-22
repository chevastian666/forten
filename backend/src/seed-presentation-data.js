require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const path = require('path');

// SQLite Database Setup
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../database.sqlite'),
  logging: false
});

// User Model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  firstName: DataTypes.STRING,
  lastName: DataTypes.STRING,
  role: {
    type: DataTypes.STRING,
    defaultValue: 'operator'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

// Building Model
const Building = sequelize.define('Building', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: DataTypes.STRING,
  address: DataTypes.STRING,
  city: DataTypes.STRING,
  phone: DataTypes.STRING,
  email: DataTypes.STRING,
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active'
  },
  totalUnits: DataTypes.INTEGER,
  totalCameras: DataTypes.INTEGER,
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

// Event Model
const Event = sequelize.define('Event', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  buildingId: DataTypes.INTEGER,
  type: DataTypes.STRING,
  priority: DataTypes.STRING,
  title: DataTypes.STRING,
  description: DataTypes.TEXT,
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending'
  },
  resolvedAt: DataTypes.DATE,
  resolvedBy: DataTypes.INTEGER
});

// Access Model
const Access = sequelize.define('Access', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  buildingId: DataTypes.INTEGER,
  visitorName: DataTypes.STRING,
  visitorDocument: DataTypes.STRING,
  unitNumber: DataTypes.STRING,
  pin: DataTypes.STRING,
  validFrom: DataTypes.DATE,
  validUntil: DataTypes.DATE,
  used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  usedAt: DataTypes.DATE
});

// Associations
Building.hasMany(Event, { foreignKey: 'buildingId' });
Event.belongsTo(Building, { foreignKey: 'buildingId' });

Building.hasMany(Access, { foreignKey: 'buildingId' });
Access.belongsTo(Building, { foreignKey: 'buildingId' });

async function seedPresentationData() {
  try {
    await sequelize.sync({ force: true });
    console.log('🗄️  Database reset for presentation data');

    // Create Users
    const adminPassword = await bcrypt.hash('admin123', 10);
    const managerPassword = await bcrypt.hash('manager123', 10);
    const operatorPassword = await bcrypt.hash('operator123', 10);

    await User.bulkCreate([
      {
        email: 'admin@forten.com',
        password: adminPassword,
        firstName: 'Admin',
        lastName: 'FORTEN',
        role: 'admin'
      },
      {
        email: 'manager@forten.com',
        password: managerPassword,
        firstName: 'Carlos',
        lastName: 'Mendez',
        role: 'manager'
      },
      {
        email: 'operator@forten.com',
        password: operatorPassword,
        firstName: 'Maria',
        lastName: 'Garcia',
        role: 'operator'
      },
      {
        email: 'juan.perez@forten.com',
        password: operatorPassword,
        firstName: 'Juan',
        lastName: 'Perez',
        role: 'operator'
      },
      {
        email: 'ana.rodriguez@forten.com',
        password: operatorPassword,
        firstName: 'Ana',
        lastName: 'Rodriguez',
        role: 'operator'
      }
    ]);
    console.log('✅ Users created');

    // Create Buildings with realistic data
    const buildings = await Building.bulkCreate([
      {
        name: 'Torres del Sol',
        address: 'Av. Libertador 4580',
        city: 'Buenos Aires',
        phone: '+54 11 4785-2300',
        email: 'torresdelsol@forten.com',
        status: 'active',
        totalUnits: 120,
        totalCameras: 24
      },
      {
        name: 'Edificio Plaza Mayor',
        address: 'Calle 9 de Julio 1234',
        city: 'Córdoba',
        phone: '+54 351 468-9000',
        email: 'plazamayor@forten.com',
        status: 'active',
        totalUnits: 85,
        totalCameras: 18
      },
      {
        name: 'Residencial Los Pinos',
        address: 'Av. San Martín 567',
        city: 'Mendoza',
        phone: '+54 261 425-7800',
        email: 'lospinos@forten.com',
        status: 'active',
        totalUnits: 60,
        totalCameras: 12
      },
      {
        name: 'Complejo Río Vista',
        address: 'Bv. Oroño 2890',
        city: 'Rosario',
        phone: '+54 341 480-3500',
        email: 'riovista@forten.com',
        status: 'active',
        totalUnits: 200,
        totalCameras: 36
      },
      {
        name: 'Park Tower',
        address: 'Av. Pellegrini 1500',
        city: 'Buenos Aires',
        phone: '+54 11 4325-8900',
        email: 'parktower@forten.com',
        status: 'maintenance',
        totalUnits: 150,
        totalCameras: 28
      },
      {
        name: 'Edificio Central',
        address: 'Calle Sarmiento 890',
        city: 'La Plata',
        phone: '+54 221 489-2100',
        email: 'central@forten.com',
        status: 'active',
        totalUnits: 75,
        totalCameras: 16
      }
    ]);
    console.log('✅ Buildings created');

    // Create Events with various types and priorities
    const eventTypes = ['security', 'maintenance', 'access', 'system', 'emergency'];
    const priorities = ['low', 'medium', 'high', 'critical'];
    const eventTitles = {
      security: [
        'Persona sospechosa en lobby',
        'Intento de acceso no autorizado',
        'Cámara vandalizada en estacionamiento',
        'Actividad inusual en piso 5'
      ],
      maintenance: [
        'Ascensor 2 fuera de servicio',
        'Fuga de agua en piso 3',
        'Iluminación defectuosa en pasillo',
        'Puerta de emergencia no cierra'
      ],
      access: [
        'Tarjeta de acceso bloqueada',
        'Visitante sin autorización',
        'Código PIN inválido múltiples veces',
        'Solicitud de acceso temporal'
      ],
      system: [
        'Pérdida de conexión cámara 12',
        'Sistema de alarma offline',
        'Error en base de datos',
        'Actualización de firmware pendiente'
      ],
      emergency: [
        'Alarma de incendio activada',
        'Evacuación en progreso',
        'Corte de energía total',
        'Emergencia médica en piso 8'
      ]
    };

    const events = [];
    const now = new Date();
    
    // Generate events for the last 30 days
    for (let i = 0; i < 50; i++) {
      const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const priority = type === 'emergency' ? 'critical' : 
                      type === 'security' ? priorities.slice(1)[Math.floor(Math.random() * 3)] :
                      priorities[Math.floor(Math.random() * priorities.length)];
      
      const titles = eventTitles[type];
      const title = titles[Math.floor(Math.random() * titles.length)];
      
      const createdAt = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const isResolved = Math.random() > 0.3;
      
      events.push({
        buildingId: buildings[Math.floor(Math.random() * buildings.length)].id,
        type,
        priority,
        title,
        description: `${title}. Reportado por sistema de monitoreo automático.`,
        status: isResolved ? 'resolved' : 'pending',
        resolvedAt: isResolved ? new Date(createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000) : null,
        resolvedBy: isResolved ? Math.floor(Math.random() * 3) + 1 : null,
        createdAt,
        updatedAt: createdAt
      });
    }

    await Event.bulkCreate(events);
    console.log('✅ Events created');

    // Create Access Control records
    const visitorNames = [
      'Roberto Martinez', 'Laura Fernandez', 'Diego Silva', 'Carolina Lopez',
      'Miguel Torres', 'Sofia Gonzalez', 'Alejandro Ruiz', 'Valentina Castro',
      'Fernando Morales', 'Lucia Vargas', 'Pablo Herrera', 'Martina Flores',
      'Sebastian Medina', 'Camila Rivera', 'Nicolas Alvarez', 'Isabella Romero'
    ];

    const accesses = [];
    
    // Generate access records for the last 14 days
    for (let i = 0; i < 30; i++) {
      const validFrom = new Date(now.getTime() - Math.random() * 14 * 24 * 60 * 60 * 1000);
      const validUntil = new Date(validFrom.getTime() + (Math.random() * 7 + 1) * 24 * 60 * 60 * 1000);
      const isUsed = Math.random() > 0.4 && validFrom < now;
      
      accesses.push({
        buildingId: buildings[Math.floor(Math.random() * buildings.length)].id,
        visitorName: visitorNames[Math.floor(Math.random() * visitorNames.length)],
        visitorDocument: `${Math.floor(Math.random() * 40000000) + 10000000}`,
        unitNumber: `${Math.floor(Math.random() * 15) + 1}${String.fromCharCode(65 + Math.floor(Math.random() * 4))}`,
        pin: Math.floor(100000 + Math.random() * 900000).toString(),
        validFrom,
        validUntil,
        used: isUsed,
        usedAt: isUsed ? new Date(validFrom.getTime() + Math.random() * (validUntil - validFrom)) : null,
        createdAt: validFrom,
        updatedAt: validFrom
      });
    }

    await Access.bulkCreate(accesses);
    console.log('✅ Access records created');

    console.log('\n🎉 Presentation data seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Users: 5`);
    console.log(`- Buildings: ${buildings.length}`);
    console.log(`- Events: ${events.length}`);
    console.log(`- Access Records: ${accesses.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedPresentationData();