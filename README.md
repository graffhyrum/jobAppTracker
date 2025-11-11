# Job Application Tracker

A lightweight, single-user job application tracking system built with TypeScript and Bun. Features customizable pipeline workflows, PDF form filling capabilities, and integrated task management.

## Features

- **Application Management**: Track job applications with custom fields including company, position, status, interest rating, and timestamped notes
- **Customizable Pipeline**: Two-category status system (active/inactive) with configurable workflow stages
- **Browser Extension**: Quick-capture job postings from LinkedIn, Indeed, Greenhouse, Lever and other job boards
- **PDF Integration**: Fill PDF forms automatically using application data with extensible template system
- **Task Management**: Dashboard with due/overdue items and integrated todo functionality
- **Standalone Executable**: Compiles to a single executable file for easy distribution

## Architecture

Built using hexagonal architecture principles with clean separation of concerns:
- **Domain Layer**: Core business logic and entities
- **Application Layer**: Use cases and API routes
- **Infrastructure Layer**: Database, PDF processing, file system
- **Presentation Layer**: HTMX-powered web interface

See [docs/PRD.md](./docs/PRD.md) for detailed requirements and architecture diagrams.

## Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **Database**: SQLite (using Bun's built-in driver)
- **Web Framework**: Bun.serve with HTMX
- **Validation**: ArkType
- **Error Handling**: NeverThrow
- **PDF Processing**: PDF-lib

## Getting Started

### Prerequisites
- [Bun](https://bun.sh/) v1.2.21 or later

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd jobAppTracker

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration (see Environment Variables section)
```

### Environment Variables

The following environment variables are required:

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `BASE_URL` | string | Base URL for the application | `http://localhost` |
| `PORT` | number | Port number for the server | `3000` |
| `JOB_APP_MANAGER_TYPE` | `"prod" \| "test"` | **Required**. Storage backend type:<br/>- `"prod"`: File-based SQLite database (production)<br/>- `"test"`: In-memory SQLite database (testing) | `"prod"` |
| `BROWSER_EXTENSION_API_KEY` | string | API key for browser extension authentication | `dev-api-key` |

### Development

```bash
# Run in development mode
bun dev

# Run tests
bun test

# Build for production
bun build
```

### Usage

1. Start the application: `bun run src/index.ts`
2. Open your browser to the host and port defined in `.env`
3. Begin tracking your job applications!

## Browser Extension

A companion browser extension allows you to quickly capture job postings from job boards and save them directly to your tracker.

### Quick Start

1. **Configure API Key**: Set `BROWSER_EXTENSION_API_KEY` in your `.env` file
2. **Install Extension**:
   - Chrome/Edge: Load `extension/` folder as unpacked extension
   - Firefox: Load `extension/manifest.json` as temporary add-on
3. **Configure Extension**: Click extension icon → Settings
   - API URL: `http://localhost:3000`
   - API Key: Same as your `.env` file
4. **Use**: Visit any job posting and click the extension icon!

### Supported Sites

- LinkedIn Jobs
- Indeed
- Greenhouse
- Lever
- Generic fallback for other sites

For detailed installation and usage instructions, see [extension/README.md](extension/README.md).

## Project Structure

```
src/
├── domain/           # Core business logic
├── application/      # Use cases and application services
├── presentation/     # Web routes and HTMX templates
└── index.ts         # Application entry point

extension/           # Browser extension for quick job capture
├── manifest.json    # Extension configuration
├── content/         # Page data extraction scripts
├── popup/           # Extension popup UI
├── options/         # Settings page
└── background/      # Background service worker

docs/
└── PRD.md           # Product Requirements Document

tests/               # Test files
```

## Development Status

This project is currently in development. See [docs/PRD.md](./docs/PRD.md) for the complete roadmap and feature specifications.

## License

Private project - not licensed for distribution.
