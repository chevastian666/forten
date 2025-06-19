const request = require('supertest');
const { createTestApp } = require('./testApp');
const { setupTestDatabase, teardownTestDatabase, clearDatabase, models } = require('./setup');
const { createBuilding, createAccess, generatePin } = require('./factories');
const AuthHelpers = require('./authHelpers');
const ApiHelpers = require('./apiHelpers');

describe('Access API Integration Tests', () => {
  let app;
  let authHelpers;
  let apiHelpers;
  let testBuilding;
  
  beforeAll(async () => {
    const setupResult = await setupTestDatabase();
    testBuilding = setupResult.building;
    app = await createTestApp();
    authHelpers = new AuthHelpers(app);
    apiHelpers = new ApiHelpers(app, authHelpers);
    await authHelpers.login();
  });
  
  afterAll(async () => {
    await teardownTestDatabase();
  });
  
  beforeEach(async () => {
    await clearDatabase();
  });
  
  describe('GET /api/access', () => {
    beforeEach(async () => {
      // Create test accesses
      await Promise.all([
        models.Access.create(createAccess(testBuilding.id, { 
          name: 'Visitor 1',
          type: 'visitor'
        })),
        models.Access.create(createAccess(testBuilding.id, { 
          name: 'Service Tech',
          type: 'service'
        })),
        models.Access.create(createAccess(testBuilding.id, { 
          name: 'Temporary Worker',
          type: 'temporary'
        }))
      ]);
    });
    
    it('should get all accesses with pagination', async () => {
      const response = await apiHelpers.getPaginated('/api/access', 1, 10);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.data).toHaveLength(3);
      expect(response.body.pagination.total).toBe(3);
    });
    
    it('should paginate results correctly', async () => {
      // Create 5 more accesses
      await Promise.all(
        Array(5).fill(null).map((_, i) => 
          models.Access.create(createAccess(testBuilding.id, { 
            name: `Additional Visitor ${i + 1}`
          }))
        )
      );
      
      // Get first page
      const page1 = await apiHelpers.getPaginated('/api/access', 1, 5);
      expect(page1.body.data).toHaveLength(5);
      expect(page1.body.pagination.total).toBe(8);
      expect(page1.body.pagination.hasMore).toBe(true);
      
      // Get second page
      const page2 = await apiHelpers.getPaginated('/api/access', 2, 5);
      expect(page2.body.data).toHaveLength(3);
      expect(page2.body.pagination.hasMore).toBe(false);
    });
    
    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/access');
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('GET /api/access/report', () => {
    beforeEach(async () => {
      // Create accesses with different dates and buildings
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      await Promise.all([
        models.Access.create({
          ...createAccess(testBuilding.id),
          createdAt: yesterday
        }),
        models.Access.create({
          ...createAccess(testBuilding.id),
          usedCount: 3
        }),
        models.Access.create({
          ...createAccess(testBuilding.id),
          isActive: false
        })
      ]);
    });
    
    it('should generate report with admin role', async () => {
      const response = await apiHelpers.get('/api/access/report');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('accesses');
      expect(response.body.summary).toHaveProperty('total');
      expect(response.body.summary).toHaveProperty('active');
      expect(response.body.summary).toHaveProperty('inactive');
      expect(response.body.summary).toHaveProperty('totalUses');
    });
    
    it('should generate report with supervisor role', async () => {
      const response = await apiHelpers.get('/api/access/report', {}, 'supervisor');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('summary');
    });
    
    it('should fail with operator role', async () => {
      const response = await apiHelpers.get('/api/access/report', {}, 'operator');
      
      expect(response.status).toBe(403);
    });
    
    it('should filter report by building', async () => {
      // Create another building with access
      const otherBuilding = await models.Building.create(createBuilding());
      await models.Access.create(createAccess(otherBuilding.id));
      
      const response = await apiHelpers.get('/api/access/report', {
        buildingId: testBuilding.id
      });
      
      expect(response.status).toBe(200);
      expect(response.body.accesses).toHaveLength(3);
      expect(response.body.accesses.every(a => a.buildingId === testBuilding.id)).toBe(true);
    });
    
    it('should filter report by date range', async () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      const today = new Date();
      
      const response = await apiHelpers.get('/api/access/report', {
        startDate: twoDaysAgo.toISOString(),
        endDate: today.toISOString()
      });
      
      expect(response.status).toBe(200);
      expect(response.body.accesses).toHaveLength(3);
    });
  });
  
  describe('GET /api/access/:id', () => {
    it('should get access by id', async () => {
      const access = await models.Access.create(createAccess(testBuilding.id));
      
      const response = await apiHelpers.getEntityById('/api/access', access.id);
      
      expect(response).toMatchObject({
        id: access.id,
        buildingId: access.buildingId,
        name: access.name,
        type: access.type
      });
      expect(response).toHaveProperty('pin'); // Should include PIN
    });
    
    it('should return 404 for non-existent access', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await apiHelpers.get(`/api/access/${fakeId}`);
      
      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Access not found');
    });
  });
  
  describe('POST /api/access', () => {
    const validAccessData = {
      name: 'New Visitor',
      phone: '+1234567890',
      type: 'visitor',
      maxUses: 5,
      notes: 'Visiting apartment 101'
    };
    
    it('should create access', async () => {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 7);
      
      const response = await apiHelpers.post('/api/access', {
        buildingId: testBuilding.id,
        ...validAccessData,
        validUntil: validUntil.toISOString()
      });
      
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        buildingId: testBuilding.id,
        name: validAccessData.name,
        type: validAccessData.type,
        isActive: true,
        usedCount: 0
      });
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('pin');
      expect(response.body.pin).toMatch(/^\d{6}$/); // 6-digit PIN
      
      // Verify it was saved
      const saved = await models.Access.findByPk(response.body.id);
      expect(saved).toBeTruthy();
    });
    
    it('should validate required fields', async () => {
      const response = await apiHelpers.post('/api/access', {
        name: 'Only Name'
      });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors.length).toBeGreaterThan(2);
    });
    
    it('should validate access type', async () => {
      const response = await apiHelpers.post('/api/access', {
        buildingId: testBuilding.id,
        name: 'Test',
        type: 'invalid_type',
        validUntil: new Date().toISOString()
      });
      
      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toContain('Invalid');
    });
    
    it('should validate phone format', async () => {
      const response = await apiHelpers.post('/api/access', {
        buildingId: testBuilding.id,
        name: 'Test',
        phone: 'not-a-phone',
        type: 'visitor',
        validUntil: new Date().toISOString()
      });
      
      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toContain('phone');
    });
    
    it('should validate building exists', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await apiHelpers.post('/api/access', {
        buildingId: fakeId,
        name: 'Test',
        type: 'visitor',
        validUntil: new Date().toISOString()
      });
      
      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Building not found');
    });
    
    it('should handle expired validUntil date', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const response = await apiHelpers.post('/api/access', {
        buildingId: testBuilding.id,
        name: 'Test',
        type: 'visitor',
        validUntil: yesterday.toISOString()
      });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('past date');
    });
  });
  
  describe('POST /api/access/validate', () => {
    let access;
    
    beforeEach(async () => {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 7);
      
      access = await models.Access.create({
        ...createAccess(testBuilding.id),
        pin: '123456',
        validUntil,
        maxUses: 5,
        usedCount: 0
      });
    });
    
    it('should validate correct PIN', async () => {
      const response = await apiHelpers.post('/api/access/validate', {
        pin: '123456',
        buildingId: testBuilding.id
      });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('valid', true);
      expect(response.body).toHaveProperty('access');
      expect(response.body.access.id).toBe(access.id);
      
      // Verify use count increased
      const updated = await models.Access.findByPk(access.id);
      expect(updated.usedCount).toBe(1);
    });
    
    it('should validate PIN without building ID', async () => {
      const response = await apiHelpers.post('/api/access/validate', {
        pin: '123456'
      });
      
      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
    });
    
    it('should fail with incorrect PIN', async () => {
      const response = await apiHelpers.post('/api/access/validate', {
        pin: '999999'
      });
      
      expect(response.status).toBe(401);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toContain('Invalid PIN');
    });
    
    it('should fail with expired access', async () => {
      // Update access to be expired
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await access.update({ validUntil: yesterday });
      
      const response = await apiHelpers.post('/api/access/validate', {
        pin: '123456'
      });
      
      expect(response.status).toBe(401);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toContain('expired');
    });
    
    it('should fail with inactive access', async () => {
      await access.update({ isActive: false });
      
      const response = await apiHelpers.post('/api/access/validate', {
        pin: '123456'
      });
      
      expect(response.status).toBe(401);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toContain('inactive');
    });
    
    it('should fail when max uses reached', async () => {
      await access.update({ usedCount: 5 }); // maxUses is 5
      
      const response = await apiHelpers.post('/api/access/validate', {
        pin: '123456'
      });
      
      expect(response.status).toBe(401);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toContain('Maximum uses reached');
    });
    
    it('should validate PIN format', async () => {
      const response = await apiHelpers.post('/api/access/validate', {
        pin: '12345' // Too short
      });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });
  
  describe('PUT /api/access/:id', () => {
    let access;
    
    beforeEach(async () => {
      access = await models.Access.create(createAccess(testBuilding.id));
    });
    
    it('should update access with admin role', async () => {
      const newValidUntil = new Date();
      newValidUntil.setDate(newValidUntil.getDate() + 14);
      
      const updates = {
        name: 'Updated Visitor',
        phone: '+9876543210',
        validUntil: newValidUntil.toISOString(),
        maxUses: 10,
        notes: 'Updated notes'
      };
      
      const response = await apiHelpers.updateEntity(
        '/api/access',
        access.id,
        updates
      );
      
      expect(response.name).toBe(updates.name);
      expect(response.phone).toBe(updates.phone);
      expect(response.maxUses).toBe(updates.maxUses);
      expect(response.type).toBe(access.type); // Unchanged
    });
    
    it('should update access with supervisor role', async () => {
      const response = await apiHelpers.put(
        `/api/access/${access.id}`,
        { name: 'Supervisor Update' },
        'supervisor'
      );
      
      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Supervisor Update');
    });
    
    it('should update access with operator role', async () => {
      const response = await apiHelpers.put(
        `/api/access/${access.id}`,
        { notes: 'Operator notes' },
        'operator'
      );
      
      expect(response.status).toBe(200);
      expect(response.body.notes).toBe('Operator notes');
    });
    
    it('should deactivate access', async () => {
      const response = await apiHelpers.put(
        `/api/access/${access.id}`,
        { isActive: false }
      );
      
      expect(response.status).toBe(200);
      expect(response.body.isActive).toBe(false);
    });
    
    it('should validate phone format on update', async () => {
      const response = await apiHelpers.put(
        `/api/access/${access.id}`,
        { phone: 'invalid-phone' }
      );
      
      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toContain('phone');
    });
    
    it('should return 404 for non-existent access', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await apiHelpers.put(
        `/api/access/${fakeId}`,
        { name: 'Update' }
      );
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('DELETE /api/access/:id', () => {
    let access;
    
    beforeEach(async () => {
      access = await models.Access.create(createAccess(testBuilding.id));
    });
    
    it('should delete access with admin role', async () => {
      await apiHelpers.deleteEntity('/api/access', access.id);
      
      // Verify it was deleted
      const deleted = await models.Access.findByPk(access.id);
      expect(deleted).toBeNull();
    });
    
    it('should delete access with supervisor role', async () => {
      const response = await apiHelpers.delete(
        `/api/access/${access.id}`,
        'supervisor'
      );
      
      expect(response.status).toBe(204);
      
      // Verify it was deleted
      const deleted = await models.Access.findByPk(access.id);
      expect(deleted).toBeNull();
    });
    
    it('should fail with operator role', async () => {
      const response = await apiHelpers.delete(
        `/api/access/${access.id}`,
        'operator'
      );
      
      expect(response.status).toBe(403);
      
      // Verify it wasn't deleted
      const exists = await models.Access.findByPk(access.id);
      expect(exists).toBeTruthy();
    });
    
    it('should return 404 for non-existent access', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await apiHelpers.delete(`/api/access/${fakeId}`);
      
      expect(response.status).toBe(404);
    });
  });
});