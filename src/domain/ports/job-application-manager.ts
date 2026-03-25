import type { Effect } from "effect";

import type { JobApplicationError } from "../entities/job-application-error.ts";
import type {
	JobApplication,
	JobApplicationForCreate,
	JobApplicationId,
} from "../entities/job-application.ts";
import type { UUID } from "../entities/uuid.ts";
import type { ForUpdate } from "./common-types.ts";

export interface JobApplicationManager {
	createJobApplication(
		data: JobApplicationForCreate,
	): Effect.Effect<JobApplication, JobApplicationError>;

	getJobApplication(
		id: JobApplicationId,
	): Effect.Effect<JobApplication, JobApplicationError>;

	getAllJobApplications(): Effect.Effect<
		JobApplication[],
		JobApplicationError
	>;

	updateJobApplication(
		id: UUID,
		data: ForUpdate<JobApplication>,
	): Effect.Effect<JobApplication, JobApplicationError>;

	deleteJobApplication(
		id: JobApplicationId,
	): Effect.Effect<void, JobApplicationError>;

	getActiveJobApplications(): Effect.Effect<
		JobApplication[],
		JobApplicationError
	>;

	getInactiveJobApplications(): Effect.Effect<
		JobApplication[],
		JobApplicationError
	>;

	clearAllJobApplications(): Effect.Effect<void, JobApplicationError>;
}
