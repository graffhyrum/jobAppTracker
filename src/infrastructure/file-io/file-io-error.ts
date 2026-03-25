import { Data } from "effect";

export class FileIOError extends Data.TaggedError("FileIOError")<{
	readonly detail: string;
	readonly operation: string;
	readonly path: string;
}> {}
