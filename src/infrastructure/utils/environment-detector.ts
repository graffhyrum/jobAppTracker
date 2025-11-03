/**
 * Environment detection utilities for distinguishing dev vs production contexts.
 *
 * Dev context: Running via `bun dev` or `bun run src/index.ts`
 * Production context: Running built binary from `dist/jobapptracker`
 */

/**
 * Detects if the application is running in development mode.
 *
 * Checks:
 * 1. Bun.main path - if it's in src/ directory, we're in dev
 * 2. NODE_ENV environment variable
 *
 * @returns true if in development mode, false if in production
 */
export function isDevelopment(): boolean {
	// Check if main file is in src/ directory (dev mode)
	if (Bun.main.includes("/src/") || Bun.main.includes("\\src\\")) {
		return true;
	}

	// Check NODE_ENV
	if (process.env.NODE_ENV === "development") {
		return true;
	}

	// Default to production for safety
	return false;
}

/**
 * Detects if the application is running as a production binary.
 *
 * @returns true if in production mode, false if in development
 */
export function isProduction(): boolean {
	return !isDevelopment();
}

/**
 * Gets the current environment name.
 *
 * @returns "development" or "production"
 */
export function getEnvironment(): "development" | "production" {
	return isDevelopment() ? "development" : "production";
}
