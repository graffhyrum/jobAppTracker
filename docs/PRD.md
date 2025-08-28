# Job Application Tracker - Product Requirements Document

## Product Overview
A single-user, lightweight job application tracking system built with TypeScript and Bun, featuring customizable pipeline workflows, PDF form filling, and integrated task management. Compiles to a standalone executable.

## Core Features

### 1. Application Data Management
- **CRUD Operations**: Create, read, update, delete job applications
- **Core Fields**: Company name, position title, application date, status category, status
- **Extended Fields**:
  - Interest rating (1-3 scale)
  - Next event date
  - Job posting URL
  - Job description (text)
  - Timestamped, mutable notes list
  - Last updated timestamp (auto-calculated)
- **Data Persistence**: JSON flat files using Bun.file I/O with hexagonal architecture.

### 2. Customizable Pipeline Workflow
- **Status Categories**: 
  - `active`: ['applied', 'screening interview', 'interview', 'onsite', 'online test', 'take-home assignment', 'offer']
  - `inactive`: ['rejected', 'no response', 'no longer interested', 'hiring freeze']
- **Pipeline Customization**: Admin interface to modify status lists
- **Status Transitions**: Move applications between statuses with automatic timestamp tracking

### 3. PDF Form Integration (Open-Closed Design)
- **Generic Interface**: Extensible for different PDF form types
- **Field Mapping**: Configure which application fields map to PDF form fields
- **Template Management**: Store and manage PDF templates with their field mappings

### 4. Integrated Task Management & Dashboard
- **Dashboard View**: 
  - Applications by status (active vs inactive)
  - Due/overdue items prominently displayed on load
  - Quick stats and recent activity
- **Task List Integration**: 
  - Next event dates become todo items
  - Overdue follow-ups highlighted
  - Quick actions from dashboard

### 5. Nice-to-Have Features
- **Import/Export**: CSV/JSON import and export functionality
- **Bulk Operations**: Multi-select for status updates
- **Search & Filtering**: Advanced filtering by multiple criteria

## Technical Architecture

### Stack
- **Runtime**: Bun
- **Language**: TypeScript
- **Storage**: Flat file and Bun file I/O
- **Web Framework**: Bun.serve with HTMX frontend
- **Validation**: ArkType
- **Error Handling**: NeverThrow
- **PDF Processing**: PDF-lib

### [Architecture Overview](architecture.mermaid)


### [Data Model](dataModel.mermaid)


### [PDF Form System Architecture](pdfFiller.mermaid)



## Data Model Details

### Type Definitions
```typescript
type StatusCategory = 'active' | 'inactive'

type ActiveStatus = 'applied' | 'screening interview' | 'interview' | 'onsite' | 'online test' | 'take-home assignment' | 'offer'
type InactiveStatus = 'rejected' | 'no response' | 'no longer interested' | 'hiring freeze'

type ApplicationStatus = {
  category: StatusCategory
  current: ActiveStatus | InactiveStatus
  note?: string
}

type Note = {
  id: string
  content: string
  createdAt: string // ISO date string
  updatedAt: string // ISO date string
}

type NotesCollection = {
  notes: Record<string, Omit<Note, 'id'>>
  operations: {
    get(id: string): Result<Note, Error>
    getAll(): Result<Note[], Error>
    add(data: { content: string }): Result<Note, Error>
    update(id: string, data: { content?: string }): Result<Note, Error>
    remove(id: string): Result<void, Error>
  }
}

type JobApplication = {
  id: string // UUID v7
  company: string
  positionTitle: string
  applicationDate: string // ISO date string
  createdAt: string // ISO date string
  updatedAt: string // ISO date string
  interestRating?: 1 | 2 | 3
  nextEventDate?: string // ISO date string
  jobPostingUrl?: string
  jobDescription?: string
  statusLog: Record<string, ApplicationStatus> // timestamp -> status
  notes: NotesCollection
  // Operations
  update(newVals: Partial<JobApplication>): void
  newStatus(status: ApplicationStatus): void
}

type PipelineConfig = {
  active: string[]
  inactive: string[]
  addActiveStatus: (status: string) => void
  addInactiveStatus: (status: string) => void
  removeStatus: (status: string) => void
  toJSON: () => { active: string[], inactive: string[] }
}

type PDFTemplate = {
  id: string
  name: string
  filePath: string
  fieldMappings: Record<keyof JobApplication, string>
  createdAt: Date
}

type PDFFieldInfo = {
  fieldName: string
  fieldType: 'text' | 'checkbox' | 'date'
  required: boolean
}
```

