# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A single-user job application tracking system built with TypeScript and Bun, following hexagonal architecture principles. The system tracks job applications through customizable pipelines, supports PDF form filling, and includes integrated task management.

## Development Commands

```bash
# Development (requires SurrealDB running)
surreal start --log trace memory     # Start SurrealDB in memory mode
bun run dev                          # Start development server
bun run src/index.ts                 # Direct run

# Building
bun build src/index.ts --target bun --outfile dist/jobapptracker

# Testing
bun test                      # Run all tests
bun test tests/unit/          # Unit tests only
bun test tests/integration/   # Integration tests only
bun test --coverage           # With coverage
bun test tests/e2e/          # E2E tests (Playwright)
playwright test               # E2E tests with Playwright
playwright test --ui          # E2E tests with UI

# Code Quality
biome lint                    # Lint code
biome format                  # Format code
biome check                   # Check code (lint + format)
biome check --fix             # Fix issues automatically
```

## Architecture

### Hexagonal Architecture Layers

- **Domain** (`src/domain/`): Core business logic, entities, and types
  - Entities: JobApplication, Note, PipelineConfig with rich behavior methods
  - Types: StatusCategory, ApplicationStatus, InterestRating
  - Pure functions and domain logic, no external dependencies

- **Application** (`src/application/`): Use cases and application services
  - Orchestrates domain entities and infrastructure adapters
  - Contains business workflows and validation logic

- **Infrastructure** (`src/infrastructure/`): External adapters
  - Database: SurrealDB operations with native JavaScript SDK
  - PDF: Form filling using PDF-lib
  - File system operations

- **Presentation** (`src/presentation/`): Web interface
  - HTMX-powered frontend with server-rendered templates
  - RESTful routes served via Bun.serve

### Hexagonal Architecture & Dependency Inversion

This project strictly follows hexagonal architecture (ports & adapters) with typed holes for dependency inversion:

**Core Principle**: Domain layer defines interfaces (ports/typed holes), infrastructure implements them (adapters).

#### Creating New Abstractions

When adding functionality that requires external dependencies:

1. **Define a typed hole (port)** in `src/domain/ports/`:
   ```typescript
   // Domain defines the interface
   export interface JobApplicationRepository {
     save: (app: JobApplication) => ResultAsync<void, DatabaseError>
     findById: (id: string) => ResultAsync<JobApplication | null, DatabaseError>
   }
   ```

2. **Create BOTH implementations**:
   ```typescript
   // Real implementation in src/infrastructure/
   export const SurrealJobApplicationRepository: JobApplicationRepository = {
     save: async (app) => { /* SurrealDB operations */ },
     findById: async (id) => { /* SurrealQL queries */ }
   }

   // Test implementation in tests/
   export const InMemoryJobApplicationRepository: JobApplicationRepository = {
     save: async (app) => { /* in-memory operations */ },
     findById: async (id) => { /* mock data */ }
   }
   ```

3. **Inject via use cases**:
   ```typescript
   // Use case accepts the interface, not concrete implementation
   export const saveJobApplication = (
     data: CreateJobApplicationData,
     repo: JobApplicationRepository
   ): ResultAsync<JobApplication, Error> => {
     const app = createJobApplication(data)
     return repo.save(app).map(() => app)
   }
   ```

#### Why This Matters

- **Testability**: Every external dependency has a test double
- **Flexibility**: Switch implementations without changing business logic  
- **Isolation**: Domain layer remains pure, infrastructure changes don't cascade
- **Interface Evolution**: When changing an interface, you must update both real and test implementations

**Rule**: Never import infrastructure modules directly in domain/application layers. Always define and inject interfaces.

### Key Technical Patterns

- **Rich Domain Entities**: JobApplication and Note entities contain behavior methods (updateStatus, addNote, isOverdue, etc.)
- **ArkType Validation**: Used for input validation and type inference
- **NeverThrow Error Handling**: Result types instead of exceptions
- **Functional Composition**: Prefer pure functions over classes

### Status System

