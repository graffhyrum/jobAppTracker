import { Data } from "effect";

export class JobApplicationError extends Data.TaggedError(
	"JobApplicationError",
)<{
	readonly detail: string;
	readonly operation: string;
}> {}
