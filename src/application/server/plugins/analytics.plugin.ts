import { Elysia } from "elysia";
import { contactRepositoryPlugin } from "#src/application/server/plugins/contactRepository.plugin.ts";
import { getCurrentDbFromCookie } from "#src/application/server/plugins/db-selector-utils.ts";
import { interviewStageRepositoryPlugin } from "#src/application/server/plugins/interviewStageRepository.plugin.ts";
import { jobApplicationManagerPlugin } from "#src/application/server/plugins/jobApplicationManager.plugin.ts";
import { createAnalyticsAggregator } from "#src/domain/use-cases/analytics-aggregator.ts";
import { isDevelopment } from "#src/infrastructure/utils/environment-detector.ts";
import { analyticsPage } from "#src/presentation/pages/analytics.ts";

/**
 * Analytics plugin - provides analytics dashboard and visualizations
 */
export const createAnalyticsPlugin = new Elysia()
	.use(jobApplicationManagerPlugin)
	.use(contactRepositoryPlugin)
	.use(interviewStageRepositoryPlugin)
	.derive(
		({ jobApplicationManager, contactRepository, interviewStageRepository }) => {
			return {
				analyticsAggregator: createAnalyticsAggregator(
					jobApplicationManager,
					contactRepository,
					interviewStageRepository,
				),
			};
		},
	)
	.get("/analytics", async ({ analyticsAggregator, set, cookie, query }) => {
		// Determine date range from query params
		const startDate = query.startDate as string | undefined;
		const endDate = query.endDate as string | undefined;

		// Compute application analytics using the aggregator
		const result = await analyticsAggregator.computeApplicationAnalytics({
			startDate,
			endDate,
		});

		if (result.isErr()) {
			console.error(
				"❌ [Analytics] Failed to compute analytics:",
				result.error,
			);
			set.status = 500;
			return `<div class="error-message">Failed to load analytics: ${result.error}</div>`;
		}

		const { analytics, dateRange } = result.value;

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
			dateRange,
		);
	});
