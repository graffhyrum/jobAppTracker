# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Project Overview

A single-user job application tracking system built with TypeScript and Bun, following hexagonal architecture principles. The system tracks job applications through customizable pipelines, supports PDF form filling, and includes integrated task management.

# Development Commands

```bash
# Development
bun run dev                          # Start development server in watch mode
bun run src/index.ts                 # Direct run

# Building
bun run build

# Testing
bun test:all                  # Run all tests
bun test:coverage             # Unit tests with coverage
bun test:e2e                  # Headless E2E tests (Playwright)
bun test:e2e:ui               # Headed E2E tests (Playwright)

# Code Quality
bun vet                     # An all-inclusive check for linting, styling, compiling, and tests
bun lint                    # Lint code with biome
bun format                  # Format code
bun check                   # Check code (lint + format)
bun fix                     # Fix issues automatically
bun typecheck               # use Tsc to check for type errors

```

# Architecture

## Hexagonal Architecture Layers

- **Domain** (`src/domain/`): Core business logic, entities, and types
  - Entities: JobApplication, Note, PipelineConfig with rich behavior methods
  - Types: StatusCategory, ApplicationStatus, InterestRating
  - Pure functions and domain logic, no external dependencies

- **Application** (`src/application/`): Use cases and application services
  - Orchestrates domain entities and infrastructure adapters
  - Contains business workflows and validation logic

- **Infrastructure** (`src/infrastructure/`): External adapters
  - PDF: Form filling using PDF-lib
  - File system operations

- **Presentation** (`src/presentation/`): Web interface
  - HTMX-powered frontend with server-rendered templates
  - RESTful routes served via Bun.serve

## Hexagonal Architecture & Dependency Inversion

This project strictly follows hexagonal architecture (ports & adapters) with typed holes for dependency inversion:

**Core Principle**: Domain layer defines interfaces (ports/typed holes), infrastructure implements them (adapters).

### Creating New Abstractions

When adding functionality that requires external dependencies:

1. **Define a typed hole (port)** in `src/domain/ports/`:
   ```typescript
   // Domain defines the interface
   export interface JobApplicationRepository {
     save: (app: JobApplication) => ResultAsync<void, DatabaseError>
     findById: (id: UUID) => ResultAsync<JobApplication | null, DatabaseError>
   }
   ```

2. **Create BOTH implementations**:
   ```typescript
   // Real implementation in src/infrastructure/
   export const SQLiteJobApplicationRepository: JobApplicationRepository = {
     save: async (app) => { /* SQLite operations */ },
     findById: async (id) => { /* SQLite queries */ }
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
- **Database**: SQLite using Bun's built-in `bun:sqlite` driver
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
- Uses indentation configured in `biome.json`
- Follows SOLID principles with dependency inversion
- Entity methods automatically update `lastUpdated` timestamps
- Status changes trigger category recalculation
- PDF templates use field mapping configuration for extensibility
- Always check work at the end with `bun vet`

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

# Code Style

## Typed Holes for Dependency Inversion
- Use TypeScript's type system to define 'holes' (interfaces or types) for dependencies and inject implementations at composition root.
- This enforces dependency inversion and makes code more testable and modular.
- Example:

```typescript
// Define a typed hole (port)
export interface Clock {
  now(): Date;
}

// Inject implementation
function logCurrentTime(clock: Clock) {
  console.log(clock.now());
}

// In production
const systemClock: Clock = { 
  now() { return new Date() } 
};
logCurrentTime(systemClock);

// In tests
const fixedClock: Clock = { 
  now() {
    new Date('2000-01-01')
  } };
logCurrentTime(fixedClock);
```

## Hexagonal Architecture
- Structure code to separate core business logic (domain) from external concerns (infrastructure, APIs, UI).
- Use interfaces (ports) for dependencies; implement adapters for infrastructure.
- When creating a new interface, expect to always make at least two adapters, one for testing and one (or more) for production use/injection.
- Example:

```ts
// Port (interface)
type PullRequest = {};

export interface PRRepository {
  getOpenPRs(repo: string): Promise<PullRequest[]>;
}

// Production Adapter (infrastructure)
function createGitHubPRRepository(): PRRepository {
  return {
    async getOpenPRs(repo) {
      return [] as PullRequest[]; /* call GitHub API */
    },
  };
}

// Test Adapter
function createTestPRRepository(): PRRepository {
  return {
    async getOpenPRs(repo: string): Promise<PullRequest[]> {
      return [] as PullRequest[]; /* create mock */
    },
  };
}

