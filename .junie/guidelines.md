# Project Guidelines

## Project Overview
JobAppTracker is a TypeScript project for tracking job applications, their stages in a pipeline, and related notes. The domain layer defines entities like JobApplication, Note, and PipelineConfig. The repository includes tests (unit, integration, e2e) to ensure domain correctness and basic UI flows.

## Repository Structure
- src/
  - domain/ — core domain entities, types, and ports (interfaces for repositories)
  - application/ — application services/use-cases (if present)
  - infrastructure/ — adapters and external integrations (if present)
  - presentation/ and pages/ — app UI layers (if present)
  - helpers/ and forms/ — utilities and forms
- tests/
  - helpers/ — test utilities (e.g., test database helpers)
  - integration/ — integration tests
  - e2e/ — Playwright end-to-end tests
- docs/ — documentation (e.g., RCA.md)
- .junie/guidelines.md — these guidelines

## Setup
- Node runtime: project uses Bun (bun.lock present). 
- Install dependencies: `bun install`

## Running Tests
- Unit/Integration tests: if using Bun test runner, run `bun test`. If using a different runner, check package.json scripts.
- Playwright e2e tests: `bunx playwright test` (ensure browsers are installed: `bunx playwright install`).
- Some tests rely on helpers in tests/helpers; no special DB service should be required beyond in-memory/test helpers.

## Linting/Formatting
- Biome is configured (biome.json). To lint/format:
  - If a script exists: `bun run lint`
  - Otherwise, run Biome directly (e.g., `bunx @biomejs/biome check .`)
- TypeScript: ensure `tsc --noEmit` passes if type-check scripts exist.

## How Junie Should Work on This Repo
1. Make minimal changes necessary to satisfy issues.
2. Before submitting:
   - Run tests: unit/integration via `bun test` and e2e if relevant changes affect UI/flows.
   - Run linter/formatter if scripts exist.
3. Do not introduce new external dependencies unless required by the issue.
4. Keep the code style consistent with existing patterns; favor explicit typing in the domain layer.
5. Update docs when behavior or public APIs change.

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
const systemClock: Clock = { now: () => new Date() };
logCurrentTime(systemClock);

// In tests
const fixedClock: Clock = { now: () => new Date('2000-01-01') };
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

## Application Rules

1. **Prefer composition**: Chain utility types for complex transformations
2. **Type safety first**: Use utility types to maintain type correctness during transformations
3. **Readability**: Choose the most expressive utility type for the use case
4. **Performance**: Utility types are compile-time only and have no runtime cost
5. **Constraints**: Respect TypeScript version requirements for each utility type
6. **Error handling**: Use conditional types with utility types for robust type definitions

## Notes
- keep entities pure and side-effect free.
