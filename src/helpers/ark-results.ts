import { ArkErrors, type Type } from "arktype";
import { Either } from "effect";

type ArkTypeOut<T> = T extends Type<infer Out, infer _Scope> ? Out : never;

// oxlint-disable-next-line no-explicit-any
export function toArkResult<const ArkType extends Type<any, any>>(
	arkType: ArkType,
	input: unknown,
): Either.Either<ArkTypeOut<ArkType>, ArkErrors> {
	const result = arkType(input);

	if (result instanceof ArkErrors) {
		return Either.left(result);
	}

	return Either.right(result as ArkTypeOut<ArkType>);
}
