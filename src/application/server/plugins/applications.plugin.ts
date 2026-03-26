import { type } from "arktype";
import { Either } from "effect";
import { Elysia, NotFoundError } from "elysia";

import { getCurrentDbFromCookie } from "#src/application/server/plugins/db-selector-utils.ts";
import { jobApplicationManagerPlugin } from "#src/application/server/plugins/jobApplicationManager.plugin.ts";
import { createJobBoardRepositoryPlugin } from "#src/application/server/plugins/jobBoardRepository.plugin.ts";
import {
	extractApplicationData,
	fetchAllApplicationsOrEmpty,
	transformUpdateData,
} from "#src/application/server/utils/application-route-helpers.ts";
import { runEffect } from "#src/application/server/utils/run-effect.ts";
import { filterApplications } from "#src/application/use-cases/filterApplications.ts";
import { generateRandomJobApplicationData } from "#src/application/use-cases/generateRandomApplications.ts";
import { jobApplicationModule } from "#src/domain/entities/job-application.ts";
import type { JobBoardRepository } from "#src/domain/ports/job-board-repository.ts";
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
import { escapeHtml } from "#src/presentation/utils/html-escape.ts";

/**
 * Factory function to create applications plugin with injected dependencies.
 */
export const createApplicationsPlugin = (jobBoardRepo: JobBoardRepository) =>
	new Elysia({ prefix: "/applications" })
		.use(jobApplicationManagerPlugin)
		.use(createJobBoardRepositoryPlugin(jobBoardRepo))
		// GET /applications/:id - Returns display row (for cancel and initial display)
		.get(
			"/:id",
			async ({ jobApplicationManager, params: { id }, set }) => {
				const result = await runEffect(
					jobApplicationManager.getJobApplication(id),
				);

				if (Either.isLeft(result)) {
					throw new NotFoundError(`Error: ${escapeHtml(result.left.detail)}`);
				}

				set.headers["Content-Type"] = "text/html";
				return renderApplicationTableRow(result.right);
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
				const result = await runEffect(
					jobApplicationManager.getJobApplication(id),
				);

				if (Either.isLeft(result)) {
					throw new NotFoundError(`Error: ${escapeHtml(result.left.detail)}`);
				}

				set.headers["Content-Type"] = "text/html";
				return renderEditableRow(result.right);
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
				const result = await runEffect(
					jobApplicationManager.getJobApplication(id),
				);

				if (Either.isLeft(result)) {
					throw new NotFoundError(`Error: ${escapeHtml(result.left.detail)}`);
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
					? applicationDetailsPage(result.right, {
							navbar: {
								currentDb: getCurrentDbFromCookie(cookie),
							},
						})
					: renderApplicationDetailsView(result.right);
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
				const result = await runEffect(
					jobApplicationManager.getJobApplication(id),
				);

				if (Either.isLeft(result)) {
					throw new NotFoundError(`Error: ${escapeHtml(result.left.detail)}`);
				}

				set.headers["Content-Type"] = "text/html";
				return renderApplicationDetailsEdit(result.right);
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
				const updateResult = await runEffect(
					jobApplicationManager.updateJobApplication(id, body),
				);

				if (Either.isLeft(updateResult)) {
					set.status = 500;
					return `Error: ${escapeHtml(updateResult.left.detail)}`;
				}

				// Return updated details view
				set.headers["Content-Type"] = "text/html";
				return renderApplicationDetailsView(updateResult.right);
			},
			{
				params: applicationIdParamSchema,
				body: jobApplicationModule.forUpdate,
				async transform(ctx) {
					const { jobApplicationManager, params: { id } } = ctx;
					// Get current application to preserve existing statusLog
					const currentAppResult = await runEffect(
						jobApplicationManager.getJobApplication(id),
					);
					const currentApp = Either.isRight(currentAppResult)
						? currentAppResult.right
						: null;

					ctx.body = transformUpdateData(ctx.body, currentApp);
				},
			},
		)
		// PUT /applications/:id - Updates all fields and returns display row
		.put(
			"/:id",
			async ({ jobApplicationManager, params: { id }, body, set }) => {
				// Update the application
				const updateResult = await runEffect(
					jobApplicationManager.updateJobApplication(id, body),
				);

				if (Either.isLeft(updateResult)) {
					set.status = 500;
					return `Error: ${escapeHtml(updateResult.left.detail)}`;
				}

				// Return the updated display row
				set.headers["Content-Type"] = "text/html";
				return renderApplicationTableRow(updateResult.right);
			},
			{
				params: applicationIdParamSchema,
				body: jobApplicationModule.forUpdate,
				async transform(ctx) {
					const { jobApplicationManager, params: { id } } = ctx;
					// Get current application to preserve existing statusLog
					const currentAppResult = await runEffect(
						jobApplicationManager.getJobApplication(id),
					);
					const currentApp = Either.isRight(currentAppResult)
						? currentAppResult.right
						: null;

					ctx.body = transformUpdateData(ctx.body, currentApp);
				},
			},
		)
		// DELETE /applications/:id - Deletes an application and returns empty content or redirects
		.delete(
			"/:id",
			async ({ jobApplicationManager, params: { id }, set, request }) => {
				const result = await runEffect(
					jobApplicationManager.deleteJobApplication(id),
				);
				if (Either.isLeft(result)) {
					set.status = 500;
					return `Error: ${escapeHtml(result.left.detail)}`;
				}
				// If called from the details page (check referer), redirect to the homepage
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
					const result = await runEffect(jobBoardRepository.getAll());
					return Either.isRight(result) ? result.right : [];
				};

				try {
					// Body is already validated by Elysia using ArkType schema
					const applicationData = extractApplicationData(body);

					const result = await runEffect(
						jobApplicationManager.createJobApplication(applicationData),
					);

					if (Either.isLeft(result)) {
						console.error("Failed to create application:", result.left.detail);
						const currentApps = await fetchAllApplicationsOrEmpty(
							jobApplicationManager,
						);
						const jobBoards = await getJobBoards();

						set.status = 400;
						set.headers["Content-Type"] = "text/html";
						return formAndPipelineContent(
							currentApps,
							jobBoards,
							`Error: ${escapeHtml(result.left.detail)}`,
						);
					}

					const newApplication = result.right;

					// Get all applications to refresh the pipeline view
					const applicationsResult = await runEffect(
						jobApplicationManager.getAllJobApplications(),
					);
					if (Either.isLeft(applicationsResult)) {
						console.error(
							"Failed to fetch applications:",
							escapeHtml(applicationsResult.left.detail),
						);
						const jobBoards = await getJobBoards();
						set.status = 500;
						set.headers["Content-Type"] = "text/html";
						return formAndPipelineContent(
							[],
							jobBoards,
							`Error fetching applications: ${escapeHtml(applicationsResult.left.detail)}`,
						);
					}

					const jobBoards = await getJobBoards();
					set.headers["Content-Type"] = "text/html";
					set.headers["X-Application-ID"] = newApplication.id;
					return formAndPipelineContent(applicationsResult.right, jobBoards);
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
						`Unexpected error: ${escapeHtml(error instanceof Error ? error.message : String(error))}`,
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
				const applicationsResult = await runEffect(
					jobApplicationManager.getAllJobApplications(),
				);
				const all = Either.isRight(applicationsResult)
					? applicationsResult.right
					: [];

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
				const result = await runEffect(
					jobApplicationManager.clearAllJobApplications(),
				);

				if (Either.isLeft(result)) {
					set.status = 500;
					set.headers["Content-Type"] = "text/html";
					return `<div class="error-message">Error: ${escapeHtml(result.left.detail)}</div>`;
				}

				// Get job boards to refresh the form
				const jobBoardsResult = await runEffect(jobBoardRepository.getAll());
				const jobBoards = Either.isRight(jobBoardsResult)
					? jobBoardsResult.right
					: [];

				// Return the updated pipeline with empty applications
				set.headers["Content-Type"] = "text/html";
				return formAndPipelineContent([], jobBoards);
			},
		)
		// POST /applications/import-data - Executes data import script
		.post("/import-data", async ({ set }) => {
			try {
				// Execute the import script in a child process
				const { spawn } = await import("node:child_process");

				const childProcess = spawn("bun", ["./scripts/import-data.ts"], {
					stdio: ["ignore", "pipe", "pipe"],
					cwd: process.cwd(),
				});

				let stdout = "";
				let stderr = "";

				// Collect stdout and stderr
				childProcess.stdout?.on("data", (data) => {
					stdout += data.toString();
				});

				childProcess.stderr?.on("data", (data) => {
					stderr += data.toString();
				});

				// Wait for a process to complete
				await new Promise<void>((resolve, reject) => {
					childProcess.on("close", (code) => {
						if (code === 0) {
							resolve();
						} else {
							reject(new Error(`Process exited with code ${code}`));
						}
					});
					childProcess.on("error", reject);
				});

				// Return HTML with a console output script
				set.headers["Content-Type"] = "text/html";
				return `
						<script>
							console.log("=== BaseData Import Script Output ===");
							console.log("STDOUT:");
							console.log(${JSON.stringify(stdout)});
							if (${JSON.stringify(stderr)}) {
								console.log("STDERR:");
								console.log(${JSON.stringify(stderr)});
							}
							console.log("=== End Import Output ===");
							// Refresh the page after a short delay to show updated data
							setTimeout(() => {
								window.location.reload();
							}, 2000);
						</script>
						<div class="success-message">
							Import script executed successfully. Check the browser console for output. Page will refresh in 2 seconds...
						</div>
					`;
			} catch (error) {
				console.error("Error executing import script:", error);
				set.status = 500;
				set.headers["Content-Type"] = "text/html";
				return `
						<script>
							console.error("=== BaseData Import Script Error ===");
							console.error(${JSON.stringify(error instanceof Error ? error.message : String(error))});
							console.error("=== End Import Error ===");
						</script>
						<div class="error-message">
							Error executing an import script: ${escapeHtml(error instanceof Error ? error.message : String(error))}. Check browser console for details.
						</div>
					`;
			}
		})
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

					// Get job boards for potential linking
					const jobBoardsResult = await runEffect(jobBoardRepository.getAll());
					const jobBoards = Either.isRight(jobBoardsResult)
						? jobBoardsResult.right
						: [];

					// Generate and create applications
					for (let i = 0; i < count; i++) {
						const data = generateRandomJobApplicationData(jobBoards);
						await runEffect(
							jobApplicationManager.createJobApplication(data),
						);
					}

					// Get all applications to refresh the pipeline view
					const applicationsResult = await runEffect(
						jobApplicationManager.getAllJobApplications(),
					);
					const applications = Either.isRight(applicationsResult)
						? applicationsResult.right
						: [];

					set.headers["Content-Type"] = "text/html";
					return formAndPipelineContent(applications, jobBoards);
				} catch (error) {
					console.error("Error generating applications:", error);
					const jobBoardsResult = await runEffect(jobBoardRepository.getAll());
					const jobBoards = Either.isRight(jobBoardsResult)
						? jobBoardsResult.right
						: [];
					const applicationsResult = await runEffect(
						jobApplicationManager.getAllJobApplications(),
					);
					const applications = Either.isRight(applicationsResult)
						? applicationsResult.right
						: [];

					set.status = 500;
					set.headers["Content-Type"] = "text/html";
					return formAndPipelineContent(
						applications,
						jobBoards,
						`Error generating applications: ${escapeHtml(error instanceof Error ? error.message : String(error))}`,
					);
				}
			},
			{
				body: type({
					count: "string",
				}),
			},
		);
