# Job Application Tracker

A lightweight, single-user job application tracking system built with TypeScript and Bun. Features customizable pipeline workflows, PDF form filling capabilities, and integrated task management.

## Features

- **Application Management**: Track job applications with custom fields including company, position, status, interest rating, and timestamped notes
- **Customizable Pipeline**: Two-category status system (active/inactive) with configurable workflow stages
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
```

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

## Project Structure

```
src/
├── domain/           # Core business logic
├── application/      # Use cases and application services  
├── presentation/     # Web routes and HTMX templates
└── index.ts         # Application entry point

docs/
└── PRD.md           # Product Requirements Document

tests/               # Test files
```

## Development Status

This project is currently in development. See [docs/PRD.md](./docs/PRD.md) for the complete roadmap and feature specifications.

## License

Private project - not licensed for distribution.
