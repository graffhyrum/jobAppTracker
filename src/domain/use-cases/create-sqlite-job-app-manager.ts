import { Database } from "bun:sqlite";
import { ArkErrors } from "arktype";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import {
	type ProcessEnvSchema,
	processEnv,
} from "../../../processEnvFacade.ts";
import { createSQLiteJobBoardRepository } from "../../infrastructure/adapters/sqlite-job-board-repository.ts";
import { getDatabasePath } from "../../infrastructure/config/sqlite-config.ts";
import { uuidProvider } from "../../infrastructure/di/uuid-provider.ts";
import type { ForUpdate } from "../../infrastructure/storage/storage-provider-interface.ts";
import {
	createJobApplicationWithInitialStatus,
	type JobApplication,
	type JobApplicationForCreate,
	jobApplicationModule,
} from "../entities/job-application.ts";
import type { UUID } from "../entities/uuid.ts";
import type { JobApplicationManager } from "../ports/job-application-manager.ts";

export function createSQLiteJobAppManager(
	environment: ProcessEnvSchema["JOB_APP_MANAGER_TYPE"] = "test",
): JobApplicationManager {
	const db = SQLiteConnection.getInstance(environment);

	return {
		createJobApplication: (
			data: JobApplicationForCreate,
		): ResultAsync<JobApplication, string> => {
			const app = createJobApplicationWithInitialStatus(
				data,
				uuidProvider.generateUUID,
			);

			return ResultAsync.fromPromise(
				db.withConnection(async (database) => {
					const query = database.prepare(`
                        INSERT INTO job_applications (id, company, positionTitle, applicationDate, interestRating,
                                                      nextEventDate, jobPostingUrl, jobDescription,
                                                      sourceType, jobBoardId, sourceNotes, isRemote,
                                                      createdAt, updatedAt, notes, statusLog)
                        VALUES ($id, $company, $positionTitle, $applicationDate, $interestRating,
                                $nextEventDate, $jobPostingUrl, $jobDescription,
                                $sourceType, $jobBoardId, $sourceNotes, $isRemote,
                                $createdAt, $updatedAt, $notes, $statusLog)
                    `);

					query.run({
						$id: app.id,
						$company: app.company,
						$positionTitle: app.positionTitle,
						$applicationDate: app.applicationDate,
						$interestRating: app.interestRating ?? null,
						$nextEventDate: app.nextEventDate ?? null,
						$jobPostingUrl: app.jobPostingUrl ?? null,
						$jobDescription: app.jobDescription ?? null,
						$sourceType: app.sourceType,
						$jobBoardId: app.jobBoardId ?? null,
						$sourceNotes: app.sourceNotes ?? null,
						$isRemote: app.isRemote ? 1 : 0,
						$createdAt: app.createdAt,
						$updatedAt: app.updatedAt,
						$notes: JSON.stringify(app.notes),
						$statusLog: JSON.stringify(app.statusLog),
					});

					return app;
				}),
				(err) => `Failed to create Job Application: ${err}`,
			).andThen(parseJobApplication);
		},

		getJobApplication: (id: UUID): ResultAsync<JobApplication, string> => {
			return ResultAsync.fromPromise(
				db.withConnection(async (database) => {
					const query = database.prepare(
						"SELECT * FROM job_applications WHERE id = $id",
					);
					const result = query.get({ $id: id });
					if (!result) {
						throw new Error(`Job Application with id ${id} not found`);
					}
					return result;
				}),
				(err) => `Failed to query Job Application: ${err}`,
			).andThen(parseJobApplication);
		},

		getAllJobApplications: (): ResultAsync<JobApplication[], string> => {
			return ResultAsync.fromPromise(
				db.withConnection(async (database) => {
					const query = database.prepare("SELECT * FROM job_applications");
					return query.all();
				}),
				(err) => `Failed to query Job Applications: ${err}`,
			).andThen(parseJobAppArray);
		},

		updateJobApplication: (
			id: UUID,
			data: ForUpdate<JobApplication>,
		): ResultAsync<JobApplication, string> => {
			return ResultAsync.fromPromise(
				db.withConnection(async (database) => {
					// First, get the current application
					const getQuery = database.prepare(
						"SELECT * FROM job_applications WHERE id = $id",
					);
					const current = getQuery.get({ $id: id });
					if (!current) {
						throw new Error(`Job Application with id ${id} not found`);
					}

					// Normalize current record
					const normalized = normalizeSQLiteRow(current) as Record<
						string,
						unknown
					>;

					// Merge with updates
					const updated = {
						...normalized,
						...data,
						updatedAt: new Date().toISOString(),
					} as Record<string, unknown>;

					// Update in database
					const updateQuery = database.prepare(`
                        UPDATE job_applications
                        SET company         = $company,
                            positionTitle   = $positionTitle,
                            applicationDate = $applicationDate,
                            interestRating  = $interestRating,
                            nextEventDate   = $nextEventDate,
                            jobPostingUrl   = $jobPostingUrl,
                            jobDescription  = $jobDescription,
                            sourceType      = $sourceType,
                            jobBoardId      = $jobBoardId,
                            sourceNotes     = $sourceNotes,
                            isRemote        = $isRemote,
                            updatedAt       = $updatedAt,
                            notes           = $notes,
                            statusLog       = $statusLog
                        WHERE id = $id
                    `);

					updateQuery.run({
						$id: id,
						$company: updated.company as string,
						$positionTitle: updated.positionTitle as string,
						$applicationDate: updated.applicationDate as string,
						$interestRating:
							(updated.interestRating as number | undefined) ?? null,
						$nextEventDate:
							(updated.nextEventDate as string | undefined) ?? null,
						$jobPostingUrl:
							(updated.jobPostingUrl as string | undefined) ?? null,
						$jobDescription:
							(updated.jobDescription as string | undefined) ?? null,
						$sourceType: updated.sourceType as string,
						$jobBoardId: (updated.jobBoardId as string | undefined) ?? null,
						$sourceNotes: (updated.sourceNotes as string | undefined) ?? null,
						$isRemote: (updated.isRemote as boolean) ? 1 : 0,
						$updatedAt: updated.updatedAt as string,
						$notes:
							typeof updated.notes === "string"
								? updated.notes
								: JSON.stringify(updated.notes),
						$statusLog:
							typeof updated.statusLog === "string"
								? updated.statusLog
								: JSON.stringify(updated.statusLog),
					});

					return updated;
				}),
				(err) => `Failed to update Job Application: ${err}`,
			).andThen(parseJobApplication);
		},

		deleteJobApplication: (id: UUID): ResultAsync<void, string> => {
			return ResultAsync.fromPromise(
				db.withConnection(async (database) => {
					const query = database.prepare(
						"DELETE FROM job_applications WHERE id = $id",
					);
					query.run({ $id: id });
					return undefined;
				}),
				(err) => `Failed to delete Job Application: ${err}`,
			);
		},

		getActiveJobApplications: (): ResultAsync<JobApplication[], string> => {
			return ResultAsync.fromPromise(
				db.withConnection(async (database) => {
					const query = database.prepare(`
                        SELECT *
                        FROM job_applications
                        WHERE json_extract(statusLog, '$[#-1][1].category') = 'active'
                    `);
					return query.all();
				}),
				(err) => `Failed to query Job Applications: ${err}`,
			).andThen(parseJobAppArray);
		},

		getInactiveJobApplications: (): ResultAsync<JobApplication[], string> => {
			return ResultAsync.fromPromise(
				db.withConnection(async (database) => {
					const query = database.prepare(`
                        SELECT *
                        FROM job_applications
                        WHERE json_extract(statusLog, '$[#-1][1].category') = 'inactive'
                    `);
					return query.all();
				}),
				(err) => `Failed to query Job Applications: ${err}`,
			).andThen(parseJobAppArray);
		},

		clearAllJobApplications: (): ResultAsync<void, string> => {
			return ResultAsync.fromPromise(
				db.withConnection(async (database) => {
					const query = database.prepare("DELETE FROM job_applications");
					query.run();
					return undefined;
				}),
				(err) => `Failed to clear all job applications: ${err}`,
			);
		},
	};

	function parseJobAppArray(maybeArray: unknown) {
		// Parse JSON fields in each row
		const normalizedArray = Array.isArray(maybeArray)
			? maybeArray.map(normalizeSQLiteRow)
			: maybeArray;

		const parsedResult = jobApplicationModule.JobApp.array()(normalizedArray);
		if (parsedResult instanceof ArkErrors) {
			return errAsync(JSON.stringify(parsedResult, null, 2));
		} else {
			return okAsync(parsedResult);
		}
	}

	function parseJobApplication(maybeRecord: unknown) {
		const normalized = normalizeSQLiteRow(maybeRecord);
		const parseResult = jobApplicationModule.JobApp(normalized);
		if (parseResult instanceof ArkErrors) {
			return errAsync(JSON.stringify(parseResult, null, 2));
		} else {
			return okAsync(parseResult);
		}
	}

	function normalizeSQLiteRow(record: unknown): unknown {
		if (typeof record === "object" && record !== null) {
			const row = record as Record<string, unknown>;
			const normalized: Record<string, unknown> = {};

			for (const [key, value] of Object.entries(row)) {
				// Convert SQL null to undefined for optional fields
				if (value === null) {
					// Skip null values - they'll be undefined in the result
					continue;
				}

				// Parse JSON fields
				if (key === "notes" && typeof value === "string") {
					normalized[key] = JSON.parse(value);
				} else if (key === "statusLog" && typeof value === "string") {
					normalized[key] = JSON.parse(value);
				} else if (key === "isRemote" && typeof value === "number") {
					// Convert SQLite integer to boolean
					normalized[key] = value === 1;
				} else {
					normalized[key] = value;
				}
			}

			return normalized;
		}
		return record;
	}
}

