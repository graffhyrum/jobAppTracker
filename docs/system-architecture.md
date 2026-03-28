# System Architecture

This document describes the architecture of Job Application Tracker using diagrams and explanations of data flow, component relationships, and entity models.

## Hexagonal Architecture (Ports and Adapters)

The system follows hexagonal architecture where domain logic is isolated from infrastructure through port interfaces. Dependencies always point inward: infrastructure depends on domain, never the reverse.

```mermaid
graph TB
    subgraph External["External Clients"]
        Browser["Browser (HTMX)"]
        Extension["Chrome Extension"]
    end

    subgraph Presentation["Presentation Layer"]
        Pages["Pages<br/>(homepage, analytics)"]
        Components["Components<br/>(pipeline, forms, layout)"]
        Schemas["Validation Schemas"]
    end

    subgraph Application["Application Layer"]
        Server["ElysiaJS Server"]
        Plugins["Route Plugins"]
        RunEffect["runEffect() Bridge"]
    end

    subgraph Domain["Domain Layer"]
        Entities["Entities<br/>(JobApplication, Contact,<br/>InterviewStage, JobBoard, Note)"]
        Ports["Port Interfaces<br/>(JobApplicationManager,<br/>ContactRepository, etc.)"]
        UseCases["Use Cases<br/>(Analytics Aggregator)"]
    end

    subgraph Infrastructure["Infrastructure Layer"]
        SQLiteAdapters["SQLite Adapters"]
        Registry["Manager Registry"]
        DI["DI Providers<br/>(UUID, File I/O)"]
        SQLiteDB[("SQLite Database")]
    end

    Browser -->|"HTTP / HTMX"| Server
    Extension -->|"HMAC-Auth API"| Server
    Server --> Plugins
    Plugins --> RunEffect
    Plugins --> Pages
    Plugins --> Components
    Plugins --> Schemas
    RunEffect --> UseCases
    RunEffect --> Ports
    UseCases --> Ports
    UseCases --> Entities
    Ports -.->|"implemented by"| SQLiteAdapters
    SQLiteAdapters --> SQLiteDB
    Registry --> SQLiteAdapters
    DI --> SQLiteAdapters

    style Domain fill:#e8f5e9,stroke:#2e7d32
    style Application fill:#e3f2fd,stroke:#1565c0
    style Presentation fill:#fff3e0,stroke:#ef6c00
    style Infrastructure fill:#fce4ec,stroke:#c62828
```

## Request Lifecycle

Every HTTP request flows through a consistent lifecycle. The server differentiates between HTMX partial requests and full-page loads.

```mermaid
sequenceDiagram
    participant B as Browser
    participant E as ElysiaJS
    participant P as Plugin
    participant R as runEffect()
    participant D as Domain Port
    participant S as SQLite Adapter
    participant T as Template

    B->>E: HTTP Request
    E->>E: Security headers (CSP, X-Frame-Options)
    E->>E: ArkType query/body validation

    alt Validation fails
        E-->>B: 400 (HTML if HX-Request, JSON otherwise)
    end

    E->>P: Route to plugin handler
    P->>R: runEffect(port.operation())
    R->>D: Effect.Effect<T, E>
    D->>S: SQL query
    S-->>D: Raw rows
    D-->>R: Effect result
    R-->>P: Either<T, E>

    alt Either.isLeft (error)
        P-->>B: Error response (500)
    end

    P->>P: Check HX-Request header

    alt HTMX partial request
        P->>T: Render component fragment
        T-->>B: HTML fragment (hx-swap)
    else Full page request
        P->>T: Render full page with layout
        T-->>B: Complete HTML document
    end
```

### HX-Request Detection

The server checks the `HX-Request` header to determine response format:

- **HTMX request** (`HX-Request: true`): Returns an HTML fragment that HTMX swaps into the existing DOM
- **Full page request**: Returns a complete HTML document with layout, navbar, and HTMX/CSS includes
- **API request** (extension): Returns JSON

### Error Handling Flow

The global `onError` handler in `startElysiaServer.ts` catches all unhandled errors and formats responses based on the request type:

