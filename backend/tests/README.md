# Unit Tests for FORTEN Backend

This directory contains unit tests for the FORTEN backend application, focusing on the main use cases.

## Test Structure

```
tests/
├── unit/
│   └── use-cases/
│       ├── auth/
│       │   └── LoginUseCase.test.ts
│       ├── building/
│       │   └── CreateBuildingUseCase.test.ts
│       ├── event/
│       │   └── CreateEventUseCase.test.ts
│       └── access/
│           └── ValidateAccessUseCase.test.ts
├── mocks/
│   ├── repositories/
│   │   ├── MockUserRepository.ts
│   │   ├── MockBuildingRepository.ts
│   │   ├── MockEventRepository.ts
│   │   └── MockAccessRepository.ts
│   └── services/
│       ├── MockAuthService.ts
│       └── MockEventService.ts
└── setup.js
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run only unit tests
npm run test:unit
```

## Test Coverage

The following use cases have 100% test coverage:

1. **LoginUseCase** - Tests authentication flow including:
   - Successful login with valid credentials
   - Error handling for invalid credentials
   - User deactivation checks
   - Password validation
   - Database error handling

2. **CreateBuildingUseCase** - Tests building creation including:
   - Creating buildings with required fields only
   - Creating buildings with all optional fields
   - System event creation on building creation
   - Repository persistence
   - Error handling for database failures
   - Graceful handling of event creation failures

3. **CreateEventUseCase** - Tests event creation including:
   - Creating events with required fields
   - Creating events with optional fields
   - Event publishing through event service
   - Repository persistence
   - Different event types and severity levels
   - Error handling and resilience

4. **ValidateAccessUseCase** - Tests access validation including:
   - Valid PIN validation and usage tracking
   - Invalid PIN rejection
   - Building-specific PIN validation
   - Expired and inactive access rejection
   - Usage limit enforcement
   - Event logging for both success and failure cases
   - Different access types validation

## Mock Implementations

The tests use mock implementations of repositories and services to isolate the business logic:

### Mock Repositories
- Implement the full interface of their corresponding domain repositories
- Provide in-memory storage for testing
- Include helper methods for test setup (addUser, addBuilding, etc.)
- Support all query methods and filters

### Mock Services
- **MockAuthService**: Handles token generation/verification and password hashing
- **MockEventService**: Tracks published events and manages subscriptions

## Test Patterns

### Setup and Teardown
```typescript
beforeEach(() => {
  // Initialize mocks
  mockRepository = new MockRepository();
  mockService = new MockService();
  useCase = new UseCase(mockRepository, mockService);
});

afterEach(() => {
  // Clear mock data
  mockRepository.clear();
  mockService.clear();
  jest.clearAllMocks();
});
```

### Testing Success Cases
```typescript
it('should successfully execute the use case', async () => {
  // Arrange - Set up test data
  const input = { /* test data */ };
  
  // Act - Execute the use case
  const result = await useCase.execute(input);
  
  // Assert - Verify the results
  expect(result).toMatchExpectedOutput();
});
```

### Testing Error Cases
```typescript
it('should handle errors gracefully', async () => {
  // Arrange - Set up error condition
  mockRepository.method = jest.fn().mockRejectedValue(new Error('Test error'));
  
  // Act & Assert - Verify error handling
  await expect(useCase.execute(input)).rejects.toThrow('Test error');
});
```

## Best Practices

1. **Isolation**: Each use case is tested in isolation using mocks
2. **Coverage**: Aim for high code coverage but focus on meaningful tests
3. **Edge Cases**: Test boundary conditions and error scenarios
4. **Readability**: Use descriptive test names and clear arrange-act-assert pattern
5. **Maintainability**: Keep tests simple and focused on single behaviors

## Adding New Tests

To add tests for a new use case:

1. Create the test file in the appropriate subdirectory
2. Create or reuse mock implementations as needed
3. Follow the existing test patterns
4. Ensure all success paths and error cases are covered
5. Run tests to verify they pass and check coverage

## Continuous Integration

These tests should be run as part of the CI/CD pipeline to ensure code quality and prevent regressions.