const request = require('supertest');
const jwt = require('jsonwebtoken');

class AuthHelpers {
  constructor(app) {
    this.app = app;
    this.tokens = {};
  }
  
  // Login and get tokens
  async login(email = 'admin@test.com', password = 'admin123') {
    const response = await request(this.app)
      .post('/api/auth/login')
      .send({ email, password });
    
    if (response.status !== 200) {
      throw new Error(`Login failed: ${response.body.error || 'Unknown error'}`);
    }
    
    this.tokens = {
      accessToken: response.body.accessToken,
      refreshToken: response.body.refreshToken,
      user: response.body.user
    };
    
    return this.tokens;
  }
  
  // Get authorization header
  getAuthHeader() {
    if (!this.tokens.accessToken) {
      throw new Error('No access token available. Please login first.');
    }
    return `Bearer ${this.tokens.accessToken}`;
  }
  
  // Create custom token with specific role
  createToken(role = 'admin', userId = 'test-user-id') {
    const token = jwt.sign(
      { userId, email: `${role}@test.com`, role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
    return token;
  }
  
  // Get auth header with custom role
  getAuthHeaderWithRole(role) {
    const token = this.createToken(role);
    return `Bearer ${token}`;
  }
  
  // Refresh access token
  async refreshToken() {
    if (!this.tokens.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await request(this.app)
      .post('/api/auth/refresh')
      .send({ refreshToken: this.tokens.refreshToken });
    
    if (response.status !== 200) {
      throw new Error(`Token refresh failed: ${response.body.error || 'Unknown error'}`);
    }
    
    this.tokens.accessToken = response.body.accessToken;
    return response.body.accessToken;
  }
  
  // Logout
  async logout() {
    if (!this.tokens.accessToken) {
      return;
    }
    
    await request(this.app)
      .post('/api/auth/logout')
      .set('Authorization', this.getAuthHeader());
    
    this.tokens = {};
  }
  
  // Get current user profile
  async getProfile() {
    const response = await request(this.app)
      .get('/api/auth/profile')
      .set('Authorization', this.getAuthHeader());
    
    return response.body;
  }
}

module.exports = AuthHelpers;