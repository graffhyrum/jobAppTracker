/**
 * UUID Generation abstraction port
 * Provides cross-runtime UUID generation
 */
export interface UUIDGeneration {
	/**
	 * Generate a UUID
	 */
	generateUUID(): string;
}
