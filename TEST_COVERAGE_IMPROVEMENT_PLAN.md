# Test Coverage Improvement Plan

**Created:** 2025-11-12
**Status:** Ready for Implementation
**Estimated Effort:** 3-5 days for complete implementation

---

## Context

This project follows hexagonal architecture with ports (interfaces) and adapters (implementations). Currently, the project violates its own architectural guidelines by only providing production adapters (SQLite) without corresponding test adapters (in-memory). This forces unit tests to become integration tests, creating an inverted test pyramid.

**Key Files to Understand:**
- `CLAUDE.md` - Project guidelines (especially lines 95-129 on hexagonal architecture)
- `src/domain/ports/` - Interface definitions
- `src/domain/entities/` - Pure domain logic
- `src/infrastructure/adapters/` - SQLite implementations
- `bunfig.toml` - Test configuration (95% coverage threshold)

---

## Phase 1: Create In-Memory Test Adapters (HIGH PRIORITY)

### Task 1.1: Create In-Memory Job Application Manager

**Objective:** Implement a fully in-memory version of `JobApplicationManager` interface for fast unit testing.

**Instructions:**

1. Create file: `tests/adapters/in-memory-job-application-manager.ts`

2. Implement the following structure:
```typescript
import type { JobApplicationManager } from "#src/domain/ports/job-application-manager.ts";
import type { ForUpdate } from "#src/infrastructure/storage/storage-provider-interface.ts";
import type {
  JobApplication,
  JobApplicationForCreate,
  JobApplicationId,
} from "#src/domain/entities/job-application.ts";
import {
  createJobApplicationWithInitialStatus,
  isActive,
  isInactive,
} from "#src/domain/entities/job-application.ts";
import { errAsync, okAsync, type ResultAsync } from "neverthrow";

export function createInMemoryJobApplicationManager(
  generateUUID: () => string = crypto.randomUUID
): JobApplicationManager {
  // Use Map for O(1) lookups
  const applications = new Map<JobApplicationId, JobApplication>();

  return {
    createJobApplication(data: JobApplicationForCreate): ResultAsync<JobApplication, string> {
      const app = createJobApplicationWithInitialStatus(data, generateUUID);
      applications.set(app.id, app);
      return okAsync(app);
    },

    getJobApplication(id: JobApplicationId): ResultAsync<JobApplication, string> {
      const app = applications.get(id);
      if (!app) {
        return errAsync(`Job Application with id ${id} not found`);
      }
      return okAsync(app);
    },

    getAllJobApplications(): ResultAsync<JobApplication[], string> {
      return okAsync(Array.from(applications.values()));
    },

    updateJobApplication(
      id: JobApplicationId,
      data: ForUpdate<JobApplication>
    ): ResultAsync<JobApplication, string> {
      const existing = applications.get(id);
      if (!existing) {
        return errAsync(`Job Application with id ${id} not found`);
      }

      const updated = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      applications.set(id, updated);
      return okAsync(updated);
    },

    deleteJobApplication(id: JobApplicationId): ResultAsync<void, string> {
      applications.delete(id);
      return okAsync(undefined);
    },

    getActiveJobApplications(): ResultAsync<JobApplication[], string> {
      const active = Array.from(applications.values()).filter(isActive);
      return okAsync(active);
    },

    getInactiveJobApplications(): ResultAsync<JobApplication[], string> {
      const inactive = Array.from(applications.values()).filter(isInactive);
      return okAsync(inactive);
    },

    clearAllJobApplications(): ResultAsync<void, string> {
      applications.clear();
      return okAsync(undefined);
    },
  };
}
```

3. Add unit tests for this adapter in: `tests/adapters/in-memory-job-application-manager.test.ts`
   - Test that it correctly implements the interface
   - Test isolation between instances
   - Test edge cases (not found, empty state, etc.)

