import { ArkErrors, type } from "arktype";
import { Elysia, NotFoundError } from "elysia";
import { jobApplicationManagerPlugin } from "#src/application/server/plugins/jobApplicationManager.plugin.ts";
import {
	type ApplicationStatus,
	type JobApplicationForCreate,
	jobApplicationModule,
} from "#src/domain/entities/job-application.ts";
import { formAndPipelineContent } from "#src/presentation/components/formAndPipelineContent.ts";
import {
	renderApplicationTableRow,
	renderEditableRow,
} from "#src/presentation/components/table-row-renderer.ts";
import {
	applicationIdParamSchema,
	createApplicationBodySchema,
	searchQuerySchema,
	updateApplicationBodySchema,
} from "#src/presentation/schemas/application-routes.schemas.ts";

type ApplicationStatusLabel =
	typeof jobApplicationModule.ApplicationStatusLabel.infer;

// Helper to convert status label to ApplicationStatus with proper category
function createApplicationStatus(
	label: ApplicationStatusLabel,
): ApplicationStatus {
	const activeLabels: ApplicationStatusLabel[] = [
		"applied",
		"screening interview",
		"interview",
		"onsite",
		"online test",
		"take-home assignment",
		"offer",
	];

	const category = activeLabels.includes(label) ? "active" : "inactive";

	return { category, label } as ApplicationStatus;
}

