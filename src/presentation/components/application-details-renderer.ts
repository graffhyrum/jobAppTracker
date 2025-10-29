import {
	getJobAppCurrentStatusEntry,
	type JobApplication,
} from "../../domain/entities/job-application";
import {
	activeStatuses,
	formatDate,
	formatInterestRating,
	getStatusInfo,
	inactiveStatuses,
	isApplicationOverdue,
} from "../utils/pipeline-utils";

export const renderApplicationDetailsView = (app: JobApplication): string => {
	const status = getStatusInfo(app);
	const isOverdue = isApplicationOverdue(app);

	// Prepare status log for timeline display
	const statusLogHtml = app.statusLog
		.map(([datetime, statusObj]) => {
			const date = formatDate(datetime);
			const label =
				typeof statusObj === "object" && "label" in statusObj
					? statusObj.label
					: String(statusObj);
			const category =
				typeof statusObj === "object" && "category" in statusObj
					? statusObj.category
					: "active";
			return `
				<div class="status-log-entry" data-testid="status-log-entry">
					<span class="status-log-date" data-utc="${datetime}">${date}</span>
					<span class="status-badge ${category}">${label}</span>
				</div>
			`;
		})
		.reverse()
		.join("");

	return `
		<div id="details-content" data-testid="details-content-${app.id}">
			<div class="details-action-bar" data-testid="details-action-bar">
				<button
					type="button"
					class="action-btn back"
					data-testid="back-btn"
					hx-get="/"
					hx-target="body"
					hx-swap="innerHTML"
					hx-push-url="true"
					title="Back to List">← Back</button>
				<div class="action-bar-spacer"></div>
				<button
					type="button"
					class="action-btn edit"
					data-testid="edit-details-btn-${app.id}"
					hx-get="/applications/${app.id}/details/edit"
					hx-target="#details-content"
					hx-swap="innerHTML"
					title="Edit Application">✏️ Edit</button>
				<button
					type="button"
					class="action-btn delete"
					data-testid="delete-details-btn-${app.id}"
					hx-delete="/applications/${app.id}"
					hx-confirm="Are you sure you want to delete this application?"
					title="Delete Application">🗑️ Delete</button>
			</div>

			<div class="application-details ${status.category} ${isOverdue ? "overdue" : ""}" data-testid="application-details-${app.id}">
				<div class="details-grid">
					<div class="details-section">
						<h2>Application Information</h2>

						<div class="details-field" data-testid="field-company">
							<label>Company</label>
							<div class="field-value">${app.company}</div>
						</div>

						<div class="details-field" data-testid="field-position">
							<label>Position</label>
							<div class="field-value">${app.positionTitle}</div>
						</div>

						<div class="details-field" data-testid="field-application-date">
							<label>Application Date</label>
							<div class="field-value" data-utc="${app.applicationDate}">${formatDate(app.applicationDate)}</div>
						</div>

						<div class="details-field" data-testid="field-status">
							<label>Status</label>
							<div class="field-value">
								<span class="status-badge ${status.category}">${status.label}</span>
							</div>
						</div>

						<div class="details-field" data-testid="field-interest-rating">
							<label>Interest Rating</label>
							<div class="field-value">${formatInterestRating(app.interestRating)}</div>
						</div>

						<div class="details-field" data-testid="field-next-event">
							<label>Next Event Date</label>
							<div class="field-value">
								${
									app.nextEventDate
										? `<span class="${isOverdue ? "overdue-date" : ""}" data-utc="${app.nextEventDate}">${formatDate(app.nextEventDate)}</span>`
										: `<span class="no-date">No date set</span>`
								}
							</div>
						</div>
					</div>

					<div class="details-section">
						<h2>Additional Details</h2>

						<div class="details-field" data-testid="field-job-url">
							<label>Job Posting URL</label>
							<div class="field-value">
								${
									app.jobPostingUrl
										? `<a href="${app.jobPostingUrl}" target="_blank" rel="noopener noreferrer">${app.jobPostingUrl}</a>`
										: `<span class="no-data">Not provided</span>`
								}
							</div>
						</div>

						<div class="details-field" data-testid="field-job-description">
							<label>Job Description</label>
							<div class="field-value description-text">
								${app.jobDescription ? app.jobDescription : `<span class="no-data">Not provided</span>`}
							</div>
						</div>
					</div>
				</div>

				<div class="details-metadata">
					<h2>Metadata</h2>
					<div class="metadata-grid">
						<div class="details-field" data-testid="field-created-at">
							<label>Created</label>
							<div class="field-value" data-utc="${app.createdAt}">${formatDate(app.createdAt)}</div>
						</div>

						<div class="details-field" data-testid="field-updated-at">
							<label>Last Updated</label>
							<div class="field-value" data-utc="${app.updatedAt}">${formatDate(app.updatedAt)}</div>
						</div>
					</div>
				</div>

				<div class="details-status-history">
					<details data-testid="status-history-disclosure">
						<summary>
							<h2>Status History (${app.statusLog.length} entries)</h2>
						</summary>
						<div class="status-timeline" data-testid="status-timeline">
							${statusLogHtml}
						</div>
					</details>
				</div>

				<div
					id="interview-stages-container"
					hx-get="/applications/${app.id}/interview-stages"
					hx-trigger="load"
					hx-swap="innerHTML"
					data-testid="interview-stages-container">
					<p class="loading-text">Loading interview stages...</p>
				</div>

				<div
					id="contacts-container"
					hx-get="/applications/${app.id}/contacts"
					hx-trigger="load"
					hx-swap="innerHTML"
					data-testid="contacts-container">
					<p class="loading-text">Loading contacts...</p>
				</div>

				<div class="placeholder-section" data-testid="notes-placeholder">
					<h2>Notes</h2>
					<p class="placeholder-text">Note editing functionality coming soon...</p>
				</div>
			</div>
		</div>
	`;
};

