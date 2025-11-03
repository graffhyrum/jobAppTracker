import { Elysia } from "elysia";
import { getCurrentDbFromCookie } from "#src/application/server/plugins/db-selector-utils.ts";
import { jobApplicationManagerPlugin } from "#src/application/server/plugins/jobApplicationManager.plugin.ts";
import { createJobBoardRepositoryPlugin } from "#src/application/server/plugins/jobBoardRepository.plugin.ts";
import type { JobBoardRepository } from "#src/domain/ports/job-board-repository.ts";
import { isDevelopment } from "#src/infrastructure/utils/environment-detector.ts";
import { healthcheckPage } from "#src/presentation/pages/healthcheck.ts";
import { homepagePage } from "#src/presentation/pages/homepage.ts";
import { processEnv } from "../../../../processEnvFacade.ts";

/**
 * Factory function to create pages plugin with injected dependencies.
 */
export const createPagesPlugin = (jobBoardRepository: JobBoardRepository) =>
	new Elysia()
		.use(jobApplicationManagerPlugin)
		.use(createJobBoardRepositoryPlugin(jobBoardRepository))
		.get(
			"/",
			async ({ jobApplicationManager, jobBoardRepository, set, cookie }) => {
				// Fetch applications to show in the pipeline
				const applicationsResult =
					await jobApplicationManager.getAllJobApplications();
				const applications = applicationsResult.isOk()
					? applicationsResult.value
					: [];

				if (applicationsResult.isErr()) {
					console.error(
						"❌ [Homepage] Failed to fetch applications:",
						applicationsResult.error,
					);
				}

				// Fetch job boards for the form
				const jobBoardsResult = await jobBoardRepository.getAll();
				const jobBoards = jobBoardsResult.isOk() ? jobBoardsResult.value : [];

				if (jobBoardsResult.isErr()) {
					console.error(
						"❌ [Homepage] Failed to fetch job boards:",
						jobBoardsResult.error,
					);
				}

				set.headers["Content-Type"] = "text/html";
				return homepagePage(applications, jobBoards, {
					navbar: {
						isDev: isDevelopment(),
						currentDb: getCurrentDbFromCookie(cookie),
					},
				});
			},
		)
		.get("/health", ({ set, cookie }) => {
			const dbStatus = {}; // add later
			set.headers["Content-Type"] = "text/html";
			return healthcheckPage(dbStatus, processEnv, {
				navbar: {
					isDev: isDevelopment(),
					currentDb: getCurrentDbFromCookie(cookie),
				},
			});
		});
