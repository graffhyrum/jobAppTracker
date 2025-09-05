import { randomUUID } from "node:crypto";
import type { UUIDGeneration } from "./uuid-generation.ts";

/**
 * Node.js crypto-based UUID generation implementation
 */
export function createNodeUUIDGeneration(): UUIDGeneration {
	return {
		generateUUID: () => randomUUID(),
	};
}
