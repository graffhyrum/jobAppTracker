import type { ResultAsync } from "neverthrow";
import type { JobApplication } from "../entities/job-application";

export class DatabaseError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "DatabaseError";
	}
}

export function createDatabaseError(
	message: string,
	options?: ErrorOptions,
): DatabaseError {
	return new DatabaseError(message, options);
}

export interface JobApplicationRepository {
	/**
	 * Save a job application to storage
	 */
	save(application: JobApplication): ResultAsync<void, DatabaseError>;

	/**
	 * Find a job application by ID
	 */
	findById(id: string): ResultAsync<JobApplication | null, DatabaseError>;

	/**
	 * Find all job applications
	 */
	findAll(): ResultAsync<JobApplication[], DatabaseError>;

	/**
	 * Update an existing job application
	 */
	update(application: JobApplication): ResultAsync<void, DatabaseError>;

	/**
	 * Delete a job application by ID
	 */
	deleteById(id: string): ResultAsync<void, DatabaseError>;

	/**
	 * Find applications by status category
	 */
	findByStatusCategory(
		category: "active" | "inactive",
	): ResultAsync<JobApplication[], DatabaseError>;

	/**
	 * Find applications with next event dates that are overdue
	 */
	findOverdue(): ResultAsync<JobApplication[], DatabaseError>;
}
