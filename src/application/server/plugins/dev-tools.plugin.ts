import { type } from "arktype";
import { Elysia } from "elysia";
import { isDevelopment } from "#src/infrastructure/utils/environment-detector.ts";
import { COOKIE_MAX_AGE, DEV_DB_COOKIE_NAME } from "./db-selector-constants.ts";

const switchDbBodySchema = type({
	environment: '"test" | "prod"',
});

/**
 * Dev tools plugin - only available in development mode.
 * Provides endpoints for switching between test and prod databases.
 * Uses cookies to persist database selection across requests.
 * Database selection is request-scoped via jobApplicationManagerPlugin.
 */
export const createDevToolsPlugin = new Elysia({ prefix: "/dev" })
	.post(
		"/switch-db",
		({ body, set, cookie }) => {
			// Double-check we're in dev mode (redundant safety check)
			if (!isDevelopment()) {
				set.status = 403;
				return {
					error: "Dev tools are only available in development mode",
				};
			}

			const { environment } = body;

			// Persist selection in cookie - jobApplicationManagerPlugin reads this
			// Non-null assertion is safe here - Elysia creates cookie object on access
			cookie[DEV_DB_COOKIE_NAME]?.set({
				value: environment,
				maxAge: COOKIE_MAX_AGE,
				httpOnly: false, // Need client to read for consistency
				sameSite: "lax",
				path: "/",
			});

			// HTMX: Trigger page refresh so user sees data from new database
			set.headers["HX-Refresh"] = "true";
			set.headers["Content-Type"] = "application/json";

			// Return success response
			return {
				success: true,
				currentEnvironment: environment,
				message: `Switched to ${environment} database`,
			};
		},
		{
			body: switchDbBodySchema,
		},
	)
	.get("/status", ({ set, cookie }) => {
		// Double-check we're in dev mode
		if (!isDevelopment()) {
			set.status = 403;
			return {
				error: "Dev tools are only available in development mode",
			};
		}

		// Read current selection from cookie
		const currentEnv = cookie[DEV_DB_COOKIE_NAME]?.value || "prod";

		set.headers["Content-Type"] = "application/json";
		return {
			currentEnvironment: currentEnv,
			isDevelopment: isDevelopment(),
		};
	});