- `NOT_FOUND` -- 404 JSON response
- `VALIDATION` -- 400 with HTML (HTMX) or JSON (API)
- `PARSE` -- 400 with error text
- Other -- 500 with error message

## Data Flow

```mermaid
flowchart LR
    subgraph Input["Input Sources"]
        WebForm["Web Form<br/>(HTMX POST)"]
        ExtAPI["Extension API<br/>(HMAC + JSON)"]
        InlineEdit["Inline Edit<br/>(HTMX PATCH)"]
    end

    subgraph Validation["Validation"]
        ArkSchema["ArkType Schema<br/>(route-level)"]
        EntitySchema["ArkType Scope<br/>(entity-level)"]
    end

    subgraph Processing["Domain Processing"]
        Factory["Entity Factory<br/>(create/update)"]
        StatusLog["Status Log<br/>(append-only)"]
        Analytics["Analytics<br/>Aggregator"]
    end

    subgraph Storage["Persistence"]
        Adapter["SQLite Adapter"]
        DB[("jobapp.sqlite")]
    end

    subgraph Output["Output"]
        HTMLFrag["HTML Fragment"]
        FullPage["Full Page"]
        JSONResp["JSON Response"]
    end

    WebForm --> ArkSchema
    ExtAPI --> ArkSchema
    InlineEdit --> ArkSchema
    ArkSchema --> EntitySchema
    EntitySchema --> Factory
    Factory --> StatusLog
    Factory --> Adapter
    Analytics --> Adapter
    Adapter --> DB
    Adapter --> HTMLFrag
    Adapter --> FullPage
    Analytics --> FullPage
    Adapter --> JSONResp
```

## Entity Relationship Diagram

```mermaid
erDiagram
    JOB_APPLICATION {
        uuid id PK
        string company
        string positionTitle
        datetime applicationDate
        int interestRating "0-3, optional"
        datetime nextEventDate "optional"
        string jobPostingUrl "optional"
        string jobDescription "optional"
        enum sourceType "job_board|referral|company_website|recruiter|networking|other"
        uuid jobBoardId FK "optional"
        string sourceNotes "optional"
        boolean isRemote
        datetime createdAt
        datetime updatedAt
        json notes "NoteEntry[]"
        json statusLog "AppStatusEntry[] (append-only)"
    }

    CONTACT {
        uuid id PK
        uuid jobApplicationId FK
        string contactName
        string contactEmail "optional"
        string linkedInUrl "optional"
        enum role "recruiter|hiring_manager|employee|referral|other"
        enum channel "email|linkedin|phone|referral|other"
        datetime outreachDate
        boolean responseReceived
        string notes "optional"
        datetime createdAt
        datetime updatedAt
    }

    INTERVIEW_STAGE {
        uuid id PK
        uuid jobApplicationId FK
        int round ">=1"
        enum interviewType "phone_screening|technical|behavioral|onsite|panel|other"
        boolean isFinalRound
        datetime scheduledDate "optional"
        datetime completedDate "optional"
        string notes "optional"
        json questions "Question[]"
        datetime createdAt
        datetime updatedAt
    }

    JOB_BOARD {
        uuid id PK
        string name
        string rootDomain
        json domains "string[]"
        datetime createdAt
    }

    NOTE {
        uuid id PK
        string content
        datetime createdAt
        datetime updatedAt
    }

    JOB_APPLICATION ||--o{ CONTACT : "has"
    JOB_APPLICATION ||--o{ INTERVIEW_STAGE : "has"
    JOB_APPLICATION }o--o| JOB_BOARD : "sourced from"
    JOB_APPLICATION ||--o{ NOTE : "contains (embedded JSON)"
```

### Key Entity Design Decisions

- **Status log is append-only**: Every status change creates a new `[datetime, status]` tuple. The current status is always the last entry. This preserves the full transition history.
- **Notes are embedded JSON**: Notes are stored as a JSON array within the job application row, managed by a `NotesCollectionManager` that provides CRUD operations on the array.
- **Questions are embedded in interview stages**: Each interview stage contains a `questions` JSON array with `{id, title, answer?}` objects.
- **Job boards are a lookup table**: Seeded with common boards (LinkedIn, Indeed, etc.) and matched by domain for source attribution.

