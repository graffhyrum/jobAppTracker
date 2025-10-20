import { scope } from "arktype";
import { toArkResult } from "#helpers/ark-results.ts";
import type { JobApplicationForCreate } from "../../domain/entities/job-application";
import type { JobApplicationManager } from "../../domain/ports/job-application-manager.ts";
import { formAndPipelineContent } from "../components/formAndPipelineContent.ts";
import {
	renderApplicationTableRow,
	renderEditableRow,
} from "../components/table-row-renderer";

// Form validation schema for updating all fields at once
const updateAllFieldsScope = scope({
	UpdateAllFields: {
		company: "string > 0",
		positionTitle: "string > 0",
		status:
			"'applied'|'screening interview'|'interview'|'onsite'|'online test'|'take-home assignment'|'offer'|'rejected'|'no response'|'no longer interested'|'hiring freeze'",
		"interestRating?": "'1'|'2'|'3'",
		"nextEventDate?": "string",
	},
});

const updateAllFieldsSchema = updateAllFieldsScope.export();

function getStatusCategory(status: string): "active" | "inactive" {
	const activeStatuses = [
		"applied",
		"screening interview",
		"interview",
		"onsite",
		"online test",
		"take-home assignment",
		"offer",
	];
	return activeStatuses.includes(status) ? "active" : "inactive";
}

function _formatInterestRating(rating?: number): string {
	if (!rating) return "";
	return "★".repeat(rating) + "☆".repeat(3 - rating);
}