**Acceptance Criteria:**
- [ ] File created at `tests/adapters/in-memory-job-application-manager.ts`
- [ ] All methods from `JobApplicationManager` interface implemented
- [ ] Returns proper Result types (okAsync/errAsync)
- [ ] Uses Map for O(1) lookups
- [ ] Accepts optional UUID generator for deterministic testing
- [ ] Unit tests pass with 100% coverage
- [ ] `bun vet` passes

---

### Task 1.2: Create In-Memory Job Board Repository

**Objective:** Implement in-memory version of `JobBoardRepository` interface.

**Instructions:**

1. Create file: `tests/adapters/in-memory-job-board-repository.ts`

2. Implement interface from `src/domain/ports/job-board-repository.ts`:
```typescript
import type { JobBoardRepository } from "#src/domain/ports/job-board-repository.ts";
import type {
  JobBoard,
  JobBoardForCreate,
  JobBoardId,
} from "#src/domain/entities/job-board.ts";
import { createJobBoard } from "#src/domain/entities/job-board.ts";
import { errAsync, okAsync, type ResultAsync } from "neverthrow";

export function createInMemoryJobBoardRepository(
  generateUUID: () => string = crypto.randomUUID
): JobBoardRepository {
  const boards = new Map<JobBoardId, JobBoard>();

  return {
    create(data: JobBoardForCreate): ResultAsync<JobBoard, string> {
      const result = createJobBoard(data, generateUUID);
      if (result.isErr()) {
        return errAsync(`Failed to create job board: ${result.error}`);
      }
      const board = result.value;
      boards.set(board.id, board);
      return okAsync(board);
    },

    getById(id: JobBoardId): ResultAsync<JobBoard, string> {
      const board = boards.get(id);
      if (!board) {
        return errAsync(`Job board with id ${id} not found`);
      }
      return okAsync(board);
    },

    getAll(): ResultAsync<JobBoard[], string> {
      // Sort by name like SQLite implementation
      const sorted = Array.from(boards.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      return okAsync(sorted);
    },

    findByDomain(domain: string): ResultAsync<JobBoard | null, string> {
      // Search by rootDomain first
      for (const board of boards.values()) {
        if (board.rootDomain === domain) {
          return okAsync(board);
        }
      }

      // Then search in domains array
      for (const board of boards.values()) {
        if (board.domains.includes(domain)) {
          return okAsync(board);
        }
      }

      return okAsync(null);
    },

    delete(id: JobBoardId): ResultAsync<void, string> {
      boards.delete(id);
      return okAsync(undefined);
    },

    seedCommonBoards(): ResultAsync<void, string> {
      // Implement seeding common boards from COMMON_JOB_BOARDS constant
      // This is optional for tests - can return okAsync(undefined)
      return okAsync(undefined);
    },
  };
}
```

3. Add unit tests: `tests/adapters/in-memory-job-board-repository.test.ts`

**Acceptance Criteria:**
- [ ] File created at `tests/adapters/in-memory-job-board-repository.ts`
- [ ] All interface methods implemented correctly
- [ ] Domain search logic matches SQLite implementation behavior
- [ ] Sorting by name works correctly
- [ ] Unit tests cover all methods
- [ ] `bun vet` passes

---

### Task 1.3: Create In-Memory Contact Repository

**Objective:** Implement in-memory version of `ContactRepository` interface.

**Instructions:**

1. Read `src/domain/ports/contact-repository.ts` to understand the interface
2. Read `src/infrastructure/adapters/sqlite-contact-repository.ts` to understand expected behavior
3. Create file: `tests/adapters/in-memory-contact-repository.ts`
4. Implement all interface methods using a Map for storage
5. Ensure filtering by `jobApplicationId` works correctly
6. Add unit tests: `tests/adapters/in-memory-contact-repository.test.ts`

**Acceptance Criteria:**
- [ ] File created at `tests/adapters/in-memory-contact-repository.ts`
- [ ] All interface methods implemented
- [ ] Filtering by jobApplicationId works correctly
- [ ] Unit tests pass
- [ ] `bun vet` passes

---

### Task 1.4: Create In-Memory Interview Stage Repository