class SQLiteConnection {
	private static readonly instances = new Map<
		ProcessEnvSchema["JOB_APP_MANAGER_TYPE"],
		SQLiteConnection
	>();

	private readonly db: Database;

	private constructor(environment: ProcessEnvSchema["JOB_APP_MANAGER_TYPE"]) {
		const dbPath = getDatabasePath(environment);
		this.db = new Database(dbPath, { create: true });
		this.initializeSchema();
		this.seedJobBoards();
		console.log(`🔍 [SQLite] Database initialized: ${dbPath}`);
	}

	static getInstance(
		environment: ProcessEnvSchema["JOB_APP_MANAGER_TYPE"],
	): SQLiteConnection {
		const connection =
			SQLiteConnection.instances.get(environment) ??
			new SQLiteConnection(environment);
		SQLiteConnection.instances.set(environment, connection);
		return connection;
	}

	private initializeSchema(): void {
		// Create job_boards table
		this.db.run(`
            CREATE TABLE IF NOT EXISTS job_boards
            (
                id          TEXT PRIMARY KEY,
                name        TEXT NOT NULL,
                rootDomain  TEXT NOT NULL,
                domains     TEXT NOT NULL,
                createdAt   TEXT NOT NULL
            )
        `);

		// Create job_applications table
		this.db.run(`
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

		// Create interview_stages table
		this.db.run(`
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

		// Create contacts table
		this.db.run(`
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

		// Create indexes for better query performance
		this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_company
                ON job_applications(company)
        `);

		this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_status_category
                ON job_applications(json_extract(statusLog, '$[#-1][1].category'))
        `);

		this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_updated_at
                ON job_applications(updatedAt DESC)
        `);

		this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_interview_stages_job_app
                ON interview_stages(jobApplicationId)
        `);

		this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_contacts_job_app
                ON contacts(jobApplicationId)
        `);

