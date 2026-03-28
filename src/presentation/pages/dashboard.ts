import type {
	ActivityEntry,
	DashboardStats,
	OverdueItem,
} from "#src/domain/use-cases/dashboard-utils.ts";

import { type LayoutOptions, layout } from "../components/layout.ts";
import { overdueList } from "../components/overdue-list.ts";
import { recentActivity } from "../components/recent-activity.ts";

export function dashboardPage(
	stats: DashboardStats,
	overdueItems: readonly OverdueItem[],
	activityEntries: readonly ActivityEntry[],
	layoutOptions: LayoutOptions = {},
): string {
	const content = `
		<div class="dashboard-page">
			<div class="page-header">
				<div class="header-content">
					<h1 data-testid="page-title">Dashboard</h1>
				</div>
			</div>

			<div class="analytics-summary" data-testid="stats-bar">
				<div class="summary-card">
					<h3>Total Applications</h3>
					<div class="summary-value" data-testid="stat-total">${stats.totalApplications}</div>
				</div>
				<div class="summary-card">
					<h3>Active</h3>
					<div class="summary-value" data-testid="stat-active">${stats.activeApplications}</div>
				</div>
				<div class="summary-card">
					<h3>Upcoming (7 days)</h3>
					<div class="summary-value" data-testid="stat-upcoming">${stats.upcomingInSevenDays}</div>
				</div>
			</div>

			${overdueList(overdueItems)}
			${recentActivity(activityEntries)}
		</div>`;

	return layout("Dashboard", content, layoutOptions);
}
