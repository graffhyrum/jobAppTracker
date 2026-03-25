import { ArkErrors, type } from "arktype";

export const jobDataSchema = type({
	company: "string",
	position: "string",
	jobDescription: "string",
	jobPostingUrl: "string",
});
export type JobData = typeof jobDataSchema.infer;

export function getAndAssertJobData(x: unknown): JobData {
	const result = jobDataSchema(x);
	if (result instanceof ArkErrors) {
		throw new TypeError(result.summary);
	}
	return result;
}
