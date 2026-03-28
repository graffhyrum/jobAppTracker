# Project Roadmap

Current state and planned evolution of the Job Application Tracker.

---

## Product Phases

### Phase 1: Core Application Management -- COMPLETED

The foundation is fully built and tested.

- Hexagonal architecture with ports and adapters
- Full CRUD for job applications with status management
- SQLite persistence via `bun:sqlite`
- Customizable pipeline workflow (active/inactive status categories)
- Rich domain entities with behavior methods (`isOverdue`, `getCurrentStatus`, `newStatus`)
- NeverThrow `ResultAsync` error handling throughout domain and infrastructure
- ArkType validation at system boundaries
- Comprehensive test suite (88+ tests, >93% coverage)

### Phase 2: Interactive UI and Task Management -- PARTIALLY COMPLETE

The interactive web interface and several advanced features are shipped.

**Completed:**

- HTMX-powered frontend with server-rendered HTML
- Pipeline view with sorting, filtering, search, and pagination
- Click-to-edit inline editing for all key fields (company, position, status, interest, next event date)
- Contact management (CRUD with per-application association)
- Interview stage tracking (rounds, types, questions, dates)
- Analytics dashboard with 6 core metrics and Chart.js visualizations
- Date range filtering on analytics
- Light/dark theme system
- Browser extension for quick job capture from LinkedIn, Indeed, Greenhouse, Lever
- Feature flag system (client-side, localStorage-based)

**Remaining:**

- Dashboard with due/overdue tasks prominently displayed
- Notes system improvements
- Advanced filtering by multiple criteria simultaneously

### Phase 3: Polish and Distribution -- NOT STARTED

- Standalone executable compilation (`bun build` to single binary)
- Import/export (CSV/JSON)
- Bulk operations (multi-select status updates)
- Advanced search across all fields
- Performance optimization and fast startup (<2s)

---

## Monetization Phases

Sequenced from the [monetization action plan](./monetization-action-plan.md). Each phase has a feedback gate that must pass before advancing.

### Phase 0: Instrumentation

Add PostHog analytics, Google Search Console, and UTM tracking. Gate: events flowing.

### Phase 1: Polish and Position (~1 week)

CSS polish, positioning variants, landing page, comparison page ("vs. Spreadsheets"). Gate: landing page live with baseline traffic data.

### Phase 2: Distribution Test (~2 weeks)

Parallel channel tests: Show HN, Reddit communities, SEO articles, Chrome Web Store extension listing, `llms.txt`. Gate: 200+ unique visitors from at least one channel.

### Phase 3: Conversion Infrastructure (~1-2 weeks)

Stripe integration ($15 one-time), license validation proxy, premium feature gating with visible-but-locked UI. Gate: end-to-end purchase flow working.

### Phase 4: First Revenue (~1 week)

Premium launch announcement, A/B pricing tests, optional companion product (job search guide on Gumroad). Gate: first 10 paying customers within 30 days.

### Phase 5: Smart Scrape (first premium feature)

Browser extension captures raw page content, LLM extracts structured job data (company, title, requirements, salary, remote status). Gate: extraction accuracy across 20+ sites, user retention of premium.

### Phase 6: Evaluate and Decide

Use real data to determine whether to iterate (more premium features), reposition (pricing/messaging), or pivot distribution strategy.

**Investment guardrail:** Total pre-revenue investment is ~5-6 weeks and <$20.

For full detail, see [monetization-action-plan.md](./monetization-action-plan.md) and [monetization-research.md](./monetization-research.md).

---

## Analytics Extension

Planned from the [analytics extension plan](./analytics-extension-plan.md). Four phases that deepen analytics coverage from the current 6 metrics to 15+ dimensions, all using existing data (no schema changes required).

### Analytics Phase 1: Contact and Interview Analytics (2-3 weeks)

High value, low effort. Adds:

- Contact effectiveness dashboard (response rate by channel, by role, contact count correlation with outcomes)
- Interview pipeline analytics (rounds to offer, type effectiveness, completion rates, timing between rounds)
- Tab-based analytics navigation (Overview, Contact, Interview, Funnel, Trends)

### Analytics Phase 2: Funnel and Correlation (2 weeks)

High value, medium effort. Adds:

- Application funnel analysis (applied -> contacted -> responded -> interviewed -> offered)
- Drop-off point identification
- Multi-dimensional correlation (contacts vs outcome, remote vs on-site, interest rating vs engagement)

### Analytics Phase 3: Trends and Predictions (2 weeks)

Medium value, medium effort. Adds:

- Application velocity with moving averages
- Monthly and quarterly comparisons
- Day-of-week patterns
- Stalled application detection
- Optimal follow-up timing recommendations

### Analytics Phase 4: Job Board and Quality (1 week)

Low value, low effort. Adds:

- Per-board success rates (beyond current source-type-only analysis)
- Application quality indicators (job description present, URL present, note count correlation)
- Data entry timeliness correlation with outcomes

**Total estimated timeline: 8-9 weeks for complete implementation.**

For full detail including type definitions, visualization plans, and implementation architecture, see [analytics-extension-plan.md](./analytics-extension-plan.md).

---

## Current Technical Priorities

Based on recent work (March 2026):

1. **Security hardening** -- XSS mitigation, CSP headers, timing-safe auth, input validation (largely completed)
2. **Analytics refactoring** -- extracting shared math, utils, and fixture builders to reduce duplication across analytics modules (in progress)
3. **Domain layer cleanup** -- moving functions to proper domain boundaries, removing dead code

---

## Related Documents

- [PRD.md](./PRD.md) -- detailed product requirements and data model
- [monetization-action-plan.md](./monetization-action-plan.md) -- sequenced monetization plan with gates
- [monetization-research.md](./monetization-research.md) -- market research and pricing analysis
- [analytics-extension-plan.md](./analytics-extension-plan.md) -- 4-phase analytics depth plan
- [TEST_PLAN.md](./TEST_PLAN.md) -- testing strategy
