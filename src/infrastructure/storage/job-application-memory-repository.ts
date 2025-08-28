import { errAsync, okAsync, ResultAsync } from "neverthrow";
import type { JobApplication } from "../../domain/entities/job-application";
import {
	createDatabaseError,
	type DatabaseError,
	type JobApplicationRepository,
} from "../../domain/ports/job-application-repository";
import { getEntries } from "../../helpers/entries.ts";
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
			if (!storage.has(application.id)) {
				return errAsync(
					createDatabaseError(
						`Application with ID ${application.id} not found`,
					),
				);
			}
			storage.set(application.id, application);
			return okAsync(undefined);
		},

		deleteById: (id: string): ResultAsync<void, DatabaseError> => {
			if (!storage.has(id)) {
				return errAsync(
					createDatabaseError(`Application with ID ${id} not found`),
				);
			}
			storage.delete(id);
			return okAsync(undefined);
		},

		findByStatusCategory: (
			category: "active" | "inactive",
		): ResultAsync<JobApplication[], DatabaseError> => {
			const applications: JobApplication[] = [];

			for (const app of storage.values()) {
				// Get the latest status from statusLog
				const statusEntries = getEntries(app.statusLog);
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

			return okAsync(applications);
		},

		findOverdue: (): ResultAsync<JobApplication[], DatabaseError> => {
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

			return okAsync(applications);
		},
	};
}
