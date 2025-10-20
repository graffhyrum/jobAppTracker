import { ResultAsync } from "neverthrow";
import type { Fn } from "#rootTypes/generic-function.ts";

export function wrapPromise<T, _E>(
	promise: Promise<T>,
	errorMessage: string,
): ResultAsync<T, string> {
	return ResultAsync.fromPromise(promise, () => errorMessage);
}

export function wrapAsyncOperation<T>(
	operation: Fn<Promise<T>>,
	errorMessage: string,
): ResultAsync<T, string> {
	return wrapPromise(operation(), errorMessage);
}
