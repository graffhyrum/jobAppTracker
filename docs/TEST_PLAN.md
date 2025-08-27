# Job Application Tracker - Test Plan

## Overview

This test plan outlines the testing strategy for the Job Application Tracker, using Bun's built-in test runner for unit and integration tests, and Playwright for end-to-end testing.

## Testing Philosophy

- **Test-Driven Development (TDD)**: Write tests before implementation
- **Hexagonal Architecture Testing**: Test each layer independently with proper mocking
- **High Coverage**: Aim for >90% code coverage on business logic
- **Fast Feedback**: Unit tests should run in <2 seconds total
- **Reliable E2E**: End-to-end tests should be deterministic and isolated

## Test Pyramid

```
       /\
      /  \     E2E Tests (Playwright)
     /    \    - Happy path workflows
    /______\   - Critical user journeys
   /        \  
  /          \  Integration Tests (Bun)
 /            \ - Database interactions
/______________\- External service mocking
                
                Unit Tests (Bun)
                - Business logic
                - Domain entities
                - Use cases
```

## Testing Framework Setup

### Unit & Integration Tests
- **Framework**: Bun Test Runner
- **Mocking**: Bun's built-in mocking
- **Assertions**: Bun's built-in assertions
- **Coverage**: Bun's built-in coverage reporting

### End-to-End Tests
- **Framework**: Playwright
- **Browsers**: Chromium (primary), Firefox, Safari (CI only)
- **Test Data**: Isolated test database per test
- **Screenshots**: On failure for debugging

## Test Structure

### Directory Organization
```
src/
├── domain/
│   ├── entities/
│   └── use-cases/
├── infrastructure/
│   ├── repositories/
│   └── pdf/
└── presentation/
    ├── routes/
    └── templates/

tests/
├── integration/
├── e2e/
├── fixtures/
└── helpers/
```

## Unit Test Plan

### Domain Layer Tests
- **JobApplication Entity**: Validation, status updates, note management, timestamp handling
- **Use Cases**: Application creation, status updates, data validation, error handling

### Infrastructure Layer Tests
- **Repository Implementation**: Data persistence, querying, error handling
- **PDF Form Filler**: Template validation, field mapping, form generation

## Integration Test Plan

### Database Integration
- Application persistence with all fields
- Database migrations and schema changes
- Referential integrity maintenance
- Concurrent write handling

### API Integration  
- CRUD operations via HTTP endpoints
- Request validation and error handling
- Response format consistency
- Authentication and authorization (future)

### PDF Generation Integration
- End-to-end form filling with real templates
- Complex field mapping scenarios
- Output PDF validation
- Performance with large datasets

## End-to-End Test Plan

### Critical User Journeys

#### Application Management Flow
- Create new application with all required fields
- Edit application details and verify persistence
- Delete application and confirm removal
- Navigate between application views

#### Pipeline Workflow  
- Move applications through active status pipeline
- Transition applications to inactive status
- Verify status changes reflect in dashboard
- Test pipeline customization functionality

#### PDF Generation
- Upload PDF template and configure mappings
- Generate filled PDF from application data
- Download and validate PDF content
- Handle multiple template scenarios

#### Dashboard & Task Management
- View overdue applications prominently
- Update next event dates
- Manage todo items from dashboard
- Filter and sort applications by various criteria

### Cross-browser Testing
- Test core functionality across Chromium, Firefox, and WebKit
- Verify consistent behavior and styling
- Validate form submissions and data persistence

## Test Data Management

### Fixtures
- **Sample Applications**: Basic, with notes, overdue, and inactive scenarios
- **PDF Templates**: Standard form templates with field mappings
- **Pipeline Configurations**: Default and custom pipeline setups
- **Notes Data**: Various note content and timestamp scenarios

### Database Test Helpers
- **Test Database Creation**: Isolated in-memory databases per test
- **Data Seeding**: Populate test databases with fixture data
- **Cleanup Utilities**: Reset database state between tests
- **Schema Management**: Initialize and migrate test schemas

## Performance Testing

### Load Testing
- Handle large numbers of applications (1000+) efficiently
- Measure response times under load
- Monitor memory usage and resource consumption
- Test database performance with realistic data volumes

### PDF Generation Performance  
- Generate PDFs within acceptable time limits (<5 seconds)
- Test with various template sizes and complexity
- Measure memory usage during PDF operations
- Validate performance with concurrent PDF generation

## Test Execution Strategy

### Local Development
```bash
# Run all unit tests
bun test tests/unit/

# Run integration tests
bun test tests/integration/

# Run with coverage
bun test --coverage

# Run E2E tests
bunx playwright test
```

### CI/CD Pipeline
```yaml
# .github/workflows/test.yml
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Run unit tests
        run: bun test tests/unit/ --coverage
        
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Run integration tests
        run: bun test tests/integration/
        
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Install Playwright
        run: bunx playwright install
      - name: Run E2E tests
        run: bunx playwright test
```

## Coverage Goals

| Layer | Coverage Target | Critical Paths |
|-------|----------------|----------------|
| Domain Entities | 95%+ | All business logic |
| Use Cases | 90%+ | Error handling paths |
| Infrastructure | 80%+ | Happy path + error cases |
| Presentation | 70%+ | Key user interactions |

## Mock Strategy

### External Dependencies
- **Database**: Use in-memory SQLite for unit tests
- **File System**: Mock PDF file operations
- **Time**: Mock Date.now() for consistent timestamps
- **External APIs**: Not applicable (offline app)

### Test Doubles
- **Repository Mocks**: Mock data persistence layer
- **PDF Service Mocks**: Mock form filling operations
- **Time Mocks**: Consistent timestamp generation
- **File System Mocks**: Simulate file operations

## Quality Gates

### Pre-commit Hooks
- All unit tests must pass
- Code coverage must not decrease
- Linting and type checking must pass

### Pre-merge Requirements
- All tests (unit, integration, E2E) must pass
- Coverage targets must be met
- Performance tests must not regress

### Release Criteria
- Full test suite passes on all supported platforms
- E2E tests pass on all target browsers
- Performance benchmarks meet requirements
- Manual smoke testing completed

## Test Maintenance

### Regular Tasks
- Review and update test data monthly
- Audit test performance quarterly
- Update browser versions for E2E tests
- Clean up obsolete tests during refactoring

### Test Hygiene Rules
- One assertion per test where possible
- Descriptive test names following "should [expected behavior] when [condition]"
- No shared mutable state between tests
- Clean up resources in teardown hooks
- Use data builders for complex test objects
