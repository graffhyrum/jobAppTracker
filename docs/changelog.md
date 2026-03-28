# Changelog

All notable changes to this project are documented in this file. Grouped by type following conventional commit conventions.

## [Unreleased]

### Security

- **XSS hardening across all HTML templates** -- adopted `escapeHtml` in page templates, pipeline view, interview stage list, contact list, and application details renderer (commits `c132d3b`..`db5a640`)
- **Escape script tag content** -- wrap `JSON.stringify` output in `escapeScriptContent` to prevent injection via embedded data (`622391a`)
- **Replace HX-Request header check with origin guard** -- prevents cross-origin HTMX request forgery (`622391a`)
- **Timing-safe API key comparison** -- use HMAC comparison to prevent key-length timing oracle on browser extension auth (`8127e71`, `a0769c1`)
- **Security response headers** -- add CSP, X-Frame-Options, X-Content-Type-Options headers (`ed947d7`)
- **CSP script-src update** -- add `cdn.jsdelivr.net` so HTMX loads correctly (`2017db4`)
- **HTMX auth guard** -- protect delete-all and import-data routes with HTMX authentication check (`d414950`)
- **Validate date query params** -- use ArkType to validate `startDate`/`endDate` on analytics routes (`c9cb636`)

### Bug Fixes

- **interestRating 0 handling** -- allow `interestRating: 0` in route helper includes check; `formatInterestRating(0)` now returns triple-empty-star instead of empty string (`1c1fb3a`, `9422a5a`, `7cfb0eb`)
- **Interview stage cancel** -- cancel action returns single card instead of full list (`b21dd4c`)
- **Stage card id** -- add `id` attribute to stage card; fix PUT/DELETE to return single card or delete swap (`e578665`)
- **DELETE empty response** -- fix empty response handling on delete operations (`d414950`)
- **Dead double validation** -- remove redundant validation in analytics handler (`932db3f`, `5ff3b06`)
- **UUID schema and branded type** -- lift UUID schema to module level, extract `resolveSourceType`, fix branded type mismatch (`467b41d`, `330e3af`)
- **Dead code removal** -- remove dotenv import, unused assert function, unused variable (`7bf90a9`)
- **Council remediation** -- fix `escapeScriptContent`, origin guard, HMAC comparison, `resolveSourceType`, stage card id (`fed6812`)
- **Dead ternary and silent failure** -- remove dead ternary, fix silent failure in predicate, remove dead predicate (`75230f7`)
- **Dead function and Effect import** -- delete dead function, fix Effect import path, XSS in error messages (`3eb64b4`)
- **Plugin HTML escaping** -- escape `.left.detail` across all plugin HTML responses (`cc0b5e0`)

### Refactoring

- **Analytics math extraction** -- extract `computeMedian`, `computeAverage`, `computeSuccessRate` to `analytics-math.ts` (`0459e75`)
- **Analytics utils extraction** -- extract `filterByAppIds`, `resolveEffectiveDateRange` to `analytics-utils.ts` (`7e788a8`)
- **Analytics status resolution** -- extract `getResolvedStatus` to `analytics-utils.ts` (`7d448ef`)
- **Shared test fixtures** -- extract shared test fixture builders to `tests/helpers/analytics-fixtures.ts` (`19d7936`)
- **Domain layer move** -- move `createApplicationStatus` to domain layer (`af9cdd2`)
- **Import rearrangement** -- rearrange imports, simplify `safeHref` and `escapeHtml` usage (`e2dffdb`)
- **Route helper simplification** -- extract helpers, fix defaults in application route helpers (`d02acf3`)
- **computeAverage reuse** -- use shared `computeAverage` in analytics-contacts (`ef2cdbb`)

### Documentation

- **Analytics duplication inventory** -- spike documenting analytics code duplication across modules (`02eabf0`)
- **Post-mortem distillation** -- distill 7 post-mortems into 10 cm rules (`b40d2fc`)

### Chores

- **Beads sync** -- close epic and multiple beads across security, bug fix, and refactor sessions (`1019859`, `096ed9e`, `d0d8d0a`, `3348983`, `760b821`)
- **Config cleanup** -- remove local Claude settings file, update .gitignore (`f9f2334`)
- **Distillation cleanup** -- remove 7 distilled post-mortems (`40a05eb`)
