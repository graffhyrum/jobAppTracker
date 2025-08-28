import { errAsync, type ResultAsync } from "neverthrow";
import {
	createJobApplication,
	type JobApplication,
	type JobApplicationForCreate,
} from "../entities/job-application";
import type {
	DatabaseError,
	JobApplicationRepository,
} from "../ports/job-application-repository";

export interface JobApplicationUseCases {
	createJobApplication(
		data: JobApplicationForCreate,
	): ResultAsync<JobApplication, Error>;
	getJobApplication(
		id: string,
	): ResultAsync<JobApplication | null, DatabaseError>;
	getAllJobApplications(): ResultAsync<JobApplication[], DatabaseError>;
	updateJobApplication(
		application: JobApplication,
	): ResultAsync<void, DatabaseError>;
	deleteJobApplication(id: string): ResultAsync<void, DatabaseError>;
	getActiveJobApplications(): ResultAsync<JobApplication[], DatabaseError>;
	getInactiveJobApplications(): ResultAsync<JobApplication[], DatabaseError>;
	getOverdueJobApplications(): ResultAsync<JobApplication[], DatabaseError>;
}

export function createJobApplicationUseCases(
	repository: JobApplicationRepository,
): JobApplicationUseCases {
	return {
		createJobApplication: (
			data: JobApplicationForCreate,
		): ResultAsync<JobApplication, Error> => {
			const appResult = createJobApplication(data);
			if (appResult.isErr()) {
				return errAsync(appResult.error);
			}
			const app = appResult.value;
			return repository.save(app).map(() => app);
		},

		getJobApplication: (
			id: string,
		): ResultAsync<JobApplication | null, DatabaseError> => {
			return repository.findById(id);
		},

		getAllJobApplications: (): ResultAsync<JobApplication[], DatabaseError> => {
			return repository.findAll();
		},

		updateJobApplication: (
			application: JobApplication,
		): ResultAsync<void, DatabaseError> => {
			return repository.update(application);
		},

		deleteJobApplication: (id: string): ResultAsync<void, DatabaseError> => {
			return repository.deleteById(id);
		},

		getActiveJobApplications: (): ResultAsync<
			JobApplication[],
			DatabaseError
		> => {
			return repository.findByStatusCategory("active");
		},

		getInactiveJobApplications: (): ResultAsync<
			JobApplication[],
			DatabaseError
		> => {
			return repository.findByStatusCategory("inactive");
		},

		getOverdueJobApplications: (): ResultAsync<
			JobApplication[],
			DatabaseError
		> => {
			return repository.findOverdue();
		},
	};
}
