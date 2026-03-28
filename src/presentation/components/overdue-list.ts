import type { OverdueItem } from "#src/domain/use-cases/dashboard-utils.ts";
import { escapeHtml } from "#src/presentation/utils/html-escape.ts";

export function overdueList(items: readonly OverdueItem[]): string {
	if (items.length === 0) {
		return `
		<div class="dashboard-section" data-testid="overdue-section">
			<h2>Overdue Items</h2>
			<p class="empty-state" data-testid="overdue-empty">No overdue items. You're all caught up!</p>
		</div>`;
	}

	const rows = items
		.map(
			(item) => `
			<tr data-testid="overdue-row">
				<td>
					<span class="overdue-indicator" style="color: var(--color-danger, #dc3545); font-weight: bold;" data-testid="overdue-indicator">!</span>
				</td>
				<td><a href="/applications/${escapeHtml(item.id)}">${escapeHtml(item.company)}</a></td>
				<td>${escapeHtml(item.positionTitle)}</td>
				<td>${escapeHtml(item.nextEventDate)}</td>
			</tr>`,
		)
		.join("");

	return `
	<div class="dashboard-section" data-testid="overdue-section">
		<h2>Overdue Items</h2>
		<table class="table" data-testid="overdue-table">
			<thead>
				<tr>
					<th></th>
					<th>Company</th>
					<th>Position</th>
					<th>Due Date</th>
				</tr>
			</thead>
			<tbody>
				${rows}
			</tbody>
		</table>
	</div>`;
}