### PDF Form Interface
```typescript
interface PDFFormFiller {
  fillForm(application: JobApplication, template: PDFTemplate): ResultAsync<Buffer, PDFError>
  validateTemplate(templatePath: string): Result<PDFFieldInfo[], PDFError>
}
```

## Development Phases

### Phase 1: Core Application Management
1. Database setup and models
2. Basic CRUD operations
3. Status management system
4. Simple web interface

### Phase 2: Enhanced UI & Task Management
1. Dashboard with due/overdue items
2. Notes system
3. Pipeline customization interface
4. Advanced filtering

### Phase 3: PDF Integration
1. PDF form interface design
2. Template management
3. Field mapping configuration
4. Form generation

### Phase 4: Polish & Distribution
1. Executable compilation setup
2. Import/export features
3. Performance optimization
4. User experience refinements

## Success Criteria

### Functional Requirements
- [x] Create, edit, delete job applications
- [x] Track applications through customizable pipeline
- [x] Add and edit timestamped notes
- [x] Customize pipeline statuses
- [x] Enhanced JobApplication entity with behavior methods (isOverdue, getCurrentStatus)
- [x] Repository interfaces with JSON and in-memory implementations
- [x] Use cases for CRUD operations and pipeline management
- [ ] Generate filled PDF forms from application data
- [ ] Display due/overdue tasks on dashboard

### Non-Functional Requirements
- [ ] Compiles to standalone executable
- [x] JSON file-based data persistence with hexagonal architecture
- [x] Clean, maintainable codebase following SOLID principles
- [x] Comprehensive test suite (88 tests, >93% coverage)
- [x] Dependency inversion with typed holes (ports & adapters)
- [ ] Responsive web interface
- [ ] Fast application startup (<2 seconds)
- [ ] Reliable PDF generation

## Technical Constraints

- Single-user application (no authentication required)
- Uses Bun runtime and built-in APIs where possible
- JSON flat files with Bun.file I/O for data persistence
- Minimal external dependencies beyond core stack
- Follows hexagonal architecture patterns with dependency inversion
- Uses ArkType for validation and NeverThrow for error handling
- HTMX for dynamic frontend interactions (planned)
- Comprehensive test coverage with both unit and integration tests

## Implementation Status

### Phase 1: Core Application Management ✅ COMPLETED
✅ **Storage Layer Implementation**:
- Hexagonal architecture with dependency inversion using typed holes (ports & adapters)
- `JobApplicationRepository` and `PipelineConfigRepository` interfaces
- JSON file implementations using Bun.file I/O
- In-memory implementations for testing
- Comprehensive serialization/deserialization handling

✅ **Enhanced Domain Entities**:
- `JobApplication` entity with rich behavior methods:
  - `isOverdue()`: Check if next event date has passed
  - `getCurrentStatus()`: Get latest status from status log
  - `update()`: Update application properties with automatic timestamp tracking
  - `newStatus()`: Add new status with automatic timestamp
- `PipelineConfig` entity with customizable status management
- `NotesCollection` with CRUD operations

✅ **Use Cases & Application Layer**:
- `JobApplicationUseCases`: Complete CRUD operations, filtering, status management
- `PipelineConfigUseCases`: Pipeline customization and persistence
- Error handling with NeverThrow Result types
- Input validation with ArkType schemas

✅ **Comprehensive Testing**:
- 88 tests with >93% code coverage
- Unit tests for all entities, repositories, and use cases
- Integration tests for pipeline and job application interactions
- Both JSON file and in-memory repository implementations tested

### Next Phases: 
- **Phase 2**: Enhanced UI & Task Management (dashboard, filtering interface)
- **Phase 3**: PDF Integration (form filling, template management)  
- **Phase 4**: Polish & Distribution (executable compilation, import/export)