**Objective:** Implement in-memory version of `InterviewStageRepository` interface.

**Instructions:**

1. Read `src/domain/ports/interview-stage-repository.ts` to understand the interface
2. Read `src/infrastructure/adapters/sqlite-interview-stage-repository.ts` to understand expected behavior
3. Create file: `tests/adapters/in-memory-interview-stage-repository.ts`
4. Implement all interface methods using a Map for storage
5. Ensure filtering by `jobApplicationId` works correctly
6. Add unit tests: `tests/adapters/in-memory-interview-stage-repository.test.ts`

**Acceptance Criteria:**
- [ ] File created at `tests/adapters/in-memory-interview-stage-repository.ts`
- [ ] All interface methods implemented
- [ ] Filtering by jobApplicationId works correctly
- [ ] Unit tests pass
- [ ] `bun vet` passes

---

## Phase 2: Refactor Existing Tests to Use In-Memory Adapters (HIGH PRIORITY)

### Task 2.1: Convert Manager Tests to True Unit Tests

**Objective:** Refactor tests currently using SQLite to use in-memory adapters instead.

**Instructions:**

1. **Create new file:** `src/domain/use-cases/job-application-manager.test.ts`
   - This will be a TRUE unit test file
   - Copy test structure from `create-sqlite-job-app-manager.test.ts`
   - Replace SQLite manager with in-memory manager:
   ```typescript
   // OLD (integration test):
   const jobApplicationManager = jobAppManagerRegistry.getManager("test");

   // NEW (unit test):
   import { createInMemoryJobApplicationManager } from "../../../tests/adapters/in-memory-job-application-manager.ts";
   const jobApplicationManager = createInMemoryJobApplicationManager();
   ```
   - Remove beforeEach cleanup calls (in-memory manager is fresh per test)
   - Test focuses on business logic, not database interactions

2. **Rename existing file:** `src/domain/use-cases/create-sqlite-job-app-manager.test.ts`
   - Move to: `src/infrastructure/adapters/sqlite-job-application-manager.integration.test.ts`
   - Update imports to reflect new location
   - Keep these as integration tests that verify SQLite implementation

3. **Update test descriptions:**
   - Unit test file: Focus on "JobApplicationManager" behavior
   - Integration test file: Focus on "SQLite JobApplicationManager implementation" specifics

**Acceptance Criteria:**
- [ ] New unit test file created using in-memory adapter
- [ ] Original test file renamed and moved to infrastructure
- [ ] Both test files pass
- [ ] Unit tests run significantly faster than integration tests
- [ ] `bun vet` passes

---

### Task 2.2: Add True Unit Tests for Repository Patterns

**Objective:** Create unit tests for repository usage patterns without hitting database.

**Instructions:**

1. Create `src/domain/use-cases/job-board-operations.test.ts`
   - Test any business logic that uses JobBoardRepository
   - Use in-memory adapter
   - Focus on edge cases and error handling

2. If there are use cases that compose multiple repositories, create unit tests for those using all in-memory adapters

**Acceptance Criteria:**
- [ ] Use cases tested independently of infrastructure
- [ ] Error handling paths tested
- [ ] `bun vet` passes

---

## Phase 3: Add Missing Test Coverage (MEDIUM PRIORITY)

### Task 3.1: Add Tests for Missing Repositories

**Objective:** Achieve 95% coverage for all repository implementations.

**Instructions:**

1. **Create:** `src/infrastructure/adapters/sqlite-contact-repository.test.ts`
   - Follow same pattern as `sqlite-job-board-repository.test.ts`
   - Test all CRUD operations
   - Test filtering by jobApplicationId
   - Test edge cases (not found, empty results)
   - Use test database: `jobAppManagerRegistry.getDatabase("test")`

2. **Create:** `src/infrastructure/adapters/sqlite-interview-stage-repository.test.ts`
   - Follow same pattern as above
   - Test all CRUD operations
   - Test round numbering and ordering
   - Test date handling (scheduled vs completed)

