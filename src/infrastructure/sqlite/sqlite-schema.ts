import type { Database } from "bun:sqlite";

/**
 * Applies the full application schema to a SQLite database.
 * Idempotent — all statements use IF NOT EXISTS.
 */
export function initializeSchema(db: Database): void {
	db.run(`
		CREATE TABLE IF NOT EXISTS job_boards
		(
			id          TEXT PRIMARY KEY,
			name        TEXT NOT NULL,
			rootDomain  TEXT NOT NULL,
			domains     TEXT NOT NULL,
			createdAt   TEXT NOT NULL
		)
	`);

	db.run(`
		CREATE TABLE IF NOT EXISTS job_applications
		(
			id              TEXT PRIMARY KEY,
			company         TEXT NOT NULL,
			positionTitle   TEXT NOT NULL,
			applicationDate TEXT NOT NULL,
			interestRating  INTEGER,
			nextEventDate   TEXT,
			jobPostingUrl   TEXT,
			jobDescription  TEXT,
			sourceType      TEXT NOT NULL,
			jobBoardId      TEXT,
			sourceNotes     TEXT,
			isRemote        INTEGER NOT NULL,
			createdAt       TEXT NOT NULL,
			updatedAt       TEXT NOT NULL,
			notes           TEXT NOT NULL,
			statusLog       TEXT NOT NULL,
			FOREIGN KEY (jobBoardId) REFERENCES job_boards(id)
		)
	`);

	db.run(`
		CREATE TABLE IF NOT EXISTS interview_stages
		(
			id               TEXT PRIMARY KEY,
			jobApplicationId TEXT NOT NULL,
			round            INTEGER NOT NULL,
			interviewType    TEXT NOT NULL,
			isFinalRound     INTEGER NOT NULL,
			scheduledDate    TEXT,
			completedDate    TEXT,
			notes            TEXT,
			questions        TEXT NOT NULL,
			createdAt        TEXT NOT NULL,
			updatedAt        TEXT NOT NULL,
			FOREIGN KEY (jobApplicationId) REFERENCES job_applications(id) ON DELETE CASCADE
		)
	`);

	db.run(`
		CREATE TABLE IF NOT EXISTS contacts
		(
			id               TEXT PRIMARY KEY,
			jobApplicationId TEXT NOT NULL,
			contactName      TEXT NOT NULL,
			contactEmail     TEXT,
			linkedInUrl      TEXT,
			role             TEXT,
			channel          TEXT NOT NULL,
			outreachDate     TEXT NOT NULL,
			responseReceived INTEGER NOT NULL,
			notes            TEXT,
			createdAt        TEXT NOT NULL,
			updatedAt        TEXT NOT NULL,
			FOREIGN KEY (jobApplicationId) REFERENCES job_applications(id) ON DELETE CASCADE
		)
	`);

	// Performance indexes
	db.run(`CREATE INDEX IF NOT EXISTS idx_company ON job_applications(company)`);
	db.run(
		`CREATE INDEX IF NOT EXISTS idx_status_category ON job_applications(json_extract(statusLog, '$[#-1][1].category'))`,
	);
	db.run(
		`CREATE INDEX IF NOT EXISTS idx_updated_at ON job_applications(updatedAt DESC)`,
	);
	db.run(
		`CREATE INDEX IF NOT EXISTS idx_interview_stages_job_app ON interview_stages(jobApplicationId)`,
	);
	db.run(
		`CREATE INDEX IF NOT EXISTS idx_contacts_job_app ON contacts(jobApplicationId)`,
	);
	db.run(
		`CREATE INDEX IF NOT EXISTS idx_job_boards_domain ON job_boards(rootDomain)`,
	);

	// Analytics indexes
	db.run(
		`CREATE INDEX IF NOT EXISTS idx_applications_remote ON job_applications(isRemote)`,
	);
	db.run(
		`CREATE INDEX IF NOT EXISTS idx_applications_source ON job_applications(sourceType)`,
	);
	db.run(
		`CREATE INDEX IF NOT EXISTS idx_applications_date_range ON job_applications(applicationDate, updatedAt)`,
	);
	db.run(
		`CREATE INDEX IF NOT EXISTS idx_contacts_channel ON contacts(channel)`,
	);
	db.run(`CREATE INDEX IF NOT EXISTS idx_contacts_role ON contacts(role)`);
	db.run(
		`CREATE INDEX IF NOT EXISTS idx_contacts_response ON contacts(responseReceived, outreachDate)`,
	);
	db.run(
		`CREATE INDEX IF NOT EXISTS idx_interview_type ON interview_stages(interviewType)`,
	);
	db.run(
		`CREATE INDEX IF NOT EXISTS idx_interview_round ON interview_stages(round)`,
	);
	db.run(
		`CREATE INDEX IF NOT EXISTS idx_interview_final ON interview_stages(isFinalRound)`,
	);
}