		this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_job_boards_domain
                ON job_boards(rootDomain)
        `);

		// Analytics performance indexes
		this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_applications_remote
                ON job_applications(isRemote)
        `);

		this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_applications_source
                ON job_applications(sourceType)
        `);

		this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_applications_date_range
                ON job_applications(applicationDate, updatedAt)
        `);

		this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_contacts_channel
                ON contacts(channel)
        `);

		this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_contacts_role
                ON contacts(role)
        `);

		this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_contacts_response
                ON contacts(responseReceived, outreachDate)
        `);

		this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_interview_type
                ON interview_stages(interviewType)
        `);

		this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_interview_round
                ON interview_stages(round)
        `);

		this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_interview_final
                ON interview_stages(isFinalRound)
        `);
	}

	async withConnection<T>(operation: (db: Database) => Promise<T>): Promise<T> {
		return operation(this.db);
	}

	/**
	 * Get the underlying Database instance.
	 * Use this to create repository instances that share the same initialized connection.
	 */
	getDatabase(): Database {
		return this.db;
	}

	private seedJobBoards(): void {
		const jobBoardRepo = createSQLiteJobBoardRepository(this.db);
		jobBoardRepo.seedCommonBoards().mapErr((err) => {
			console.warn(`⚠️ [SQLite] Failed to seed job boards: ${err}`);
		});
	}

	close(): void {
		this.db.close();
	}
}

export type ManagerType = ProcessEnvSchema["JOB_APP_MANAGER_TYPE"];

/**
 * Registry for managing JobApplicationManager instances.
 * Allows runtime switching between test and prod databases in dev mode.
 */
function createJobAppManagerRegistry(initialEnvironment: ManagerType) {
	const managers = new Map<ManagerType, JobApplicationManager>();

	function getOrCreateManager(env: ManagerType): JobApplicationManager {
		const existing = managers.get(env);
		if (existing) {
			return existing;
		}

		const newManager = createSQLiteJobAppManager(env);
		managers.set(env, newManager);
		return newManager;
	}

	// Pre-create both test and prod managers at startup for faster access
	getOrCreateManager("test");
	getOrCreateManager("prod");

	return {
		/**
		 * Gets manager for specified environment without mutating global state.
		 * This is thread-safe and can be called concurrently from multiple requests.
		 */
		getManager(env: ManagerType): JobApplicationManager {
			return getOrCreateManager(env);
		},

		/**
		 * Gets the default environment from initial configuration.
		 */
		getDefaultEnvironment(): ManagerType {
			return initialEnvironment;
		},

		/**
		 * Gets the initialized Database instance for the specified environment.
		 * Use this to create repository instances that share the same database connection.
		 */
		getDatabase(env: ManagerType): Database {
			// Ensure the manager (and thus the SQLiteConnection) exists
			getOrCreateManager(env);
			return SQLiteConnection.getInstance(env).getDatabase();
		},
	};
}

// Create registry with initial environment from process.env
const registry = createJobAppManagerRegistry(processEnv.JOB_APP_MANAGER_TYPE);

/**
 * Global registry for job application managers.
 * Use `jobAppManagerRegistry.getManager(env)` to get a manager for a specific environment.
 * Each manager instance is cached and reused.
 */
export const jobAppManagerRegistry = registry;