**Acceptance Criteria:**
- [ ] Both test files created
- [ ] Coverage for repositories above 95%
- [ ] Tests use cleanup helpers to avoid pollution
- [ ] All tests pass
- [ ] `bun vet` passes

---

### Task 3.2: Add Missing Entity Tests

**Objective:** Add unit tests for job-board entity.

**Instructions:**

1. **Create:** `src/domain/entities/job-board.test.ts`
   - Test `createJobBoard` function
   - Test validation (empty name, invalid domains, etc.)
   - Test domain matching logic if any exists
   - Follow pattern from `job-application.test.ts`

**Acceptance Criteria:**
- [ ] File created with comprehensive tests
- [ ] All entity creation paths tested
- [ ] All validation rules tested
- [ ] `bun vet` passes

---

### Task 3.3: Enhance Analytics Test Coverage

**Objective:** Add missing tests for analytics computations beyond date filtering.

**Instructions:**

1. **Review:** `src/domain/use-cases/analytics.ts` to identify all functions
2. **Enhance:** `src/domain/use-cases/analytics.test.ts` to cover:
   - Status distribution calculations (if they exist)
   - Time series aggregations (if they exist)
   - Edge cases (empty datasets, single data point, etc.)
   - Date boundary conditions

**Acceptance Criteria:**
- [ ] All exported functions from analytics.ts have tests
- [ ] Coverage above 95%
- [ ] `bun vet` passes

---

## Phase 4: Eliminate Test Redundancy (MEDIUM PRIORITY)

### Task 4.1: Reduce E2E Test Scope

**Objective:** Move validation and edge case tests from E2E to unit/integration levels.

**Instructions:**

1. **Review:** `src/application/server/plugins/extension-api.plugin.test.ts`

2. **Identify tests that should NOT be E2E:**
   - Authentication tests (keep 1-2, remove rest)
   - Validation error tests (empty strings, invalid formats, etc.)
   - Edge cases (very long strings, special characters, etc.)
   - Concurrent request handling

3. **For each identified test:**
   - If it's testing validation logic, move to a unit test of the validation schema
   - If it's testing API behavior, keep as integration test but remove browser
   - Delete from E2E suite

4. **Keep in E2E:** `tests/e2e/spec/application-table.spec.ts`
   - ONE happy path test for each major feature (create, edit, delete)
   - Critical user journeys that span multiple pages
   - Keyboard navigation (this requires browser)
   - Visual/accessibility concerns

**Target Reduction:** Remove 50% of current E2E tests by moving them to lower levels.

**Acceptance Criteria:**
- [ ] At least 10 tests moved from E2E to unit/integration
- [ ] Remaining E2E tests focus on user journeys
- [ ] Test suite runs at least 30% faster
- [ ] All tests still pass
- [ ] `bun vet` passes

---

### Task 4.2: Deduplicate Extension API Tests

**Objective:** Remove redundant validation tests from extension API plugin tests.

**Instructions:**

1. **In:** `src/application/server/plugins/extension-api.plugin.test.ts`

2. **Remove these test categories:**
   - Lines 224-244: Empty validation tests → These should be schema unit tests
   - Lines 268-287: Invalid interest rating → Schema unit test
   - Lines 304-329: Testing all ratings 1,2,3 → Keep only one
   - Lines 362-385: Very long descriptions → Integration, not needed in full API stack
   - Lines 418-430: CORS tests → Not needed if not implementing CORS

3. **Create:** `src/domain/entities/validation/application-input.test.ts` (if validation schemas are defined)
   - Move all validation logic tests here
   - Test ArkType schemas in isolation

**Acceptance Criteria:**
- [ ] At least 8 tests removed from extension API test file
- [ ] Validation tests moved to appropriate unit test location
- [ ] All tests still pass
- [ ] `bun vet` passes

---

## Phase 5: Improve Test Architecture (LOW PRIORITY)

### Task 5.1: Refactor UUID Generation to Accept Injection

