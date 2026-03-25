import { Data } from "effect";

export class ContactError extends Data.TaggedError("ContactError")<{
	readonly detail: string;
	readonly operation: string;
}> {}