// Use in core
function listOpenPRs(repo: string, prRepo: PRRepository) {
  return prRepo.getOpenPRs(repo);
}

```

## ts-js-guidelines

- Prefer pure functions and module composition over classes.
- Use named functions unless infeasible.
- Prefer 'unknown' over 'any' for vague types.
- No type casting or ES6 classes without explicit permission.
-
- Always use const or let for variables, never 'var'.
- Prefer using nullish coalescing operator (`??`) instead of logical or (`||`), as it is a safer operator.

# Unit Test Guidelines
- Create unit test files 'next to' the files they test. EG: for `someFeature.ts`, create `someFeature.test.ts`
- Only test the API contract of a module, never the implementation.
- Create as few tests as possible to reach the coverage target (95%)
- Before adding tests, always check if the system under test could be refactored to improve testability without changing functionality. If you think it can, propose the changes to the user but *DO NOT* apply them. 

# Utility Types

## Core Utility Types

### `Awaited<Type>`
Extract the resolved type of Promise types recursively. Use for modeling async operations and Promise unwrapping.

```typescript  
type A = Awaited<Promise<string>>; // string  
type B = Awaited<Promise<Promise<number>>>; // number  
```  

### `Partial<Type>`
Make all properties optional. Use for update operations and partial object construction.

```typescript  
interface Todo {  
  title: string;  description: string;}  
type PartialTodo = Partial<Todo>; // { title?: string; description?: string; }  
```  

### `Required<Type>`
Make all properties required. Opposite of Partial. Use when enforcing complete object structures.

```typescript  
interface Props {  
  a?: number;  b?: string;}  
type RequiredProps = Required<Props>; // { a: number; b: string; }  
```  

### `Readonly<Type>`
Make all properties readonly. Use for immutable data structures and preventing reassignment.

```typescript  
interface Todo {  
  title: string;}  
type ReadonlyTodo = Readonly<Todo>; // { readonly title: string; }  
```  

### `Record<Keys, Type>`
Create object type with specified keys and value types. Use for mapping and dictionary structures.

```typescript  
type CatName = "miffy" | "boris" | "mordred";interface CatInfo {  
  age: number;  
  breed: string;  
}  
type Cats = Record<CatName, CatInfo>;  
```  

### `Pick<Type, Keys>`
Select specific properties from a type. Use for creating focused interfaces.

```typescript  
interface Todo {  
  title: string;  description: string;  completed: boolean;}  
type TodoPreview = Pick<Todo, "title" | "completed">;  
```  

### `Omit<Type, Keys>`
Remove specific properties from a type. Opposite of Pick. Use for excluding unwanted properties.

```typescript  
interface Todo {  
  title: string;  description: string;  completed: boolean;  createdAt: number;}  
type TodoPreview = Omit<Todo, "description">;  
```  

## Union Manipulation Types

### `Exclude<UnionType, ExcludedMembers>`
Remove types from union. Use for filtering union members.

```typescript  
type T0 = Exclude<"a" | "b" | "c", "a">; // "b" | "c"  
type T1 = Exclude<string | number | (() => void), Function>; // string | number  
```  

### `Extract<Type, Union>`
Extract matching types from union. Use for selecting specific union members.

```typescript  
type T0 = Extract<"a" | "b" | "c", "a" | "f">; // "a"  
type T1 = Extract<string | number | (() => void), Function>; // () => void  
```  

### `NonNullable<Type>`
Remove null and undefined from type. Use for ensuring non-null values.

```typescript  
type T0 = NonNullable<string | number | undefined>; // string | number  
type T1 = NonNullable<string[] | null | undefined>; // string[]  
```  

## Function Type Utilities

### `Parameters<Type>`
Extract parameter types as tuple. Use for function parameter analysis.

```typescript  
declare function f1(arg: { a: number; b: string }): void;  
type T0 = Parameters<() => string>; // []  
type T1 = Parameters<(s: string) => void>; // [s: string]  
type T3 = Parameters<typeof f1>; // [arg: { a: number; b: string }]  
```  

### `ConstructorParameters<Type>`
Extract constructor parameter types. Use for class instantiation analysis.

```typescript  
class C {  
  constructor(a: number, b: string) {}}  
