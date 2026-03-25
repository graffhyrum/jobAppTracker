# Handoff: Monetization Strategy & PRD for Job App Tracker

**Created**: 2026-03-24

## Goal

Define and document a monetization strategy for the job application tracker — an open-source, self-hosted tool at v0.4.0. The developer is unemployed and needs income. The outcome is a concrete, phased plan to go from free tool to revenue-generating open-core product.

## Accomplished

### Strategy (via /grill-me interview)
- Resolved 9 major design decisions across goal, scope, architecture, sequencing, and risk
- Chose: open-core freemium model, one-time fixed price (~$15), Stripe via existing LLC, cloud LLM API (pay-per-call) behind a thin license-gated proxy, configurable inference endpoint (hosted or local model)
- Rejected: activation-code executable, PWYW for premium, self-hosted GPU inference, subscription billing

### PRD & Issues
- **Full PRD** for Phase 2 (Payment + License Infrastructure) → GitHub issue #9
- **Stub issue** for Phase 1 (Polish Free Tier) → GitHub issue #10
- **Stub issue** for Phase 3 (Smart Scrape — first premium feature) → GitHub issue #11

### Research
- Reviewed 16 curated articles on digital product monetization, marketing, UI polish, distribution
- Distilled findings with verification steps and feedback mechanisms
- Created sequenced action plan with phase gates and kill signals

### Artifacts Written
- `docs/monetization-research.md` — all 16 sources canonized with links, claims, verify steps
- `docs/monetization-action-plan.md` — 6-phase plan with gates, guardrails, investment caps
- `.claude/plans/wobbly-humming-squirrel.md` — original grilling summary and strategy plan

### Memory Updated
- `project_monetization.md` — open-core model decisions, pricing, architecture
- `user_product_experience.md` — first-time digital product seller, unemployed, revenue matters

## Current State

- **Branch:** main (no new commits from this session — all output is docs + GitHub issues)
- **Working tree:** has pre-existing unstaged changes from other work (see git status in session start)
- **No code changes made** — this was a strategy/planning session
- **GitHub issues created:** #9 (PRD), #10 (stub), #11 (stub)

## Files to Load

- `docs/monetization-action-plan.md` — the sequenced plan (start here)
- `docs/monetization-research.md` — source material with verification steps
- `.claude/plans/wobbly-humming-squirrel.md` — grilling decisions and rationale
- `CLAUDE.md` — project architecture and conventions
- `src/presentation/components/navbar.ts` — navigation (needs "Premium" + "Settings" links)
- `src/infrastructure/sqlite/sqlite-schema.ts` — schema (needs `settings` table)
- `src/application/server/plugins/extension-api.plugin.ts` — existing API key auth pattern to reference

## Known Issues / Blockers

- **No authentication system exists.** The app is single-user with no login. Premium gating via license key works without user auth, but if multi-user is ever needed, this becomes a larger change.
- **No settings page exists.** Needs to be created from scratch (new page, new route, new nav entry, new SQLite table).
- **Proxy service is a separate deployment.** Needs its own repo or directory, its own hosting, its own CI. Not yet scoped in detail.
- **Price point undecided.** $10, $15, or $20 — needs market testing (deferred to Phase 4 of action plan).
- **10 of 16 research URLs are X/Twitter posts** — content was captured via browser automation but tweets may be deleted/changed. The research doc has the distilled findings.

## Next Steps (in order)

1. **Phase 0 — Instrumentation:** Add PostHog to HTML templates, set up Google Search Console, add "How did you hear about us?" field. (~1 hour)
2. **Phase 1 — CSS Polish:** Apply Krehel's CSS quick wins (see research doc section 5a). Build landing page with positioning copy. Write one comparison page (vs. Spreadsheets). (~1 week)
3. **Phase 2 — Distribution Test:** Show HN post, Reddit answers, 5 SEO test articles, Chrome Web Store submission, llms.txt. Measure for 2 weeks. (~2 weeks)
4. **Phase 3 — Conversion Infrastructure:** Implement GitHub issue #9 (Stripe + license proxy + settings table + premium gating). (~1-2 weeks)
5. **Phase 4 — First Revenue:** Launch premium tier, A/B test pricing copy, target first 10 paying customers. (~1 week + ongoing)
6. **Phase 5 — Smart Scrape:** Implement GitHub issue #11 (universal job posting extraction via LLM). (~2-3 weeks)

**Success criteria:** First paying customer within ~6 weeks of starting Phase 0. Infrastructure cost < $20 before first revenue signal.

## Skills / Context Hints

- Run `bun run vet` before closing any implementation work
- Bead workflow: `br create` → `br update --status blocked` → groom → open → claim → close
- The app uses ElysiaJS + HTMX + SQLite — no React, no SPA
- Existing extension API auth pattern (`X-API-Key` header) is a reference for license key validation
- ArkType for all validation at system boundaries
- NeverThrow `ResultAsync` throughout domain + infrastructure (Effect-TS migration in progress on separate branch)
