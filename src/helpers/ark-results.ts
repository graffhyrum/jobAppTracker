import { ArkErrors, type TraversalError, type Type } from "arktype";
import { err, ok, type Result } from "neverthrow";

type ArkTypeOut<T> = T extends Type<infer Out, infer _Scope> ? Out : never;

// biome-ignore lint/suspicious/noExplicitAny: generic function
export function toArkResult<const ArkType extends Type<any, any>>(
	arkType: ArkType,
	input: unknown,
): Result<ArkTypeOut<ArkType>, TraversalError> {
	const result = arkType(input);

	if (result instanceof ArkErrors) {
		return err(result.toTraversalError());
	}

	return ok(result as ArkTypeOut<ArkType>);
}
