import { Elysia } from "elysia";
import { getCurrentDbFromCookie } from "#src/application/server/plugins/db-selector-utils.ts";
import { jobApplicationManagerPlugin } from "#src/application/server/plugins/jobApplicationManager.plugin.ts";
import {
	computeAnalytics,
	filterApplicationsByDateRange,
} from "#src/domain/use-cases/analytics.ts";
import { isDevelopment } from "#src/infrastructure/utils/environment-detector.ts";
import { analyticsPage } from "#src/presentation/pages/analytics.ts";

/**
 * Analytics plugin - provides analytics dashboard and visualizations
 */
export const createAnalyticsPlugin = new Elysia()
	.use(jobApplicationManagerPlugin)
	.get("/analytics", async ({ jobApplicationManager, set, cookie, query }) => {
		// Extract date range from query parameters
		const startDate = query.startDate as string | undefined;
		const endDate = query.endDate as string | undefined;

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

		let applications = applicationsResult.value;

		// Apply date range filtering
		applications = filterApplicationsByDateRange(applications, {
			startDate,
			endDate,
		});

		// Compute analytics
		const analytics = computeAnalytics(applications);

		// Render analytics page
		set.headers["Content-Type"] = "text/html";
		return analyticsPage(
			analytics,
			{
				navbar: {
					isDev: isDevelopment(),
					currentDb: getCurrentDbFromCookie(cookie),
				},
			},
			{
				startDate,
				endDate,
			},
		);
	});
