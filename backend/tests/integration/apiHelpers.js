const request = require('supertest');

class ApiHelpers {
  constructor(app, authHelpers) {
    this.app = app;
    this.auth = authHelpers;
  }
  
  // Generic authenticated request helper
  async makeAuthenticatedRequest(method, path, data = null, role = null) {
    const authHeader = role 
      ? this.auth.getAuthHeaderWithRole(role)
      : this.auth.getAuthHeader();
    
    let req = request(this.app)[method](path)
      .set('Authorization', authHeader);
    
    if (data) {
      req = req.send(data);
    }
    
    return req;
  }
  
  // GET request helper
  async get(path, query = {}, role = null) {
    const authHeader = role 
      ? this.auth.getAuthHeaderWithRole(role)
      : this.auth.getAuthHeader();
    
    return request(this.app)
      .get(path)
      .query(query)
      .set('Authorization', authHeader);
  }
  
  // POST request helper
  async post(path, data, role = null) {
    return this.makeAuthenticatedRequest('post', path, data, role);
  }
  
  // PUT request helper
  async put(path, data, role = null) {
    return this.makeAuthenticatedRequest('put', path, data, role);
  }
  
  // DELETE request helper
  async delete(path, role = null) {
    return this.makeAuthenticatedRequest('delete', path, null, role);
  }
  
  // Unauthenticated request helpers
  async getPublic(path, query = {}) {
    return request(this.app)
      .get(path)
      .query(query);
  }
  
  async postPublic(path, data) {
    return request(this.app)
      .post(path)
      .send(data);
  }
  
  // Helper to check response status and return body
  expectSuccess(response, expectedStatus = 200) {
    expect(response.status).toBe(expectedStatus);
    return response.body;
  }
  
  // Helper to check error response
  expectError(response, expectedStatus, expectedMessage = null) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('error');
    if (expectedMessage) {
      expect(response.body.error).toContain(expectedMessage);
    }
    return response.body;
  }
  
  // Pagination helper
  async getPaginated(path, page = 1, limit = 10, additionalQuery = {}, role = null) {
    return this.get(path, { page, limit, ...additionalQuery }, role);
  }
  
  // Helper to wait for async operations
  async waitFor(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Helper to create and return an entity
  async createEntity(endpoint, data, role = null) {
    const response = await this.post(endpoint, data, role);
    this.expectSuccess(response, 201);
    return response.body;
  }
  
  // Helper to update and return an entity
  async updateEntity(endpoint, id, data, role = null) {
    const response = await this.put(`${endpoint}/${id}`, data, role);
    this.expectSuccess(response);
    return response.body;
  }
  
  // Helper to delete an entity
  async deleteEntity(endpoint, id, role = null) {
    const response = await this.delete(`${endpoint}/${id}`, role);
    this.expectSuccess(response, 204);
  }
  
  // Helper to get entity by ID
  async getEntityById(endpoint, id, role = null) {
    const response = await this.get(`${endpoint}/${id}`, {}, role);
    this.expectSuccess(response);
    return response.body;
  }
}

module.exports = ApiHelpers;