# Testing Guide

## Overview

This guide covers the comprehensive testing strategy for the Debate Arena application, including unit tests, integration tests, component tests, and performance tests.

## Testing Stack

### Core Testing Libraries
- **Jest**: Test runner and assertion library
- **React Testing Library**: Component testing utilities
- **@testing-library/user-event**: User interaction simulation
- **@testing-library/jest-dom**: Additional DOM matchers
- **node-mocks-http**: HTTP request/response mocking
- **@swc/jest**: Fast TypeScript compilation

### Test Structure
```
tests/
├── fixtures/           # Mock data and test utilities
├── lib/               # Library and utility tests
│   ├── storage/       # Storage backend tests
│   └── utils/         # Utility function tests
├── api/               # API endpoint tests
├── components/        # React component tests
├── performance/       # Performance and load tests
└── setup/            # Test configuration
```

## Running Tests

### Basic Commands
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm run test:api         # API tests only
npm run test:components  # Component tests only
npm run test:storage     # Storage tests only
npm run test:utils       # Utility tests only
```

### Specialized Commands
```bash
# Seed test data
npm run test:seed        # Create test data
npm run test:seed dev    # Create development data
npm run test:seed perf   # Create performance test data

# Clean test artifacts
npm run test:clean       # Remove test data and coverage
```

## Test Categories

### 1. Unit Tests

**Storage Layer Tests** (`tests/lib/storage/`)
- File storage operations (CRUD)
- Data validation and error handling
- Search and pagination
- Export functionality
- Concurrent operations

```typescript
// Example: File storage test
describe('FileStorage', () => {
  test('should create a new debate successfully', async () => {
    const request = createMockDebateRequest();
    const result = await storage.createDebate(request);
    
    expect(result.success).toBe(true);
    expect(result.data!.metadata.topic.title).toBe(request.topic.title);
  });
});
```

**Utility Tests** (`tests/lib/utils/`)
- Debate format conversion
- API client functionality
- Data transformation
- Type conversions

```typescript
// Example: Conversion utility test
describe('DebateConverter', () => {
  test('should convert legacy state to DebateDocument', () => {
    const legacyState = createLegacyState();
    const result = DebateConverter.convertToDebateDocument(legacyState);
    
    expect(result.metadata.topic.title).toBe(legacyState.topic);
    expect(result.rootNodeId).toBeDefined();
  });
});
```

### 2. Integration Tests

**API Endpoint Tests** (`tests/api/`)
- HTTP request/response handling
- Parameter validation
- Error responses
- Status codes

```typescript
// Example: API endpoint test
describe('/api/debates', () => {
  test('should create new debate', async () => {
    const response = await POST(mockRequest);
    const body = await response.json();
    
    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
  });
});
```

### 3. Component Tests

**React Component Tests** (`tests/components/`)
- User interactions
- State management
- Props handling
- Event handling

```typescript
// Example: Component test
describe('DebatesPage', () => {
  test('should handle search functionality', async () => {
    const user = userEvent.setup();
    render(<DebatesPage />);
    
    const searchInput = screen.getByPlaceholderText('Search...');
    await user.type(searchInput, 'climate');
    
    expect(DebateAPI.searchDebates).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'climate' })
    );
  });
});
```

### 4. Performance Tests

**Load and Stress Tests** (`tests/performance/`)
- Large dataset handling
- Concurrent operations
- Memory usage
- Response times

```typescript
// Example: Performance test
describe('Storage Performance', () => {
  test('should create debates efficiently', async () => {
    const startTime = performance.now();
    // ... perform operations
    const duration = performance.now() - startTime;
    
    expect(duration).toBeLessThan(5000);
  });
});
```

## Test Data Management

### Mock Data Fixtures

**Mock Debates** (`tests/fixtures/mock-debates.ts`)
- Sample debate documents
- Participant configurations
- Node structures
- API responses

```typescript
export const createMockDebateDocument = (): DebateDocument => ({
  metadata: {
    id: uuidv4(),
    topic: { title: 'Test Debate', tags: ['test'] },
    // ...
  },
  participants: mockParticipants,
  nodes: mockNodes,
  // ...
});
```

### Data Seeding

**Test Data Generation** (`scripts/seed-test-data.js`)
- Development data creation
- Performance test datasets
- Automated data cleanup

```bash
# Create sample debates for development
npm run test:seed dev

# Create large datasets for performance testing
npm run test:seed perf
```

## Mocking Strategies

### API Mocking
```typescript
// Mock fetch for API tests
global.fetch = jest.fn();

