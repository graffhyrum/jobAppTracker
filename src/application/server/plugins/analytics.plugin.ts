import { type } from "arktype";
import { Either } from "effect";
import { Elysia } from "elysia";

import { contactRepositoryPlugin } from "#src/application/server/plugins/contactRepository.plugin.ts";
import { getCurrentDbFromCookie } from "#src/application/server/plugins/db-selector-utils.ts";
import { interviewStageRepositoryPlugin } from "#src/application/server/plugins/interviewStageRepository.plugin.ts";
import { jobApplicationManagerPlugin } from "#src/application/server/plugins/jobApplicationManager.plugin.ts";
import { runEffect } from "#src/application/server/utils/run-effect.ts";
import { createAnalyticsAggregator } from "#src/domain/use-cases/analytics-aggregator.ts";
import { analyticsPage } from "#src/presentation/pages/analytics.ts";
import { escapeHtml } from "#src/presentation/utils/html-escape.ts";

const analyticsQuerySchema = type({
	"startDate?": "string.date.iso",
	"endDate?": "string.date.iso",
});

/**
 * Analytics plugin - provides analytics dashboard and visualizations
 */
export const createAnalyticsPlugin = new Elysia()
	.use(jobApplicationManagerPlugin)
	.use(contactRepositoryPlugin)
	.use(interviewStageRepositoryPlugin)
	.derive(
		({
			jobApplicationManager,
			contactRepository,
			interviewStageRepository,
		}) => {
			return {
				analyticsAggregator: createAnalyticsAggregator(
					jobApplicationManager,
					contactRepository,
					interviewStageRepository,
				),
			};
		},
	)
	.get(
		"/analytics",
		async ({ analyticsAggregator, set, cookie, query }) => {
			const { startDate, endDate } = query;

			const result = await runEffect(
				analyticsAggregator.computeApplicationAnalytics({
					startDate,
					endDate,
				}),
			);

			if (Either.isLeft(result)) {
				console.error(
					"[Analytics] Failed to compute analytics:",
					escapeHtml(result.left.detail),
				);
				set.status = 500;
				return `<div class="error-message">Failed to load analytics: ${escapeHtml(result.left.detail)}</div>`;
			}

			const { analytics, dateRange } = result.right;

			set.headers["Content-Type"] = "text/html";
			return analyticsPage(
				analytics,
				{
					navbar: {
						currentDb: getCurrentDbFromCookie(cookie),
					},
				},
				dateRange,
			);
		},
		{
			query: analyticsQuerySchema,
		},
	);
