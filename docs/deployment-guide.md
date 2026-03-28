# Deployment Guide

This document covers building, deploying, and running the Job Application Tracker in production. For environment setup, see [configuration-guide.md](./configuration-guide.md). For API details, see [api-reference.md](./api-reference.md).

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Build Process](#build-process)
- [Running in Production](#running-in-production)
- [Static Asset Serving](#static-asset-serving)
- [Git Hooks](#git-hooks)
- [CI/CD](#cicd)
- [Quality Gates](#quality-gates)

---

## Prerequisites

- [Bun](https://bun.sh/) v1.x or later
- Git
- Node.js 20+ (for Playwright E2E tests only)

---

## Environment Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/graffhyrum/jobapptracker.git
   cd jobapptracker
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Create environment file:

   ```bash
   cp .env.example .env
   ```

4. Configure `.env` (see [configuration-guide.md](./configuration-guide.md#environment-variables) for all variables):

   ```
   BASE_URL=http://localhost
   PORT=3000
   JOB_APP_MANAGER_TYPE=prod
   BROWSER_EXTENSION_API_KEY=your-32-char-minimum-api-key-here
   ```

5. Ensure the data directory exists:

   ```bash
   mkdir -p data
   ```

   The SQLite database file (`data/jobapp.sqlite`) is created automatically on first run.

---

## Build Process

### Production Binary

```bash
bun build
```

This command runs two steps:

1. **Browser script bundling** (`build:scripts`): Compiles TypeScript browser scripts to JavaScript.
2. **Server binary** (`bun build src/index.ts --target bun --outfile dist/jobapptracker`): Produces a single executable at `dist/jobapptracker`.

### Browser Script Bundling

The `build:scripts` step compiles two client-side TypeScript files to browser-compatible JavaScript:

| Source                                        | Output                                        | Purpose                            |
| --------------------------------------------- | --------------------------------------------- | ---------------------------------- |
| `src/presentation/scripts/feature-flags.ts`   | `src/presentation/scripts/feature-flags.js`   | Client-side feature flag API       |
| `src/presentation/scripts/pipeline-client.ts` | `src/presentation/scripts/pipeline-client.js` | Pipeline table client-side sorting |

Both are built with `bun build --target browser`. The output `.js` files are served as static assets at `/scripts/` and are gitignored (they are build artifacts).

### Build Output

```
dist/
  jobapptracker    # Single Bun executable
```

The binary includes all server code but not static assets. Static files are served from the filesystem at runtime (see [Static Asset Serving](#static-asset-serving)).

---

## Running in Production

### Using the Built Binary

```bash
bun run start
# or directly:
bun run dist/jobapptracker
```

### Using Source Directly

```bash
bun run src/index.ts
```

### Development Mode

```bash
bun dev
```

This builds scripts first, then starts the server with `--watch` for hot reload. In development mode, the dev tools plugin is enabled at `/dev/*` (see [api-reference.md](./api-reference.md#dev-tools-development-only)).

### Server Behavior

- Listens on port 3000 (hardcoded in `startElysiaServer.ts`)
- Environment validation happens at import time via `processEnvFacade.ts`
- If any required env var is missing or invalid, the process exits with an ArkType validation error
- The SQLite database is initialized lazily on first request

---

## Static Asset Serving

The server uses `@elysiajs/static` to serve three directories:

| URL Path    | Filesystem Path             | Contents                              |
| ----------- | --------------------------- | ------------------------------------- |
| `/styles/`  | `src/presentation/styles/`  | CSS stylesheets                       |
| `/scripts/` | `src/presentation/scripts/` | Built JavaScript files                |
| `/assets/`  | `src/presentation/assets/`  | Images, icons, and other static files |

In production, these files are served from the source tree relative to the working directory. The production binary must be run from the project root (or the `assets`, `prefix` paths must be adjusted).

### HTMX

HTMX is loaded from CDN (`https://cdn.jsdelivr.net`), which is allowed in the Content-Security-Policy header. The CSP is configured in `startElysiaServer.ts`.

---

## Git Hooks

### Husky Pre-commit

**File:** `.husky/pre-commit`

```bash
bun test
```

Runs the unit test suite before every commit. If any test fails, the commit is blocked.

### lint-staged

Configured in `package.json`:

```json
{
	"lint-staged": {
		"**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}": ["bunx oxlint --fix", "bunx oxfmt"]
	}
}
```

On commit, staged files are auto-fixed with `oxlint` and formatted with `oxfmt`. This runs via `lint-staged` which is invoked by the husky infrastructure (though the current pre-commit hook only runs `bun test`).

---

## CI/CD

### GitHub Actions

**File:** `.github/workflows/opencode.yml`

The project uses a single GitHub Actions workflow triggered by issue comments containing `/oc` or `/opencode`. This invokes the [opencode](https://github.com/sst/opencode) AI coding agent.

```yaml
name: opencode
on:
  issue_comment:
    types: [created]
jobs:
  opencode:
    if: |
      contains(github.event.comment.body, '/oc') ||
      startsWith(github.event.comment.body, '/oc') ||
      contains(github.event.comment.body, '/opencode') ||
      startsWith(github.event.comment.body, '/opencode')
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
      pull-requests: read
      issues: read
    steps:
      - uses: actions/checkout@v4
      - uses: sst/opencode/github@latest
        env:
          OPENCODE_API_KEY: ${{ secrets.OPENCODE_API_KEY }}
        with:
          model: opencode/big-pickle
```

**Trigger**: Comment `/oc` or `/opencode` on any issue or PR.

### Secrets Required

| Secret             | Purpose                                  |
| ------------------ | ---------------------------------------- |
| `OPENCODE_API_KEY` | Authentication for the opencode AI agent |

---

## Quality Gates

The full quality gate is the `bun vet` command. It runs the following checks in sequence, failing fast on any error:

```bash
bun vet
```

### What `vet` runs

1. **`bun fix`**: `oxlint --fix` + `oxfmt` (auto-fix lint and formatting issues)
2. **`bun typecheck`**: `tsc --noEmit` (TypeScript type checking with strict mode)
3. **`bun test:all`**:
   - `bun test:coverage` (unit tests with 90% coverage threshold)
   - `bun test:e2e` (Playwright E2E tests)

### Fast Quality Gate

```bash
bun fastvet
```

Runs typecheck, fix, stepdown-rule analysis, rule-validator, and unit tests -- but skips E2E. Useful for quick feedback during development.

### Pre-commit Checks

The husky pre-commit hook runs `bun test` (unit tests only). Full `vet` is run manually or in CI before merging.

### Coverage Threshold

The 90% coverage threshold is enforced by `bunfig.toml`:

```toml
[test]
coverageThreshold = 0.90
```

`bun test:coverage` fails if overall line coverage drops below 90%.

---

## Project Structure for Deployment

```
jobapptracker/
  .env                  # Environment configuration (not committed)
  .env.example          # Template for .env
  data/
    jobapp.sqlite       # Production SQLite database (created at runtime)
  dist/
    jobapptracker       # Built production binary
  src/
    presentation/
      styles/           # CSS (served at /styles/)
      scripts/          # Built JS (served at /scripts/)
      assets/           # Static assets (served at /assets/)
    index.ts            # Entry point
```

The production binary, `.env` file, `data/` directory, and `src/presentation/` static asset directories are the minimum required to run in production.
