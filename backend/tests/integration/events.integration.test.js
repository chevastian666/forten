const request = require('supertest');
const { createTestApp } = require('./testApp');
const { setupTestDatabase, teardownTestDatabase, clearDatabase, models } = require('./setup');
const { createBuilding, createEvent } = require('./factories');
const AuthHelpers = require('./authHelpers');
const ApiHelpers = require('./apiHelpers');

describe('Events API Integration Tests', () => {
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
  
  describe('GET /api/events', () => {
    beforeEach(async () => {
      // Create test events
      await Promise.all([
        models.Event.create(createEvent(testBuilding.id, { 
          type: 'door_open',
          severity: 'low',
          resolved: false
        })),
        models.Event.create(createEvent(testBuilding.id, { 
          type: 'alarm',
          severity: 'high',
          resolved: true
        })),
        models.Event.create(createEvent(testBuilding.id, { 
          type: 'visitor_call',
          severity: 'medium',
          resolved: false
        }))
      ]);
    });
    
    it('should get all events with pagination', async () => {
      const response = await apiHelpers.getPaginated('/api/events', 1, 10);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('events');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.events).toHaveLength(3);
      expect(response.body.pagination.total).toBe(3);
    });
    
    it('should filter events by building', async () => {
      // Create another building with an event
      const otherBuilding = await models.Building.create(createBuilding());
      await models.Event.create(createEvent(otherBuilding.id));
      
      const response = await apiHelpers.get('/api/events', { 
        buildingId: testBuilding.id 
      });
      
      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(3);
      expect(response.body.events.every(e => e.buildingId === testBuilding.id)).toBe(true);
    });
    
    it('should filter events by type', async () => {
      const response = await apiHelpers.get('/api/events', { 
        type: 'alarm' 
      });
      
      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(1);
      expect(response.body.events[0].type).toBe('alarm');
    });
    
    it('should filter events by severity', async () => {
      const response = await apiHelpers.get('/api/events', { 
        severity: 'high' 
      });
      
      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(1);
      expect(response.body.events[0].severity).toBe('high');
    });
    
    it('should filter events by resolved status', async () => {
      const response = await apiHelpers.get('/api/events', { 
        resolved: false 
      });
      
      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(2);
      expect(response.body.events.every(e => !e.resolved)).toBe(true);
    });
    
    it('should filter events by date range', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const response = await apiHelpers.get('/api/events', { 
        startDate: yesterday.toISOString(),
        endDate: tomorrow.toISOString()
      });
      
      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(3);
    });
    
    it('should validate query parameters', async () => {
      const response = await apiHelpers.get('/api/events', { 
        type: 'invalid_type',
        severity: 'invalid_severity'
      });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
    
    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/events');
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('GET /api/events/stats', () => {
    beforeEach(async () => {
      // Create events with different types and severities
      await Promise.all([
        models.Event.create(createEvent(testBuilding.id, { 
          type: 'door_open', severity: 'low', resolved: false 
        })),
        models.Event.create(createEvent(testBuilding.id, { 
          type: 'door_open', severity: 'low', resolved: true 
        })),
        models.Event.create(createEvent(testBuilding.id, { 
          type: 'alarm', severity: 'high', resolved: false 
        })),
        models.Event.create(createEvent(testBuilding.id, { 
          type: 'alarm', severity: 'critical', resolved: false 
        })),
        models.Event.create(createEvent(testBuilding.id, { 
          type: 'visitor_call', severity: 'medium', resolved: true 
        }))
      ]);
    });
    
    it('should get event statistics', async () => {
      const response = await apiHelpers.get('/api/events/stats');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('byType');
      expect(response.body).toHaveProperty('bySeverity');
      expect(response.body).toHaveProperty('byStatus');
      
      expect(response.body.total).toBe(5);
      expect(response.body.byType.door_open).toBe(2);
      expect(response.body.byType.alarm).toBe(2);
      expect(response.body.byType.visitor_call).toBe(1);
      expect(response.body.bySeverity.low).toBe(2);
      expect(response.body.bySeverity.high).toBe(1);
      expect(response.body.bySeverity.critical).toBe(1);
      expect(response.body.byStatus.resolved).toBe(2);
      expect(response.body.byStatus.unresolved).toBe(3);
    });
  });
  
  describe('GET /api/events/:id', () => {
    it('should get event by id', async () => {
      const event = await models.Event.create(createEvent(testBuilding.id));
      
      const response = await apiHelpers.getEntityById('/api/events', event.id);
      
      expect(response).toMatchObject({
        id: event.id,
        buildingId: event.buildingId,
        type: event.type,
        description: event.description
      });
    });
    
    it('should return 404 for non-existent event', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await apiHelpers.get(`/api/events/${fakeId}`);
      
      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Event not found');
    });
    
    it('should validate id format', async () => {
      const response = await apiHelpers.get('/api/events/invalid-id');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });
  
  describe('POST /api/events', () => {
    const validEventData = {
      type: 'door_open',
      description: 'Front door opened',
      severity: 'low',
      metadata: { doorId: 'front-001' }
    };
    
    it('should create event', async () => {
      const response = await apiHelpers.post('/api/events', {
        buildingId: testBuilding.id,
        ...validEventData
      });
      
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        buildingId: testBuilding.id,
        type: validEventData.type,
        description: validEventData.description,
        severity: validEventData.severity,
        resolved: false
      });
      expect(response.body).toHaveProperty('id');
      
      // Verify it was saved
      const saved = await models.Event.findByPk(response.body.id);
      expect(saved).toBeTruthy();
    });
    
    it('should create event with default severity', async () => {
      const response = await apiHelpers.post('/api/events', {
        buildingId: testBuilding.id,
        type: 'door_open',
        description: 'Door opened'
      });
      
      expect(response.status).toBe(201);
      expect(response.body.severity).toBe('low'); // Default severity
    });
    
    it('should validate required fields', async () => {
      const response = await apiHelpers.post('/api/events', {
        type: 'door_open'
        // Missing buildingId and description
      });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toHaveLength(2);
    });
    
    it('should validate event type', async () => {
      const response = await apiHelpers.post('/api/events', {
        buildingId: testBuilding.id,
        type: 'invalid_type',
        description: 'Test'
      });
      
      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toContain('Invalid');
    });
    
    it('should validate severity', async () => {
      const response = await apiHelpers.post('/api/events', {
        buildingId: testBuilding.id,
        type: 'door_open',
        description: 'Test',
        severity: 'invalid_severity'
      });
      
      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toContain('Invalid');
    });
    
    it('should validate building exists', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await apiHelpers.post('/api/events', {
        buildingId: fakeId,
        type: 'door_open',
        description: 'Test'
      });
      
      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Building not found');
    });
  });
  
  describe('PUT /api/events/:id', () => {
    let event;
    
    beforeEach(async () => {
      event = await models.Event.create(createEvent(testBuilding.id));
    });
    
    it('should update event', async () => {
      const updates = {
        description: 'Updated description',
        severity: 'high',
        metadata: { updated: true }
      };
      
      const response = await apiHelpers.updateEntity(
        '/api/events',
        event.id,
        updates
      );
      
      expect(response.description).toBe(updates.description);
      expect(response.severity).toBe(updates.severity);
      expect(response.metadata).toEqual(updates.metadata);
      expect(response.type).toBe(event.type); // Unchanged
    });
    
    it('should update resolved status', async () => {
      const response = await apiHelpers.put(
        `/api/events/${event.id}`,
        { resolved: true }
      );
      
      expect(response.status).toBe(200);
      expect(response.body.resolved).toBe(true);
    });
    
    it('should validate update fields', async () => {
      const response = await apiHelpers.put(
        `/api/events/${event.id}`,
        { 
          type: 'invalid_type',
          severity: 'invalid_severity'
        }
      );
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
    
    it('should return 404 for non-existent event', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await apiHelpers.put(
        `/api/events/${fakeId}`,
        { description: 'Update' }
      );
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('PUT /api/events/:id/resolve', () => {
    let unresolvedEvent;
    
    beforeEach(async () => {
      unresolvedEvent = await models.Event.create(
        createEvent(testBuilding.id, { resolved: false })
      );
    });
    
    it('should resolve event', async () => {
      const response = await apiHelpers.put(
        `/api/events/${unresolvedEvent.id}/resolve`
      );
      
      expect(response.status).toBe(200);
      expect(response.body.resolved).toBe(true);
      expect(response.body).toHaveProperty('resolvedAt');
      
      // Verify it was saved
      const updated = await models.Event.findByPk(unresolvedEvent.id);
      expect(updated.resolved).toBe(true);
      expect(updated.resolvedAt).toBeTruthy();
    });
    
    it('should handle already resolved event', async () => {
      // Create already resolved event
      const resolvedEvent = await models.Event.create(
        createEvent(testBuilding.id, { 
          resolved: true,
          resolvedAt: new Date()
        })
      );
      
      const response = await apiHelpers.put(
        `/api/events/${resolvedEvent.id}/resolve`
      );
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already resolved');
    });
    
    it('should return 404 for non-existent event', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await apiHelpers.put(`/api/events/${fakeId}/resolve`);
      
      expect(response.status).toBe(404);
    });
  });
});