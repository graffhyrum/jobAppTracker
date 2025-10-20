import { createBunUUIDGeneration } from "../uuid-generation/bun-uuid-generation.ts";
import { createNodeUUIDGeneration } from "../uuid-generation/node-uuid-generation.ts";
import type { UUIDGeneration } from "../uuid-generation/uuid-generation.ts";

/**
 * Runtime types for UUID Generation provider
 */
export type RuntimeType = "bun" | "node";

/**
 * Dependency injection provider for UUIDGeneration
 */
const configMap = {
	bun: createBunUUIDGeneration,
	node: createNodeUUIDGeneration,
} as const satisfies Record<RuntimeType, () => UUIDGeneration>;
const bunInScope =
	typeof Bun !== "undefined" && typeof Bun.randomUUIDv7 === "function";
const key: RuntimeType = bunInScope ? "bun" : "node";
const instance = configMap[key]();

function getUUIDGeneration(): UUIDGeneration {
	return instance;
}

// Create and export a singleton instance
export const uuidProvider = getUUIDGeneration();
