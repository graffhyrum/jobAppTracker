import { ResultAsync } from "neverthrow";
import type { JobApplication } from "../../domain/entities/job-application";
import {
	createDatabaseError,
	type DatabaseError,
	type JobApplicationRepository,
} from "../../domain/ports/job-application-repository";
import { toDatabaseError, wrapPromise } from "./utils";

/**
 * In-memory implementation of JobApplicationRepository for testing
 * Simulates the behavior of a persistent storage system without file I/O
 */
export function createJobApplicationMemoryRepository(): JobApplicationRepository {
	const storage = new Map<string, JobApplication>();

	return {
		save: (application: JobApplication): ResultAsync<void, DatabaseError> => {
			return wrapPromise(
				Promise.resolve().then(() => {
					storage.set(application.id, application);
				}),
				"Failed to save application",
			);
		},

		findById: (
			id: string,
		): ResultAsync<JobApplication | null, DatabaseError> => {
			return ResultAsync.fromPromise(
				Promise.resolve(storage.get(id) ?? null),
				(error) => toDatabaseError("Failed to find application by ID", error),
			);
		},

		findAll: (): ResultAsync<JobApplication[], DatabaseError> => {
			return ResultAsync.fromPromise(
				Promise.resolve(Array.from(storage.values())),
				(error) => toDatabaseError("Failed to find all applications", error),
			);
		},

		update: (application: JobApplication): ResultAsync<void, DatabaseError> => {
			return ResultAsync.fromPromise(
				Promise.resolve().then(() => {
					if (!storage.has(application.id)) {
						throw toDatabaseError(
							`Application with ID ${application.id} not found`,
							new Error("Application not found"),
						);
					}
					storage.set(application.id, application);
				}),
				(error) =>
					error instanceof Error && error.name === "DatabaseError"
						? (error as DatabaseError)
						: toDatabaseError("Failed to update application", error),
			);
		},

		deleteById: (id: string): ResultAsync<void, DatabaseError> => {
			return ResultAsync.fromPromise(
				Promise.resolve().then(() => {
					if (!storage.has(id)) {
						throw createDatabaseError(`Application with ID ${id} not found`);
					}
					storage.delete(id);
				}),
				(error) =>
					error instanceof Error && error.name === "DatabaseError"
						? (error as DatabaseError)
						: toDatabaseError("Failed to delete application", error),
			);
		},

		findByStatusCategory: (
			category: "active" | "inactive",
		): ResultAsync<JobApplication[], DatabaseError> => {
			return ResultAsync.fromPromise(
				Promise.resolve().then(() => {
					const applications: JobApplication[] = [];

					for (const app of storage.values()) {
						// Get the latest status from statusLog
						const statusEntries = Object.entries(app.statusLog);
						if (statusEntries.length > 0) {
							// Sort by timestamp (ISO string) to get the latest
							const sortedEntries = statusEntries.toSorted(([a], [b]) =>
								b.localeCompare(a),
							);
							const latestEntry = sortedEntries[0];
							if (latestEntry && latestEntry[1].category === category) {
								applications.push(app);
							}
						}
					}

					return applications;
				}),
				(error) =>
					createDatabaseError(
						"Failed to find applications by status category",
						error instanceof Error ? error : new Error(String(error)),
					),
			);
		},

		findOverdue: (): ResultAsync<JobApplication[], DatabaseError> => {
			return ResultAsync.fromPromise(
				Promise.resolve().then(() => {
					const applications: JobApplication[] = [];
					const now = new Date();

					for (const app of storage.values()) {
						if (app.nextEventDate) {
							const nextEventDate = new Date(app.nextEventDate);
							if (nextEventDate < now) {
								applications.push(app);
							}
						}
					}

					return applications;
				}),
				(error) =>
					createDatabaseError(
						"Failed to find overdue applications",
						error instanceof Error ? error : new Error(String(error)),
					),
			);
		},
	};
}
