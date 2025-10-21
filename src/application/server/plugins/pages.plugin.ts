import { Elysia } from "elysia";
import { jobApplicationManagerPlugin } from "#src/application/server/plugins/jobApplicationManager.plugin.ts";
import { healthcheckPage } from "#src/presentation/pages/healthcheck.ts";
import { homepagePage } from "#src/presentation/pages/homepage.ts";
import { processEnv } from "../../../../processEnvFacade.ts";

export const createPagesPlugin = new Elysia()
	.use(jobApplicationManagerPlugin)
	.get("/", async ({ jobApplicationManager, set }) => {
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

		set.headers["Content-Type"] = "text/html";
		return homepagePage(applications);
	})
	.get("/health", ({ set }) => {
		const dbStatus = {}; // add later
		set.headers["Content-Type"] = "text/html";
		return healthcheckPage(dbStatus, processEnv);
	});
