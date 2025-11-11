import {
	camelCaseToHyphenated,
	camelCaseToSpaceSeparatedLower,
	camelCaseToSpaceSeparatedUpper,
} from "#src/presentation/utils/string-conversions.ts";
import type { JobApplication } from "../../domain/entities/job-application";
import { processApplicationData } from "../utils/pipeline-utils";
import { renderApplicationTableRow } from "./table-row-renderer";

export function pipelineComponent(
	applications: JobApplication[] = [],
	sortColumn?: Column,
	sortDirection?: "asc" | "desc",
): string {
	const { stats } = processApplicationData(applications);

	// Apply server-side sorting
	const sortedApplications = sortApplications(
		applications,
		sortColumn || "updatedAt",
		sortDirection || "desc",
	);

	return `
		<div id="pipeline-container" class="pipeline-container" data-testid="pipeline-container"
			hx-on:htmx:responseError="(function(ev,el){try{const t=ev.detail && ev.detail.requestConfig && ev.detail.requestConfig.target; const row=t && t.closest ? t.closest('tr') : null; const e=row?row.querySelector('[data-testid=inline-error]'):null; if(e){ e.textContent='Error updating application. Please try again.'; e.hidden=false; e.removeAttribute('hidden'); e.style.display='block'; }}catch(_) {}})(event,this)"
			hx-on:htmx:sendError="(function(ev,el){try{const t=ev.detail && ev.detail.requestConfig && ev.detail.requestConfig.target; const row=t && t.closest ? t.closest('tr') : null; const e=row?row.querySelector('[data-testid=inline-error]'):null; if(e){ e.textContent='Network error. Please check your connection and try again.'; e.hidden=false; e.removeAttribute('hidden'); e.style.display='block'; }}catch(_) {}})(event,this)"
			hx-on:htmx:afterOnLoad="(function(ev,el){try{const t=ev.detail && ev.detail.requestConfig && ev.detail.requestConfig.target; const row=t && t.closest ? t.closest('tr') : null; const e=row?row.querySelector('[data-testid=inline-error]'):null; if(e){ e.hidden=true; e.setAttribute('hidden',''); e.textContent=''; e.style.display=''; }}catch(_) {}})(event,this)">
			<div class="pipeline-header">
				<h2>Job Applications</h2>
				<div class="summary-stats">
					<span class="stat active">Active: ${stats.active}</span>
					<span class="stat inactive">Inactive: ${stats.inactive}</span>
					<span class="stat total">Total: ${stats.total}</span>
				</div>
			</div>

			
			<div class="table-tools" data-testid="table-tools">
				<div class="search">
					<input
						type="search"
						id="search-filter"
						name="q"
						data-testid="search-filter"
						placeholder="Search applications..."
						aria-label="Search applications"
						hx-get="/applications/search"
						hx-trigger="keyup changed delay:300ms, search"
						hx-target="#applications-tbody"
						hx-swap="innerHTML"
						hx-indicator="#search-indicator"
						autocomplete="off"
						inputmode="search"
					/>
					<span id="search-indicator" class="htmx-indicator" aria-hidden="true">Loading…</span>
				</div>
			</div>
			<div class="table-container">
				<table class="applications-table" id="applications-table" data-testid="applications-table" role="table" aria-label="Job applications">
					${pipelineHeaderComponent(sortColumn, sortDirection)}
					<tbody id="applications-tbody" data-testid="applications-tbody" hx-target="closest tr" hx-swap="outerHTML">
						${
							sortedApplications.length > 0
								? sortedApplications.map(renderApplicationTableRow).join("")
								: `<tr><td colspan="8" class="empty-state">No applications found</td></tr>`
						}
					</tbody>
				</table>
				
			</div>
		</div>
		<link rel="stylesheet" href="/styles/pipeline.css">
	`;
}

function pipelineHeaderComponent(
	sortColumn?: Column,
	sortDirection?: "asc" | "desc",
) {
	const headerKeys: Column[] = [
		"company",
		"positionTitle",
		"status",
		"applicationDate",
		"updatedAt",
		"interestRating",
		"nextEventDate",
	];
	return `
    <thead>
    <tr>
    ${headerKeys
			.map(
				(key) => `
<th
    class="sortable cursor-pointer"
    hx-get="${getSortUrl(key, sortColumn, sortDirection)}"
    hx-target="#pipeline-container"
	hx-swap="outerHTML"
	title="Click to sort by ${camelCaseToSpaceSeparatedLower(key)}"
	data-testid="${camelCaseToHyphenated(key)}-header"
	>
	${camelCaseToSpaceSeparatedUpper(key)}
	<span class="sort-indicator">${getSortIndicator(key, sortColumn, sortDirection)}</span>
</th>
`,
			)
			.join("")}
    <th>Actions</th>
    </tr>
    </thead>
   
    `;
}

function sortApplications(
	applications: JobApplication[],
	column: Column,
	direction: "asc" | "desc",
): JobApplication[] {
	return [...applications].sort((a, b) => {
		let aVal: string | number;
		let bVal: string | number;

		switch (column) {
			case "company":
				aVal = a.company.toLowerCase();
				bVal = b.company.toLowerCase();
				break;
			case "positionTitle":
				aVal = a.positionTitle.toLowerCase();
				bVal = b.positionTitle.toLowerCase();
				break;
			case "status": {
				// Get current status from statusLog
				const aStatus = a.statusLog.at(-1)?.[1]?.label || "";
				const bStatus = b.statusLog.at(-1)?.[1]?.label || "";
				aVal = aStatus.toLowerCase();
				bVal = bStatus.toLowerCase();
				break;
			}
			case "applicationDate":
				aVal = new Date(a.applicationDate).getTime();
				bVal = new Date(b.applicationDate).getTime();
				break;
			case "interestRating":
				aVal = a.interestRating || 0;
				bVal = b.interestRating || 0;
				break;
			case "nextEventDate":
				aVal = a.nextEventDate ? new Date(a.nextEventDate).getTime() : 0;
				bVal = b.nextEventDate ? new Date(b.nextEventDate).getTime() : 0;
				break;
			// biome-ignore lint: explicitness
			case "updatedAt":
			default:
				aVal = new Date(a.updatedAt).getTime();
				bVal = new Date(b.updatedAt).getTime();
		}

		const comparisonResult = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
		return direction === "asc" ? comparisonResult : -comparisonResult;
	});
}

function getSortUrl(
	column: Column,
	currentColumn?: string,
	currentDirection?: "asc" | "desc",
): string {
	let direction: "asc" | "desc" = "asc";

	// If clicking the same column, toggle a direction
	if (column === currentColumn) {
		direction = currentDirection === "asc" ? "desc" : "asc";
	}

	return `/api/pipeline?sortColumn=${column}&sortDirection=${direction}`;
}

function getSortIndicator(
	column: Column,
	currentColumn?: string,
	currentDirection?: "asc" | "desc",
): string {
	if (column === currentColumn) {
		return currentDirection === "asc" ? "🔼" : "🔽";
	}
	return "↕️";
}

// Status is an object, but we want a string for a key here.
export type Column = keyof JobApplication | "status";
