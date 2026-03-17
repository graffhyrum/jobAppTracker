# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
bun dev                  # Start dev server with watch mode (builds scripts first)
bun build                # Build production binary to dist/jobapptracker

# Testing
bun test:unit            # Run unit tests (src/ only, CLAUDECODE=1 env)
bun test:coverage        # Run unit tests with coverage (90% threshold)
bun test:e2e             # Run Playwright E2E tests (manages dev server lifecycle)
bun test                 # Run a single test file: bun test src/path/to/file.test.ts

# Quality
bun fix                  # Biome check + auto-fix (safe rules)
bun fixx                 # Biome check + auto-fix (unsafe rules too)
bun typecheck            # tsc --noEmit
bun vet                  # fix + typecheck + test:all (full quality gate)
```

Path aliases: `#src/*` → `./src/*`, `#helpers/*` → `./src/helpers/*`, `#rootTypes/*` → `./types/*`

## Architecture

This is a **hexagonal (ports & adapters)** architecture. Domain logic never depends on infrastructure.

**Layer flow:** `presentation → application → domain → infrastructure (via ports)`

### Layers

- **`src/domain/`** — Entities (job-application, contact, interview-stage), port interfaces, and domain use-cases (analytics). No framework dependencies.
- **`src/infrastructure/`** — SQLite adapters implementing domain ports. Single database file at `data/jobapp.sqlite`. DI via factory functions (not a container).
- **`src/application/server/`** — ElysiaJS server setup + plugins. Each plugin (`plugins/*.plugin.ts`) encapsulates a route group and receives dependencies as function parameters.
- **`src/presentation/`** — HTML templates returned by routes. Components are functions returning HTML strings. HTMX drives partial updates; server detects `HX-Request` header to return fragments vs. full pages.

### Key Patterns

**Error handling**: NeverThrow `ResultAsync` throughout domain + infrastructure. No `throw` in business logic. HTTP error responses are handled at the plugin level.

**Validation**: ArkType at all system boundaries. Schemas live in `src/presentation/schemas/`. Use `type("string.json.parse").to(MySchema)` for JSON parsing.

**Testing doubles**: `tests/adapters/` contains in-memory repository implementations for unit tests. SQLite integration tests live in `src/infrastructure/adapters/*.test.ts`.

**Environment**: `processEnvFacade.ts` validates env vars with ArkType. `JOB_APP_MANAGER_TYPE` switches between test and prod database paths.

**Feature flags**: Client-side only (localStorage). Browser console API: `featureFlags.enable('flag')`.

**Browser extension**: `src/application/server/plugins/extension-api.plugin.ts` handles extension auth via `BROWSER_EXTENSION_API_KEY`. Extension code is in `extension/`.

### E2E Test Setup

`bun test:e2e` runs `scripts/end-to-end.ts` which finds or starts a dev server on port 3000, polls for health, then spawns Playwright. Global setup/teardown clears and seeds the database. Page Objects are in `tests/e2e/POMs/`, fixtures in `tests/e2e/fixtures/base.ts`.
