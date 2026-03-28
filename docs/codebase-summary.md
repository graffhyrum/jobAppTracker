# Codebase Summary

## Directory Structure

```
jobAppTracker/
├── src/                          # Application source (~9,200 LoC)
│   ├── domain/                   # Domain layer (~2,100 LoC)
│   │   ├── entities/             # Domain entities with ArkType schemas
│   │   ├── ports/                # Port interfaces (repository contracts)
│   │   └── use-cases/            # Analytics computation, app management
│   ├── infrastructure/           # Infrastructure layer (~1,700 LoC)
│   │   ├── adapters/             # SQLite repository implementations
│   │   ├── config/               # Database configuration
│   │   ├── di/                   # Dependency injection providers
│   │   ├── factories/            # Repository factory functions
│   │   ├── file-io/              # File I/O abstraction
│   │   ├── sqlite/               # SQLite connection, registry, normalization
│   │   ├── storage/              # Storage utilities
│   │   └── uuid-generation/      # UUID generation
│   ├── application/              # Application layer (~2,200 LoC)
│   │   ├── server/
│   │   │   ├── plugins/          # ElysiaJS route plugins (one per feature)
│   │   │   └── utils/            # Effect runner, route helpers
│   │   └── use-cases/            # Application-level orchestration
│   ├── presentation/             # Presentation layer (~3,000 LoC)
│   │   ├── assets/               # Static assets (favicons, images)
│   │   ├── components/           # HTML template functions (pipeline, forms, etc.)
│   │   ├── pages/                # Full page templates (homepage, analytics, etc.)
│   │   ├── schemas/              # ArkType validation schemas for routes
│   │   ├── scripts/              # Client-side JS (feature flags, pipeline client)
│   │   ├── styles/               # CSS stylesheets
│   │   ├── templates/            # Layout and wrapper templates
│   │   ├── types/                # Presentation-layer type definitions
│   │   └── utils/                # HTML escaping, string conversions, pipeline utils
│   ├── helpers/                  # Shared utilities (~165 LoC)
│   └── index.ts                  # Application entry point
├── tests/                        # Test code (~7,600 LoC total across src/ and tests/)
│   ├── adapters/                 # In-memory repository implementations for unit tests
│   ├── e2e/                      # Playwright E2E tests, POMs, fixtures
│   ├── helpers/                  # Test helper utilities
│   └── integration/              # Integration test suites
├── extension/                    # Chrome browser extension (~990 LoC)
│   ├── background/               # Service worker (install/update lifecycle)
│   ├── content/                  # Content scripts (job data extractors)
│   ├── icons/                    # Extension icons
│   ├── options/                  # Options page (API URL, key config)
│   └── popup/                    # Popup UI (capture form)
├── types/                        # Shared TypeScript type definitions
├── scripts/                      # Build and CI scripts (e2e runner, etc.)
├── docs/                         # Project documentation
├── data/                         # SQLite database files
├── plans/                        # Implementation plans
└── worklog/                      # Work session logs
```

## Lines of Code Breakdown

| Layer / Area   | LoC (approx.) | Description                                |
| -------------- | ------------- | ------------------------------------------ |
| Domain         | 2,100         | Entities, ports, analytics use-cases       |
| Infrastructure | 1,700         | SQLite adapters, DI, config, factories     |
| Application    | 2,200         | ElysiaJS server, plugins, route handlers   |
| Presentation   | 3,000         | HTML templates, components, schemas, utils |
| Helpers        | 165           | Shared utility functions                   |
| Tests          | 7,600         | Unit, integration, E2E, in-memory adapters |
| Extension      | 990           | Chrome extension (JS, HTML, CSS)           |
| **Total**      | **~17,800**   |                                            |

## Key Dependencies

### Runtime Dependencies (7)

| Package             | Version | Purpose                                     |
| ------------------- | ------- | ------------------------------------------- |
| `elysia`            | ^1.4.28 | Web framework (Bun-native, plugin-based)    |
| `@elysiajs/html`    | ^1.4.0  | HTML content-type handling for Elysia       |
| `@elysiajs/static`  | ^1.4.7  | Static file serving (CSS, JS, assets)       |
| `@elysiajs/swagger` | ^1.3.1  | OpenAPI/Swagger documentation               |
| `arktype`           | ^2.2.0  | Runtime type validation with TS inference   |
| `effect`            | ^3.21.0 | Typed error handling (Effect, Either, Data) |
| `dotenv`            | ^17.3.1 | Environment variable loading (legacy)       |

### Dev Dependencies (15)

