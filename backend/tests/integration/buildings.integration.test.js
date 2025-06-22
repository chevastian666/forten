const request = require('supertest');
const { createTestApp } = require('./testApp');
const { setupTestDatabase, teardownTestDatabase, clearDatabase, models } = require('./setup');
const { createBuilding } = require('./factories');
const AuthHelpers = require('./authHelpers');
const ApiHelpers = require('./apiHelpers');

describe('Buildings API Integration Tests', () => {
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
  
  describe('GET /api/buildings', () => {
    it('should get all buildings with pagination', async () => {
      // Create test buildings
      const buildings = await Promise.all([
        models.Building.create(createBuilding({ name: 'Building 1' })),
        models.Building.create(createBuilding({ name: 'Building 2' })),
        models.Building.create(createBuilding({ name: 'Building 3' }))
      ]);
      
      const response = await apiHelpers.getPaginated('/api/buildings', 1, 10);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.data).toHaveLength(4); // 3 created + 1 test building
      expect(response.body.pagination.total).toBe(4);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });
    
    it('should paginate results correctly', async () => {
      // Create 5 buildings
      await Promise.all(
        Array(5).fill(null).map((_, i) => 
          models.Building.create(createBuilding({ name: `Building ${i + 1}` }))
        )
      );
      
      // Get first page
      const page1 = await apiHelpers.getPaginated('/api/buildings', 1, 3);
      expect(page1.body.data).toHaveLength(3);
      expect(page1.body.pagination.total).toBe(6); // 5 + test building
      expect(page1.body.pagination.hasMore).toBe(true);
      
      // Get second page
      const page2 = await apiHelpers.getPaginated('/api/buildings', 2, 3);
      expect(page2.body.data).toHaveLength(3);
      expect(page2.body.pagination.hasMore).toBe(false);
    });
    
    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/buildings');
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
    
    it('should validate pagination parameters', async () => {
      const response = await apiHelpers.get('/api/buildings', { page: 0, limit: 200 });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });
  
  describe('GET /api/buildings/:id', () => {
    it('should get building by id', async () => {
      const building = await models.Building.create(createBuilding());
      
      const response = await apiHelpers.getEntityById('/api/buildings', building.id);
      
      expect(response).toMatchObject({
        id: building.id,
        name: building.name,
        address: building.address,
        city: building.city
      });
    });
    
    it('should return 404 for non-existent building', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await apiHelpers.get(`/api/buildings/${fakeId}`);
      
      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Building not found');
    });
    
    it('should return 400 for invalid id format', async () => {
      const response = await apiHelpers.get('/api/buildings/invalid-id');
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid building ID');
    });
  });
  
  describe('POST /api/buildings', () => {
    const validBuildingData = {
      name: 'New Building',
      address: '789 New St',
      city: 'New City',
      state: 'NC',
      zipCode: '98765',
      phone: '5551234567',
      email: 'new@building.com'
    };
    
    it('should create building with admin role', async () => {
      const response = await apiHelpers.createEntity('/api/buildings', validBuildingData);
      
      expect(response).toMatchObject({
        name: validBuildingData.name,
        address: validBuildingData.address,
        city: validBuildingData.city
      });
      expect(response).toHaveProperty('id');
      
      // Verify it was saved
      const saved = await models.Building.findByPk(response.id);
      expect(saved).toBeTruthy();
    });
    
    it('should create building with supervisor role', async () => {
      const response = await apiHelpers.post(
        '/api/buildings',
        validBuildingData,
        'supervisor'
      );
      
      expect(response.status).toBe(201);
      expect(response.body.name).toBe(validBuildingData.name);
    });
    
    it('should fail with operator role', async () => {
      const response = await apiHelpers.post(
        '/api/buildings',
        validBuildingData,
        'operator'
      );
      
      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient permissions');
    });
    
    it('should validate required fields', async () => {
      const response = await apiHelpers.post('/api/buildings', {
        name: 'Only Name'
      });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toHaveLength(2); // address and city are required
    });
    
    it('should validate email format', async () => {
      const response = await apiHelpers.post('/api/buildings', {
        ...validBuildingData,
        email: 'invalid-email'
      });
      
      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toContain('email');
    });
    
    it('should handle duplicate building names', async () => {
      // Create first building
      await models.Building.create(createBuilding({ name: 'Unique Building' }));
      
      // Try to create another with same name
      const response = await apiHelpers.post('/api/buildings', {
        ...validBuildingData,
        name: 'Unique Building'
      });
      
      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already exists');
    });
  });
  
  describe('PUT /api/buildings/:id', () => {
    let building;
    
    beforeEach(async () => {
      building = await models.Building.create(createBuilding());
    });
    
    it('should update building with admin role', async () => {
      const updates = {
        name: 'Updated Building',
        email: 'updated@building.com'
      };
      
      const response = await apiHelpers.updateEntity(
        '/api/buildings',
        building.id,
        updates
      );
      
      expect(response.name).toBe(updates.name);
      expect(response.email).toBe(updates.email);
      expect(response.address).toBe(building.address); // Unchanged
    });
    
    it('should update building with supervisor role', async () => {
      const response = await apiHelpers.put(
        `/api/buildings/${building.id}`,
        { name: 'Supervisor Update' },
        'supervisor'
      );
      
      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Supervisor Update');
    });
    
    it('should fail with operator role', async () => {
      const response = await apiHelpers.put(
        `/api/buildings/${building.id}`,
        { name: 'Operator Update' },
        'operator'
      );
      
      expect(response.status).toBe(403);
    });
    
    it('should validate email format on update', async () => {
      const response = await apiHelpers.put(
        `/api/buildings/${building.id}`,
        { email: 'not-an-email' }
      );
      
      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toContain('email');
    });
    
    it('should return 404 for non-existent building', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await apiHelpers.put(
        `/api/buildings/${fakeId}`,
        { name: 'Update' }
      );
      
      expect(response.status).toBe(404);
    });
    
    it('should handle partial updates', async () => {
      const response = await apiHelpers.put(
        `/api/buildings/${building.id}`,
        { phone: '9998887777' }
      );
      
      expect(response.status).toBe(200);
      expect(response.body.phone).toBe('9998887777');
      expect(response.body.name).toBe(building.name); // Unchanged
    });
  });
  
  describe('DELETE /api/buildings/:id', () => {
    let building;
    
    beforeEach(async () => {
      building = await models.Building.create(createBuilding());
    });
    
    it('should delete building with admin role', async () => {
      await apiHelpers.deleteEntity('/api/buildings', building.id);
      
      // Verify it was deleted
      const deleted = await models.Building.findByPk(building.id);
      expect(deleted).toBeNull();
    });
    
    it('should fail with supervisor role', async () => {
      const response = await apiHelpers.delete(
        `/api/buildings/${building.id}`,
        'supervisor'
      );
      
      expect(response.status).toBe(403);
      
      // Verify it wasn't deleted
      const exists = await models.Building.findByPk(building.id);
      expect(exists).toBeTruthy();
    });
    
    it('should fail with operator role', async () => {
      const response = await apiHelpers.delete(
        `/api/buildings/${building.id}`,
        'operator'
      );
      
      expect(response.status).toBe(403);
    });
    
    it('should return 404 for non-existent building', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await apiHelpers.delete(`/api/buildings/${fakeId}`);
      
      expect(response.status).toBe(404);
    });
    
    it('should handle building with associated data', async () => {
      // Create associated event
      await models.Event.create({
        buildingId: building.id,
        type: 'door_open',
        description: 'Test event',
        severity: 'low'
      });
      
      const response = await apiHelpers.delete(`/api/buildings/${building.id}`);
      
      // Should either cascade delete or return error based on implementation
      // Adjust assertion based on your business logic
      expect([204, 409]).toContain(response.status);
    });
  });
});