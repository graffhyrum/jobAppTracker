import type { Effect } from "effect";

import type { FileIOError } from "./file-io-error.ts";

/**
 * File IO abstraction port
 * Provides cross-runtime file system operations
 */
export interface FileIO {
	exists(filePath: string): Effect.Effect<boolean, FileIOError>;
	readText(filePath: string): Effect.Effect<string, FileIOError>;
	writeText(
		filePath: string,
		content: string,
	): Effect.Effect<void, FileIOError>;
	ensureDir(dirPath: string): Effect.Effect<void, FileIOError>;
	createDir(dirPath: string): Effect.Effect<void, FileIOError>;
	deleteFile(filePath: string): Effect.Effect<void, FileIOError>;
}
