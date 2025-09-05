import { ResultAsync } from "neverthrow";
import type { FileIO, FileIOError } from "./file-io";
import { createFileIOError } from "./file-io";

/**
 * Node.js-specific File IO implementation
 */
export function createNodeFileIO(): FileIO {
	function exists(filePath: string): ResultAsync<boolean, FileIOError> {
		return ResultAsync.fromPromise(
			(async () => {
				const fs = await import("node:fs");
				try {
					await fs.promises.access(filePath);
					return true;
				} catch {
					return false;
				}
			})(),
			(error) => createFileIOError("exists", filePath, error),
		);
	}

	function readText(filePath: string): ResultAsync<string, FileIOError> {
		return ResultAsync.fromPromise(
			(async () => {
				const fs = await import("node:fs");
				return await fs.promises.readFile(filePath, "utf8");
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
				const fs = await import("node:fs");
				await fs.promises.writeFile(filePath, content, "utf8");
			})(),
			(error) => createFileIOError("writeText", filePath, error),
		);
	}

	function ensureDir(dirPath: string): ResultAsync<void, FileIOError> {
		return ResultAsync.fromPromise(
			(async () => {
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
