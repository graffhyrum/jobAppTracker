# Post-Mortem: SQLite God Factory Decomposition

**Date**: 2026-03-24
**Status**: Completed

## Executive Summary

Decomposed the 555-LOC `create-sqlite-job-app-manager.ts` "god factory" into 5 focused modules under `src/infrastructure/sqlite/`, eliminating 4 copies of duplicated `normalizeRow` code across adapters. The session used the `improve-codebase-architecture` skill to explore, design (3 parallel design agents), stress-test, and implement. All 296 tests pass, zero consumer-facing API changes.

## Bead Outcomes

- Closed: none (no tracking bead was created for the god factory itself — it was an inline architecture improvement)
- Opened: jobapptracker-jom (analytics sprawl), jobapptracker-ui6 (form+list conflation), jobapptracker-9iy (route-helper bridge)
- Modified: none

## What Went Well

1. **3 parallel design agents produced convergent results** — All three independently arrived at the same core structure (shared normalizer, extracted schema, connection singleton, registry). This validated the design without wasted exploration.
2. **Config-driven normalizer eliminated 4 copies cleanly** — The `createRowNormalizer` approach with `"json"` / `"boolean"` string literals was simpler than the object-based alternatives and caught all field transforms correctly.
3. **Pre-flight infrastructure checks caught clean tree** — Starting from a clean git state meant no stash/merge complications during the refactoring.
4. **User feedback redirected barrel file approach** — The plan originally called for a re-export barrel, but the user's "no barrel files" feedback led to direct import migration across all 9 consumers, which is cleaner.

## What Could Improve

1. **`replace_all` missed `.map(normalizeRow)` references** — The Edit tool's `replace_all` only matched `normalizeRow(` (with opening paren), not `normalizeRow)` (as a function reference passed to `.map()`). Required a second pass.
   - **Impact**: 5 test failures on first run after adapter migration, ~3 minutes of rework
   - **Mitigation**: When replacing a function name across files, grep for the bare identifier first, not just call-site patterns. Use `replace_all` with the bare name (no paren) when the function is also passed as a reference.

2. **Commits 3-5 collapsed into one** — The plan called for 6 incremental commits, but `withConnection` removal forced merging the connection extraction, adapter extraction, and registry extraction into a single step because the adapter couldn't compile without both changes.
   - **Impact**: The commit is larger than planned (742 insertions) but still a single logical change
   - **Mitigation**: When planning incremental extraction, identify cross-cutting dependencies (like `withConnection`) that force multiple modules to change simultaneously. Either preserve the old API temporarily or plan the commit boundaries around these coupling points.

3. **No tracking bead opened before starting** — CLAUDE.md says "Inline-plan work: open a tracking bead before starting" but this was skipped for the architecture improvement skill invocation.
   - **Impact**: Low — the work was completed in a single session
   - **Mitigation**: The improve-codebase-architecture skill should create a tracking bead at Step 3 (user selection) before implementation begins.

## Key Decisions

| Decision                                                | Rationale                                                                   | Outcome                                                                       |
| ------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Hybrid of Design 1 (minimal) + Design 3 (common caller) | Design 2 introduced premature abstractions. 1+3 agreed on essentials.       | Clean decomposition, no over-engineering                                      |
| No barrel file — direct imports                         | User preference against barrels; direct imports are more explicit           | 9 consumers updated, no indirection layer                                     |
| `Promise.resolve().then()` wrapper in adapter           | Replaced `withConnection(async (db) => ...)` which was a no-op pass-through | Matches how other adapters work; `ResultAsync.fromPromise` still wraps errors |
| String-literal normalizer config                        | Simpler than object-based `FieldRule` or `ColumnTransform` patterns         | 2 transform types (`"json"`, `"boolean"`) cover all 4 adapters                |

## Lessons Learned

### Applicable Everywhere

- When `replace_all` is used on a function name, the function may also be used as a reference (e.g., `.map(fn)`) — grep for the bare identifier to find all usage patterns before replacing.
- Parallel design agents converging on the same structure is a strong signal the design is correct — it's worth the cost even when the task seems straightforward.

### Specific to This Work

- The `withConnection` wrapper was pure ceremony — it just called `operation(this.db)`. Removing it during extraction was the right call; it simplified the adapter to match the pattern of the other 3 adapters which use `db.prepare()` directly.

## Remediation

### Remediation Hierarchy (mandatory)

No new hooks, scripts, or rules needed. The refactoring is self-contained.

### Skill Coverage

- Skills relevant: improve-codebase-architecture, refactoring-methods, typescript, bun
- Skills loaded: improve-codebase-architecture (explicitly invoked)
- Gap: none — the skill drove the full workflow correctly

### Skill Gaps

- None identified — improve-codebase-architecture performed well end-to-end

### Infrastructure Actions (non-rule)

- None

## Follow-up Actions

- [ ] Groom the 3 new beads (jobapptracker-jom, jobapptracker-ui6, jobapptracker-9iy) via `/planning:sprint-grooming`

## Candidate Rules (for cm reflect)

- **Pattern**: "When using Edit replace_all on a function name, also search for the bare identifier as a `.map(fn)` reference — replace_all with opening paren misses function-reference usage" (source: this post-mortem)

## Related Threads

- Beads: jobapptracker-jom, jobapptracker-ui6, jobapptracker-9iy (created as follow-up work from this session's architecture exploration)
