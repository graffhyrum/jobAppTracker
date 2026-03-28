# API Reference

This document catalogs every HTTP endpoint exposed by the Job Application Tracker server. The server is built with [ElysiaJS](https://elysiajs.com/) on [Bun](https://bun.sh/) and returns **HTML fragments** for HTMX-driven partial updates or **full HTML pages** for browser navigation. The extension API returns JSON.

All route plugins live in `src/application/server/plugins/`. The server is assembled in `src/application/server/startElysiaServer.ts`.

---

## Table of Contents

- [Conventions](#conventions)
- [Pages](#pages)
- [Applications (CRUD)](#applications-crud)
- [Interview Stages](#interview-stages)
- [Contacts](#contacts)
- [Analytics](#analytics)
- [Pipeline](#pipeline)
- [Extension API](#extension-api)
- [Dev Tools](#dev-tools-development-only)
- [Static Assets](#static-assets)
- [Error Handling](#error-handling)
- [HTMX Headers](#htmx-headers)
- [Security Headers](#security-headers)

---

## Conventions

| Convention   | Detail                                                                                                                     |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Content type | All HTML routes set `Content-Type: text/html`. Extension API routes return `application/json`.                             |
| Validation   | Request bodies and query parameters are validated at the boundary with ArkType schemas (see `src/presentation/schemas/`).  |
| Error model  | Domain operations return `Either<Result, Error>` (Effect-TS). Left values produce error HTML or JSON depending on context. |
| ID format    | All entity IDs are UUIDs, validated by `uuidSchema`.                                                                       |

---

## Pages

**Plugin:** `pages.plugin.ts` (no prefix)

| Method | Path      | Description                                      | Response       |
| ------ | --------- | ------------------------------------------------ | -------------- |
| `GET`  | `/`       | Homepage with application form and pipeline view | Full HTML page |
| `GET`  | `/health` | Health check page showing environment info       | Full HTML page |

Both routes read the `devdb` cookie to determine which database (test/prod) to display in the navbar.

---

## Applications (CRUD)

**Plugin:** `applications.plugin.ts` (prefix: `/applications`)

### Read

| Method | Path                             | Description                              | Response                          |
| ------ | -------------------------------- | ---------------------------------------- | --------------------------------- |
| `GET`  | `/applications/:id`              | Single application as a table row        | HTML `<tr>` fragment              |
| `GET`  | `/applications/:id/edit`         | Editable table row for inline editing    | HTML `<tr>` form fragment         |
| `GET`  | `/applications/:id/details`      | Full detail page or content fragment     | Full page or fragment (see below) |
| `GET`  | `/applications/:id/details/edit` | Editable detail fields                   | HTML form fragment                |
| `GET`  | `/applications/search?q=...`     | Search/filter applications by text query | HTML table rows                   |

**Content negotiation on `/applications/:id/details`:**

- Browser navigation (no `HX-Request` header) -- full page with navbar
- HTMX navigation to details (not already on details page) -- full page
- HTMX partial update (already on details page) -- content fragment only

The server inspects `HX-Request` and `HX-Current-URL` headers to decide.

### Create

| Method | Path                        | Description                       | Request Body                              | Response                                                            |
| ------ | --------------------------- | --------------------------------- | ----------------------------------------- | ------------------------------------------------------------------- |
| `POST` | `/applications`             | Create a new application          | `createApplicationBodySchema` (form data) | Updated form + pipeline HTML; `X-Application-ID` header with new ID |
| `POST` | `/applications/generate`    | Generate random test applications | `{ count: string }` (1-100)               | Updated form + pipeline HTML                                        |
| `POST` | `/applications/import-data` | Run data import script            | None                                      | HTML with script tag for page refresh                               |

### Update

| Method | Path                        | Description                            | Request Body                     | Response                     |
| ------ | --------------------------- | -------------------------------------- | -------------------------------- | ---------------------------- |
| `PUT`  | `/applications/:id`         | Update application, return table row   | `jobApplicationModule.forUpdate` | HTML `<tr>` fragment         |
| `PUT`  | `/applications/:id/details` | Update application, return detail view | `jobApplicationModule.forUpdate` | HTML detail content fragment |

Both `PUT` routes run a `transform` hook that preserves the existing `statusLog` from the current application state.

### Delete

| Method   | Path                       | Description               | Response                                                                              |
| -------- | -------------------------- | ------------------------- | ------------------------------------------------------------------------------------- |
| `DELETE` | `/applications/:id`        | Delete single application | Empty HTML comment (`<!-- deleted -->`); `HX-Redirect: /` if called from details page |
| `POST`   | `/applications/delete-all` | Delete all applications   | Updated empty pipeline HTML                                                           |

**Origin guard:** `delete-all` and `import-data` reject requests whose `Origin` header does not start with `http://localhost`.

### Request Schemas

- **`applicationIdParamSchema`**: `{ id: JobAppId }` (UUID)
- **`createApplicationBodySchema`**: `jobApplicationModule.FormForCreate` -- string-typed form fields (company, positionTitle, applicationDate, sourceType, isRemote, etc.)
- **`searchQuerySchema`**: `{ q?: string }`

---

## Interview Stages

**Plugins:** `interview-stages.plugin.ts` (two Elysia instances)

### Application-scoped routes (prefix: `/applications`)

| Method | Path                                     | Description                        | Request Body           | Response                |
| ------ | ---------------------------------------- | ---------------------------------- | ---------------------- | ----------------------- |
| `GET`  | `/applications/:id/interview-stages`     | List all stages for an application | --                     | HTML stage list         |
| `GET`  | `/applications/:id/interview-stages/new` | New interview stage form           | --                     | HTML form               |
| `POST` | `/applications/:id/interview-stages`     | Create interview stage             | `FormData` (see below) | Updated HTML stage list |

### Direct stage routes (no prefix)

| Method   | Path                         | Description            | Request Body | Response                                 |
| -------- | ---------------------------- | ---------------------- | ------------ | ---------------------------------------- |
| `GET`    | `/interview-stages/:id`      | Get single stage card  | --           | HTML card                                |
| `GET`    | `/interview-stages/:id/edit` | Edit form for a stage  | --           | HTML form                                |
| `PUT`    | `/interview-stages/:id`      | Update interview stage | `FormData`   | HTML card                                |
| `DELETE` | `/interview-stages/:id`      | Delete interview stage | --           | Empty string; `HX-Reswap: delete` header |

### FormData Schema

```
{
  round: number (parsed from string),
  interviewType: 'phone screening' | 'technical' | 'behavioral' | 'onsite' | 'panel' | 'other',
  isFinalRound?: boolean,
  scheduledDate?: ISO date string | '',
  completedDate?: ISO date string | '',
  notes?: string,
  questions?: Array<{ title: string, answer?: string }>
}
```

---

## Contacts

**Plugins:** `contacts.plugin.ts` (two Elysia instances)

### Application-scoped routes (prefix: `/applications`)

| Method | Path                             | Description                          | Request Body           | Response                  |
| ------ | -------------------------------- | ------------------------------------ | ---------------------- | ------------------------- |
| `GET`  | `/applications/:id/contacts`     | List all contacts for an application | --                     | HTML contact list         |
| `GET`  | `/applications/:id/contacts/new` | New contact form                     | --                     | HTML form                 |
| `POST` | `/applications/:id/contacts`     | Create contact                       | `FormData` (see below) | Updated HTML contact list |

### Direct contact routes (no prefix)

| Method   | Path                 | Description                                         | Request Body | Response                  |
| -------- | -------------------- | --------------------------------------------------- | ------------ | ------------------------- |
| `GET`    | `/contacts/:id`      | Get contact (returns full list for its application) | --           | HTML contact list         |
| `GET`    | `/contacts/:id/edit` | Edit form for a contact                             | --           | HTML form                 |
| `PUT`    | `/contacts/:id`      | Update contact                                      | `FormData`   | Updated HTML contact list |
| `DELETE` | `/contacts/:id`      | Delete contact                                      | --           | Updated HTML contact list |

### FormData Schema

```
{
  contactName: string (non-empty),
  contactEmail?: email | '',
  linkedInUrl?: URL | '',
  role?: 'recruiter' | 'hiring manager' | 'employee' | 'referral' | 'other' | '',
  channel: 'email' | 'linkedin' | 'phone' | 'referral' | 'other',
  outreachDate: ISO date string,
  responseReceived?: boolean,
  notes?: string
}
```

---

## Analytics

**Plugin:** `analytics.plugin.ts` (no prefix)

| Method | Path         | Description                                 | Query Params                                 | Response       |
| ------ | ------------ | ------------------------------------------- | -------------------------------------------- | -------------- |
| `GET`  | `/analytics` | Analytics dashboard with charts and metrics | `startDate?: ISO date`, `endDate?: ISO date` | Full HTML page |

The analytics aggregator computes metrics across applications, contacts, and interview stages. Date range filtering is optional.

---

## Pipeline

**Plugin:** `pipeline.plugin.ts` (prefix: `/api`)

| Method | Path            | Description             | Query Params                    | Response               |
| ------ | --------------- | ----------------------- | ------------------------------- | ---------------------- |
| `GET`  | `/api/pipeline` | Sortable pipeline table | `sortColumn?`, `sortDirection?` | HTML pipeline fragment |

### Query Parameters

- **`sortColumn`**: `'company' | 'positionTitle' | 'applicationDate' | 'status' | 'interestRating' | 'nextEventDate' | 'updatedAt'`
- **`sortDirection`**: `'asc' | 'desc'`

---

## Extension API

**Plugin:** `extension-api.plugin.ts` (prefix: `/api`)

### Public Endpoints

| Method    | Path                               | Description      | Response                              |
| --------- | ---------------------------------- | ---------------- | ------------------------------------- |
| `GET`     | `/api/health`                      | API health check | JSON `{ status, service, timestamp }` |
| `OPTIONS` | `/api/applications/from-extension` | CORS preflight   | Empty (204) with CORS headers         |

### Authenticated Endpoints

| Method | Path                               | Description                               | Request Body     | Response                                 |
| ------ | ---------------------------------- | ----------------------------------------- | ---------------- | ---------------------------------------- |
| `POST` | `/api/applications/from-extension` | Create application from browser extension | JSON (see below) | JSON `{ success, id, message }` or error |

### Authentication

The extension API uses **HMAC-based API key authentication**:

1. Client sends the key in the `X-API-Key` header.
2. Server reads `BROWSER_EXTENSION_API_KEY` from environment.
3. Validation uses `crypto.createHmac` + `timingSafeEqual` for constant-time comparison.
4. If `BROWSER_EXTENSION_API_KEY` is not set, the API returns `503 Service Unavailable`.
5. Invalid or missing key returns `401 Unauthorized`.

### CORS

The extension API accepts requests from browser extension origins:

- `chrome-extension://*`
- `moz-extension://*`

CORS headers set:

- `Access-Control-Allow-Origin`: the requesting extension origin
- `Access-Control-Allow-Methods`: `GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers`: `Content-Type, X-API-Key`
- `Access-Control-Max-Age`: `86400` (24 hours)

### Request Body

```json
{
	"company": "string (required)",
	"position": "string (required)",
	"applicationDate": "Date | string (optional)",
	"interestRating": "number (optional)",
	"jobPostingUrl": "string (optional)",
	"jobDescription": "string (optional)"
}
```

Applications are always created with `"applied"` status. The `position` field maps to `positionTitle` internally.

### Response Codes

| Status | Meaning                                        |
| ------ | ---------------------------------------------- |
| `201`  | Application created successfully               |
| `400`  | Validation error (ArkType schema failure)      |
| `401`  | Invalid or missing API key                     |
| `500`  | Creation failed or internal error              |
| `503`  | Extension API disabled (no API key configured) |

---

## Dev Tools (Development Only)

**Plugin:** `dev-tools.plugin.ts` (prefix: `/dev`)

Only registered when `isDevelopment()` returns `true`.

| Method | Path             | Description                            | Request Body                        | Response                                                                 |
| ------ | ---------------- | -------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------ |
| `POST` | `/dev/switch-db` | Switch between test and prod databases | `{ environment: "test" \| "prod" }` | JSON `{ success, currentEnvironment, message }`; sets `HX-Refresh: true` |
| `GET`  | `/dev/status`    | Current database environment           | --                                  | JSON `{ currentEnvironment, isDevelopment }`                             |

Database selection is persisted in a cookie (`devdb`) and read per-request by `jobApplicationManagerPlugin`.

---

## Static Assets

Configured via `@elysiajs/static`:

| URL Prefix  | Filesystem Path             | Content                                               |
| ----------- | --------------------------- | ----------------------------------------------------- |
| `/styles/`  | `src/presentation/styles/`  | CSS stylesheets                                       |
| `/scripts/` | `src/presentation/scripts/` | Bundled JS (`feature-flags.js`, `pipeline-client.js`) |
| `/assets/`  | `src/presentation/assets/`  | Images and other static files                         |

### Additional Static Routes

| Method | Path                                                | Description                              |
| ------ | --------------------------------------------------- | ---------------------------------------- |
| `GET`  | `/.well-known/appspecific/com.chrome.devtools.json` | Chrome DevTools workspace auto-detection |

---

## Error Handling

The server uses a global `onError` handler in `startElysiaServer.ts`. Error responses vary by error code and request type.

| Error Code   | HTTP Status | Behavior                                                                                   |
| ------------ | ----------- | ------------------------------------------------------------------------------------------ |
| `NOT_FOUND`  | 404         | JSON `{ message, request }`                                                                |
| `VALIDATION` | 400         | HTML `<div class="error-message">` for HTMX requests; JSON `{ error, message }` for others |
| `PARSE`      | 400         | Plain text error                                                                           |
| Other        | 500         | Plain text `Internal Server Error: ...`                                                    |

---

## HTMX Headers

The server uses these HTMX response headers:

| Header           | Usage                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------- |
| `HX-Request`     | Read from request to detect HTMX-initiated calls (value: `"true"`)                       |
| `HX-Current-URL` | Read from request for content negotiation on detail pages                                |
| `HX-Redirect`    | Set on response to trigger client-side redirect (e.g., after deleting from details page) |
| `HX-Refresh`     | Set to `"true"` to trigger full page refresh (used by dev tools DB switch)               |
| `HX-Reswap`      | Set to `"delete"` to remove the target element (used by interview stage deletion)        |

---

## Security Headers

Applied globally via `onBeforeHandle`:

| Header                    | Value                                                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `X-Content-Type-Options`  | `nosniff`                                                                                                                                                    |
| `X-Frame-Options`         | `DENY`                                                                                                                                                       |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'` |

---

## Swagger / OpenAPI

Available at `/swagger` when the server is running. Configured with `@elysiajs/swagger` in `startElysiaServer.ts`.

Tags: `Applications`, `Pipeline`, `Pages`.
