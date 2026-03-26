import { Either } from "effect";

import {
	getJobAppCurrentStatusEntry,
	isJobAppOverdue,
	type JobApplication,
} from "../../domain/entities/job-application";
import {
	formatDate,
	formatInterestRating,
	getStatusInfo,
	isApplicationOverdue,
} from "../utils/pipeline-utils";
import { escapeHtml } from "../utils/html-escape";

export const renderApplicationTableRow = (app: JobApplication): string => {
	const isOverdue = isApplicationOverdue(app);
	const status = getStatusInfo(app);
	const safeId = escapeHtml(app.id);
	const safeCompany = escapeHtml(app.company);
	const safePositionTitle = escapeHtml(app.positionTitle);
	const safeStatusLabel = escapeHtml(status.label);
	const safeApplicationDate = escapeHtml(app.applicationDate);
	const safeUpdatedAt = escapeHtml(app.updatedAt);

	return `
		<tr id="row-${safeId}"
		    class="application-row ${status.category} ${isOverdue ? "overdue" : ""}"
		    data-testid="application-row-${safeId}"
		    data-app-id="${safeId}">
			<td class="company-cell" data-testid="company-cell-${safeId}">${safeCompany}</td>
			<td class="position-cell" data-testid="position-cell-${safeId}">${safePositionTitle}</td>
			<td class="status-cell" data-testid="status-cell-${safeId}">
				<span class="status-badge ${status.category}" data-testid="status-badge-${safeId}">${safeStatusLabel}</span>
			</td>
			<td
			    class="application-date-cell"
			    data-testid="application-date-cell-${safeId}"
			    data-utc="${safeApplicationDate}"
			>
                ${formatDate(app.applicationDate)}
            </td>
			<td class="updated-date-cell" data-testid="updated-date-cell-${safeId}" data-utc="${safeUpdatedAt}">
                ${formatDate(app.updatedAt)}
                </td>
			<td class="interest-cell" data-testid="interest-cell-${safeId}">${formatInterestRating(
				app.interestRating,
			)}</td>
			<td class="next-event-cell" data-testid="next-event-cell-${safeId}">
				${
					app.nextEventDate
						? `<span class="${
								isOverdue ? "overdue-date" : ""
							}" data-testid="next-event-date-${safeId}" data-utc="${escapeHtml(app.nextEventDate)}">${formatDate(
								app.nextEventDate,
							)}</span>`
						: `<span class="no-date" data-testid="no-next-event-${safeId}">No date set</span>`
				}
			</td>
			<td class="actions-cell" data-testid="actions-cell-${safeId}">
				<button
					type="button"
					class="action-btn edit"
					data-testid="edit-btn-${safeId}"
					hx-get="/applications/${safeId}/edit"
					hx-target="closest tr"
					hx-swap="outerHTML"
					title="Edit Application">✏️</button>
				<button
					type="button"
					class="action-btn view"
					data-testid="view-btn-${safeId}"
					hx-get="/applications/${safeId}/details"
					hx-target="body"
					hx-swap="innerHTML"
					hx-push-url="true"
					title="View Details">👁️</button>
				<button
					type="button"
					class="action-btn delete"
					data-testid="delete-btn-${safeId}"
					hx-delete="/applications/${safeId}"
					hx-target="closest tr"
					hx-swap="outerHTML"
					hx-confirm="Are you sure you want to delete this application?"
					title="Delete Application">🗑️</button>
			</td>
		</tr>
	`;
};

// Render the row in edit mode (all fields as inputs)
export function renderEditableRow(app: JobApplication): string {
	const currentStatusResult = getJobAppCurrentStatusEntry(app);
	const currentStatus = Either.isRight(currentStatusResult)
		? currentStatusResult.right[1]
		: null;
	const isOverdue = isJobAppOverdue(app);

	const statusOptions = [
		"applied",
		"screening interview",
		"interview",
		"onsite",
		"online test",
		"take-home assignment",
		"offer",
		"rejected",
		"no response",
		"no longer interested",
		"hiring freeze",
	];

	const nextEventValue = app.nextEventDate
		? escapeHtml(app.nextEventDate.split("T")[0] ?? "")
		: "";
	const safeId = escapeHtml(app.id);
	const safeCompany = escapeHtml(app.company);
	const safePositionTitle = escapeHtml(app.positionTitle);

	return `
		<tr class="application-row ${currentStatus?.category || "active"} ${
			isOverdue ? "overdue" : ""
		} editing" data-testid="application-row-${safeId}"
		   onkeydown="(function(e,el){if(e.key==='Escape'){e.preventDefault();el.querySelector('[data-testid=cancel-btn-${safeId}]').click();}else if(e.key==='Enter'&&e.target.tagName==='INPUT'){e.preventDefault();el.querySelector('[data-testid=save-btn-${safeId}]').click();}})(event,this)">
			<td class="company-cell" data-testid="company-cell-${safeId}">
				<input
					type="text"
					name="company"
					value="${safeCompany}"
					class="edit-input"
					data-testid="edit-input-company-${safeId}"
					autofocus />
			</td>
			<td class="position-cell" data-testid="position-cell-${safeId}">
				<input
					type="text"
					name="positionTitle"
					value="${safePositionTitle}"
					class="edit-input"
					data-testid="edit-input-position-${safeId}" />
			</td>
			<td class="status-cell" data-testid="status-cell-${safeId}">
				<select
					name="status"
					class="edit-select"
					data-testid="edit-select-status-${safeId}">
					${statusOptions
						.map(
							(status) =>
								`<option value="${status}" ${
									currentStatus?.label === status ? "selected" : ""
								}>${status}</option>`,
						)
						.join("")}
				</select>
			</td>
			<td class="application-date-cell" data-testid="application-date-cell-${safeId}">
				${formatDate(app.applicationDate)}
			</td>
			<td class="updated-date-cell" data-testid="updated-date-cell-${safeId}">
				${formatDate(app.updatedAt)}
			</td>
			<td class="interest-cell" data-testid="interest-cell-${safeId}">
				<select
					name="interestRating"
					class="edit-select"
					data-testid="edit-select-interest-${safeId}">
					<option value="">None</option>
					<option value="1" ${app.interestRating === 1 ? "selected" : ""}>★☆☆</option>
					<option value="2" ${app.interestRating === 2 ? "selected" : ""}>★★☆</option>
					<option value="3" ${app.interestRating === 3 ? "selected" : ""}>★★★</option>
				</select>
			</td>
			<td class="next-event-cell" data-testid="next-event-cell-${safeId}">
				<input
					type="date"
					name="nextEventDate"
					value="${nextEventValue}"
					class="edit-input"
					data-testid="edit-input-nextEvent-${safeId}" />
			</td>
			<td class="actions-cell" data-testid="actions-cell-${safeId}">
				<button
					class="action-btn save"
					data-testid="save-btn-${safeId}"
					hx-put="/applications/${safeId}"
					hx-include="closest tr"
					hx-target="closest tr"
					hx-swap="outerHTML"
					title="Save Changes">💾</button>
				<button
					class="action-btn cancel"
					data-testid="cancel-btn-${safeId}"
					hx-get="/applications/${safeId}"
					hx-target="closest tr"
					hx-swap="outerHTML"
					title="Cancel">✖️</button>
			</td>
		</tr>
	`;
}