export const createApplicationsPlugin = new Elysia({ prefix: "/applications" })
	.use(jobApplicationManagerPlugin)
	// GET /applications/:id - Returns display row (for cancel and initial display)
	.get(
		"/:id",
		async ({ jobApplicationManager, params: { id }, set }) => {
			const result = await jobApplicationManager.getJobApplication(id);

			if (result.isErr()) {
				throw new NotFoundError(`Error: ${result.error}`);
			}

			set.headers["Content-Type"] = "text/html";
			return renderApplicationTableRow(result.value);
		},
		{
			params: applicationIdParamSchema,
			response: type.string,
		},
	)
	// GET /applications/:id/edit - Returns editable row
	.get(
		"/:id/edit",
		async ({ jobApplicationManager, params: { id }, set }) => {
			console.log(`🔍 [EDIT] GET /applications/${id}/edit`);
			const result = await jobApplicationManager.getJobApplication(id);

			if (result.isErr()) {
				throw new NotFoundError(`Error: ${result.error}`);
			}

			set.headers["Content-Type"] = "text/html";
			return renderEditableRow(result.value);
		},
		{
			params: applicationIdParamSchema,
			response: type.string,
		},
	)
	// PUT /applications/:id - Updates all fields and returns display row
	.put(
		"/:id",
		async ({ jobApplicationManager, params: { id }, body, set }) => {
			// Update the application
			const updateResult = await jobApplicationManager.updateJobApplication(
				id,
				body,
			);

			if (updateResult.isErr()) {
				set.status = 500;
				return `Error: ${updateResult.error}`;
			}

			// Return updated display row
			set.headers["Content-Type"] = "text/html";
			return renderApplicationTableRow(updateResult.value);
		},
		{
			params: applicationIdParamSchema,
			body: jobApplicationModule.forUpdate,
			async transform({ body, jobApplicationManager, params: { id } }) {
				const formData = type("object.json").to(updateApplicationBodySchema)(
					body,
				);

				// Handle status field transformation
				if ("status" in formData && typeof formData.status === "string") {
					// Get current application to preserve existing statusLog
					const currentAppResult =
						await jobApplicationManager.getJobApplication(id);

					if (currentAppResult.isOk()) {
						const currentApp = currentAppResult.value;
						const statusLabel = formData.status as ApplicationStatusLabel;
						const newStatus = createApplicationStatus(statusLabel);
						const timestamp = new Date().toISOString();

						// Append new status to statusLog
						formData.statusLog = [
							...currentApp.statusLog,
							[timestamp, newStatus],
						];
					}

					// Remove the status field as it's not part of the schema
					delete formData.status;
				}

				const maybeParsed = jobApplicationModule.forUpdate(formData);
				if (maybeParsed instanceof ArkErrors) {
					throw maybeParsed;
				} else {
					body = maybeParsed;
				}
			},
		},
	)
	// DELETE /applications/:id - Deletes an application and returns empty content
	.delete(
		"/:id",
		async ({ jobApplicationManager, params: { id }, set }) => {
			const result = await jobApplicationManager.deleteJobApplication(id);
			if (result.isErr()) {
				set.status = 500;
				return `Error: ${result.error}`;
			}
			// Return empty HTML so hx-swap="outerHTML" on the <tr> removes the row
			set.headers["Content-Type"] = "text/html";
			return "";
		},
		{
			params: applicationIdParamSchema,
		},
	)
	// POST /applications - Creates new application
	.post(
		"/",
		async ({ jobApplicationManager, body, set }) => {
			try {
				// Body is already validated by Elysia using ArkType schema
				const applicationData = extractApplicationData(body);

				const result =
					await jobApplicationManager.createJobApplication(applicationData);

				if (result.isErr()) {
					console.error("Failed to create application:", result.error);
					const currentAppsResult =
						await jobApplicationManager.getAllJobApplications();
					const currentApps = currentAppsResult.isOk()
						? currentAppsResult.value
						: [];

					set.status = 400;
					set.headers["Content-Type"] = "text/html";
					return formAndPipelineContent(currentApps, `Error: ${result.error}`);
				}

				const newApplication = result.value;

				// Get all applications to refresh the pipeline view
				const applicationsResult =
					await jobApplicationManager.getAllJobApplications();
				if (applicationsResult.isErr()) {
					console.error(
						"Failed to fetch applications:",
						applicationsResult.error,
					);
					set.status = 500;
					set.headers["Content-Type"] = "text/html";
					return formAndPipelineContent(
						[],
						`Error fetching applications: ${applicationsResult.error}`,
					);
				}

				set.headers["Content-Type"] = "text/html";
				set.headers["X-Application-ID"] = newApplication.id;
				return formAndPipelineContent(applicationsResult.value);
			} catch (error) {
				console.error("Unexpected error creating application:", error);
				const currentAppsResult =
					await jobApplicationManager.getAllJobApplications();
				const currentApps = currentAppsResult.isOk()
					? currentAppsResult.value
					: [];

				set.status = 500;
				set.headers["Content-Type"] = "text/html";
				return formAndPipelineContent(
					currentApps,
					`Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		},
		{
			body: createApplicationBodySchema,
		},
	)
	// GET /applications/search - Search applications
	.get(
		"/search",
		async ({ jobApplicationManager, query: { q }, set }) => {
			const searchQuery = q ?? "";

			// Fetch applications
			const applicationsResult =
				await jobApplicationManager.getAllJobApplications();
			const all = applicationsResult.isOk() ? applicationsResult.value : [];

			// Import filter function
			const { filterApplications } = await import(
				"../../use-cases/filterApplications.ts"
			);
			const filtered = filterApplications(searchQuery, all);

			const rows = filtered.length
				? filtered.map(renderApplicationTableRow).join("")
				: `<tr><td colspan="8" class="empty-state">No applications found</td></tr>`;

			set.headers["Content-Type"] = "text/html";
			return rows;
		},
		{
			query: searchQuerySchema,
		},
	);

// Helper to safely extract string from unknown type
function extractStringField(
	value: unknown,
	defaultValue: string | undefined = "",
): string | undefined {
	if (typeof value === "string") {
		return value;
	}
	return defaultValue;
}

/**
 * Parses form-formatted JA Creation data to JobApplicationForCreate
 */
function extractApplicationData(
	formData: typeof createApplicationBodySchema.infer,
): JobApplicationForCreate {
	const interestRating = extractStringField(formData.interestRating);
	const nextEventDateRaw = formData.nextEventDate;
	const jobPostingUrl = extractStringField(formData.jobPostingUrl)?.trim();
	const jobDescription = extractStringField(formData.jobDescription)?.trim();
	const { company, positionTitle } = formData;

	const applicationDate = normalize(formData.applicationDate);
	const nextEventDate = nextEventDateRaw
		? normalize(nextEventDateRaw)
		: undefined;

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

	// Normalize date-only strings to UTC ISO (midnight Z)
	function normalize(s: string | undefined) {
		return type("string.date.iso")
			.pipe((md) => new Date(md).toISOString())
			.assert(s);
	}
}