(global.fetch as jest.Mock).mockResolvedValue({
  json: () => Promise.resolve(mockResponse)
});
```

### Storage Mocking
```typescript
// Mock storage backend
jest.mock('@/lib/storage/storage-manager', () => ({
  storage: {
    createDebate: jest.fn(),
    getDebate: jest.fn(),
    // ...
  }
}));
```

### Next.js Mocking
```typescript
// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));
```

## Coverage Requirements

### Coverage Thresholds
```javascript
coverageThreshold: {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70,
  },
}
```

### Coverage Reports
```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

### Critical Areas
- **Storage Operations**: 90%+ coverage required
- **API Endpoints**: 85%+ coverage required
- **Core Utilities**: 80%+ coverage required
- **UI Components**: 70%+ coverage required

## Testing Best Practices

### 1. Test Organization
- **Arrange, Act, Assert**: Clear test structure
- **Descriptive Names**: Tests should read like specifications
- **Single Responsibility**: One assertion per test focus
- **Independent Tests**: No test dependencies

```typescript
describe('DebateStorage', () => {
  describe('when creating a debate', () => {
    test('should return success response with valid data', async () => {
      // Arrange
      const request = createMockDebateRequest();
      
      // Act
      const result = await storage.createDebate(request);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });
});
```

### 2. Mock Management
- **Minimal Mocking**: Mock only external dependencies
- **Realistic Data**: Use realistic mock data
- **State Reset**: Clean mocks between tests
- **Mock Verification**: Assert mock calls when relevant

### 3. Error Testing
- **Error Scenarios**: Test both success and failure paths
- **Edge Cases**: Test boundary conditions
- **Invalid Input**: Test validation and error handling
- **Network Failures**: Test connection and timeout issues

```typescript
test('should handle network errors gracefully', async () => {
  (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
  
  const result = await DebateAPI.createDebate(request);
  
  expect(result).toBeNull();
});
```

### 4. Performance Testing
- **Baseline Metrics**: Establish performance baselines
- **Load Testing**: Test with realistic data volumes
- **Memory Monitoring**: Watch for memory leaks
- **Concurrent Testing**: Test thread safety

## Continuous Integration

### GitHub Actions Workflow
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run test:api
      - run: npm run test:components
```

### Pre-commit Hooks
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test && npm run lint",
      "pre-push": "npm run test:coverage"
    }
  }
}
```

## Debugging Tests

### Debug Configuration
```json
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Jest Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Debug Commands
```bash
# Debug specific test
npx jest --debug-only tests/lib/storage/file-storage.test.ts

# Run single test with detailed output
npx jest --verbose --no-coverage tests/api/debates.test.ts

# Debug failing tests
npx jest --onlyFailures --verbose
```

## Test Environment Setup

### Environment Variables
```bash
# Test environment settings
NODE_ENV=test
OPENAI_API_KEY=test-key
DEBATE_STORAGE_PATH=./tests/data/debates
```

### Test Database
```typescript
// Setup test-specific storage
beforeEach(async () => {
  storage = new FileStorage('./tests/data/debates');
  await storage.initialize();
});

afterEach(async () => {
  await fs.rm('./tests/data/debates', { recursive: true, force: true });
});
```

## Common Testing Patterns

### Testing Async Operations
```typescript
test('should handle async debate creation', async () => {
  const promise = storage.createDebate(request);
  
  await expect(promise).resolves.toMatchObject({
    success: true,
    data: expect.objectContaining({
      metadata: expect.objectContaining({
        id: expect.any(String)
      })
    })
  });
});
```

### Testing User Interactions
```typescript
test('should update search on user input', async () => {
  const user = userEvent.setup();
  render(<SearchComponent />);
  
  const input = screen.getByRole('textbox');
  await user.type(input, 'search term');
  
  expect(mockSearchFunction).toHaveBeenCalledWith('search term');
});
```

### Testing Error Boundaries
```typescript
test('should display error when API fails', async () => {
  mockAPI.mockRejectedValue(new Error('API Error'));
  
  render(<ComponentWithAPI />);
  
  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

## Maintenance

### Regular Tasks
1. **Update Dependencies**: Keep testing libraries current
2. **Review Coverage**: Ensure coverage meets requirements
3. **Performance Baselines**: Update performance expectations
4. **Mock Data**: Keep test data realistic and current
5. **Test Documentation**: Update test documentation

### Monitoring
- **Test Duration**: Monitor test execution times
- **Flaky Tests**: Identify and fix unreliable tests
- **Coverage Trends**: Track coverage over time
- **Performance Regressions**: Monitor performance metrics

---

This testing strategy ensures reliable, maintainable code while providing confidence in system behavior across all components and use cases.