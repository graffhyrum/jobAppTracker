import { ArkErrors, scope } from "arktype";
import { Either } from "effect";

import { JobBoardError } from "./job-board-error.ts";
import { uuidSchema } from "./uuid.ts";
export const jobBoardScope = scope({
	"#dateTime": "string.date.iso",
	JobBoardId: uuidSchema,
	BaseProps: {
		name: "string > 0",
		rootDomain: "string > 0",
		domains: "string[]",
	},
	JobBoard: {
		"...": "BaseProps",
		id: "JobBoardId",
		createdAt: "dateTime",
	},
	forCreate: "BaseProps",
});
export const jobBoardModule = jobBoardScope.export();
export type JobBoardId = typeof jobBoardModule.JobBoardId.infer;
export type JobBoard = typeof jobBoardModule.JobBoard.infer;
export type JobBoardForCreate = typeof jobBoardModule.forCreate.infer;
// Common job boards for seeding
export const COMMON_JOB_BOARDS: JobBoardForCreate[] = [
	{
		name: "LinkedIn",
		rootDomain: "linkedin.com",
		domains: ["linkedin.com", "www.linkedin.com"],
	},
	{
		name: "Indeed",
		rootDomain: "indeed.com",
		domains: ["indeed.com", "www.indeed.com"],
	},
	{
		name: "Glassdoor",
		rootDomain: "glassdoor.com",
		domains: ["glassdoor.com", "www.glassdoor.com"],
	},
	{
		name: "ZipRecruiter",
		rootDomain: "ziprecruiter.com",
		domains: ["ziprecruiter.com", "www.ziprecruiter.com"],
	},
	{
		name: "Monster",
		rootDomain: "monster.com",
		domains: ["monster.com", "www.monster.com"],
	},
	{
		name: "CareerBuilder",
		rootDomain: "careerbuilder.com",
		domains: ["careerbuilder.com", "www.careerbuilder.com"],
	},
	{
		name: "AngelList",
		rootDomain: "angel.co",
		domains: ["angel.co", "www.angel.co", "wellfound.com"],
	},
	{
		name: "Dice",
		rootDomain: "dice.com",
		domains: ["dice.com", "www.dice.com"],
	},
];
export function createJobBoard(
	data: JobBoardForCreate,
	generateUUID: () => string,
): Either.Either<JobBoard, JobBoardError> {
	const now = new Date().toISOString();
	const id = createJobBoardId(generateUUID);
	const jobBoard = jobBoardModule.JobBoard({
		...data,
		id,
		createdAt: now,
	});
	if (jobBoard instanceof ArkErrors) {
		return Either.left(new JobBoardError({ detail: jobBoard.summary, operation: "createJobBoard" }));
	}
	return Either.right(jobBoard);
}
export function createJobBoardId(generateUUID: () => string): JobBoardId {
	return jobBoardModule.JobBoardId.assert(generateUUID());
}
