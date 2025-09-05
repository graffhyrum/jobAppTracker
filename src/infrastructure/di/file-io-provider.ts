import { createBunFileIO } from "../file-io/bun-file-io.ts";
import type { FileIO } from "../file-io/file-io.ts";
import { createNodeFileIO } from "../file-io/node-file-io.ts";

/**
 * Runtime types for File IO provider
 */
export type RuntimeType = "bun" | "node";

/**
 * Dependency injection provider for FileIO
 */
const configMap = {
	bun: createBunFileIO,
	node: createNodeFileIO,
} as const satisfies Record<RuntimeType, () => FileIO>;
const bunInScope = typeof Bun !== "undefined" && typeof Bun.file === "function";
const key: RuntimeType = bunInScope ? "bun" : "node";
const instance = configMap[key]();

function getFileIO(): FileIO {
	return instance;
}

// Create and export a singleton instance
export const fileIOProvider = getFileIO();
