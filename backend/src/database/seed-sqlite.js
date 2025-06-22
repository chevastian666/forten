const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open database
const db = new sqlite3.Database(path.join(__dirname, '../../database.sqlite'), (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});

async function seedDatabase() {
  try {
    // Hash passwords
    const adminHash = await bcrypt.hash('admin123', 10);
    const operatorHash = await bcrypt.hash('operator123', 10);
    const supervisorHash = await bcrypt.hash('supervisor123', 10);
    
    // Delete existing users
    db.run("DELETE FROM Users WHERE email IN ('admin@forten.com', 'operator@forten.com', 'supervisor@forten.com')", (err) => {
      if (err) console.log('Error deleting users:', err);
    });
    
    // Insert users
    const users = [
      {
        email: 'admin@forten.com',
        password: adminHash,
        firstName: 'Admin',
        lastName: 'FORTEN',
        role: 'admin',
        isActive: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        email: 'operator@forten.com',
        password: operatorHash,
        firstName: 'Juan',
        lastName: 'Pérez',
        role: 'operator',
        isActive: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        email: 'supervisor@forten.com',
        password: supervisorHash,
        firstName: 'María',
        lastName: 'González',
        role: 'supervisor',
        isActive: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    const stmt = db.prepare(`
      INSERT INTO Users (email, password, firstName, lastName, role, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    users.forEach(user => {
      stmt.run([
        user.email,
        user.password,
        user.firstName,
        user.lastName,
        user.role,
        user.isActive,
        user.createdAt,
        user.updatedAt
      ], (err) => {
        if (err) {
          console.error(`Error inserting user ${user.email}:`, err);
        } else {
          console.log(`✓ User created: ${user.email}`);
        }
      });
    });
    
    stmt.finalize();
    
    // Check if buildings exist
    db.get("SELECT COUNT(*) as count FROM Buildings", (err, row) => {
      if (err || row.count === 0) {
        // Insert demo buildings
        const buildingStmt = db.prepare(`
          INSERT INTO Buildings (name, address, city, phone, email, status, totalUnits, totalCameras, isActive, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const buildings = [
          {
            name: 'Torre Oceanía',
            address: 'Rambla República de México 6125',
            city: 'Montevideo',
            phone: '099123456',
            email: 'administracion@torreoceania.com',
            status: 'active',
            totalUnits: 120,
            totalCameras: 8,
            isActive: 1
          },
          {
            name: 'Edificio Plaza',
            address: 'Plaza Independencia 848',
            city: 'Montevideo',
            phone: '099654321',
            email: 'admin@edifplaza.com',
            status: 'active',
            totalUnits: 80,
            totalCameras: 6,
            isActive: 1
          }
        ];
        
        buildings.forEach(building => {
          buildingStmt.run([
            building.name,
            building.address,
            building.city,
            building.phone,
            building.email,
            building.status,
            building.totalUnits,
            building.totalCameras,
            building.isActive,
            new Date().toISOString(),
            new Date().toISOString()
          ], (err) => {
            if (err) {
              console.error(`Error inserting building ${building.name}:`, err);
            } else {
              console.log(`✓ Building created: ${building.name}`);
            }
          });
        });
        
        buildingStmt.finalize();
      }
    });
    
    // Close database after a delay to ensure all operations complete
    setTimeout(() => {
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('\n✅ Database seeded successfully!');
          console.log('\nYou can now login with:');
          console.log('- admin@forten.com / admin123');
          console.log('- operator@forten.com / operator123');
          console.log('- supervisor@forten.com / supervisor123');
        }
      });
    }, 2000);
    
  } catch (error) {
    console.error('Seed failed:', error);
    db.close();
    process.exit(1);
  }
}

// Run seed
seedDatabase();