import { Elysia } from "elysia";
import { jobAppManagerRegistry } from "#src/domain/use-cases/create-sqlite-job-app-manager.ts";
import { isDevelopment } from "#src/infrastructure/utils/environment-detector.ts";
import { DEV_DB_COOKIE_NAME } from "./db-selector-constants.ts";

/**
 * Plugin that provides request-scoped job application manager.
 * In development mode, reads cookie to determine which database to use.
 * In production mode, always uses the default configured database.
 *
 * Uses derive() to create a unique manager reference per request,
 * making this thread-safe for concurrent requests.
 */
export const jobApplicationManagerPlugin = new Elysia({
	name: "jobApplicationManager",
})
	.derive(({ cookie }) => {
		let selectedEnv = jobAppManagerRegistry.getDefaultEnvironment();

		// In development mode, check cookie for database selection
		if (isDevelopment()) {
			const cookieValue = cookie[DEV_DB_COOKIE_NAME]?.value;
			if (cookieValue === "test" || cookieValue === "prod") {
				selectedEnv = cookieValue;
			}
		}

		// Get manager for selected environment (thread-safe, no global mutation)
		return {
			jobApplicationManager: jobAppManagerRegistry.getManager(selectedEnv),
		};
	})
	.as("scoped");
