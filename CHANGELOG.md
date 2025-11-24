# jobapptracker

## 0.3.0

### Minor Changes

- 364854f: Refactor theme management system with modular architecture and bundled theme manager for improved performance and maintainability.
- 364854f: Add import data script for bulk data migration and initialization capabilities.
- 364854f: Add changeset synchronization agent for automated changelog management and git change tracking.

### Patch Changes

- 364854f: Update project dependencies to latest versions including security patches and performance improvements.

## 0.2.1

### Patch Changes

- Fix validation error when sorting by Updated At or Position Title columns. Previously, sorting by these columns would result in a 400 Bad Request error due to a schema mismatch in the validation layer.
- Update project documentation to accurately reflect the current implementation, including web framework (ElysiaJS), database (SQLite), and detailed project structure.

## 0.2.0

### Minor Changes

- Add browser extension for quick job capture from LinkedIn, Indeed, Greenhouse, and Lever job boards
- Add comprehensive analytics dashboard with charts showing application metrics, status distribution, and time-series analysis
- Add bulk operations to delete all applications and generate random test data with configurable quantity
- Add application details page with view and edit modes for comprehensive job application management
- Add enhanced job application fields including source type, remote status, job board tracking, and source notes

### Patch Changes

- ce56315: Add `/sync-changelog` slash command for automated changelog management with changesets integration
- Add development database selector for switching between test and production databases during development
- Add date range filter to analytics dashboard for filtering metrics by time period