## Extension Architecture

```mermaid
sequenceDiagram
    participant Page as Job Board Page
    participant CS as Content Script
    participant Popup as Extension Popup
    participant BG as Service Worker
    participant API as Server API

    Note over CS: Runs on all pages at document_idle

    Popup->>CS: chrome.tabs.sendMessage("extractJobData")
    CS->>Page: Query DOM selectors
    Page-->>CS: Element text content

    alt Site-specific extractor
        CS->>CS: LinkedIn / Indeed / Greenhouse / Lever
    else Generic fallback
        CS->>CS: Meta tags + heading heuristics
    end

    CS-->>Popup: { company, position, url, description }
    Popup->>Popup: Pre-fill form fields
    Popup->>Popup: User reviews and submits

    Popup->>BG: chrome.storage.sync.get(settings)
    BG-->>Popup: { apiUrl, apiKey }

    Popup->>API: POST /api/extension/applications
    Note over Popup,API: X-API-Key header<br/>HMAC signature verification

    alt Auth success
        API-->>Popup: 201 { success, id }
        Popup->>Popup: Show success message
    else Auth failure
        API-->>Popup: 401 { error }
        Popup->>Popup: Show error message
    end
```

### Extension Components

| Component      | File                                     | Responsibility                                                                                                       |
| -------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Content Script | `extension/content/extractor.js`         | DOM scraping with site-specific extractors for LinkedIn, Indeed, Greenhouse, Lever; generic fallback using meta tags |
| Popup          | `extension/popup/popup.{html,js,css}`    | Capture form UI, triggers extraction, submits to API                                                                 |
| Service Worker | `extension/background/service-worker.js` | Install/update lifecycle, opens options on first install                                                             |
| Options        | `extension/options/options.{html,js}`    | Server URL and API key configuration, stored in `chrome.storage.sync`                                                |

### Extension Authentication

The server-side plugin (`extension-api.plugin.ts`) authenticates extension requests using HMAC:

1. Extension sends `X-API-Key` header with each request
2. Server computes HMAC signature and uses `timingSafeEqual` for comparison
3. The `BROWSER_EXTENSION_API_KEY` env var must be at least 32 characters
4. CORS headers are set to allow extension origin

## Plugin Composition

The ElysiaJS server assembles functionality through plugin composition. Each plugin encapsulates a feature's routes and receives dependencies through Elysia's derive mechanism.

| Plugin                       | Prefix              | Responsibility                           |
| ---------------------------- | ------------------- | ---------------------------------------- |
| `pages.plugin.ts`            | `/`                 | Homepage, health check                   |
| `applications.plugin.ts`     | `/applications`     | Application CRUD, search, status updates |
| `pipeline.plugin.ts`         | `/api`              | Pipeline data API                        |
| `contacts.plugin.ts`         | `/contacts`         | Contact CRUD                             |
| `interview-stages.plugin.ts` | `/interview-stages` | Interview stage CRUD                     |
| `analytics.plugin.ts`        | `/analytics`        | Analytics dashboard                      |
| `extension-api.plugin.ts`    | `/api/extension`    | Browser extension API                    |
| `dev-tools.plugin.ts`        | `/dev`              | Dev-only DB switching (conditional)      |

### Dependency Injection Through Plugins

Repository plugins (`jobApplicationManager.plugin.ts`, `contactRepository.plugin.ts`, etc.) use Elysia's `.derive()` to inject domain services into the request context. Feature plugins compose these repository plugins via `.use()`:

```
analyticsPlugin
  ├── .use(jobApplicationManagerPlugin)
  ├── .use(contactRepositoryPlugin)
  ├── .use(interviewStageRepositoryPlugin)
  └── .derive() → analyticsAggregator
```

## Security Headers

Applied globally via `onBeforeHandle`:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy`: self + unsafe-inline for scripts/styles + cdn.jsdelivr.net for HTMX

## Related Documentation

- [Project Overview](project-overview-pdr.md) -- product features and roadmap
- [Codebase Summary](codebase-summary.md) -- file inventory and dependencies
- [Code Standards](code-standards.md) -- error handling, validation, and DI patterns