| Package                         | Version    | Purpose                                  |
| ------------------------------- | ---------- | ---------------------------------------- |
| `@types/bun`                    | ^1.3.10    | Bun runtime type definitions             |
| `@types/node`                   | ^24.12.0   | Node.js type definitions                 |
| `@typescript/native-preview`    | ^7.0.0-dev | TypeScript native compiler preview       |
| `@playwright/test`              | ^1.58.2    | E2E testing framework                    |
| `@faker-js/faker`               | ^10.3.0    | Test data generation                     |
| `@happy-dom/global-registrator` | ^20.8.4    | DOM simulation for unit tests            |
| `@changesets/cli`               | ^2.30.0    | Version management and changelogs        |
| `htmx.org`                      | ^2.0.8     | HTMX library (served as static asset)    |
| `oxlint`                        | ^1.56.0    | Linter (Rust-based, OXC toolchain)       |
| `oxfmt`                         | ^0.41.0    | Formatter (Rust-based, OXC toolchain)    |
| `husky`                         | ^9.1.7     | Git hooks                                |
| `lint-staged`                   | ^16.4.0    | Pre-commit lint/format on staged files   |
| `memfs`                         | ^4.56.11   | In-memory filesystem for testing         |
| `find-process`                  | ^2.1.0     | Process lookup for E2E server management |
| `tree-kill`                     | ^1.2.2     | Process tree termination for E2E cleanup |

## File Naming Conventions

| Pattern                 | Example                                              | Purpose                |
| ----------------------- | ---------------------------------------------------- | ---------------------- |
| `*.ts`                  | `job-application.ts`                                 | Source files           |
| `*.test.ts`             | `job-application.test.ts`                            | Co-located unit tests  |
| `*.integration.test.ts` | `sqlite-job-application-manager.integration.test.ts` | Integration tests      |
| `*.plugin.ts`           | `analytics.plugin.ts`                                | ElysiaJS route plugins |
| `kebab-case`            | `interview-stage-repository.ts`                      | All file names         |
| `camelCase`             | Entity field names, function names                   | Code identifiers       |

## Import Aliases

Configured in `tsconfig.json` `paths`:

| Alias          | Maps To           | Usage                          |
| -------------- | ----------------- | ------------------------------ |
| `#src/*`       | `./src/*`         | Any source file from any depth |
| `#helpers/*`   | `./src/helpers/*` | Shared utility functions       |
| `#rootTypes/*` | `./types/*`       | Shared type definitions        |

Example: `import { runEffect } from "#src/application/server/utils/run-effect.ts"`

## Key Source Files

### Domain Layer

| File                                           | Purpose                                                           |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| `src/domain/entities/job-application.ts`       | Core entity: ArkType schema, status management, factory functions |
| `src/domain/entities/contact.ts`               | Contact entity with role and channel enums                        |
| `src/domain/entities/interview-stage.ts`       | Interview stage entity with question bank                         |
| `src/domain/entities/job-board.ts`             | Job board entity with domain matching, seed data                  |
| `src/domain/entities/note.ts`                  | Notes collection manager with CRUD operations                     |
| `src/domain/ports/job-application-manager.ts`  | Primary port: Effect-based CRUD interface                         |
| `src/domain/ports/contact-repository.ts`       | Contact repository port                                           |
| `src/domain/use-cases/analytics.ts`            | Analytics data structures and computation                         |
| `src/domain/use-cases/analytics-aggregator.ts` | Aggregator composing all analytics modules                        |

### Infrastructure Layer

| File                                                            | Purpose                                                |
| --------------------------------------------------------------- | ------------------------------------------------------ |
| `src/infrastructure/adapters/sqlite-job-application-manager.ts` | SQLite adapter implementing JobApplicationManager port |
| `src/infrastructure/sqlite/sqlite-registry.ts`                  | Manager registry with test/prod environment switching  |
| `src/infrastructure/sqlite/sqlite-connection.ts`                | SQLite connection singleton                            |
| `src/infrastructure/di/uuid-provider.ts`                        | UUID generation provider                               |
| `src/infrastructure/factories/create-sqlite-*.ts`               | Factory functions for repository creation              |

### Application Layer

| File                                                     | Purpose                                               |
| -------------------------------------------------------- | ----------------------------------------------------- |
| `src/application/server/startElysiaServer.ts`            | Server bootstrap: plugins, middleware, error handling |
| `src/application/server/plugins/applications.plugin.ts`  | Application CRUD routes                               |
| `src/application/server/plugins/pipeline.plugin.ts`      | Pipeline view API                                     |
| `src/application/server/plugins/analytics.plugin.ts`     | Analytics dashboard route                             |
| `src/application/server/plugins/extension-api.plugin.ts` | Browser extension API with HMAC auth                  |
| `src/application/server/utils/run-effect.ts`             | Effect-to-Either bridge for route handlers            |

### Presentation Layer

| File                                                  | Purpose                                             |
| ----------------------------------------------------- | --------------------------------------------------- |
| `src/presentation/components/pipeline.ts`             | Pipeline table with HTMX sorting and inline editing |
| `src/presentation/components/layout.ts`               | Page layout wrapper                                 |
| `src/presentation/pages/analytics.ts`                 | Analytics dashboard page                            |
| `src/presentation/pages/homepage.ts`                  | Landing page                                        |
| `src/presentation/schemas/pipeline-routes.schemas.ts` | ArkType schemas for pipeline query params           |
| `processEnvFacade.ts`                                 | Environment variable validation with ArkType        |

## Related Documentation

- [Project Overview](project-overview-pdr.md) -- product features and roadmap
- [System Architecture](system-architecture.md) -- diagrams and data flow
- [Code Standards](code-standards.md) -- patterns and conventions
