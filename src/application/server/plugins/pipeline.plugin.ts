import { Elysia } from "elysia";
import { jobApplicationManagerPlugin } from "#src/application/server/plugins/jobApplicationManager.plugin.ts";
import type { Column } from "#src/presentation/components/pipeline.ts";
import { pipelineQuerySchema } from "#src/presentation/schemas/pipeline-routes.schemas.ts";

export const createPipelinePlugin = new Elysia({ prefix: "/api" })
	.use(jobApplicationManagerPlugin)
	.get(
		"/pipeline",
		async ({ jobApplicationManager, query, set }) => {
			console.log("🔄 [API] Pipeline refresh requested");

			// Query is already validated by Elysia using ArkType schema
			const sortColumn = query.sortColumn as Column | undefined;
			const sortDirection = query.sortDirection;

			console.log(
				`🔍 [API] Sort parameters: column=${sortColumn}, direction=${sortDirection}`,
			);

			// Fetch fresh applications data
			const applicationsResult =
				await jobApplicationManager.getAllJobApplications();
			const applications = applicationsResult.isOk()
				? applicationsResult.value
				: [];

			// Import pipeline component to avoid circular dependency
			const { pipelineComponent } = await import(
				"../../../presentation/components/pipeline.ts"
			);

			set.headers["Content-Type"] = "text/html";
			return pipelineComponent(applications, sortColumn, sortDirection);
		},
		{
			query: pipelineQuerySchema,
		},
	);
