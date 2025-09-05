import type { UUIDGeneration } from "./uuid-generation.ts";

/**
 * Bun-specific UUID generation implementation using randomUUIDv7
 */
export function createBunUUIDGeneration(): UUIDGeneration {
	return {
		generateUUID: () => Bun.randomUUIDv7(),
	};
}
