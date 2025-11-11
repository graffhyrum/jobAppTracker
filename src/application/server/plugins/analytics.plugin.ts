import { Elysia } from "elysia";
import { getCurrentDbFromCookie } from "#src/application/server/plugins/db-selector-utils.ts";
import { jobApplicationManagerPlugin } from "#src/application/server/plugins/jobApplicationManager.plugin.ts";
import { computeAnalytics } from "#src/domain/use-cases/analytics.ts";
import { isDevelopment } from "#src/infrastructure/utils/environment-detector.ts";
import { analyticsPage } from "#src/presentation/pages/analytics.ts";

/**
 * Analytics plugin - provides analytics dashboard and visualizations
 */
export const createAnalyticsPlugin = new Elysia()
	.use(jobApplicationManagerPlugin)
	.get("/analytics", async ({ jobApplicationManager, set, cookie }) => {
		// Fetch all applications
		const applicationsResult =
			await jobApplicationManager.getAllJobApplications();

		if (applicationsResult.isErr()) {
			console.error(
				"❌ [Analytics] Failed to fetch applications:",
				applicationsResult.error,
			);
			set.status = 500;
			return `<div class="error-message">Failed to load analytics: ${applicationsResult.error}</div>`;
		}

		const applications = applicationsResult.value;

		// Compute analytics
		const analytics = computeAnalytics(applications);

		// Render analytics page
		set.headers["Content-Type"] = "text/html";
		return analyticsPage(analytics, {
			navbar: {
				isDev: isDevelopment(),
				currentDb: getCurrentDbFromCookie(cookie),
			},
		});
	});
