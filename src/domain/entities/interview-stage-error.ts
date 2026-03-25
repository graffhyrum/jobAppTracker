import { Data } from "effect";

export class InterviewStageError extends Data.TaggedError(
	"InterviewStageError",
)<{
	readonly detail: string;
	readonly operation: string;
}> {}
