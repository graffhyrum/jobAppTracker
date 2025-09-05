import type {
	JobApplication,
	JobApplicationForCreate,
} from "../../domain/entities/job-application";
import {
	createDefaultPipelineConfig,
	type PipelineConfig,
} from "../../domain/entities/pipeline-config";
import type { JobApplicationUseCases } from "../../domain/use-cases/job-application-use-cases";

export function createApplicationsRoutes(useCases: JobApplicationUseCases) {
	return {
		handleGetApplication: async (
			_request: Request,
			applicationId: string,
		): Promise<Response> => {
			try {
				const result = await useCases.getJobApplication(applicationId);
				if (result.isErr()) {
					return new Response(`Error: ${result.error.message}`, {
						status: 404,
						headers: { "Content-Type": "text/plain" },
					});
				}

				const app = result.value;
				if (!app) {
					return new Response("Application not found", {
						status: 404,
						headers: { "Content-Type": "text/plain" },
					});
				}

				const pipelineConfig = createDefaultPipelineConfig();

				return new Response(renderApplicationDisplayRow(app, pipelineConfig), {
					headers: { "Content-Type": "text/html" },
				});
			} catch (error) {
				console.error("Unexpected error fetching application:", error);
				return new Response(
					`Error: ${error instanceof Error ? error.message : String(error)}`,
					{
						status: 500,
						headers: { "Content-Type": "text/plain" },
					},
				);
			}
		},

		handleGetEditField: async (
			_request: Request,
			applicationId: string,
			field: string,
		): Promise<Response> => {
			try {
				const result = await useCases.getJobApplication(applicationId);
				if (result.isErr()) {
					return new Response(`Error: ${result.error.message}`, {
						status: 404,
						headers: { "Content-Type": "text/plain" },
					});
				}

				const app = result.value;
				if (!app) {
					return new Response("Application not found", {
						status: 404,
						headers: { "Content-Type": "text/plain" },
					});
				}

				const pipelineConfig = createDefaultPipelineConfig();

				return new Response(renderEditField(app, field, pipelineConfig), {
					headers: { "Content-Type": "text/html" },
				});
			} catch (error) {
				console.error("Unexpected error fetching edit form:", error);
				return new Response(
					`Error: ${error instanceof Error ? error.message : String(error)}`,
					{
						status: 500,
						headers: { "Content-Type": "text/plain" },
					},
				);
			}
		},

		handleUpdateApplication: async (
			request: Request,
			applicationId: string,
		): Promise<Response> => {
			try {
				const formData = await request.formData();
				const field = formData.get("field")?.toString();
				const value = formData.get("value")?.toString();

				if (!field || value === undefined) {
					return new Response("Error: Missing field or value", {
						status: 400,
						headers: { "Content-Type": "text/plain" },
					});
				}

				const getResult = await useCases.getJobApplication(applicationId);
				if (getResult.isErr()) {
					return new Response(`Error: ${getResult.error.message}`, {
						status: 404,
						headers: { "Content-Type": "text/plain" },
					});
				}

				const app = getResult.value;
				if (!app) {
					return new Response("Application not found", {
						status: 404,
						headers: { "Content-Type": "text/plain" },
					});
				}

				// Update the application based on field
				if (field === "company") {
					app.update({ id: app.id, company: value.trim() });
				} else if (field === "position") {
					app.update({ id: app.id, positionTitle: value.trim() });
				} else if (field === "interest") {
					const rating = parseInt(value, 10);
					if ([1, 2, 3].includes(rating)) {
						app.update({ id: app.id, interestRating: rating as 1 | 2 | 3 });
					}
				} else if (field === "nextEvent") {
					if (value.trim()) {
						app.update({ id: app.id, nextEventDate: value });
					} else {
						app.update({ id: app.id, nextEventDate: undefined });
					}
				} else if (field === "status") {
					const pipelineConfig = createDefaultPipelineConfig();
					const isActiveStatus = pipelineConfig.active.includes(value);
					const isInactiveStatus = pipelineConfig.inactive.includes(value);

					if (isActiveStatus) {
						app.newStatus({
							category: "active",
							current: value as
								| "applied"
								| "screening interview"
								| "interview"
								| "onsite"
								| "online test"
								| "take-home assignment"
								| "offer",
						});
					} else if (isInactiveStatus) {
						app.newStatus({
							category: "inactive",
							current: value as
								| "rejected"
								| "no response"
								| "no longer interested"
								| "hiring freeze",
						});
					}
				}

				const updateResult = await useCases.updateJobApplication(app);
				if (updateResult.isErr()) {
					return new Response(`Error: ${updateResult.error.message}`, {
						status: 500,
						headers: { "Content-Type": "text/plain" },
					});
				}

				const pipelineConfig = createDefaultPipelineConfig();
				return new Response(renderApplicationDisplayRow(app, pipelineConfig), {
					headers: { "Content-Type": "text/html" },
				});
			} catch (error) {
				console.error("Unexpected error updating application:", error);
				return new Response(
					`Error: ${error instanceof Error ? error.message : String(error)}`,
					{
						status: 500,
						headers: { "Content-Type": "text/plain" },
					},
				);
			}
		},

		handleCreateApplication: async (request: Request): Promise<Response> => {
			try {
				const formData = await request.formData();
				const applicationData = extractApplicationData(
					formData as globalThis.FormData,
				);

				const result = await useCases.createJobApplication(applicationData);

				if (result.isErr()) {
					console.error("Failed to create application:", result.error);
					return new Response(`Error: ${result.error.message}`, {
						status: 400,
						headers: { "Content-Type": "text/plain" },
					});
				}

				// Set initial status to the first active status
				const newApplication = result.value;
				const pipelineConfig = createDefaultPipelineConfig();
				const firstActiveStatus = pipelineConfig.active[0];

				if (firstActiveStatus) {
					newApplication.newStatus({
						category: "active",
						current: firstActiveStatus as
							| "applied"
							| "screening interview"
							| "interview"
							| "onsite"
							| "online test"
							| "take-home assignment"
							| "offer",
					});

					// Save the application with the new status
					const saveResult =
						await useCases.updateJobApplication(newApplication);
					if (saveResult.isErr()) {
						console.error(
							"Failed to save application with status:",
							saveResult.error,
						);
						return new Response(`Error: ${saveResult.error.message}`, {
							status: 500,
							headers: { "Content-Type": "text/plain" },
						});
					}
				}

				// Get all applications to refresh the pipeline view
				const applicationsResult = await useCases.getAllJobApplications();
				if (applicationsResult.isErr()) {
					console.error(
						"Failed to fetch applications:",
						applicationsResult.error,
					);
					return new Response(`Error: ${applicationsResult.error.message}`, {
						status: 500,
						headers: { "Content-Type": "text/plain" },
					});
				}

				// Redirect to homepage to show the updated pipeline
				return new Response("", {
					status: 303,
					headers: {
						Location: "/",
						"HX-Redirect": "/",
						"X-Application-ID": newApplication.id,
					},
				});
			} catch (error) {
				console.error("Unexpected error creating application:", error);
				return new Response(
					`Error: ${error instanceof Error ? error.message : String(error)}`,
					{
						status: 500,
						headers: { "Content-Type": "text/plain" },
					},
				);
			}
		},
	};
}

