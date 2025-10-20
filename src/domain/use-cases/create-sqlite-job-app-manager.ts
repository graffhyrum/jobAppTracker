import { Database } from "bun:sqlite";
import { ArkErrors } from "arktype";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import {
	type ProcessEnvSchema,
	processEnv,
} from "../../../processEnvFacade.ts";
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
            INSERT INTO job_applications (
              id, company, positionTitle, applicationDate, interestRating,
              nextEventDate, jobPostingUrl, jobDescription,
              createdAt, updatedAt, notes, statusLog
            ) VALUES (
              $id, $company, $positionTitle, $applicationDate, $interestRating,
              $nextEventDate, $jobPostingUrl, $jobDescription,
              $createdAt, $updatedAt, $notes, $statusLog
            )
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
            UPDATE job_applications SET
              company = $company,
              positionTitle = $positionTitle,
              applicationDate = $applicationDate,
              interestRating = $interestRating,
              nextEventDate = $nextEventDate,
              jobPostingUrl = $jobPostingUrl,
              jobDescription = $jobDescription,
              updatedAt = $updatedAt,
              notes = $notes,
              statusLog = $statusLog
            WHERE id = $id
          `);

					updateQuery.run({
						$id: id as string,
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
            SELECT * FROM job_applications
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
            SELECT * FROM job_applications
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
		// Create table if not exists
		this.db.run(`
      CREATE TABLE IF NOT EXISTS job_applications (
        id TEXT PRIMARY KEY,
        company TEXT NOT NULL,
        positionTitle TEXT NOT NULL,
        applicationDate TEXT NOT NULL,
        interestRating INTEGER,
        nextEventDate TEXT,
        jobPostingUrl TEXT,
        jobDescription TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        notes TEXT NOT NULL,
        statusLog TEXT NOT NULL
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
	}

	async withConnection<T>(operation: (db: Database) => Promise<T>): Promise<T> {
		return operation(this.db);
	}

	close(): void {
		this.db.close();
	}
}

export type ManagerType = ProcessEnvSchema["JOB_APP_MANAGER_TYPE"];
const configMap = {
	test: () => createSQLiteJobAppManager("test"),
	prod: () => createSQLiteJobAppManager("prod"),
} as const satisfies Record<ManagerType, () => JobApplicationManager>;
const instance = configMap[processEnv.JOB_APP_MANAGER_TYPE]();
export const jobApplicationManager = instance;
