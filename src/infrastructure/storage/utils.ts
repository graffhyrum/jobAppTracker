import { ResultAsync } from "neverthrow";
import type { DatabaseError } from "../../domain/ports/job-application-repository";
import { createDatabaseError } from "../../domain/ports/job-application-repository";

/**
 * Converts unknown error to DatabaseError with consistent handling
 */
export function toError(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error));
}

/**
 * Creates a DatabaseError with consistent error handling
 */
export function toDatabaseError(
	message: string,
	error: unknown,
): DatabaseError {
	return createDatabaseError(message, toError(error));
}

/**
 * Wraps a promise in ResultAsync with consistent error handling
 */
export function wrapPromise<T>(
	promise: Promise<T>,
	errorMessage: string,
): ResultAsync<T, DatabaseError> {
	return ResultAsync.fromPromise(promise, (error) =>
		toDatabaseError(errorMessage, error),
	);
}

/**
 * Wraps an async operation with DatabaseError handling for existing DatabaseErrors
 */
export function wrapAsyncOperation<T>(
	operation: () => Promise<T>,
	errorMessage: string,
): ResultAsync<T, DatabaseError> {
	return ResultAsync.fromPromise(operation(), (error) => {
		return error instanceof Error && error.name === "DatabaseError"
			? (error as DatabaseError)
			: toDatabaseError(errorMessage, error);
	});
}
