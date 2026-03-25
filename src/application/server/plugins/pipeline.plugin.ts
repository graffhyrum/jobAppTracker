import { Either } from "effect";
import { Elysia } from "elysia";

import { jobApplicationManagerPlugin } from "#src/application/server/plugins/jobApplicationManager.plugin.ts";
import { runEffect } from "#src/application/server/utils/run-effect.ts";
import type { Column } from "#src/presentation/components/pipeline.ts";
import { pipelineQuerySchema } from "#src/presentation/schemas/pipeline-routes.schemas.ts";

export const createPipelinePlugin = new Elysia({ prefix: "/api" })
	.use(jobApplicationManagerPlugin)
	.get(
		"/pipeline",
		async ({ jobApplicationManager, query, set }) => {
			// Query is already validated by Elysia using ArkType schema
			const sortColumn = query.sortColumn as Column | undefined;
			const sortDirection = query.sortDirection;

			// Fetch fresh applications data
			const applicationsResult = await runEffect(
				jobApplicationManager.getAllJobApplications(),
			);
			const applications = Either.isRight(applicationsResult)
				? applicationsResult.right
				: [];

			// Import pipeline component to avoid circular dependency
			const { pipelineComponent } =
				await import("../../../presentation/components/pipeline.ts");

			set.headers["Content-Type"] = "text/html";
			return pipelineComponent(applications, sortColumn, sortDirection);
		},
		{
			query: pipelineQuerySchema,
		},
	);
