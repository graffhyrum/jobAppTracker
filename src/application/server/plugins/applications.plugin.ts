import { type } from "arktype";
import { Elysia, NotFoundError } from "elysia";
import { getCurrentDbFromCookie } from "#src/application/server/plugins/db-selector-utils.ts";
import { jobApplicationManagerPlugin } from "#src/application/server/plugins/jobApplicationManager.plugin.ts";
import { createJobBoardRepositoryPlugin } from "#src/application/server/plugins/jobBoardRepository.plugin.ts";
import {
	extractApplicationData,
	fetchAllApplicationsOrEmpty,
	transformUpdateData,
} from "#src/application/server/utils/application-route-helpers.ts";
import { jobApplicationModule } from "#src/domain/entities/job-application.ts";
import type { JobBoardRepository } from "#src/domain/ports/job-board-repository.ts";
import { isDevelopment } from "#src/infrastructure/utils/environment-detector.ts";
import {
	renderApplicationDetailsEdit,
	renderApplicationDetailsView,
} from "#src/presentation/components/application-details-renderer.ts";
import { formAndPipelineContent } from "#src/presentation/components/formAndPipelineContent.ts";
import {
	renderApplicationTableRow,
	renderEditableRow,
} from "#src/presentation/components/table-row-renderer.ts";
import { applicationDetailsPage } from "#src/presentation/pages/application-details.ts";
import {
	applicationIdParamSchema,
	createApplicationBodySchema,
	searchQuerySchema,
} from "#src/presentation/schemas/application-routes.schemas.ts";

/**
 * Factory function to create applications plugin with injected dependencies.
 */
