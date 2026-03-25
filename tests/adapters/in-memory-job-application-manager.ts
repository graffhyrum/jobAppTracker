import { Effect } from "effect";

import { JobApplicationError } from "#src/domain/entities/job-application-error.ts";
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
import type { ForUpdate } from "#src/domain/ports/common-types.ts";
import type { JobApplicationManager } from "#src/domain/ports/job-application-manager.ts";

export function createInMemoryJobApplicationManager(
	generateUUID: () => string = () => crypto.randomUUID(),
): JobApplicationManager {
	const applications = new Map<JobApplicationId, JobApplication>();

	return {
		createJobApplication(
			data: JobApplicationForCreate,
		): Effect.Effect<JobApplication, JobApplicationError> {
			const app = createJobApplicationWithInitialStatus(data, generateUUID);
			applications.set(app.id, app);
			return Effect.succeed(app);
		},

		getJobApplication(
			id: JobApplicationId,
		): Effect.Effect<JobApplication, JobApplicationError> {
			const app = applications.get(id);
			if (!app) {
				return Effect.fail(
					new JobApplicationError({
						detail: `Job Application with id ${id} not found`,
						operation: "getJobApplication",
					}),
				);
			}
			return Effect.succeed(app);
		},

		getAllJobApplications(): Effect.Effect<
			JobApplication[],
			JobApplicationError
		> {
			return Effect.succeed(Array.from(applications.values()));
		},

		updateJobApplication(
			id: JobApplicationId,
			data: ForUpdate<JobApplication>,
		): Effect.Effect<JobApplication, JobApplicationError> {
			const existing = applications.get(id);
			if (!existing) {
				return Effect.fail(
					new JobApplicationError({
						detail: `Job Application with id ${id} not found`,
						operation: "updateJobApplication",
					}),
				);
			}

			const updated = {
				...existing,
				...data,
				updatedAt: new Date().toISOString(),
			};
			applications.set(id, updated);
			return Effect.succeed(updated);
		},

		deleteJobApplication(
			id: JobApplicationId,
		): Effect.Effect<void, JobApplicationError> {
			applications.delete(id);
			return Effect.succeed(undefined);
		},

		getActiveJobApplications(): Effect.Effect<
			JobApplication[],
			JobApplicationError
		> {
			const active = Array.from(applications.values()).filter(isActive);
			return Effect.succeed(active);
		},

		getInactiveJobApplications(): Effect.Effect<
			JobApplication[],
			JobApplicationError
		> {
			const inactive = Array.from(applications.values()).filter(isInactive);
			return Effect.succeed(inactive);
		},

		clearAllJobApplications(): Effect.Effect<void, JobApplicationError> {
			applications.clear();
			return Effect.succeed(undefined);
		},
	};
}
