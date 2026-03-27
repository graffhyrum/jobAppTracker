import {
	type ApplicationStatus,
	createJobApplication,
	createJobApplicationId,
	createJobApplicationWithInitialStatus,
	type JobApplication,
	updateJobApplicationStatus,
} from "#src/domain/entities/job-application.ts";

export const mockUuidGenerator = (seed: number) => () =>
	`123e4567-e89b-12d3-a456-42661417${String(seed).padStart(4, "0")}`;

export function createMockApplication(
	applicationDate: string,
	seed = 1000,
): JobApplication {
	return createJobApplication(
		{
			company: "Test Company",
			positionTitle: "Software Engineer",
			applicationDate,
			interestRating: 3,
			sourceType: "job_board" as const,
			isRemote: false,
		},
		createJobApplicationId(mockUuidGenerator(seed)),
	);
}

export function createMockApplicationWithStatus(
	applicationDate: string,
	status: ApplicationStatus,
	seed = 1000,
): JobApplication {
	const app = createJobApplicationWithInitialStatus(
		{
			company: "Test Company",
			positionTitle: "Software Engineer",
			applicationDate,
			interestRating: 3,
			sourceType: "job_board" as const,
			isRemote: false,
		},
		mockUuidGenerator(seed),
	);
	return updateJobApplicationStatus(app, status);
}
