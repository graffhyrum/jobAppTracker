Feature Expansion Plan: 3 Targeted Additions

1. Interview Stages Entity (High Value)

   New domain entity: InterviewStage
   {
   id: UUID
   jobApplicationId: UUID (foreign key)
   round: number
   interviewType: 'phone screening' | 'technical' | 'behavioral' | 'onsite' | 'panel' | 'other'
   isFinalRound: boolean
   scheduledDate?: ISO date
   completedDate?: ISO date
   notes?: string
   questions: Question[] // [{id, title, answer?}]
   createdAt: ISO date
   updatedAt: ISO date
   }

   Changes:
    - Create src/domain/entities/interview-stage.ts with ArkType schemas
    - Add stages: InterviewStage[] to JobApplication entity
    - Create port InterviewStageRepository
    - Update SQLite schema: new interview_stages table with a foreign key
    - UI: Add stage management to the application details page

2. Contacts/Networking Entity

   New domain entity: Contact
   {
   id: UUID
   jobApplicationId: UUID (foreign key)
   contactName: string
   contactEmail?: string
   linkedInUrl?: string
   role?: string // 'recruiter' | 'hiring manager' | 'employee' | 'referral'
   channel: 'email' | 'LinkedIn' | 'phone' | 'referral' | 'other'
   outreachDate: ISO date
   responseReceived: boolean
   notes?: string
   createdAt: ISO date
   updatedAt: ISO date
   }

   Changes:
    - Create src/domain/entities/contact.ts with ArkType schemas
    - Add contacts: Contact[] to JobApplication entity
    - Create port ContactRepository
    - Update SQLite schema: new contacts table with a foreign key
    - UI: Add the contact management section to application details

3. Job Source/Board Tracking

   New domain entities: JobBoard & source field
   JobBoard {
   id: UUID
   name: string
   rootDomain: string
   domains: string[] // for matching
   createdAt: ISO date
   }

   // Add to JobApplication:
   {
   sourceType: 'job_board' | 'referral' | 'company_website' | 'recruiter' | 'networking' |
   'other'
   jobBoardId?: UUID (if sourceType === 'job_board')
   sourceNotes?: string
   isRemote: boolean
   }

   Changes:
    - Create src/domain/entities/job-board.ts with ArkType schemas
    - Add source fields to JobApplication base props
    - Create port JobBoardRepository
    - Update SQLite schema: new job_boards table and source fields in job_applications
    - Seed common job boards (LinkedIn, Indeed, Glassdoor, etc.)
    - UI: Add source dropdown in create/edit forms, remote checkbox

   Database Migration Strategy

   Since backward compatibility isn't required:
    1. Drop existing SQLite database files
    2. Create a new schema with three new tables:
       - interview_stages (1:many with job_applications)
       - contacts (1:many with job_applications)
       - job_boards (many: 1 with job_applications)
    3. Add new columns to the job_applications table
    4. Create indexes for foreign keys and common queries

   Implementation Order

    1. Domain layer: Create new entities with ArkType schemas and factory functions
    2. Ports: Define repository interfaces for new entities
    3. Infrastructure: Update SQLite schema + implement adapters
    4. Application: Update JobApplicationManager to handle relations
    5. Presentation: Enhance UI to capture/display new data

   Testing Strategy

    - Unit tests for each new entity (factory functions, validation)
    - Integration tests for repositories (in-memory and SQLite adapters)
    - E2E tests for UI interactions with new features

   Estimated effort: Medium - 3 new entities, DB schema changes, UI updates across ~15–20 files

