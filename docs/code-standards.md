# Code Standards

This document covers the coding patterns, conventions, and quality standards enforced in the Job Application Tracker codebase.

## Error Handling

### Principle: No `throw` in Business Logic

All domain and infrastructure code uses typed error channels. Untyped exceptions are reserved for truly exceptional situations (programmer errors, infrastructure failures) and are caught at the application boundary.

### Effect-TS Error Channels

Domain ports declare their error types explicitly using `Effect.Effect<T, E>`:

```typescript
// Port interface — error type is part of the contract
interface JobApplicationManager {
	getJobApplication(
		id: JobApplicationId,
	): Effect.Effect<JobApplication, JobApplicationError>;
}
```

Infrastructure adapters implement ports using `Effect.tryPromise` to capture exceptions into the typed error channel:

```typescript
return Effect.tryPromise({
	try: () => db.prepare("SELECT ...").get(id),
	catch: (e) =>
		new JobApplicationError({
			detail: String(e),
			operation: "getJobApplication",
		}),
});
```

### Tagged Errors

All domain errors extend `Data.TaggedError` from Effect, providing discriminated union support:

```typescript
import { Data } from "effect";

export class JobApplicationError extends Data.TaggedError(
	"JobApplicationError",
)<{
	readonly detail: string;
	readonly operation: string;
}> {}
```

Each entity module has its own error class: `JobApplicationError`, `ContactError`, `InterviewStageError`, `JobBoardError`.

### Effect-to-Either Bridge

Route handlers use `runEffect()` to convert Effect computations into `Either` values for synchronous branching:

```typescript
// src/application/server/utils/run-effect.ts
export async function runEffect<T, E>(
	effect: Effect.Effect<T, E>,
): Promise<Either.Either<T, E>> {
	return Effect.runPromise(Effect.either(effect));
}

// Usage in a route handler
const result = await runEffect(manager.getJobApplication(id));
if (Either.isLeft(result)) {
	set.status = 500;
	return `Error: ${result.left.detail}`;
}
return renderPage(result.right);
```

### Either in Domain Logic

Entity factory functions that can fail return `Either.Either<T, Error>`:

```typescript
export function createContact(
	data: ContactForCreate,
	generateUUID: () => string,
): Either.Either<Contact, ContactError> {
	// validation and construction
}
```

## Validation

### ArkType at All System Boundaries

Every external input is validated through ArkType schemas before entering the domain:

1. **HTTP request bodies and query params** -- schemas in `src/presentation/schemas/`
2. **Environment variables** -- `processEnvFacade.ts` validates `process.env`
3. **Browser extension API requests** -- inline ArkType schemas in the plugin
4. **Entity construction** -- ArkType scopes define entity shapes

### Scope/Module Pattern

Domain entities use ArkType's `scope` and `export` pattern to define interconnected schemas:

```typescript
const jobApplicationScope = scope({
	ActiveLabels: "'applied'|'screening interview'|'interview'|...",
	InactiveLabels: "'rejected'|'no response'|...",
	ApplicationStatus: "(ActiveState|InactiveState) & ApplicationStatusProps",
	JobApp: { "...": "BaseProps", id: "JobAppId" /* ... */ },
	forCreate: "BaseProps",
	forUpdate: "Partial<Omit<JobApp, 'id'>>",
});

export const jobApplicationModule = jobApplicationScope.export();
export type JobApplication = typeof jobApplicationModule.JobApp.infer;
```

This approach provides:

- Compile-time type inference from runtime schemas (no duplication)
- Composable schemas via scope references
- `forCreate` and `forUpdate` variants derived from the base entity

### Route-Level Validation

Elysia plugins pass ArkType schemas to route definitions for automatic request validation:

```typescript
.get("/analytics", handler, {
  query: analyticsQuerySchema,  // ArkType schema
})
```

### Environment Validation

`processEnvFacade.ts` validates and coerces environment variables at startup:

```typescript
const processEnvSchema = type({
	BASE_URL: "string.url",
	PORT: type("string")
		.pipe((s) => Number(s))
		.to("number"),
	JOB_APP_MANAGER_TYPE: '"test" | "prod"',
	"BROWSER_EXTENSION_API_KEY?": "string >= 32",
});

export const processEnv = processEnvSchema.assert(process.env);
```

## Dependency Injection

### Factory Functions, Not Containers

DI is accomplished through factory functions and function parameters. There is no DI container.

```typescript
// Factory creates an adapter with injected database connection
export function createSQLiteJobAppManager(db: Database): JobApplicationManager {
	return {
		createJobApplication: (data) =>
			Effect.tryPromise({
				/* ... */
			}),
		// ...
	};
}
```

### Registry Pattern

The `jobAppManagerRegistry` manages environment-specific instances (test vs. prod):