export const renderApplicationDetailsEdit = (app: JobApplication): string => {
	const currentStatusResult = getJobAppCurrentStatusEntry(app);
	const currentStatus = currentStatusResult.isOk()
		? currentStatusResult.value[1]
		: null;
	const _isOverdue = isApplicationOverdue(app);

	const allStatuses = [...activeStatuses, ...inactiveStatuses];

	const applicationDateValue = app.applicationDate
		? app.applicationDate.split("T")[0]
		: "";
	const nextEventValue = app.nextEventDate
		? app.nextEventDate.split("T")[0]
		: "";

	return `
		<div id="details-content" data-testid="details-content-${app.id}">
			<div class="details-action-bar" data-testid="details-action-bar">
				<button
					type="button"
					class="action-btn back"
					data-testid="back-btn"
					hx-get="/"
					hx-target="body"
					hx-swap="innerHTML"
					hx-push-url="true"
					title="Back to List">← Back</button>
				<div class="action-bar-spacer"></div>
				<button
					type="button"
					class="action-btn save"
					data-testid="save-details-btn-${app.id}"
					hx-put="/applications/${app.id}/details"
					hx-include="#details-form"
					hx-target="#details-content"
					hx-swap="innerHTML"
					title="Save Changes">💾 Save</button>
				<button
					type="button"
					class="action-btn cancel"
					data-testid="cancel-details-btn-${app.id}"
					hx-get="/applications/${app.id}/details"
					hx-target="#details-content"
					hx-swap="innerHTML"
					title="Cancel">✖️ Cancel</button>
			</div>

			<form id="details-form" class="application-details editing" data-testid="application-details-${app.id}"
				onkeydown="(function(e){if(e.key==='Escape'){e.preventDefault();document.querySelector('[data-testid=cancel-details-btn-${app.id}]').click();}else if(e.key==='Enter'&&e.target.tagName==='INPUT'){e.preventDefault();document.querySelector('[data-testid=save-details-btn-${app.id}]').click();}})(event)">
				<div class="details-grid">
					<div class="details-section">
						<h2>Application Information</h2>

						<div class="details-field" data-testid="field-company">
							<label for="company-input">Company</label>
							<input
								id="company-input"
								type="text"
								name="company"
								value="${app.company}"
								class="edit-input"
								data-testid="edit-input-company-${app.id}"
								required
								autofocus />
						</div>

						<div class="details-field" data-testid="field-position">
							<label for="position-input">Position</label>
							<input
								id="position-input"
								type="text"
								name="positionTitle"
								value="${app.positionTitle}"
								class="edit-input"
								data-testid="edit-input-position-${app.id}"
								required />
						</div>

						<div class="details-field" data-testid="field-application-date">
							<label for="application-date-input">Application Date</label>
							<input
								id="application-date-input"
								type="date"
								name="applicationDate"
								value="${applicationDateValue}"
								class="edit-input"
								data-testid="edit-input-applicationDate-${app.id}"
								required />
						</div>

						<div class="details-field" data-testid="field-status">
							<label for="status-select">Status</label>
							<select
								id="status-select"
								name="status"
								class="edit-select"
								data-testid="edit-select-status-${app.id}">
								${allStatuses
									.map(
										(status) =>
											`<option value="${status}" ${currentStatus?.label === status ? "selected" : ""}>${status}</option>`,
									)
									.join("")}
							</select>
						</div>

						<div class="details-field" data-testid="field-interest-rating">
							<label for="interest-select">Interest Rating</label>
							<select
								id="interest-select"
								name="interestRating"
								class="edit-select"
								data-testid="edit-select-interest-${app.id}">
								<option value="">None</option>
								<option value="1" ${app.interestRating === 1 ? "selected" : ""}>★☆☆</option>
								<option value="2" ${app.interestRating === 2 ? "selected" : ""}>★★☆</option>
								<option value="3" ${app.interestRating === 3 ? "selected" : ""}>★★★</option>
							</select>
						</div>

						<div class="details-field" data-testid="field-next-event">
							<label for="next-event-input">Next Event Date</label>
							<input
								id="next-event-input"
								type="date"
								name="nextEventDate"
								value="${nextEventValue}"
								class="edit-input"
								data-testid="edit-input-nextEvent-${app.id}" />
						</div>
					</div>

					<div class="details-section">
						<h2>Additional Details</h2>

						<div class="details-field" data-testid="field-job-url">
							<label for="job-url-input">Job Posting URL</label>
							<input
								id="job-url-input"
								type="url"
								name="jobPostingUrl"
								value="${app.jobPostingUrl || ""}"
								class="edit-input"
								data-testid="edit-input-jobPostingUrl-${app.id}"
								placeholder="https://..." />
						</div>

						<div class="details-field" data-testid="field-job-description">
							<label for="job-description-textarea">Job Description</label>
							<textarea
								id="job-description-textarea"
								name="jobDescription"
								class="edit-textarea"
								data-testid="edit-textarea-jobDescription-${app.id}"
								rows="10"
								placeholder="Enter job description...">${app.jobDescription || ""}</textarea>
						</div>
					</div>
				</div>

				<div class="details-metadata">
					<h2>Metadata</h2>
					<div class="metadata-grid">
						<div class="details-field" data-testid="field-created-at">
							<label>Created</label>
							<div class="field-value" data-utc="${app.createdAt}">${formatDate(app.createdAt)}</div>
						</div>

						<div class="details-field" data-testid="field-updated-at">
							<label>Last Updated</label>
							<div class="field-value" data-utc="${app.updatedAt}">${formatDate(app.updatedAt)}</div>
						</div>
					</div>
				</div>

				<div class="placeholder-section" data-testid="notes-placeholder">
					<h2>Notes</h2>
					<p class="placeholder-text">Note editing functionality coming soon...</p>
				</div>
			</form>
		</div>
	`;
};
