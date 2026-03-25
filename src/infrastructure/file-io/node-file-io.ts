import { Effect } from "effect";

import { FileIOError } from "./file-io-error.ts";
import type { FileIO } from "./file-io.ts";

/**
 * Node.js-specific File IO implementation
 */
export function createNodeFileIO(): FileIO {
	function exists(filePath: string): Effect.Effect<boolean, FileIOError> {
		return Effect.tryPromise({
			try: async () => {
				const fs = await import("node:fs");
				try {
					await fs.promises.access(filePath);
					return true;
				} catch {
					return false;
				}
			},
			catch: (error) =>
				new FileIOError({
					detail: String(error),
					operation: "exists",
					path: filePath,
				}),
		});
	}

	function readText(filePath: string): Effect.Effect<string, FileIOError> {
		return Effect.tryPromise({
			try: async () => {
				const fs = await import("node:fs");
				return await fs.promises.readFile(filePath, "utf8");
			},
			catch: (error) =>
				new FileIOError({
					detail: String(error),
					operation: "readText",
					path: filePath,
				}),
		});
	}

	function writeText(
		filePath: string,
		content: string,
	): Effect.Effect<void, FileIOError> {
		return Effect.tryPromise({
			try: async () => {
				const fs = await import("node:fs");
				await fs.promises.writeFile(filePath, content, "utf8");
			},
			catch: (error) =>
				new FileIOError({
					detail: String(error),
					operation: "writeText",
					path: filePath,
				}),
		});
	}

	function ensureDir(dirPath: string): Effect.Effect<void, FileIOError> {
		return Effect.tryPromise({
			try: async () => {
				const fs = await import("node:fs");
				await fs.promises.mkdir(dirPath, { recursive: true });
			},
			catch: (error) =>
				new FileIOError({
					detail: String(error),
					operation: "ensureDir",
					path: dirPath,
				}),
		});
	}

	function createDir(dirPath: string): Effect.Effect<void, FileIOError> {
		return Effect.tryPromise({
			try: async () => {
				const fs = await import("node:fs");
				await fs.promises.mkdir(dirPath, { recursive: true });
			},
			catch: (error) =>
				new FileIOError({
					detail: String(error),
					operation: "createDir",
					path: dirPath,
				}),
		});
	}

	function deleteFile(filePath: string): Effect.Effect<void, FileIOError> {
		return Effect.tryPromise({
			try: async () => {
				const fs = await import("node:fs");
				await fs.promises.unlink(filePath);
			},
			catch: (error) =>
				new FileIOError({
					detail: String(error),
					operation: "deleteFile",
					path: filePath,
				}),
		});
	}

	return {
		exists,
		readText,
		writeText,
		ensureDir,
		createDir,
		deleteFile,
	};
}
