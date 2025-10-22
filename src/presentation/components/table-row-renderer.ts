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

export const renderApplicationTableRow = (app: JobApplication): string => {
	const isOverdue = isApplicationOverdue(app);
	const status = getStatusInfo(app);

	return `
		<tr id="row-${app.id}"
		    class="application-row ${status.category} ${isOverdue ? "overdue" : ""}"
		    data-testid="application-row-${app.id}"
		    data-app-id="${app.id}">
			<td class="company-cell" data-testid="company-cell-${app.id}">${app.company}</td>
			<td class="position-cell" data-testid="position-cell-${app.id}">${app.positionTitle}</td>
			<td class="status-cell" data-testid="status-cell-${app.id}">
				<span class="status-badge ${status.category}" data-testid="status-badge-${app.id}">${status.label}</span>
			</td>
			<td 
			    class="application-date-cell" 
			    data-testid="application-date-cell-${app.id}" 
			    data-utc="${app.applicationDate}"
			>
                ${formatDate(app.applicationDate)}
            </td>
			<td class="updated-date-cell" data-testid="updated-date-cell-${app.id}" data-utc="${app.updatedAt}">
                ${formatDate(app.updatedAt)}
                </td>
			<td class="interest-cell" data-testid="interest-cell-${app.id}">${formatInterestRating(
				app.interestRating,
			)}</td>
			<td class="next-event-cell" data-testid="next-event-cell-${app.id}">
				${
					app.nextEventDate
						? `<span class="${
								isOverdue ? "overdue-date" : ""
							}" data-testid="next-event-date-${app.id}" data-utc="${app.nextEventDate}">${formatDate(
								app.nextEventDate,
							)}</span>`
						: `<span class="no-date" data-testid="no-next-event-${app.id}">No date set</span>`
				}
			</td>
			<td class="actions-cell" data-testid="actions-cell-${app.id}">
				<button
					type="button"
					class="action-btn edit"
					data-testid="edit-btn-${app.id}"
					hx-get="/applications/${app.id}/edit"
					hx-target="closest tr"
					hx-swap="outerHTML"
					title="Edit Application">✏️</button>
				<button
					type="button"
					class="action-btn view"
					data-testid="view-btn-${app.id}"
					hx-get="/applications/${app.id}/details"
					hx-target="body"
					hx-swap="innerHTML"
					hx-push-url="true"
					title="View Details">👁️</button>
				<button
					type="button"
					class="action-btn delete"
					data-testid="delete-btn-${app.id}"
					hx-delete="/applications/${app.id}"
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
	const currentStatus = currentStatusResult.isOk()
		? currentStatusResult.value[1]
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
		? app.nextEventDate.split("T")[0]
		: "";

	return `
		<tr class="application-row ${currentStatus?.category || "active"} ${
			isOverdue ? "overdue" : ""
		} editing" data-testid="application-row-${app.id}"
		   onkeydown="(function(e,el){if(e.key==='Escape'){e.preventDefault();el.querySelector('[data-testid=cancel-btn-${app.id}]').click();}else if(e.key==='Enter'&&e.target.tagName==='INPUT'){e.preventDefault();el.querySelector('[data-testid=save-btn-${app.id}]').click();}})(event,this)">
			<td class="company-cell" data-testid="company-cell-${app.id}">
				<input
					type="text"
					name="company"
					value="${app.company}"
					class="edit-input"
					data-testid="edit-input-company-${app.id}"
					autofocus />
			</td>
			<td class="position-cell" data-testid="position-cell-${app.id}">
				<input
					type="text"
					name="positionTitle"
					value="${app.positionTitle}"
					class="edit-input"
					data-testid="edit-input-position-${app.id}" />
			</td>
			<td class="status-cell" data-testid="status-cell-${app.id}">
				<select
					name="status"
					class="edit-select"
					data-testid="edit-select-status-${app.id}">
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
			<td class="application-date-cell" data-testid="application-date-cell-${app.id}">
				${formatDate(app.applicationDate)}
			</td>
			<td class="updated-date-cell" data-testid="updated-date-cell-${app.id}">
				${formatDate(app.updatedAt)}
			</td>
			<td class="interest-cell" data-testid="interest-cell-${app.id}">
				<select
					name="interestRating"
					class="edit-select"
					data-testid="edit-select-interest-${app.id}">
					<option value="">None</option>
					<option value="1" ${app.interestRating === 1 ? "selected" : ""}>★☆☆</option>
					<option value="2" ${app.interestRating === 2 ? "selected" : ""}>★★☆</option>
					<option value="3" ${app.interestRating === 3 ? "selected" : ""}>★★★</option>
				</select>
			</td>
			<td class="next-event-cell" data-testid="next-event-cell-${app.id}">
				<input
					type="date"
					name="nextEventDate"
					value="${nextEventValue}"
					class="edit-input"
					data-testid="edit-input-nextEvent-${app.id}" />
			</td>
			<td class="actions-cell" data-testid="actions-cell-${app.id}">
				<button
					class="action-btn save"
					data-testid="save-btn-${app.id}"
					hx-put="/applications/${app.id}"
					hx-include="closest tr"
					hx-target="closest tr"
					hx-swap="outerHTML"
					title="Save Changes">💾</button>
				<button
					class="action-btn cancel"
					data-testid="cancel-btn-${app.id}"
					hx-get="/applications/${app.id}"
					hx-target="closest tr"
					hx-swap="outerHTML"
					title="Cancel">✖️</button>
			</td>
		</tr>
	`;
}