export const createApplicationsPlugin = (
	jobBoardRepository: JobBoardRepository,
) =>
	new Elysia({ prefix: "/applications" })
		.use(jobApplicationManagerPlugin)
		.use(createJobBoardRepositoryPlugin(jobBoardRepository))
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
		// GET /applications/:id/details - Returns full page or fragment based on request context
		.get(
			"/:id/details",
			async ({
				jobApplicationManager,
				params: { id },
				set,
				request,
				cookie,
			}) => {
				const result = await jobApplicationManager.getJobApplication(id);

				if (result.isErr()) {
					throw new NotFoundError(`Error: ${result.error}`);
				}

				set.headers["Content-Type"] = "text/html";

				// Content negotiation based on request context:
				// - Browser navigation → full page with navbar
				// - HTMX navigation TO details (not already on details) → full page
				// - HTMX partial update (already on details page) → content fragment only
				const isHtmxRequest = request.headers.get("HX-Request") === "true";
				const currentUrl = request.headers.get("HX-Current-URL") || "";

				// If HTMX request AND current URL contains this app's details path,
				// it's a partial update (edit/cancel). Otherwise, it's navigation.
				const isPartialUpdate =
					isHtmxRequest && currentUrl.includes(`/applications/${id}/details`);

				const needsFullPage = !isHtmxRequest || !isPartialUpdate;

				return needsFullPage
					? applicationDetailsPage(result.value, {
							navbar: {
								isDev: isDevelopment(),
								currentDb: getCurrentDbFromCookie(cookie),
							},
						})
					: renderApplicationDetailsView(result.value);
			},
			{
				params: applicationIdParamSchema,
				response: type.string,
			},
		)
		// GET /applications/:id/details/edit - Returns editable details content
		.get(
			"/:id/details/edit",
			async ({ jobApplicationManager, params: { id }, set }) => {
				const result = await jobApplicationManager.getJobApplication(id);

				if (result.isErr()) {
					throw new NotFoundError(`Error: ${result.error}`);
				}

				set.headers["Content-Type"] = "text/html";
				return renderApplicationDetailsEdit(result.value);
			},
			{
				params: applicationIdParamSchema,
				response: type.string,
			},
		)
		// PUT /applications/:id/details - Updates application and returns view mode details content
		.put(
			"/:id/details",
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

				// Return updated details view
				set.headers["Content-Type"] = "text/html";
				return renderApplicationDetailsView(updateResult.value);
			},
			{
				params: applicationIdParamSchema,
				body: jobApplicationModule.forUpdate,
				async transform({ body, jobApplicationManager, params: { id } }) {
					// Get current application to preserve existing statusLog
					const currentAppResult =
						await jobApplicationManager.getJobApplication(id);
					const currentApp = currentAppResult.isOk()
						? currentAppResult.value
						: null;

					body = transformUpdateData(body, currentApp);
				},
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
					// Get current application to preserve existing statusLog
					const currentAppResult =
						await jobApplicationManager.getJobApplication(id);
					const currentApp = currentAppResult.isOk()
						? currentAppResult.value
						: null;

					body = transformUpdateData(body, currentApp);
				},
			},
		)
		// DELETE /applications/:id - Deletes an application and returns empty content or redirects
		.delete(
			"/:id",
			async ({ jobApplicationManager, params: { id }, set, request }) => {
				const result = await jobApplicationManager.deleteJobApplication(id);
				if (result.isErr()) {
					set.status = 500;
					return `Error: ${result.error}`;
				}
				// If called from details page (check referer), redirect to homepage
				const referer = request.headers.get("referer") || "";
				if (referer.includes("/details")) {
					set.headers["HX-Redirect"] = "/";
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
			async ({ jobApplicationManager, jobBoardRepository, body, set }) => {
				// Helper to fetch job boards
				const getJobBoards = async () => {
					const result = await jobBoardRepository.getAll();
					return result.isOk() ? result.value : [];
				};

				try {
					// Body is already validated by Elysia using ArkType schema
					const applicationData = extractApplicationData(body);

					const result =
						await jobApplicationManager.createJobApplication(applicationData);

					if (result.isErr()) {
						console.error("Failed to create application:", result.error);
						const currentApps = await fetchAllApplicationsOrEmpty(
							jobApplicationManager,
						);
						const jobBoards = await getJobBoards();

						set.status = 400;
						set.headers["Content-Type"] = "text/html";
						return formAndPipelineContent(
							currentApps,
							jobBoards,
							`Error: ${result.error}`,
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
						const jobBoards = await getJobBoards();
						set.status = 500;
						set.headers["Content-Type"] = "text/html";
						return formAndPipelineContent(
							[],
							jobBoards,
							`Error fetching applications: ${applicationsResult.error}`,
						);
					}

					const jobBoards = await getJobBoards();
					set.headers["Content-Type"] = "text/html";
					set.headers["X-Application-ID"] = newApplication.id;
					return formAndPipelineContent(applicationsResult.value, jobBoards);
				} catch (error) {
					console.error("Unexpected error creating application:", error);
					const currentApps = await fetchAllApplicationsOrEmpty(
						jobApplicationManager,
					);
					const jobBoards = await getJobBoards();

					set.status = 500;
					set.headers["Content-Type"] = "text/html";
					return formAndPipelineContent(
						currentApps,
						jobBoards,
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
		)
		// POST /applications/delete-all - Deletes all applications
		.post(
			"/delete-all",
			async ({ jobApplicationManager, jobBoardRepository, set }) => {
				const result = await jobApplicationManager.clearAllJobApplications();

				if (result.isErr()) {
					set.status = 500;
					set.headers["Content-Type"] = "text/html";
					return `<div class="error-message">Error: ${result.error}</div>`;
				}

				// Get job boards to refresh the form
				const jobBoardsResult = await jobBoardRepository.getAll();
				const jobBoards = jobBoardsResult.isOk() ? jobBoardsResult.value : [];

				// Return updated pipeline with empty applications
				set.headers["Content-Type"] = "text/html";
				return formAndPipelineContent([], jobBoards);
			},
		)
		// POST /applications/generate - Generates random applications
		.post(
			"/generate",
			async ({ jobApplicationManager, jobBoardRepository, body, set }) => {
				try {
					const count = Number.parseInt(body.count || "10", 10);
					if (Number.isNaN(count) || count < 1 || count > 100) {
						set.status = 400;
						set.headers["Content-Type"] = "text/html";
						return `<div class="error-message">Error: Count must be between 1 and 100</div>`;
					}

					// Import the generator function
					const { generateRandomJobApplicationData } = await import(
						"../../use-cases/generateRandomApplications.ts"
					);

					// Get job boards for potential linking
					const jobBoardsResult = await jobBoardRepository.getAll();
					const jobBoards = jobBoardsResult.isOk() ? jobBoardsResult.value : [];

					// Generate and create applications
					for (let i = 0; i < count; i++) {
						const data = generateRandomJobApplicationData(jobBoards);
						await jobApplicationManager.createJobApplication(data);
					}

					// Get all applications to refresh the pipeline view
					const applicationsResult =
						await jobApplicationManager.getAllJobApplications();
					const applications = applicationsResult.isOk()
						? applicationsResult.value
						: [];

					set.headers["Content-Type"] = "text/html";
					return formAndPipelineContent(applications, jobBoards);
				} catch (error) {
					console.error("Error generating applications:", error);
					const jobBoardsResult = await jobBoardRepository.getAll();
					const jobBoards = jobBoardsResult.isOk() ? jobBoardsResult.value : [];
					const applicationsResult =
						await jobApplicationManager.getAllJobApplications();
					const applications = applicationsResult.isOk()
						? applicationsResult.value
						: [];

					set.status = 500;
					set.headers["Content-Type"] = "text/html";
					return formAndPipelineContent(
						applications,
						jobBoards,
						`Error generating applications: ${error instanceof Error ? error.message : String(error)}`,
					);
				}
			},
			{
				body: type({
					count: "string",
				}),
			},
		);