**Objective:** Make UUID generation injectable for deterministic testing.

**Instructions:**

1. **Refactor functions to accept UUID generator parameter:**
   ```typescript
   // OLD:
   export function createJobBoard(data: JobBoardForCreate, generateId: () => UUID): Result<JobBoard, string> {
     const id = createJobBoardId(uuidProvider.generateUUID); // Hard-coded global
     // ...
   }

   // NEW:
   export function createJobBoard(
     data: JobBoardForCreate,
     generateUUID: () => UUID
   ): Result<JobBoard, string> {
     const id = createJobBoardId(generateUUID); // Injected
     // ...
   }
   ```

2. **Update all callers** to pass UUID generator explicitly

3. **Update production code** to use `uuidProvider.generateUUID` at composition root

4. **Update tests** to use deterministic UUID generators:
   ```typescript
   const mockUuidGenerator = (seed: number) => () =>
     `123e4567-e89b-12d3-a456-42661417${String(seed).padStart(4, "0")}`;
   ```

**Files to refactor:**
- `src/domain/entities/job-board.ts`
- `src/domain/entities/job-application.ts`
- `src/domain/entities/note.ts` (if applicable)
- `src/infrastructure/adapters/sqlite-*.ts`

**Acceptance Criteria:**
- [ ] All entity creation functions accept UUID generator
- [ ] All tests can use deterministic UUIDs
- [ ] Production code still uses crypto UUID at composition root
- [ ] All tests pass
- [ ] `bun vet` passes

---

### Task 5.2: Refactor SQLiteConnection Singleton

**Objective:** Remove singleton pattern to enable better test isolation.

**Instructions:**

1. **In:** `src/domain/use-cases/create-sqlite-job-app-manager.ts`

2. **Change SQLiteConnection class:**
   ```typescript
   // Remove static getInstance and instances Map
   // Make constructor public
   export class SQLiteConnection {
     private readonly db: Database;

     constructor(environment: ProcessEnvSchema["JOB_APP_MANAGER_TYPE"]) {
       const dbPath = getDatabasePath(environment);
       this.db = new Database(dbPath, { create: true });
       this.initializeSchema();
       this.seedJobBoards();
     }

     // ... rest of class
   }
   ```

3. **Update registry to manage instances:**
   ```typescript
   function createJobAppManagerRegistry(initialEnvironment: ManagerType) {
     const connections = new Map<ManagerType, SQLiteConnection>();

     function getConnection(env: ManagerType): SQLiteConnection {
       let connection = connections.get(env);
       if (!connection) {
         connection = new SQLiteConnection(env);
         connections.set(env, connection);
       }
       return connection;
     }

     // ... rest of registry
   }
   ```

4. **Update tests** to create fresh connections when needed

**Acceptance Criteria:**
- [ ] Singleton pattern removed
- [ ] Registry manages connection lifecycle
- [ ] Tests can create isolated connections
- [ ] All tests pass
- [ ] `bun vet` passes

---

### Task 5.3: Create Test Fixture for Database Cleanup

**Objective:** Standardize test data management and cleanup.

**Instructions:**

1. **Create:** `tests/fixtures/database-test-fixture.ts`
   ```typescript
   import type { Database } from "bun:sqlite";

   export function withDatabaseCleanup(db: Database) {
     return {
       beforeEach: () => {
         // Start transaction
         db.run("BEGIN TRANSACTION");
       },
       afterEach: () => {
         // Rollback transaction (cleanup)
         db.run("ROLLBACK");
       },
     };
   }
   ```

2. **Update integration tests** to use this fixture:
   ```typescript
   import { withDatabaseCleanup } from "../../../tests/fixtures/database-test-fixture.ts";

   const cleanup = withDatabaseCleanup(testDb);

   describe("Repository Tests", () => {
     beforeEach(cleanup.beforeEach);
     afterEach(cleanup.afterEach);

     // Tests run in transaction, auto-rollback
   });
   ```

