import type { ResultAsync } from "neverthrow";
import type { ForUpdate } from "../../infrastructure/storage/storage-provider-interface.ts";
import type {
	JobApplication,
	JobApplicationForCreate,
	JobApplicationId,
} from "../entities/job-application.ts";
import type { UUID } from "../entities/uuid.ts";

export interface JobApplicationManager {
	createJobApplication(
		data: JobApplicationForCreate,
	): ResultAsync<JobApplication, string>;

	getJobApplication(id: JobApplicationId): ResultAsync<JobApplication, string>;

	getAllJobApplications(): ResultAsync<JobApplication[], string>;

	updateJobApplication(
		id: UUID,
		data: ForUpdate<JobApplication>,
	): ResultAsync<JobApplication, string>;

	deleteJobApplication(id: JobApplicationId): ResultAsync<void, string>;

	getActiveJobApplications(): ResultAsync<JobApplication[], string>;

	getInactiveJobApplications(): ResultAsync<JobApplication[], string>;

	clearAllJobApplications(): ResultAsync<void, string>;
}

export class JobApplicationManagerError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "JobApplicationManagerError";
	}
}

export function createJobApplicationManagerError(
	message: string,
	options?: ErrorOptions,
): JobApplicationManagerError {
	return new JobApplicationManagerError(message, options);
}
