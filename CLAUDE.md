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


<!-- bv-agent-instructions-v2 -->

---

## Beads Workflow Integration

This project uses [beads_rust](https://github.com/Dicklesworthstone/beads_rust) (`br`) for issue tracking and [beads_viewer](https://github.com/Dicklesworthstone/beads_viewer) (`bv`) for graph-aware triage. Issues are stored in `.beads/` and tracked in git.

### Using bv as an AI sidecar

bv is a graph-aware triage engine for Beads projects (.beads/beads.jsonl). Instead of parsing JSONL or hallucinating graph traversal, use robot flags for deterministic, dependency-aware outputs with precomputed metrics (PageRank, betweenness, critical path, cycles, HITS, eigenvector, k-core).

**Scope boundary:** bv handles *what to work on* (triage, priority, planning). `br` handles creating, modifying, and closing beads.

**CRITICAL: Use ONLY --robot-* flags. Bare bv launches an interactive TUI that blocks your session.**

#### The Workflow: Start With Triage

**`bv --robot-triage` is your single entry point.** It returns everything you need in one call:
- `quick_ref`: at-a-glance counts + top 3 picks
- `recommendations`: ranked actionable items with scores, reasons, unblock info
- `quick_wins`: low-effort high-impact items
- `blockers_to_clear`: items that unblock the most downstream work
- `project_health`: status/type/priority distributions, graph metrics
- `commands`: copy-paste shell commands for next steps

```bash
bv --robot-triage        # THE MEGA-COMMAND: start here
bv --robot-next          # Minimal: just the single top pick + claim command

# Token-optimized output (TOON) for lower LLM context usage:
bv --robot-triage --format toon
```

#### Other bv Commands

| Command | Returns |
|---------|---------|
| `--robot-plan` | Parallel execution tracks with unblocks lists |
| `--robot-priority` | Priority misalignment detection with confidence |
| `--robot-insights` | Full metrics: PageRank, betweenness, HITS, eigenvector, critical path, cycles, k-core |
| `--robot-alerts` | Stale issues, blocking cascades, priority mismatches |
| `--robot-suggest` | Hygiene: duplicates, missing deps, label suggestions, cycle breaks |
| `--robot-diff --diff-since <ref>` | Changes since ref: new/closed/modified issues |
| `--robot-graph [--graph-format=json\|dot\|mermaid]` | Dependency graph export |

#### Scoping & Filtering

```bash
bv --robot-plan --label backend              # Scope to label's subgraph
bv --robot-insights --as-of HEAD~30          # Historical point-in-time
bv --recipe actionable --robot-plan          # Pre-filter: ready to work (no blockers)
bv --recipe high-impact --robot-triage       # Pre-filter: top PageRank scores
```

### br Commands for Issue Management

```bash
br ready              # Show issues ready to work (no blockers)
br list --status=open # All open issues
br show <id>          # Full issue details with dependencies
br create --title="..." --type=task --priority=2
br update <id> --status=in_progress
br close <id> --reason="Completed"
br close <id1> <id2>  # Close multiple issues at once
br sync --flush-only  # Export DB to JSONL
```

### Workflow Pattern

1. **Triage**: Run `bv --robot-triage` to find the highest-impact actionable work
2. **Claim**: Use `br update <id> --status=in_progress`
3. **Work**: Implement the task
4. **Complete**: Use `br close <id>`
5. **Sync**: Always run `br sync --flush-only` at session end

### Key Concepts

- **Dependencies**: Issues can block other issues. `br ready` shows only unblocked work.
- **Priority**: P0=critical, P1=high, P2=medium, P3=low, P4=backlog (use numbers 0-4, not words)
- **Types**: task, bug, feature, epic, chore, docs, question
- **Blocking**: `br dep add <issue> <depends-on>` to add dependencies

### Session Protocol

```bash
git status              # Check what changed
git add <files>         # Stage code changes
br sync --flush-only    # Export beads changes to JSONL
git commit -m "..."     # Commit everything
git push                # Push to remote
```

<!-- end-bv-agent-instructions -->
