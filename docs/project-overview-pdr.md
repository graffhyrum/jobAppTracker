# Project Overview and Product Design Review

## What It Does

Job Application Tracker is a single-user, self-hosted web application for managing a job search pipeline. It runs as a standalone Bun executable backed by SQLite, serving server-rendered HTML enhanced with HTMX for partial page updates. A companion Chrome extension lets users capture job postings directly from job boards into the tracker.

## Who It Is For

Individual job seekers who want a local-first, privacy-respecting alternative to spreadsheets or SaaS trackers. The product targets technically comfortable users willing to run a local server in exchange for full data ownership and zero subscription cost.

## Business Model

Open-core freemium: the core tracker is free with pay-what-you-want pricing. Premium features (AI-powered insights) are planned as fixed-price add-ons with a cloud LLM proxy.

## Core Features

### Application Pipeline Tracking

- Full CRUD for job applications with rich metadata: company, position, application date, interest rating (0-3), job posting URL, description, and timestamped notes
- Status workflow with two categories:
  - **Active**: applied, screening interview, interview, onsite, online test, take-home assignment, offer
  - **Inactive**: rejected, no response, no longer interested, hiring freeze
- Immutable status log recording every transition with ISO timestamps
- Sortable, searchable pipeline table with HTMX-driven inline editing
- Overdue detection based on `nextEventDate`

### Source Tracking

- Source type classification: job board, referral, company website, recruiter, networking, other
- Job board registry with domain matching (LinkedIn, Indeed, Glassdoor, ZipRecruiter, Monster, CareerBuilder, AngelList, Dice)
- Source notes for tracking referral details

### Contact Management

- Contacts linked to applications with role (recruiter, hiring manager, employee, referral, other)
- Communication channel tracking (email, LinkedIn, phone, referral, other)
- Outreach date and response tracking

### Interview Stage Tracking

- Per-application interview stages with round number and type (phone screening, technical, behavioral, onsite, panel, other)
- Question bank per stage with optional answers
- Final round flag and scheduled/completed date tracking

### Analytics Dashboard

- Summary statistics: total, active, inactive, offer rate, response rate
- Status distribution breakdown
- Applications-over-time timeline
- Source effectiveness analysis (success rate per source type)
- Time-in-status metrics (average, median, min, max days)
- Interest rating correlation analysis
- Contact and interview statistics
- Date range filtering

### Browser Extension

- Chrome Manifest V3 extension
- Content script extractors for LinkedIn, Indeed, Greenhouse, and Lever with generic fallback
- One-click capture from popup form
- HMAC-authenticated API communication
- Configurable server URL and API key via options page

### Developer Tools

- Dev-only tools plugin with database switching (test/prod)
- Feature flags system (client-side, localStorage)
- Swagger/OpenAPI documentation at `/swagger`

## Architecture Overview

The application follows **hexagonal (ports and adapters) architecture**. Domain logic is isolated from infrastructure concerns through port interfaces.

```
Browser/Extension
       |
   [HTMX / API]
       |
  Presentation Layer (HTML templates, components)
       |
  Application Layer (ElysiaJS plugins, route handlers)
       |
  Domain Layer (entities, ports, use-cases)
       |
  Infrastructure Layer (SQLite adapters, DI providers)
       |
    [SQLite DB]
```

See [System Architecture](system-architecture.md) for detailed diagrams.

### Layer Responsibilities

| Layer          | Purpose                                       | Key Files             |
| -------------- | --------------------------------------------- | --------------------- |
| Domain         | Entities, port interfaces, analytics logic    | `src/domain/`         |
| Infrastructure | SQLite adapters, DI, UUID/file-IO providers   | `src/infrastructure/` |
| Application    | ElysiaJS server, route plugins, Effect runner | `src/application/`    |
| Presentation   | HTML templates, components, schemas, scripts  | `src/presentation/`   |
| Extension      | Chrome extension (content, popup, background) | `extension/`          |

## Tech Stack Rationale

| Technology     | Role                                              | Why                                                                                          |
| -------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Bun**        | Runtime + bundler + test runner + package manager | Single toolchain, fast startup, native SQLite driver, compiles to standalone binary          |
| **TypeScript** | Language                                          | Type safety across all layers; ArkType schemas infer types at compile time                   |
| **ElysiaJS**   | Web framework                                     | Bun-native, plugin composition model maps naturally to hexagonal architecture                |
| **HTMX**       | Frontend interactivity                            | Server-rendered HTML with partial updates; no client-side framework or build step for UI     |
| **SQLite**     | Database                                          | Zero-config, single-file, embedded via `bun:sqlite`; ideal for single-user local app         |
| **ArkType**    | Validation                                        | Runtime type validation with compile-time inference; scope/module pattern for domain schemas |
| **Effect**     | Error handling                                    | Typed error channels via `Effect.Effect<T, E>`; eliminates untyped throws in business logic  |
| **OXC**        | Linting + formatting                              | oxlint + oxfmt replaced Biome (2026-03-17); faster, Rust-based toolchain                     |

## Current State (v0.4.0)

- All core CRUD operations functional with SQLite persistence
- Pipeline view with sorting, search, inline status updates
- Analytics dashboard with 8+ metric categories
- Browser extension with site-specific extractors
- In-memory test adapters for all repositories
- E2E test suite via Playwright
- 90% unit test coverage threshold enforced

## Roadmap Summary

- **Monetization**: PWYW core + fixed-price AI features (cloud LLM proxy for resume matching, interview prep)
- **Import/Export**: CSV and JSON bulk operations
- **Bulk Operations**: Multi-select status updates
- **Advanced Filtering**: Multi-criteria pipeline filtering

## Related Documentation

- [Codebase Summary](codebase-summary.md) -- file inventory and dependency details
- [Code Standards](code-standards.md) -- error handling, validation, and DI patterns
- [System Architecture](system-architecture.md) -- Mermaid diagrams and data flow
