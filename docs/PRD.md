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
- **Data Persistence**: Local SQLite database using `bun:sqlite`

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
- **Database**: SurrealDB (multi-model database)
- **Web Framework**: Bun.serve with HTMX frontend
- **Validation**: ArkType
- **Error Handling**: NeverThrow
- **PDF Processing**: PDF-lib

### [Architecture Overview](architecture.mermaid)


### [Data Model](dataModel.mermaid)


### [PDF Form System Architecture](pdfFiller.mermaid)


### Use Cases Architecture


## Data Model Details

### Type Definitions
```typescript
type StatusCategory = 'active' | 'inactive'

type ActiveStatus = 'applied' | 'screening interview' | 'interview' | 'onsite' | 'online test' | 'take-home assignment' | 'offer'
type InactiveStatus = 'rejected' | 'no response' | 'no longer interested' | 'hiring freeze'

type ApplicationStatus = ActiveStatus | InactiveStatus

type Note = {
  id: string
  content: string
  createdAt: Date
  updatedAt: Date
}

type JobApplication = {
  id: string
  company: string
  position: string
  applicationDate: Date
  statusCategory: StatusCategory
  status: ApplicationStatus
  interestRating: 1 | 2 | 3
  nextEventDate?: Date
  lastUpdated: Date // auto-calculated
  jobPostingUrl?: string
  jobDescription?: string
  notes: Note[]
}

type PipelineConfig = {
  active: string[]
  inactive: string[]
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
- [ ] Create, edit, delete job applications
- [ ] Track applications through customizable pipeline
- [ ] Generate filled PDF forms from application data
- [ ] Display due/overdue tasks on dashboard
- [ ] Add and edit timestamped notes
- [ ] Customize pipeline statuses

### Non-Functional Requirements
- [ ] Compiles to standalone executable
- [ ] SQLite database for data persistence
- [ ] Responsive web interface
- [ ] Fast application startup (<2 seconds)
- [ ] Reliable PDF generation
- [ ] Clean, maintainable codebase following SOLID principles

## Technical Constraints

- Single-user application (no authentication required)
- Uses Bun runtime and built-in APIs where possible
- SurrealDB for multi-model data storage with graph capabilities
- Minimal external dependencies beyond core stack
- Follows hexagonal architecture patterns
- Uses ArkType for validation and NeverThrow for error handling
- HTMX for dynamic frontend interactions
