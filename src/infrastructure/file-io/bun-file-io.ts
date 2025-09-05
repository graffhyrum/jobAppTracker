import { ResultAsync } from "neverthrow";
import type { FileIO, FileIOError } from "./file-io.ts";
import { createFileIOError } from "./file-io.ts";

/**
 * Bun-specific File IO implementation
 */
export function createBunFileIO(): FileIO {
	function exists(filePath: string): ResultAsync<boolean, FileIOError> {
		return ResultAsync.fromPromise(
			(async () => {
				const file = Bun.file(filePath);
				return await file.exists();
			})(),
			(error) => createFileIOError("exists", filePath, error),
		);
	}

	function readText(filePath: string): ResultAsync<string, FileIOError> {
		return ResultAsync.fromPromise(
			(async () => {
				const file = Bun.file(filePath);
				const exists = await file.exists();
				if (!exists) {
					throw new Error("File not found");
				}
				return await file.text();
			})(),
			(error) => createFileIOError("readText", filePath, error),
		);
	}

	function writeText(
		filePath: string,
		content: string,
	): ResultAsync<void, FileIOError> {
		return ResultAsync.fromPromise(
			(async () => {
				await Bun.write(filePath, content);
			})(),
			(error) => createFileIOError("writeText", filePath, error),
		);
	}

	function ensureDir(dirPath: string): ResultAsync<void, FileIOError> {
		return ResultAsync.fromPromise(
			(async () => {
				// Bun doesn't have a built-in directory creation function
				// We'll use the Node.js fs module which is available in Bun
				const fs = await import("node:fs");
				await fs.promises.mkdir(dirPath, { recursive: true });
			})(),
			(error) => createFileIOError("ensureDir", dirPath, error),
		);
	}

	function createDir(dirPath: string): ResultAsync<void, FileIOError> {
		return ResultAsync.fromPromise(
			(async () => {
				const fs = await import("node:fs");
				await fs.promises.mkdir(dirPath, { recursive: true });
			})(),
			(error) => createFileIOError("createDir", dirPath, error),
		);
	}

	function deleteFile(filePath: string): ResultAsync<void, FileIOError> {
		return ResultAsync.fromPromise(
			(async () => {
				const fs = await import("node:fs");
				await fs.promises.unlink(filePath);
			})(),
			(error) => createFileIOError("deleteFile", filePath, error),
		);
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