function extractApplicationData(
	formData: globalThis.FormData,
): JobApplicationForCreate {
	const company = formData.get("company")?.toString().trim();
	const positionTitle = formData.get("positionTitle")?.toString().trim();
	const applicationDate = formData.get("applicationDate")?.toString();
	const interestRating = formData.get("interestRating")?.toString();
	const nextEventDate = formData.get("nextEventDate")?.toString();
	const jobPostingUrl = formData.get("jobPostingUrl")?.toString().trim();
	const jobDescription = formData.get("jobDescription")?.toString().trim();

	if (!company || !positionTitle || !applicationDate) {
		throw new Error(
			"Company, position title, and application date are required",
		);
	}

	const data: JobApplicationForCreate = {
		company,
		positionTitle,
		applicationDate,
	};

	// Add optional fields only if they have values
	if (interestRating && ["1", "2", "3"].includes(interestRating)) {
		data.interestRating = Number(interestRating) as 1 | 2 | 3;
	}

	if (nextEventDate) {
		data.nextEventDate = nextEventDate;
	}

	if (jobPostingUrl) {
		data.jobPostingUrl = jobPostingUrl;
	}

	if (jobDescription) {
		data.jobDescription = jobDescription;
	}

	return data;
}

function renderApplicationDisplayRow(
	app: JobApplication,
	pipelineConfig: PipelineConfig,
): string {
	const currentStatus = app.getCurrentStatus();
	const statusText = currentStatus?.current || "No Status";
	const statusCategory = currentStatus
		? pipelineConfig.active.includes(currentStatus.current)
			? "active"
			: "inactive"
		: "inactive";
	const isOverdue = app.isOverdue();

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US");
	};

	const formatInterestRating = (rating?: number) => {
		if (!rating) return "";
		return "★".repeat(rating) + "☆".repeat(3 - rating);
	};

	return `
		<tr class="application-row ${statusCategory} ${isOverdue ? "overdue" : ""}">
			<td class="company-cell editable-cell" 
				hx-get="/applications/${app.id}/edit/company" 
				hx-target="this" 
				hx-swap="outerHTML"
				title="Click to edit company">${app.company}</td>
			<td class="position-cell editable-cell" 
				hx-get="/applications/${app.id}/edit/position" 
				hx-target="this" 
				hx-swap="outerHTML"
				title="Click to edit position">${app.positionTitle}</td>
			<td class="status-cell editable-cell" 
				hx-get="/applications/${app.id}/edit/status" 
				hx-target="this" 
				hx-swap="outerHTML"
				title="Click to edit status">
				<span class="status-badge ${statusCategory}">${statusText}</span>
			</td>
			<td class="application-date-cell">${formatDate(app.applicationDate)}</td>
			<td class="updated-date-cell">${formatDate(app.updatedAt)}</td>
			<td class="interest-cell editable-cell" 
				hx-get="/applications/${app.id}/edit/interest" 
				hx-target="this" 
				hx-swap="outerHTML"
				title="Click to edit interest rating">${formatInterestRating(app.interestRating)}</td>
			<td class="next-event-cell editable-cell" 
				hx-get="/applications/${app.id}/edit/nextEvent" 
				hx-target="this" 
				hx-swap="outerHTML"
				title="Click to edit next event date">
				${
					app.nextEventDate
						? `<span class="${isOverdue ? "overdue-date" : ""}">${formatDate(app.nextEventDate)}</span>`
						: '<span class="no-date">No date set</span>'
				}
			</td>
			<td class="actions-cell">
				<button class="action-btn view" title="View Details">👁️</button>
			</td>
		</tr>
	`;
}

