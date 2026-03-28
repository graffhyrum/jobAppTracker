import { Either } from "effect";
import { Elysia } from "elysia";

import { getCurrentDbFromCookie } from "#src/application/server/plugins/db-selector-utils.ts";
import { jobApplicationManagerPlugin } from "#src/application/server/plugins/jobApplicationManager.plugin.ts";
import { runEffect } from "#src/application/server/utils/run-effect.ts";
import {
	computeDashboardStats,
	getOverdueApplications,
	getRecentActivity,
} from "#src/domain/use-cases/dashboard-utils.ts";
import { dashboardPage } from "#src/presentation/pages/dashboard.ts";

export const createDashboardPlugin = new Elysia()
	.use(jobApplicationManagerPlugin)
	.get("/dashboard", async ({ jobApplicationManager, set, cookie }) => {
		const result = await runEffect(
			jobApplicationManager.getAllJobApplications(),
		);

		if (Either.isLeft(result)) {
			set.status = 500;
			return `<div class="error-message">Failed to load dashboard</div>`;
		}

		const applications = result.right;
		const stats = computeDashboardStats(applications);
		const overdueItems = getOverdueApplications(applications);
		const activityEntries = getRecentActivity(applications);

		set.headers["Content-Type"] = "text/html";
		return dashboardPage(stats, overdueItems, activityEntries, {
			navbar: { currentDb: getCurrentDbFromCookie(cookie) },
		});
	});
