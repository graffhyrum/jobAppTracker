import type { JobApplication } from "../../domain/entities/job-application";
import type { PipelineConfig } from "../../domain/entities/pipeline-config";

const formatDate = (dateString: string) => {
	return new Date(dateString).toLocaleDateString();
};

const formatInterestRating = (rating?: number) => {
	if (!rating) return "";
	return "★".repeat(rating) + "☆".repeat(3 - rating);
};

const getStatusCategory = (
	status: string,
	pipelineConfig: PipelineConfig,
): "active" | "inactive" => {
	return pipelineConfig.active.includes(status) ? "active" : "inactive";
};

export const pipelineComponent = (
	pipelineConfig: PipelineConfig,
	applications: JobApplication[] = [],
): string => {
	// Default sort by last updated date (most recent first)
	const sortedApplications = [...applications].sort(
		(a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
	);

	const renderTableRow = (app: JobApplication) => {
		const currentStatus = app.getCurrentStatus();
		const statusText = currentStatus?.current || "No Status";
		const statusCategory = currentStatus
			? getStatusCategory(currentStatus.current, pipelineConfig)
			: "inactive";
		const isOverdue = app.isOverdue();

		return `
			<tr class="application-row ${statusCategory} ${isOverdue ? "overdue" : ""}">
				<td class="company-cell">${app.company}</td>
				<td class="position-cell">${app.positionTitle}</td>
				<td class="status-cell">
					<span class="status-badge ${statusCategory}">${statusText}</span>
				</td>
				<td class="application-date-cell">${formatDate(app.applicationDate)}</td>
				<td class="updated-date-cell">${formatDate(app.updatedAt)}</td>
				<td class="interest-cell">${formatInterestRating(app.interestRating)}</td>
				<td class="next-event-cell">
					${
						app.nextEventDate
							? `<span class="${isOverdue ? "overdue-date" : ""}">${formatDate(app.nextEventDate)}</span>`
							: ""
					}
				</td>
				<td class="actions-cell">
					<button class="action-btn edit" title="Edit">✏️</button>
					<button class="action-btn view" title="View Details">👁️</button>
				</td>
			</tr>
		`;
	};

	return `
		<div id="pipeline-container" class="pipeline-container">
			<div class="pipeline-header">
				<h2>Job Applications</h2>
				<div class="summary-stats">
					<span class="stat active">Active: ${
						applications.filter((app) => {
							const status = app.getCurrentStatus();
							return (
								status &&
								getStatusCategory(status.current, pipelineConfig) === "active"
							);
						}).length
					}</span>
					<span class="stat inactive">Inactive: ${
						applications.filter((app) => {
							const status = app.getCurrentStatus();
							return (
								!status ||
								getStatusCategory(status.current, pipelineConfig) === "inactive"
							);
						}).length
					}</span>
					<span class="stat total">Total: ${applications.length}</span>
				</div>
			</div>
			
			<div class="table-container">
				<table class="applications-table">
					<thead>
						<tr>
							<th class="sortable">Company</th>
							<th class="sortable">Position</th>
							<th class="sortable">Status</th>
							<th class="sortable">Applied</th>
							<th class="sortable">Last Updated</th>
							<th class="sortable">Interest</th>
							<th class="sortable">Next Event</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						${
							sortedApplications.length > 0
								? sortedApplications.map(renderTableRow).join("")
								: `<tr><td colspan="8" class="empty-state">No applications found</td></tr>`
						}
					</tbody>
				</table>
			</div>
		</div>

		<style>
			.pipeline-container {
				background: white;
				border-radius: 8px;
				padding: 24px;
				margin: 20px 0;
				box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
			}

			.pipeline-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 24px;
				flex-wrap: wrap;
				gap: 16px;
			}

			.pipeline-header h2 {
				margin: 0;
				color: #333;
				font-size: 1.5em;
			}

			.summary-stats {
				display: flex;
				gap: 16px;
				flex-wrap: wrap;
			}

			.stat {
				padding: 8px 12px;
				border-radius: 20px;
				font-size: 0.9em;
				font-weight: 600;
			}

			.stat.active {
				background-color: #e8f5e8;
				color: #2d5f2d;
				border: 2px solid #4caf50;
			}

			.stat.inactive {
				background-color: #ffeaef;
				color: #8b2635;
				border: 2px solid #f44336;
			}

			.stat.total {
				background-color: #f5f5f5;
				color: #555;
				border: 2px solid #999;
			}

			.table-container {
				overflow-x: auto;
				border-radius: 8px;
				border: 1px solid #e0e0e0;
			}

			.applications-table {
				width: 100%;
				border-collapse: collapse;
				font-size: 0.9em;
			}

			.applications-table th {
				background-color: #f8f9fa;
				color: #495057;
				font-weight: 600;
				padding: 12px 8px;
				text-align: left;
				border-bottom: 2px solid #e0e0e0;
				position: sticky;
				top: 0;
			}

			.applications-table th.sortable {
				cursor: pointer;
				user-select: none;
				transition: background-color 0.2s ease;
			}

			.applications-table th.sortable:hover {
				background-color: #e9ecef;
			}

			.applications-table td {
				padding: 12px 8px;
				border-bottom: 1px solid #e0e0e0;
				vertical-align: top;
			}

			.application-row:hover {
				background-color: #f8f9fa;
			}

			.application-row.overdue {
				background-color: #fff5f5;
			}

			.application-row.overdue:hover {
				background-color: #ffeaea;
			}

			.company-cell {
				font-weight: 600;
				color: #333;
				min-width: 120px;
			}

			.position-cell {
				color: #555;
				min-width: 150px;
			}

			.status-cell {
				min-width: 100px;
			}

			.status-badge {
				padding: 4px 8px;
				border-radius: 12px;
				font-size: 0.8em;
				font-weight: 600;
				text-transform: capitalize;
				white-space: nowrap;
			}

			.status-badge.active {
				background-color: #e8f5e8;
				color: #2d5f2d;
				border: 1px solid #4caf50;
			}

			.status-badge.inactive {
				background-color: #ffeaef;
				color: #8b2635;
				border: 1px solid #f44336;
			}

			.application-date-cell,
			.updated-date-cell,
			.next-event-cell {
				color: #666;
				font-size: 0.85em;
				min-width: 90px;
			}

			.interest-cell {
				color: #ffd700;
				font-size: 1.1em;
				min-width: 80px;
			}

			.overdue-date {
				color: #d32f2f;
				font-weight: 600;
			}

			.actions-cell {
				min-width: 80px;
			}

			.action-btn {
				background: none;
				border: none;
				cursor: pointer;
				font-size: 1.1em;
				padding: 4px;
				margin: 0 2px;
				border-radius: 4px;
				transition: background-color 0.2s ease;
			}

			.action-btn:hover {
				background-color: rgba(0, 0, 0, 0.1);
			}

			.empty-state {
				text-align: center;
				color: #999;
				font-style: italic;
				padding: 40px;
			}

			@media (max-width: 768px) {
				.pipeline-header {
					flex-direction: column;
					align-items: stretch;
				}

				.summary-stats {
					justify-content: center;
				}

				.table-container {
					font-size: 0.8em;
				}

				.applications-table th,
				.applications-table td {
					padding: 8px 4px;
				}

				/* Hide less important columns on mobile */
				.updated-date-cell,
				.interest-cell {
					display: none;
				}

				/* Stack company and position */
				.company-cell {
					min-width: 100px;
				}
				
				.position-cell {
					min-width: 120px;
				}
			}

			@media (max-width: 480px) {
				.application-date-cell {
					display: none;
				}
				
				.next-event-cell {
					display: none;
				}
			}
		</style>
	`;
};