function renderEditField(
	app: JobApplication,
	field: string,
	pipelineConfig: PipelineConfig,
): string {
	const currentStatus = app.getCurrentStatus();

	switch (field) {
		case "company":
			return `
				<td class="company-cell editing" data-testid="company-cell-editing-${app.id}">
					<form hx-put="/applications/${app.id}" hx-target="closest tr" hx-swap="outerHTML" 
						hx-headers='{"X-Application-ID": "${app.id}"}' data-testid="edit-form-${app.id}">
						<input type="hidden" name="field" value="company">
						<input type="text" name="value" value="${app.company}" 
							   class="edit-input" data-testid="edit-input-${app.id}" autofocus>
						<div class="edit-buttons" data-testid="edit-buttons-${app.id}">
							<button type="submit" class="save-btn" data-testid="save-btn-${app.id}">Save</button>
							<button type="button" 
								hx-get="/applications/${app.id}" 
								hx-target="closest tr" 
								hx-swap="outerHTML" 
								class="cancel-btn" data-testid="cancel-btn-${app.id}">Cancel</button>
						</div>
					</form>
				</td>
			`;
		case "position":
			return `
				<td class="position-cell editing" data-testid="position-cell-editing-${app.id}">
					<form hx-put="/applications/${app.id}" hx-target="closest tr" hx-swap="outerHTML" 
						hx-headers='{"X-Application-ID": "${app.id}"}' data-testid="edit-form-${app.id}">
						<input type="hidden" name="field" value="position">
						<input type="text" name="value" value="${app.positionTitle}" 
							   class="edit-input" data-testid="edit-input-${app.id}" autofocus>
						<div class="edit-buttons" data-testid="edit-buttons-${app.id}">
							<button type="submit" class="save-btn" data-testid="save-btn-${app.id}">Save</button>
							<button type="button" 
								hx-get="/applications/${app.id}" 
								hx-target="closest tr" 
								hx-swap="outerHTML" 
								class="cancel-btn" data-testid="cancel-btn-${app.id}">Cancel</button>
						</div>
					</form>
				</td>
			`;
		case "status": {
			const statusOptions = [
				...pipelineConfig.active,
				...pipelineConfig.inactive,
			];
			return `
				<td class="status-cell editing" data-testid="status-cell-editing-${app.id}">
					<form hx-put="/applications/${app.id}" hx-target="closest tr" hx-swap="outerHTML" 
						hx-headers='{"X-Application-ID": "${app.id}"}' data-testid="edit-form-${app.id}">
						<input type="hidden" name="field" value="status">
						<select name="value" class="edit-select" data-testid="edit-select-${app.id}" autofocus>
							${statusOptions
								.map(
									(status) =>
										`<option value="${status}" ${currentStatus?.current === status ? "selected" : ""}>${status}</option>`,
								)
								.join("")}
						</select>
						<div class="edit-buttons" data-testid="edit-buttons-${app.id}">
							<button type="submit" class="save-btn" data-testid="save-btn-${app.id}">Save</button>
							<button type="button" 
								hx-get="/applications/${app.id}" 
								hx-target="closest tr" 
								hx-swap="outerHTML" 
								class="cancel-btn" data-testid="cancel-btn-${app.id}">Cancel</button>
						</div>
					</form>
				</td>
			`;
		}
		case "interest":
			return `
				<td class="interest-cell editing" data-testid="interest-cell-editing-${app.id}">
					<form hx-put="/applications/${app.id}" hx-target="closest tr" hx-swap="outerHTML" 
						hx-headers='{"X-Application-ID": "${app.id}"}' data-testid="edit-form-${app.id}">
						<input type="hidden" name="field" value="interest">
						<select name="value" class="edit-select" data-testid="edit-select-${app.id}" autofocus>
							<option value="1" ${app.interestRating === 1 ? "selected" : ""}>★☆☆</option>
							<option value="2" ${app.interestRating === 2 ? "selected" : ""}>★★☆</option>
							<option value="3" ${app.interestRating === 3 ? "selected" : ""}>★★★</option>
						</select>
						<div class="edit-buttons" data-testid="edit-buttons-${app.id}">
							<button type="submit" class="save-btn" data-testid="save-btn-${app.id}">Save</button>
							<button type="button" 
								hx-get="/applications/${app.id}" 
								hx-target="closest tr" 
								hx-swap="outerHTML" 
								class="cancel-btn" data-testid="cancel-btn-${app.id}">Cancel</button>
						</div>
					</form>
				</td>
			`;
		case "nextEvent": {
			const nextEventValue = app.nextEventDate
				? app.nextEventDate.split("T")[0]
				: "";
			return `
				<td class="next-event-cell editing" data-testid="next-event-cell-editing-${app.id}">
					<form hx-put="/applications/${app.id}" hx-target="closest tr" hx-swap="outerHTML" 
						hx-headers='{"X-Application-ID": "${app.id}"}' data-testid="edit-form-${app.id}">
						<input type="hidden" name="field" value="nextEvent">
						<input type="date" name="value" value="${nextEventValue}" 
							   class="edit-input" data-testid="edit-input-${app.id}" autofocus>
						<div class="edit-buttons" data-testid="edit-buttons-${app.id}">
							<button type="submit" class="save-btn" data-testid="save-btn-${app.id}">Save</button>
							<button type="button" 
								hx-get="/applications/${app.id}" 
								hx-target="closest tr" 
								hx-swap="outerHTML" 
								class="cancel-btn" data-testid="cancel-btn-${app.id}">Cancel</button>
						</div>
					</form>
				</td>
			`;
		}
		default:
			return `<td>Invalid field</td>`;
	}
}
