import { isDevelopment } from "#src/infrastructure/utils/environment-detector.ts";
import { DEV_DB_COOKIE_NAME } from "./db-selector-constants.ts";

/**
 * Helper to get current database selection from cookie for navbar display.
 * In development mode, reads the cookie to determine which database is selected.
 * In production mode, always returns "prod".
 */
export function getCurrentDbFromCookie(
	cookie: Record<string, unknown>,
): "test" | "prod" {
	if (!isDevelopment()) return "prod";

	const cookieObj = cookie[DEV_DB_COOKIE_NAME];
	if (
		typeof cookieObj === "object" &&
		cookieObj !== null &&
		"value" in cookieObj
	) {
		const value = cookieObj.value;
		return value === "test" || value === "prod" ? value : "prod";
	}
	return "prod";
}