```typescript
function createJobAppManagerRegistry(initialEnvironment: ManagerType) {
	const managers = new Map<ManagerType, JobApplicationManager>();
	return {
		getManager(env: ManagerType): JobApplicationManager {
			/* ... */
		},
		getDatabase(env: ManagerType): Database {
			/* ... */
		},
	};
}
```

### Plugin Composition

ElysiaJS plugins inject dependencies into route handlers through Elysia's `.derive()`:

```typescript
export const createAnalyticsPlugin = new Elysia()
	.use(jobApplicationManagerPlugin)
	.use(contactRepositoryPlugin)
	.derive(({ jobApplicationManager, contactRepository }) => ({
		analyticsAggregator: createAnalyticsAggregator(
			jobApplicationManager,
			contactRepository,
		),
	}));
```

### Provider Modules

Infrastructure providers live in `src/infrastructure/di/`:

- `uuid-provider.ts` -- UUID generation (swappable for testing)
- `file-io-provider.ts` -- File I/O abstraction

## Module Composition Over Classes

The codebase avoids ES6 classes (except for Effect's `Data.TaggedError` which requires them). All business logic uses:

- **Pure functions** for entity operations (create, update, validate)
- **Module-level exports** for grouping related functions
- **Factory functions** returning interface implementations (plain objects with methods)

```typescript
// Entity operations as pure functions
export function createJobApplicationWithInitialStatus(
	data: JobApplicationForCreate,
	generateUUID: () => string,
): JobApplication {
	/* ... */
}

export function updateJobApplicationStatus(
	app: JobApplication,
	newStatus: ApplicationStatus,
): JobApplication {
	/* ... */
}
```

## Testing Patterns

### In-Memory Adapters

Every port interface has a corresponding in-memory implementation in `tests/adapters/`:

| Port                       | Test Adapter                              |
| -------------------------- | ----------------------------------------- |
| `JobApplicationManager`    | `in-memory-job-application-manager.ts`    |
| `ContactRepository`        | `in-memory-contact-repository.ts`         |
| `InterviewStageRepository` | `in-memory-interview-stage-repository.ts` |
| `JobBoardRepository`       | `in-memory-job-board-repository.ts`       |

In-memory adapters implement the same Effect-based interfaces as SQLite adapters, ensuring tests exercise the same contract.

### Effect Runner in Tests

Tests use `Effect.runPromise(Effect.either(effect))` directly or via `runEffect()` to execute Effect computations and assert on the `Either` result:

```typescript
const result = await runEffect(manager.getJobApplication(id));
expect(Either.isRight(result)).toBe(true);
if (Either.isRight(result)) {
	expect(result.right.company).toBe("Acme");
}
```

### Test Organization

| Location                   | Type                      | Runner         |
| -------------------------- | ------------------------- | -------------- |
| `src/**/*.test.ts`         | Co-located unit tests     | `bun test`     |
| `tests/adapters/*.test.ts` | In-memory adapter tests   | `bun test`     |
| `tests/integration/`       | SQLite integration tests  | `bun test`     |
| `tests/e2e/`               | E2E tests with Playwright | `bun test:e2e` |

### Coverage Threshold

Unit test coverage is enforced at 90% via `bun test --coverage`.

### Test Data Generation

`@faker-js/faker` is used for generating realistic test data. `@happy-dom/global-registrator` provides DOM simulation for component rendering tests.

## Naming Conventions

### Files

- **kebab-case** for all filenames: `job-application.ts`, `sqlite-contact-repository.ts`
- **`.plugin.ts` suffix** for ElysiaJS route plugins: `analytics.plugin.ts`
- **`.test.ts` suffix** for unit tests, co-located with source
- **`.integration.test.ts`** for integration tests

### Code

- **camelCase** for variables, functions, and object properties
- **PascalCase** for types, interfaces, and ArkType schema names
- **UPPER_SNAKE_CASE** for constants: `COMMON_JOB_BOARDS`
- **Prefix `create`** for factory functions: `createSQLiteJobAppManager`, `createContact`
- **Prefix `is`/`has`/`get`** for predicates and accessors: `isActive`, `getCurrentStatus`

### Comments

Comments explain _why_, not _what_. Implementation-obvious comments are avoided.

## Quality Gates

```bash
bun fix          # oxlint + oxfmt auto-fix
bun typecheck    # tsc --noEmit
bun test:unit    # Unit tests with CLAUDECODE=1
bun test:coverage # Unit tests with 90% coverage threshold
bun test:e2e     # Playwright E2E suite
bun vet          # Full gate: fix + typecheck + test:all
bun fastvet      # Quick gate: typecheck + fix + stepdown-rule + test:unit
```

### Pre-Commit Hooks

`husky` + `lint-staged` runs oxlint and oxfmt on staged `.ts`/`.js` files before every commit.

## Related Documentation

- [Codebase Summary](codebase-summary.md) -- file inventory and dependencies
- [System Architecture](system-architecture.md) -- layer diagrams and data flow
- [Project Overview](project-overview-pdr.md) -- features and product context
