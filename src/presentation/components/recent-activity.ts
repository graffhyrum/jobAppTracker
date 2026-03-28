import type { ActivityEntry } from "#src/domain/use-cases/dashboard-utils.ts";
import { escapeHtml } from "#src/presentation/utils/html-escape.ts";

export function recentActivity(entries: readonly ActivityEntry[]): string {
	if (entries.length === 0) {
		return `
		<div class="dashboard-section" data-testid="activity-section">
			<h2>Recent Activity</h2>
			<p class="empty-state" data-testid="activity-empty">No recent activity yet.</p>
		</div>`;
	}

	const rows = entries
		.map(
			(entry) => `
			<tr data-testid="activity-row">
				<td>${escapeHtml(entry.company)}</td>
				<td>${escapeHtml(entry.oldStatusLabel)}</td>
				<td>${escapeHtml(entry.newStatusLabel)}</td>
				<td>${escapeHtml(entry.timestamp)}</td>
			</tr>`,
		)
		.join("");

	return `
	<div class="dashboard-section" data-testid="activity-section">
		<h2>Recent Activity</h2>
		<table class="table" data-testid="activity-table">
			<thead>
				<tr>
					<th>Company</th>
					<th>From</th>
					<th>To</th>
					<th>Date</th>
				</tr>
			</thead>
			<tbody>
				${rows}
			</tbody>
		</table>
	</div>`;
}
