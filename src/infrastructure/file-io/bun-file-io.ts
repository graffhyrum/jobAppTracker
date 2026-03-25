import { Effect } from "effect";

import { FileIOError } from "./file-io-error.ts";
import type { FileIO } from "./file-io.ts";

/**
 * Bun-specific File IO implementation
 */
export function createBunFileIO(): FileIO {
	function exists(filePath: string): Effect.Effect<boolean, FileIOError> {
		return Effect.tryPromise({
			try: () => Bun.file(filePath).exists(),
			catch: (error) =>
				new FileIOError({ detail: String(error), operation: "exists", path: filePath }),
		});
	}

	function readText(filePath: string): Effect.Effect<string, FileIOError> {
		return Effect.tryPromise({
			try: async () => {
				const file = Bun.file(filePath);
				const fileExists = await file.exists();
				if (!fileExists) {
					throw new Error("File not found");
				}
				return await file.text();
			},
			catch: (error) =>
				new FileIOError({ detail: String(error), operation: "readText", path: filePath }),
		});
	}

	function writeText(
		filePath: string,
		content: string,
	): Effect.Effect<void, FileIOError> {
		return Effect.tryPromise({
			try: async () => {
				await Bun.write(filePath, content);
			},
			catch: (error) =>
				new FileIOError({ detail: String(error), operation: "writeText", path: filePath }),
		});
	}

	function ensureDir(dirPath: string): Effect.Effect<void, FileIOError> {
		return Effect.tryPromise({
			try: async () => {
				const fs = await import("node:fs");
				await fs.promises.mkdir(dirPath, { recursive: true });
			},
			catch: (error) =>
				new FileIOError({ detail: String(error), operation: "ensureDir", path: dirPath }),
		});
	}

	function createDir(dirPath: string): Effect.Effect<void, FileIOError> {
		return Effect.tryPromise({
			try: async () => {
				const fs = await import("node:fs");
				await fs.promises.mkdir(dirPath, { recursive: true });
			},
			catch: (error) =>
				new FileIOError({ detail: String(error), operation: "createDir", path: dirPath }),
		});
	}

	function deleteFile(filePath: string): Effect.Effect<void, FileIOError> {
		return Effect.tryPromise({
			try: async () => {
				const fs = await import("node:fs");
				await fs.promises.unlink(filePath);
			},
			catch: (error) =>
				new FileIOError({ detail: String(error), operation: "deleteFile", path: filePath }),
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
