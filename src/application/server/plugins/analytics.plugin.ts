import { Elysia } from "elysia";
import { getCurrentDbFromCookie } from "#src/application/server/plugins/db-selector-utils.ts";
import { jobApplicationManagerPlugin } from "#src/application/server/plugins/jobApplicationManager.plugin.ts";
import {
	computeAnalytics,
	computeDefaultDateRange,
	filterApplicationsByDateRange,
} from "#src/domain/use-cases/analytics.ts";
import { analyticsPage } from "#src/presentation/pages/analytics.ts";

/**
 * Analytics plugin - provides analytics dashboard and visualizations
 */
export const createAnalyticsPlugin = new Elysia()
	.use(jobApplicationManagerPlugin)
	.get("/analytics", async ({ jobApplicationManager, set, cookie, query }) => {
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

		const allApplications = applicationsResult.value;

		// Determine date range: use query params or compute default
		let startDate = query.startDate as string | undefined;
		let endDate = query.endDate as string | undefined;

		// If no date range provided, compute default from oldest active application to today
		if (!startDate && !endDate) {
			const defaultRange = computeDefaultDateRange(allApplications);
			startDate = defaultRange.startDate;
			endDate = defaultRange.endDate;
		}

		// Apply date range filtering
		const applications = filterApplicationsByDateRange(allApplications, {
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
					currentDb: getCurrentDbFromCookie(cookie),
				},
			},
			{
				startDate,
				endDate,
			},
		);
	});
