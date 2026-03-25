import { Data } from "effect";

export class JobBoardError extends Data.TaggedError("JobBoardError")<{
	readonly detail: string;
	readonly operation: string;
}> {}
