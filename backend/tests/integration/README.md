# Integration Tests

This directory contains integration tests for the FORTEN CRM backend API endpoints.

## Structure

- **Test Utilities**
  - `setup.js` - Database setup and teardown functions
  - `factories.js` - Test data factory functions
  - `authHelpers.js` - Authentication helper class
  - `apiHelpers.js` - API request helper class
  - `testApp.js` - Test Express app creation

- **Test Files**
  - `auth.integration.test.js` - Authentication endpoints tests
  - `buildings.integration.test.js` - Buildings CRUD operations tests
  - `events.integration.test.js` - Events management tests
  - `access.integration.test.js` - Access control and PIN validation tests

## Running Tests

```bash
# Run all integration tests
npm run test:integration

# Run a specific test file
npm test tests/integration/auth.integration.test.js

# Run all tests (unit + integration)
npm run test:all

# Run tests with coverage
npm run test:coverage
```

## Test Database

Integration tests use a separate SQLite database (`test.sqlite`) that is:
- Created automatically when tests start
- Seeded with default admin user and test building
- Cleaned between test suites
- Deleted when tests complete

## Authentication

Tests use a default admin user:
- Email: `admin@test.com`
- Password: `admin123`

Helper classes handle authentication automatically:
```javascript
const authHelpers = new AuthHelpers(app);
await authHelpers.login(); // Login with default admin
const token = authHelpers.getAuthHeader(); // Get auth header
```

## API Helpers

The `ApiHelpers` class provides convenient methods for testing:
```javascript
const apiHelpers = new ApiHelpers(app, authHelpers);

// GET request
const response = await apiHelpers.get('/api/buildings');

// POST request
const building = await apiHelpers.createEntity('/api/buildings', data);

// Test with different roles
const response = await apiHelpers.post('/api/buildings', data, 'supervisor');
```

## Test Data Factories

Use factories to create test data:
```javascript
const { createBuilding, createEvent, createAccess } = require('./factories');

const building = createBuilding({ name: 'Test Building' });
const event = createEvent(buildingId, { type: 'alarm' });
const access = createAccess(buildingId, { type: 'visitor' });
```

## Best Practices

1. **Clean State**: Each test suite cleans the database before running
2. **Isolation**: Tests run sequentially with `--runInBand` to avoid conflicts
3. **Authentication**: Use role-based helpers to test authorization
4. **Assertions**: Use API helpers for consistent error checking
5. **Factories**: Use factories for consistent test data

## Coverage

Current test coverage includes:
- ✅ Authentication (login, refresh, logout, profile)
- ✅ Buildings CRUD with role-based access
- ✅ Events creation, filtering, and resolution
- ✅ Access control with PIN validation
- ✅ Error handling and validation
- ✅ Pagination and filtering
- ✅ Authorization checks