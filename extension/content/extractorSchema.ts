import { expect } from "bun:test";
import { ArkErrors, type TraversalError, type Type, type } from "arktype";
import { err, ok, type Result } from "neverthrow";

export const jobDataSchema = type({
	company: "string",
	position: "string",
	jobDescription: "string",
	jobPostingUrl: "string",
});
export type JobData = typeof jobDataSchema.infer;

export function getAndAssertJobData(x: unknown): JobData {
	return assertValidPerSchema(jobDataSchema, x);
}

// biome-ignore lint/suspicious/noExplicitAny: generic
function assertValidPerSchema<const ArkType extends Type<any, any>>(
	arkType: ArkType,
	input: unknown,
) {
	const res = toArkResult(arkType, input);
	expect(res.isOk()).toBe(true);
	return res._unsafeUnwrap();
}

// biome-ignore lint/suspicious/noExplicitAny: generic
function toArkResult<const ArkType extends Type<any, any>>(
	arkType: ArkType,
	input: unknown,
): Result<ArkTypeOut<ArkType>, TraversalError> {
	const result = arkType(input);

	if (result instanceof ArkErrors) {
		return err(result.toTraversalError());
	}

	return ok(result as ArkTypeOut<ArkType>);
}

type ArkTypeOut<T> = T extends Type<infer Out, infer _Scope> ? Out : never;
