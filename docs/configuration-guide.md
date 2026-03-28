# Configuration Guide

This document catalogs all configuration files and environment variables used by the Job Application Tracker. For API details, see [api-reference.md](./api-reference.md). For test configuration, see [testing-guide.md](./testing-guide.md).

---

## Table of Contents

- [Environment Variables](#environment-variables)
- [Database Configuration](#database-configuration)
- [TypeScript Configuration](#typescript-configuration)
- [OXC Toolchain](#oxc-toolchain)
- [Bun Configuration](#bun-configuration)
- [Playwright Configuration](#playwright-configuration)
- [Feature Flags](#feature-flags)

---

## Environment Variables

### Validation

All environment variables are validated at startup by `processEnvFacade.ts` using ArkType. If validation fails, the process crashes immediately with a descriptive error. Bun auto-loads `.env` files -- no dotenv package needed.

**Schema** (`processEnvFacade.ts`):

| Variable                    | Type                          | Required | Description                                                                                 |
| --------------------------- | ----------------------------- | -------- | ------------------------------------------------------------------------------------------- |
| `BASE_URL`                  | `string.url`                  | Yes      | Base URL for the server (e.g., `http://localhost`)                                          |
| `PORT`                      | `string` (parsed to `number`) | Yes      | Port number (e.g., `3000`)                                                                  |
| `JOB_APP_MANAGER_TYPE`      | `"test" \| "prod"`            | Yes      | Selects database configuration. `test` uses in-memory SQLite; `prod` uses file-based SQLite |
| `BROWSER_EXTENSION_API_KEY` | `string >= 32 chars`          | No       | API key for browser extension authentication. If unset, the extension API returns 503       |

### Setup

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

Example values:

```
BASE_URL=http://localhost
PORT=3000
JOB_APP_MANAGER_TYPE=prod
BROWSER_EXTENSION_API_KEY=your-32-char-minimum-api-key-here
```

### How Validation Works

```typescript
// processEnvFacade.ts
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

`processEnvSchema.assert()` throws on invalid input with a summary of all validation errors. The validated `processEnv` object is imported throughout the codebase as the single source of truth for environment configuration.

---

## Database Configuration

### SQLite Config

**File:** `src/infrastructure/config/sqlite-config.ts`

| Environment | Database Path        | Description                       |
| ----------- | -------------------- | --------------------------------- |
| `prod`      | `data/jobapp.sqlite` | File-based SQLite database        |
| `test`      | `:memory:`           | In-memory database for fast tests |

The `getDatabasePath(environment)` helper selects the path based on the `JOB_APP_MANAGER_TYPE` environment variable.

### Database Registry

The `sqliteRegistry` (`src/infrastructure/sqlite/sqlite-registry.ts`) manages database connections:

- Maintains separate connections for `test` and `prod` environments.
- Connections are lazily initialized and cached.
- The default environment is determined by `JOB_APP_MANAGER_TYPE`.

### Dev Tools Database Switching

In development mode, the `/dev/switch-db` endpoint allows switching between test and prod databases per-request. The selection is persisted in a cookie (`devdb`) with a long max-age. Each request reads this cookie to determine which database connection to use.

---

## TypeScript Configuration

**File:** `tsconfig.json`

### Key Settings

| Setting                      | Value               | Purpose                                      |
| ---------------------------- | ------------------- | -------------------------------------------- |
| `target`                     | `ESNext`            | Latest ECMAScript features                   |
| `module`                     | `Preserve`          | Bun handles module resolution                |
| `moduleResolution`           | `bundler`           | Works with Bun's bundler                     |
| `strict`                     | `true`              | Full strict mode                             |
| `noEmit`                     | `true`              | Type checking only (Bun runs TS directly)    |
| `noUncheckedIndexedAccess`   | `true`              | Index signatures return `T \| undefined`     |
| `noImplicitOverride`         | `true`              | Explicit `override` keyword required         |
| `noFallthroughCasesInSwitch` | `true`              | Switch cases must break or return            |
| `verbatimModuleSyntax`       | `true`              | Enforces `import type` for type-only imports |
| `allowImportingTsExtensions` | `true`              | Allows `.ts` extensions in imports           |
| `jsx`                        | `react-jsx`         | JSX support for HTML templates               |
| `lib`                        | `["ESNext", "dom"]` | Includes DOM types for presentation layer    |

### Path Aliases

| Alias          | Maps To           | Usage                   |
| -------------- | ----------------- | ----------------------- |
| `#src/*`       | `./src/*`         | Main source imports     |
| `#helpers/*`   | `./src/helpers/*` | Helper utilities        |
| `#rootTypes/*` | `./types/*`       | Shared type definitions |

Example usage:

```typescript
import { runEffect } from "#src/application/server/utils/run-effect.ts";
import type { JobBoardRepository } from "#src/domain/ports/job-board-repository.ts";
```

---

## OXC Toolchain

The project uses [OXC](https://oxc.rs/) for linting (`oxlint`) and formatting (`oxfmt`), replacing Biome as of 2026-03-17.

### Linter Configuration

**File:** `.oxlintrc.json`

```json
{
	"categories": {
		"correctness": "error",
		"suspicious": "error"
	},
	"rules": {
		"consistent-function-scoping": "off",
		"no-array-sort": "off"
	},
	"ignorePatterns": [
		"src/presentation/scripts/*.js",
		"dist/**",
		"playwright-report/**"
	]
}
```

- **Categories**: `correctness` and `suspicious` rules are enabled at error level.
- **Disabled rules**: `consistent-function-scoping` (factory pattern conflicts) and `no-array-sort` (intentional in-place sorts).
- **Ignored paths**: Built JS files, dist output, and Playwright reports.

### Formatter Configuration

**File:** `.oxfmtrc.json`

| Setting          | Value                 |
| ---------------- | --------------------- |
| `useTabs`        | `true`                |
| `tabWidth`       | `2`                   |
| `printWidth`     | `80`                  |
| `singleQuote`    | `false`               |
| `trailingComma`  | `"all"`               |
| `semi`           | `true`                |
| `arrowParens`    | `"always"`            |
| `bracketSpacing` | `true`                |
| `sortImports`    | `{ "enabled": true }` |

Ignored patterns match the linter: built JS, dist, node_modules, playwright-report.

### Commands

```bash
bun lint       # Run oxlint
bun format     # Run oxfmt
bun check      # oxlint + oxfmt --check (verify only)
bun fix        # oxlint --fix + oxfmt (safe auto-fixes)
bun fixx       # oxlint --fix + --fix-suggestions + --fix-dangerously + oxfmt
```

---

## Bun Configuration

**File:** `bunfig.toml`

```toml
[test]
root = "src"
coverageThreshold = 0.90
preload = ["./test-setup.ts"]
```

| Setting             | Value                 | Purpose                                                      |
| ------------------- | --------------------- | ------------------------------------------------------------ |
| `root`              | `"src"`               | Only scan `src/` for test files (excludes `tests/e2e/`)      |
| `coverageThreshold` | `0.90`                | 90% coverage minimum; `bun test --coverage` fails below this |
| `preload`           | `["./test-setup.ts"]` | Registers happy-dom for DOM APIs before tests run            |

### Test Setup

**File:** `test-setup.ts`

Registers `@happy-dom/global-registrator` to provide DOM APIs (`document`, `window`, `HTMLElement`, etc.) in the test environment. This enables testing presentation-layer HTML template functions that use DOM APIs.

---

## Playwright Configuration

**File:** `playwright.config.ts`

### Core Settings

| Setting        | Value             |
| -------------- | ----------------- |
| Test directory | `./tests/e2e`     |
| Test timeout   | 10 seconds        |
| Expect timeout | 2 seconds         |
| Parallel       | Fully parallel    |
| Workers        | 4 (local), 2 (CI) |
| Retries        | 0 (local), 2 (CI) |
| `forbidOnly`   | `true` in CI      |

### Base URL

Constructed from `processEnvFacade.ts`: `${BASE_URL}:${PORT}` (e.g., `http://localhost:3000`).

### Reporters

- `dot` -- minimal console output
- `html` -- full HTML report (auto-open disabled)

### Artifacts

| Artifact   | When Captured     |
| ---------- | ----------------- |
| Trace      | Retain on failure |
| Screenshot | Only on failure   |
| Video      | Retain on failure |

### Projects

Single project: Chromium at 1920x1080 viewport. Additional viewports can be enabled by uncommenting entries in the `viewportsOptions` array.

### Global Lifecycle

| Hook             | File                           | Purpose                     |
| ---------------- | ------------------------------ | --------------------------- |
| `globalSetup`    | `tests/e2e/global-setup.ts`    | Clears test database tables |
| `globalTeardown` | `tests/e2e/global-teardown.ts` | Clears database after suite |

---

## Feature Flags

Feature flags are **client-side only**, stored in `localStorage`. They do not affect server behavior.

### Browser Console API

```javascript
// Enable a flag
featureFlags.enable("flagName");

// Disable a flag
featureFlags.disable("flagName");

// Check a flag
featureFlags.isEnabled("flagName");
```

### Implementation

- **Source**: `src/presentation/scripts/feature-flags.ts`
- **Built output**: `src/presentation/scripts/feature-flags.js` (bundled for browser via `bun build:scripts`)
- **Served at**: `/scripts/feature-flags.js`

The build step (`bun build:scripts`) compiles TypeScript to browser-compatible JavaScript with `--target browser`. This runs automatically before `bun dev` and `bun build`.