**Acceptance Criteria:**
- [ ] Fixture created and documented
- [ ] At least 3 integration test files use the fixture
- [ ] Tests no longer need manual cleanup calls
- [ ] All tests pass
- [ ] `bun vet` passes

---

## Phase 6: Documentation and Guidelines (LOW PRIORITY)

### Task 6.1: Update CLAUDE.md with Test Patterns

**Objective:** Document the test patterns established in this refactor.

**Instructions:**

1. **Add section to CLAUDE.md:** "Testing Patterns and Guidelines"

2. **Include:**
   - How to create in-memory adapters for new ports
   - When to write unit vs integration vs E2E tests
   - How to use test fixtures
   - How to use deterministic UUID generators
   - Examples of each test type

3. **Update hexagonal architecture section** to reference the in-memory adapters as examples

**Acceptance Criteria:**
- [ ] New section added to CLAUDE.md
- [ ] At least 3 code examples included
- [ ] Guidelines match implemented patterns
- [ ] `bun vet` passes

---

### Task 6.2: Create Test Architecture Diagram

**Objective:** Visualize the test architecture for new contributors.

**Instructions:**

1. **Create:** `docs/test-architecture.md`

2. **Include diagram showing:**
   - Test pyramid (unit, integration, E2E proportions)
   - Where each test type lives in the codebase
   - How in-memory and SQLite adapters fit together
   - Test data flow

3. **Use mermaid diagram format** for compatibility with GitHub

**Acceptance Criteria:**
- [ ] Diagram created in markdown
- [ ] Renders correctly on GitHub
- [ ] Clear and easy to understand

---

## Success Metrics

Track these metrics before and after implementation:

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Total test runtime | ~30s | <15s | `time bun test` |
| True unit tests | ~40% | >70% | Count tests not hitting database |
| Integration tests | ~35% | <20% | Count tests hitting database |
| E2E tests | ~25% | <10% | Count Playwright tests |
| Coverage | 95% | 95% | `bun test:coverage` |
| In-memory adapter usage | 0% | 80%+ | Grep for `createInMemory*` in tests |

---

## Implementation Order

Follow this order for maximum impact:

1. **Phase 1:** Create all in-memory adapters (1-2 days)
2. **Phase 2:** Refactor existing tests (1 day)
3. **Phase 4.1:** Reduce E2E redundancy (0.5 days)
4. **Phase 3:** Add missing coverage (1 day)
5. **Phase 4.2:** Deduplicate validation tests (0.5 days)
6. **Phase 5:** Improve architecture (1-2 days, can be done separately)
7. **Phase 6:** Documentation (0.5 days)

**Total estimated time:** 3-5 days depending on thoroughness

---

## Notes for AI Agent Execution

**When implementing this plan:**

1. **Always run `bun vet` after each task** to ensure code quality
2. **Commit after each completed task** with descriptive message
3. **If a task fails**, ask for clarification before proceeding
4. **Update this document** to mark completed tasks with [x]
5. **If you discover new issues**, add them to the appropriate phase
6. **Prioritize failing tests** - never leave broken tests
7. **Follow existing code style** - use same patterns as current code
8. **Reference `CLAUDE.md`** for all architectural decisions

**Key principles:**
- Pure functions over classes
- Result types instead of exceptions
- Dependency injection via function parameters
- Test at the earliest appropriate level
- One assertion per test (where reasonable)

**Test naming convention:**
- Unit tests: `*.test.ts` (next to source file)
- Integration tests: `*.integration.test.ts` (in infrastructure/)
- E2E tests: `*.spec.ts` (in tests/e2e/)

---

## Rollback Plan

If issues arise during implementation:

1. **Phase 1-2 issues:** Revert to using SQLite in tests, continue with Phase 3
2. **Phase 3 issues:** Skip problematic files, complete others
3. **Phase 4 issues:** Keep redundant tests, mark for future cleanup
4. **Phase 5 issues:** This phase is optional, can be skipped entirely

**Critical rule:** Never commit code that breaks existing functionality or reduces test coverage below 95%.
