import { errAsync, okAsync, type ResultAsync } from "neverthrow";
import type {
	JobApplication,
	JobApplicationForCreate,
	JobApplicationId,
} from "#src/domain/entities/job-application.ts";
import {
	createJobApplicationWithInitialStatus,
	isActive,
	isInactive,
} from "#src/domain/entities/job-application.ts";
import type { JobApplicationManager } from "#src/domain/ports/job-application-manager.ts";
import type { ForUpdate } from "#src/infrastructure/storage/storage-provider-interface.ts";

export function createInMemoryJobApplicationManager(
	generateUUID: () => string = () => crypto.randomUUID(),
): JobApplicationManager {
	// Use Map for O(1) lookups
	const applications = new Map<JobApplicationId, JobApplication>();

	return {
		createJobApplication(
			data: JobApplicationForCreate,
		): ResultAsync<JobApplication, string> {
			const app = createJobApplicationWithInitialStatus(data, generateUUID);
			applications.set(app.id, app);
			return okAsync(app);
		},

		getJobApplication(
			id: JobApplicationId,
		): ResultAsync<JobApplication, string> {
			const app = applications.get(id);
			if (!app) {
				return errAsync(`Job Application with id ${id} not found`);
			}
			return okAsync(app);
		},

		getAllJobApplications(): ResultAsync<JobApplication[], string> {
			return okAsync(Array.from(applications.values()));
		},

		updateJobApplication(
			id: JobApplicationId,
			data: ForUpdate<JobApplication>,
		): ResultAsync<JobApplication, string> {
			const existing = applications.get(id);
			if (!existing) {
				return errAsync(`Job Application with id ${id} not found`);
			}

			const updated = {
				...existing,
				...data,
				updatedAt: new Date().toISOString(),
			};
			applications.set(id, updated);
			return okAsync(updated);
		},

		deleteJobApplication(id: JobApplicationId): ResultAsync<void, string> {
			applications.delete(id);
			return okAsync(undefined);
		},

		getActiveJobApplications(): ResultAsync<JobApplication[], string> {
			const active = Array.from(applications.values()).filter(isActive);
			return okAsync(active);
		},

		getInactiveJobApplications(): ResultAsync<JobApplication[], string> {
			const inactive = Array.from(applications.values()).filter(isInactive);
			return okAsync(inactive);
		},

		clearAllJobApplications(): ResultAsync<void, string> {
			applications.clear();
			return okAsync(undefined);
		},
	};
}
