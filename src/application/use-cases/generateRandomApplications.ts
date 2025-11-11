import { faker } from "@faker-js/faker";
import type { JobBoard } from "../../domain/entities/job-board.ts";
import type {
	JobApplicationForCreate,
	SourceType,
} from "../../domain/entities/job-application.ts";

const SOURCE_TYPES: SourceType[] = [
	"job_board",
	"referral",
	"company_website",
	"recruiter",
	"networking",
	"other",
];

const JOB_TITLES = [
	"Software Engineer",
	"Senior Software Engineer",
	"Full Stack Developer",
	"Frontend Developer",
	"Backend Developer",
	"DevOps Engineer",
	"Data Scientist",
	"Machine Learning Engineer",
	"Product Manager",
	"UX Designer",
	"UI Designer",
	"QA Engineer",
	"Security Engineer",
	"Cloud Architect",
	"Engineering Manager",
	"Technical Lead",
	"Site Reliability Engineer",
	"Data Engineer",
	"Mobile Developer",
	"iOS Developer",
	"Android Developer",
];

/**
 * Generates random job application data using faker.js
 * Follows the JobApplicationForCreate schema
 */
export function generateRandomJobApplicationData(
	jobBoards: JobBoard[] = [],
): JobApplicationForCreate {
	const sourceType = faker.helpers.arrayElement(SOURCE_TYPES);
	const isRemote = faker.datatype.boolean();

	// Generate application date in the past 90 days
	const applicationDate = faker.date
		.recent({ days: 90 })
		.toISOString();

	// 60% chance of having an interest rating
	const interestRating = faker.datatype.boolean({ probability: 0.6 })
		? faker.number.int({ min: 1, max: 3 })
		: undefined;

	// 40% chance of having a next event date (in the future)
	const nextEventDate = faker.datatype.boolean({ probability: 0.4 })
		? faker.date.soon({ days: 30 }).toISOString()
		: undefined;

	// 70% chance of having a job posting URL
	const jobPostingUrl = faker.datatype.boolean({ probability: 0.7 })
		? faker.internet.url()
		: undefined;

	// 50% chance of having a job description
	const jobDescription = faker.datatype.boolean({ probability: 0.5 })
		? faker.lorem.paragraphs(2)
		: undefined;

	// If source type is job_board, randomly assign a job board
	const jobBoardId =
		sourceType === "job_board" && jobBoards.length > 0
			? faker.helpers.arrayElement(jobBoards).id
			: undefined;

	// 30% chance of having source notes
	const sourceNotes = faker.datatype.boolean({ probability: 0.3 })
		? faker.lorem.sentence()
		: undefined;

	return {
		company: faker.company.name(),
		positionTitle: faker.helpers.arrayElement(JOB_TITLES),
		applicationDate,
		interestRating,
		nextEventDate,
		jobPostingUrl,
		jobDescription,
		sourceType,
		jobBoardId,
		sourceNotes,
		isRemote,
	};
}