type T0 = ConstructorParameters<ErrorConstructor>; // [message?: string]  
type T3 = ConstructorParameters<typeof C>; // [a: number, b: string]  
```  

### `ReturnType<Type>`
Extract function return type. Use for function result analysis.

```typescript  
declare function f1(): { a: number; b: string };  
type T0 = ReturnType<() => string>; // string  
type T1 = ReturnType<(s: string) => void>; // void  
type T4 = ReturnType<typeof f1>; // { a: number; b: string }  
```  

### `InstanceType<Type>`
Extract instance type from constructor. Use for class instance analysis.

```typescript  
class C {  
  x = 0;  y = 0;}  
type T0 = InstanceType<typeof C>; // C  
```  

## Advanced Utilities

### `NoInfer<Type>`
Block type inference. Use to prevent unwanted type inference in generics.

```typescript  
function createStreetLight<C extends string>(  
  colors: C[],  defaultColor?: NoInfer<C>) {  
  // ...
}  
```  

### `ThisParameterType<Type>`
Extract 'this' parameter type. Use for analyzing this-bound functions.

```typescript  
function toHex(this: Number) {  
  return this.toString(16);}  
type T = ThisParameterType<typeof toHex>; // Number  
```  

### `OmitThisParameter<Type>`
Remove 'this' parameter from function type. Use for converting methods to functions.

```typescript  
function toHex(this: Number) {  
  return this.toString(16);}  
const fiveToHex: OmitThisParameter<typeof toHex> = toHex.bind(5);  
```  

### `ThisType<Type>`
Mark contextual 'this' type. Use with noImplicitThis flag for typed method contexts.

```typescript  
type ObjectDescriptor<D, M> = {  
  data?: D;  
  methods?: M & ThisType<D & M>;  
};  
```  

## String Manipulation Types

### `Uppercase<StringType>`
Convert string literal to uppercase.

### `Lowercase<StringType>`
Convert string literal to lowercase.

### `Capitalize<StringType>`
Capitalize first character of string literal.

### `Uncapitalize<StringType>`
Uncapitalize first character of string literal.

Use these with template literal types for compile-time string transformations.

# Application Rules

1. **Prefer composition**: Chain utility types for complex transformations
2. **Type safety first**: Use utility types to maintain type correctness during transformations
3. **Readability**: Choose the most expressive utility type for the use case
4. **Performance**: Utility types are compile-time only and have no runtime cost
5. **Constraints**: Respect TypeScript version requirements for each utility type
6. **Error handling**: Use conditional types with utility types for robust type definitions

# GitHub CLI Integration

This project uses the GitHub CLI (`gh`) tool for all GitHub-related operations. Always use `gh` commands instead of direct API calls or web interface actions.

## Available Commands

Use `gh --help` or `gh <command> --help` to explore available commands and their usage. Key command categories include:

- **Repository operations**: `gh repo` - create, clone, fork, view repositories
- **Pull requests**: `gh pr` - create, list, view, merge, review pull requests  
- **Issues**: `gh issue` - create, list, view, close issues
- **Authentication**: `gh auth` - login, logout, status, token management
- **Releases**: `gh release` - create, list, view, download releases
- **Workflows**: `gh workflow` - run, list, view GitHub Actions workflows
- **SSH keys**: `gh ssh-key` - add, list, delete SSH keys

## Common Usage Patterns

```bash
# Get help for any command
gh --help
gh pr --help
gh issue --help

# Repository operations
gh repo view                    # View current repository
gh repo create                  # Create new repository
gh repo clone owner/repo        # Clone repository

# Pull requests
gh pr create                    # Create new pull request
gh pr list                      # List pull requests
gh pr view 123                  # View specific PR
gh pr merge 123                 # Merge pull request

# Issues
gh issue create                 # Create new issue
gh issue list                   # List issues
gh issue close 456             # Close issue

# Authentication
gh auth status                  # Check authentication status
gh auth login                   # Login to GitHub
```

## Integration Rules

- Always use `gh` for GitHub operations rather than manual web interface actions
- Use `gh --help` to discover available commands before implementing GitHub functionality
- Prefer `gh` over direct GitHub API calls when CLI functionality exists
- Include proper error handling for GitHub CLI operations

# Memories
- If there are linter errors in unit tests where `expect(something).toBeDefined()` is called, but TS has `TS2532: Object is possibly undefined` errors because `expect()` doesn't narrow the type, for each place in the tests where `expect(x).toBeDefined()` is used, instead use `expectDefined` as a type-narrowing wrapper around bun's `expect`.
- When working with HTML, reference [THIS GUIDE FILE](docs/ai/HTML_GUIDE.md) for instructions on HTML conventions for the project.
- Playwright results are written to @test-results\ the error context markdown for each test is written there.