Two-tier status system:
- **Status Categories**: `active` | `inactive`
- **Statuses**: Auto-categorized based on predefined lists
  - Active: applied, screening interview, interview, onsite, online test, take-home assignment, offer
  - Inactive: rejected, no response, no longer interested, hiring freeze

Pipeline is customizable through admin interface.

## Key Domain Models

### JobApplication Entity
- Rich entity with behavior methods: `updateStatus()`, `addNote()`, `updateNote()`, `removeNote()`, `isOverdue()`
- Immutable ID, mutable state with automatic lastUpdated tracking
- Factory functions: `createJobApplication()`, `jobApplicationFromData()`

### Note Entity
- Timestamped content with `update()` method
- Tracks creation and modification dates

### Data Flow
1. Input validation with ArkType schemas
2. Domain entity creation/updates
3. Infrastructure persistence via adapters
4. HTMX frontend updates via hypermedia responses

## Technology Stack Specifics

- **Runtime**: Bun (use `bun` commands, not `node` or `npm`)
- **Database**: SurrealDB (multi-model database with graph capabilities)
- **Web**: `Bun.serve` with HTMX (not Express)
- **Validation**: ArkType for schemas and type inference
- **Error Handling**: NeverThrow Result types
- **PDF**: PDF-lib for form filling
- **Testing**: Built-in Bun test runner + Playwright for E2E
- **Linting**: Biome (replaces ESLint/Prettier)

## File Structure Conventions

```
src/
├── domain/           # Pure business logic, no external deps
│   ├── entities/     # Rich domain objects with behavior
│   ├── ports/        # Interfaces for infrastructure
│   └── use-cases/    # Application workflows
├── application/      # Use case orchestration
├── infrastructure/   # External system adapters
└── presentation/     # HTMX web interface
```

## Development Notes

- Server runs on `http://localhost:3000` by default
- SurrealDB runs on `http://localhost:8000` by default
- Uses tab indentation (configured in biome.json)
- Follows SOLID principles with dependency inversion
- Entity methods automatically update `lastUpdated` timestamps
- Status changes trigger category recalculation
- PDF templates use field mapping configuration for extensibility

## SurrealDB Integration

- **Connection**: Use SurrealDB JavaScript SDK for database operations
- **Query Language**: SurrealQL (SQL-like with additional capabilities)
- **Schema**: Schemaless by default, can add schema constraints as needed
- **Relationships**: Native graph relationships between job applications and notes
- **Real-time**: Built-in support for live queries (future enhancement)
- **Data Types**: Native support for complex types, arrays, and objects

## Error Handling Patterns

This project uses NeverThrow's Result types instead of throwing exceptions:

```typescript
// Good - Return Result types
export const validateApplication = (data: unknown): Result<JobApplication, ValidationError> => {
  const validation = ApplicationSchema(data)
  if (validation instanceof type.errors) {
    return Result.err(new ValidationError(validation.summary))
  }
  return Result.ok(validation)
}

// Good - Chain operations with map/andThen
export const processApplication = (data: unknown): ResultAsync<string, Error> => {
  return validateApplication(data)
    .asyncAndThen(app => repository.save(app))
    .map(() => "Application saved successfully")
}
```

**Rule**: Never throw exceptions in business logic. Always return Result<T, E> or ResultAsync<T, E>.

## ArkType Integration

Use ArkType schemas for validation at system boundaries:

```typescript
// Define runtime validators that also provide types
export const CreateJobApplicationSchema = type({
  company: CompanyName,
  position: PositionTitle,
  applicationDate: "Date",
  status: ApplicationStatus,
  interestRating: InterestRating,
  "nextEventDate?": "Date",
  "jobPostingUrl?": "string",
  "jobDescription?": "string"
})

export type CreateJobApplicationData = typeof CreateJobApplicationSchema.infer

// Use in validation functions
const validateInput = (input: unknown) => {
  const result = CreateJobApplicationSchema(input)
  return result instanceof type.errors 
    ? Result.err(new ValidationError(result.summary))
    : Result.ok(result)
}
```