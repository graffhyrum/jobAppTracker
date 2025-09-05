import type { ResultAsync } from "neverthrow";

/**
 * Error types for file operations
 */
export interface FileIOError extends Error {
	readonly name: "FileIOError";
	readonly operation: string;
	readonly path: string;
	readonly cause?: unknown;
}

/**
 * File IO abstraction port
 * Provides cross-runtime file system operations
 */
export interface FileIO {
	/**
	 * Check if a file exists
	 */
	exists(filePath: string): ResultAsync<boolean, FileIOError>;

	/**
	 * Read file contents as text
	 */
	readText(filePath: string): ResultAsync<string, FileIOError>;

	/**
	 * Write text content to a file
	 */
	writeText(filePath: string, content: string): ResultAsync<void, FileIOError>;

	/**
	 * Ensure directory exists (create if it doesn't)
	 */
	ensureDir(dirPath: string): ResultAsync<void, FileIOError>;

	/**
	 * Create directory (recursively)
	 */
	createDir(dirPath: string): ResultAsync<void, FileIOError>;

	/**
	 * Delete a file
	 */
	deleteFile(filePath: string): ResultAsync<void, FileIOError>;
}

/**
 * Factory function for creating FileIOError instances
 */
export function createFileIOError(
	operation: keyof FileIO,
	path: string,
	cause?: unknown,
): FileIOError {
	const message = `File operation '${operation}' failed for path '${path}'${
		cause ? `: ${cause}` : ""
	}`;

	const error = Object.assign(new Error(message), {
		name: "FileIOError" as const,
		operation,
		path,
		cause,
	});

	return error;
}