export function createApplicationsRoutes(
	jobApplicationManager: JobApplicationManager,
) {
	return {
		// GET /applications/:id - Returns display row (for cancel and initial display)
		handleGetApplication: async (applicationId: string): Promise<Response> => {
			return jobApplicationManager.getJobApplication(applicationId).match(
				(app) =>
					new Response(renderApplicationTableRow(app), {
						headers: { "Content-Type": "text/html" },
					}),
				(error) =>
					new Response(`Error: ${error}`, {
						status: 404,
						headers: { "Content-Type": "text/plain" },
					}),
			);
		},

		// GET /applications/:id/edit - Returns editable row
		handleGetEditApplication: async (
			applicationId: string,
		): Promise<Response> => {
			return jobApplicationManager.getJobApplication(applicationId).match(
				(app) =>
					new Response(renderEditableRow(app), {
						headers: { "Content-Type": "text/html" },
					}),
				(error) =>
					new Response(`Error: ${error}`, {
						status: 404,
						headers: { "Content-Type": "text/plain" },
					}),
			);
		},

		// PUT /applications/:id - Updates all fields and returns display row
		handleUpdateApplication: async (
			request: Request,
			applicationId: string,
		): Promise<Response> => {
			try {
				const formData = await request.formData();
				const company = formData.get("company")?.toString();
				const positionTitle = formData.get("positionTitle")?.toString();
				const status = formData.get("status")?.toString();
				const interestRatingRaw = formData.get("interestRating");
				const nextEventDateRaw = formData.get("nextEventDate");

				// Build rawData ensuring optional fields are either present with valid values or omitted entirely
				const rawData: Record<string, unknown> = {
					company,
					positionTitle,
					status,
				};

				// Only include interestRating when user selected 1,2,or 3; omit if empty
				if (interestRatingRaw !== null) {
					const ir = interestRatingRaw.toString();
					if (ir !== "") {
						rawData.interestRating = ir;
					}
				}

				// Always include nextEventDate when present in the form, even if empty string
				// Empty string signals clearing the date and will be handled downstream
				if (nextEventDateRaw !== null) {
					rawData.nextEventDate = nextEventDateRaw.toString();
				}

				// Validate form data
				const validationResult = toArkResult(
					updateAllFieldsSchema.UpdateAllFields,
					rawData,
				);
				if (validationResult.isErr()) {
					return new Response(
						`Error: Invalid form data - ${validationResult.error.message}`,
						{
							status: 400,
							headers: { "Content-Type": "text/plain" },
						},
					);
				}

				const validatedData = validationResult.value;

				// Get current application
				const getResult =
					await jobApplicationManager.getJobApplication(applicationId);
				if (getResult.isErr()) {
					return new Response(`Error: ${getResult.error}`, {
						status: 404,
						headers: { "Content-Type": "text/plain" },
					});
				}

				const currentApp = getResult.value;
				if (!currentApp) {
					return new Response("Application not found", {
						status: 404,
						headers: { "Content-Type": "text/plain" },
					});
				}

				// Build update data
				const updateData: Record<string, unknown> = {
					company: validatedData.company,
					positionTitle: validatedData.positionTitle,
				};

				// Handle status update (add to statusLog)
				if (validatedData.status) {
					const newStatusEntry = [
						new Date().toISOString(),
						{
							category: getStatusCategory(validatedData.status),
							label: validatedData.status,
						},
					];
					updateData.statusLog = [...currentApp.statusLog, newStatusEntry];
				}

				// Handle optional fields
				if (validatedData.interestRating) {
					updateData.interestRating = Number(validatedData.interestRating);
				}

				if (validatedData.nextEventDate) {
					const ned = validatedData.nextEventDate;
					updateData.nextEventDate = /^(\d{4})-(\d{2})-(\d{2})$/.test(ned)
						? `${ned}T00:00:00Z`
						: ned;
				} else if (validatedData.nextEventDate === "") {
					updateData.nextEventDate = null;
				}

				// Update the application
				const updateResult = await jobApplicationManager.updateJobApplication(
					applicationId,
					updateData,
				);

				if (updateResult.isErr()) {
					return new Response(`Error: ${updateResult.error}`, {
						status: 500,
						headers: { "Content-Type": "text/plain" },
					});
				}

				// Return updated display row
				const updatedApp = updateResult.value;
				return new Response(renderApplicationTableRow(updatedApp), {
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

		// DELETE /applications/:id - Deletes an application and returns empty content to remove the row
		handleDeleteApplication: async (
			applicationId: string,
		): Promise<Response> => {
			const result =
				await jobApplicationManager.deleteJobApplication(applicationId);
			if (result.isErr()) {
				return new Response(`Error: ${result.error}`, {
					status: 500,
					headers: { "Content-Type": "text/plain" },
				});
			}
			// Return empty HTML so hx-swap="outerHTML" on the <tr> removes the row
			return new Response("", {
				status: 200,
				headers: { "Content-Type": "text/html" },
			});
		},

		// POST /applications - Creates new application
		handleCreateApplication: async (request: Request): Promise<Response> => {
			try {
				const formData = await request.formData();
				const applicationData = extractApplicationData(
					formData as globalThis.FormData,
				);

				const result =
					await jobApplicationManager.createJobApplication(applicationData);

				if (result.isErr()) {
					console.error("Failed to create application:", result.error);
					const currentAppsResult =
						await jobApplicationManager.getAllJobApplications();
					const currentApps = currentAppsResult.isOk()
						? currentAppsResult.value
						: [];

					return new Response(
						formAndPipelineContent(currentApps, `Error: ${result.error}`),
						{
							status: 400,
							headers: { "Content-Type": "text/html" },
						},
					);
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
					return new Response(
						formAndPipelineContent(
							[],
							`Error fetching applications: ${applicationsResult.error}`,
						),
						{
							status: 500,
							headers: { "Content-Type": "text/html" },
						},
					);
				}

				return new Response(formAndPipelineContent(applicationsResult.value), {
					status: 200,
					headers: {
						"Content-Type": "text/html",
						"X-Application-ID": newApplication.id,
					},
				});
			} catch (error) {
				console.error("Unexpected error creating application:", error);
				const currentAppsResult =
					await jobApplicationManager.getAllJobApplications();
				const currentApps = currentAppsResult.isOk()
					? currentAppsResult.value
					: [];

				return new Response(
					formAndPipelineContent(
						currentApps,
						`Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
					),
					{
						status: 500,
						headers: { "Content-Type": "text/html" },
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
	const applicationDateRaw = formData.get("applicationDate")?.toString();
	const interestRating = formData.get("interestRating")?.toString();
	const nextEventDateRaw = formData.get("nextEventDate")?.toString();
	const jobPostingUrl = formData.get("jobPostingUrl")?.toString().trim();
	const jobDescription = formData.get("jobDescription")?.toString().trim();

	// Normalize date-only strings to UTC ISO (midnight Z)
	const normalize = (s: string | undefined | null) => {
		if (!s) return undefined as unknown as string; // handled by required check below
		return /^(\d{4})-(\d{2})-(\d{2})$/.test(s) ? `${s}T00:00:00Z` : s;
	};

	const applicationDate = applicationDateRaw
		? normalize(applicationDateRaw)
		: undefined;
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

	return data as JobApplicationForCreate;
}
