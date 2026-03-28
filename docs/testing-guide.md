# Testing Guide

This document describes the test strategy, tooling, and patterns used in the Job Application Tracker. For API endpoint details, see [api-reference.md](./api-reference.md). For environment and config setup, see [configuration-guide.md](./configuration-guide.md).

---

## Table of Contents

- [Test Pyramid](#test-pyramid)
- [Running Tests](#running-tests)
- [Unit Tests](#unit-tests)
- [Integration Tests](#integration-tests)
- [E2E Tests](#e2e-tests)
- [Test Data](#test-data)
- [Coverage Goals](#coverage-goals)
- [Patterns and Conventions](#patterns-and-conventions)

---

## Test Pyramid

```
         /  E2E  \           Playwright (browser)
        /----------\
       / Integration \       SQLite adapter tests
      /----------------\
     /    Unit Tests     \   bun:test + in-memory adapters
    /______________________\
```

| Layer       | Runner     | Location                                | Scope                                           |
| ----------- | ---------- | --------------------------------------- | ----------------------------------------------- |
| Unit        | `bun:test` | `src/**/*.test.ts`                      | Domain logic, use cases, presentation helpers   |
| Integration | `bun:test` | `src/infrastructure/adapters/*.test.ts` | SQLite adapters against real database           |
| E2E         | Playwright | `tests/e2e/spec/*.spec.ts`              | Full browser interaction against running server |

---

## Running Tests

```bash
# Unit tests (src/ only, sets CLAUDECODE=1)
bun test:unit

# Single test file
bun test src/domain/use-cases/analytics.test.ts

# Unit tests with coverage (90% threshold enforced)
bun test:coverage

# E2E tests (starts dev server if needed, runs Playwright)
bun test:e2e

# E2E with Playwright UI mode
bun test:e2e:ui

# Full quality gate (lint + typecheck + all tests)
bun vet
```

### What each command does

- **`bun test:unit`** / **`bun test`**: Runs `bun test` with test root set to `src/` (configured in `bunfig.toml`). Preloads `test-setup.ts` which registers happy-dom for DOM APIs.
- **`bun test:coverage`**: Same as unit tests but with `--coverage` flag. Fails if coverage drops below 90% (configured in `bunfig.toml`).
- **`bun test:e2e`**: Executes `scripts/end-to-end.ts`, which finds or starts a dev server on port 3000, polls for health, then spawns Playwright.
- **`bun vet`**: Runs `bun fix` (oxlint + oxfmt) then `bun typecheck` (tsc --noEmit) then `bun test:all` (coverage + E2E).

---

## Unit Tests

### Runtime and Setup

- **Runner**: [bun:test](https://bun.sh/docs/test/writing) (built-in Bun test runner)
- **DOM**: [happy-dom](https://github.com/nicedayfor/happy-dom) registered globally via `test-setup.ts`
- **Test root**: `src/` (only scans this directory for `*.test.ts` files)
- **Preload**: `test-setup.ts` -- registered in `bunfig.toml`

### In-Memory Adapters

The project uses **in-memory repository implementations** as test doubles for domain port interfaces. These live in `tests/adapters/`:

| Adapter                                   | Implements Port            | Purpose                   |
| ----------------------------------------- | -------------------------- | ------------------------- |
| `in-memory-job-application-manager.ts`    | `JobApplicationManager`    | CRUD for job applications |
| `in-memory-contact-repository.ts`         | `ContactRepository`        | CRUD for contacts         |
| `in-memory-interview-stage-repository.ts` | `InterviewStageRepository` | CRUD for interview stages |
| `in-memory-job-board-repository.ts`       | `JobBoardRepository`       | CRUD for job boards       |

Each in-memory adapter has its own test file (`*.test.ts`) verifying it correctly implements the port contract.

### Effect/Either Patterns

Domain operations return `ResultAsync` (NeverThrow) or `Effect` (Effect-TS). Tests use `Either.isRight()` / `Either.isLeft()` to assert on success/failure:

```typescript
import { Either } from "effect";

const result = await runEffect(manager.getJobApplication(id));
expect(Either.isRight(result)).toBe(true);
if (Either.isRight(result)) {
	expect(result.right.company).toBe("Acme");
}
```

### Analytics Tests

Analytics tests are split by concern across multiple files:

| File                        | Tests                                   |
| --------------------------- | --------------------------------------- |
| `analytics.test.ts`         | Aggregation and full analytics pipeline |
| `analytics-status.test.ts`  | Status distribution calculations        |
| `analytics-date.test.ts`    | Date-based grouping and filtering       |
| `analytics-summary.test.ts` | Summary metric computation              |
| `analytics-utils.test.ts`   | Shared utility functions                |

These use factory functions from `tests/helpers/analytics-fixtures.ts` (`createMockApplication`, `createMockApplicationWithStatus`).

---

## Integration Tests

### SQLite Adapter Tests

Located in `src/infrastructure/adapters/*.test.ts`, these test the actual SQLite implementations of domain ports. They use a real SQLite database (in-memory via `:memory:` when `JOB_APP_MANAGER_TYPE=test`).

Key difference from unit tests: these verify SQL queries, schema migrations, and data persistence round-trips work correctly.

---

## E2E Tests

### Stack

- **Runner**: [Playwright](https://playwright.dev/)
- **Config**: `playwright.config.ts`
- **Test dir**: `tests/e2e/`
- **Server management**: `scripts/end-to-end.ts` handles dev server lifecycle

### Configuration

From `playwright.config.ts`:

| Setting        | Value                        |
| -------------- | ---------------------------- |
| Timeout        | 10 seconds per test          |
| Expect timeout | 2 seconds                    |
| Parallel       | Fully parallel               |
| Workers        | 4 (local), 2 (CI)            |
| Retries        | 0 (local), 2 (CI)            |
| Reporter       | `dot` + `html` (open: never) |
| Trace          | Retain on failure            |
| Screenshot     | Only on failure              |
| Video          | Retain on failure            |
| Browser        | Chromium at 1920x1080        |

### Global Setup and Teardown

- **`global-setup.ts`**: Clears test database tables via `clearTestTables()` from `utils/sqlite-test-isolation.ts`
- **`global-teardown.ts`**: Clears database after all tests complete

### Page Object Model (Screenplay Pattern)

Page objects live in `tests/e2e/POMs/` and follow the `PageObject` / `ComponentObject` interfaces from `tests/e2e/config/ScreenplayTypes.ts`:

| POM                        | Represents                     |
| -------------------------- | ------------------------------ |
| `homePagePOM.ts`           | Homepage with application form |
| `healthPagePOM.ts`         | Health check page              |
| `navBarPOM.ts`             | Navigation bar component       |
| `pipelineTablePOM.ts`      | Pipeline table with sorting    |
| `pipelineTableRowPOM.ts`   | Individual pipeline table row  |
| `applicationDetailsPOM.ts` | Application detail page        |
| `themeTogglePOM.ts`        | Theme toggle component         |

Page objects expose:

- **`page`**: Playwright Page instance
- **`goto()`**: Navigate to the page
- **`actions`**: Value-returning getters and interaction methods
- **`assertions`**: Assertion-style methods using `expect()`

### Fixtures

Defined in `tests/e2e/fixtures/base.ts`:

| Fixture        | Scope  | Purpose                                               |
| -------------- | ------ | ----------------------------------------------------- |
| `POMs`         | test   | Registry of all page and component objects            |
| `appFactory`   | test   | Creates applications via API, auto-cleans on teardown |
| `mutableApp`   | test   | Pre-created application for tests that modify data    |
| `immutableApp` | worker | Shared read-only application across tests in a worker |

**Worker-scoped fixtures** (`immutableApp`) are created once per worker and shared across all tests in that worker. They create applications via the API and clean up in `finally` blocks.

**Test-scoped fixtures** (`appFactory`, `mutableApp`) are created per test and auto-cleaned after each test.

### Spec Files

| Spec                          | Tests                                 |
| ----------------------------- | ------------------------------------- |
| `navigation.spec.ts`          | Page navigation and link verification |
| `application-table.spec.ts`   | Application CRUD in the table view    |
| `application-sorting.spec.ts` | Pipeline table sorting behavior       |
| `theme-toggle.spec.ts`        | Dark/light theme switching            |
| `db-selector.spec.ts`         | Dev tools database switching          |

### Utility Helpers

| File                             | Purpose                              |
| -------------------------------- | ------------------------------------ |
| `utils/mockFactory.ts`           | Test data generation for E2E         |
| `utils/keyboard-helpers.ts`      | Keyboard interaction utilities       |
| `utils/sqlite-test-isolation.ts` | Database clearing for test isolation |

---

## Test Data

### Unit Test Fixtures

- **`tests/helpers/analytics-fixtures.ts`**: Factory functions for creating mock `JobApplication` objects with specific statuses, dates, and interest ratings. Uses deterministic UUIDs based on a counter parameter.
- **In-memory adapters**: Each adapter starts with an empty dataset. Tests seed data as needed in `beforeEach` or `beforeAll` blocks.

### E2E Test Data

- **`appFactory` fixture**: Creates real applications via `POST /applications` and returns `{ id, company, positionTitle }`. Cleans up via `DELETE /applications/:id` after each test.
- **Global setup**: Clears all tables before the suite starts, ensuring a clean slate.
- **Worker isolation**: Worker-scoped fixtures include the worker index in company/position names to avoid collisions in parallel execution.

---

## Coverage Goals

Enforced by `bun test:coverage` with a global 90% threshold (configured in `bunfig.toml`).

Recommended coverage targets by layer:

| Layer                       | Target | Rationale                                           |
| --------------------------- | ------ | --------------------------------------------------- |
| Domain entities + use cases | 95%    | Pure logic, easy to test, high value                |
| Application use cases       | 90%    | Orchestration logic                                 |
| Infrastructure adapters     | 80%    | SQL queries, some branches are error paths          |
| Presentation templates      | 70%    | HTML generation, visual correctness verified by E2E |

---

## Patterns and Conventions

### General

- **No `throw` in business logic.** Domain and infrastructure layers use `ResultAsync` / `Either`. Only presentation/plugin layers may throw (via Elysia's `NotFoundError`).
- **ArkType validation at boundaries.** All incoming data (HTTP bodies, query params, env vars) is validated with ArkType schemas before entering the domain.
- **Test doubles must be type-safe.** In-memory adapters implement the same port interfaces as production code. No `as any` casts.

### Unit Test Patterns

- Import `describe`, `test`, `expect` from `bun:test`.
- Use `beforeEach` to reset in-memory adapter state.
- Assert on `Either.isRight()` / `Either.isLeft()` for domain operation results.
- Factory functions (not raw object literals) for test data to avoid drift.

### E2E Test Patterns

- Import `expect` from `@playwright/test` (not from fixtures).
- Use POM methods for interactions; avoid raw Playwright selectors in spec files.
- Assertions belong in `Then` steps (BDD pattern); `Given`/`When` steps must not contain `expect()`.
- Prefer DOM state assertions (`toBeVisible`, `toHaveValue`, `toContainText`) over `waitForResponse` for HTMX synchronization.
- After renaming HTML elements in templates, grep POMs for stale selectors.

### Pre-commit Hook

The husky pre-commit hook runs `bun test` before every commit. If tests fail, the commit is blocked. See [deployment-guide.md](./deployment-guide.md) for the full CI/CD pipeline.
