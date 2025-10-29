import { html } from "@elysiajs/html";
import { staticPlugin } from "@elysiajs/static";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { createApplicationsPlugin } from "./plugins/applications.plugin.ts";
import {
	createContactOperationsPlugin,
	createContactsPlugin,
} from "./plugins/contacts.plugin.ts";
import {
	createInterviewStageOperationsPlugin,
	createInterviewStagesPlugin,
} from "./plugins/interview-stages.plugin.ts";
import { createPagesPlugin } from "./plugins/pages.plugin.ts";
import { createPipelinePlugin } from "./plugins/pipeline.plugin.ts";

export function startElysiaServer() {
	const app = new Elysia()
		// Global error handling
		.onError(({ code, error, set, request }) => {
			console.error(`[Error ${code}]:`, error, request);

			if (code === "NOT_FOUND") {
				return Response.json(
					{ message: error.message, request },
					{ status: 404 },
				);
			}

			const errorMessage =
				error instanceof Error ? error.message : JSON.stringify(error);

			if (code === "VALIDATION") {
				// For HTMX requests, return HTML; otherwise return JSON
				const isHtmxRequest = request.headers.get("HX-Request") === "true";
				set.status = 400;

				if (isHtmxRequest) {
					set.headers["Content-Type"] = "text/html";
					return `<div class="error-message">Validation Error: ${errorMessage}</div>`;
				}

				return { error: "Validation Error", message: errorMessage };
			}

			if (code === "PARSE") {
				set.status = 400;
				return `Parse Error: ${errorMessage}`;
			}

			// Internal server error
			set.status = 500;
			return `Internal Server Error: ${errorMessage}`;
		})
		// Add the HTML plugin for automatic HTML content-type handling
		.use(html()) // https://github.com/elysiajs/elysia/issues/1363
		// Add Swagger for OpenAPI documentation
		.use(
			swagger({
				documentation: {
					info: {
						title: "Job Application Tracker API",
						version: "1.0.0",
						description:
							"A single-user job application tracking system with customizable pipelines and PDF form filling support",
					},
					tags: [
						{
							name: "Applications",
							description: "Job application CRUD operations",
						},
						{
							name: "Pipeline",
							description: "Pipeline view and search operations",
						},
						{
							name: "Pages",
							description: "Web pages and health checks",
						},
					],
				},
			}),
		)
		// Add static file serving for CSS and JS
		.use(
			staticPlugin({
				assets: "src/presentation/styles",
				prefix: "/styles",
			}),
		)
		.use(
			staticPlugin({
				assets: "src/presentation/scripts",
				prefix: "/scripts",
			}),
		)
		.use(
			staticPlugin({
				assets: "src/presentation/assets",
				prefix: "/assets",
			}),
		)
		// Chrome DevTools workspace auto-detection endpoint
		.get(
			"/.well-known/appspecific/com.chrome.devtools.json",
			async ({ set }) => {
				set.headers["Content-Type"] = "application/json";
				const file = Bun.file(
					"src/presentation/.well-known/appspecific/com.chrome.devtools.json",
				);
				const exists = await file.exists();
				return exists ? new Response(file) : "{}";
			},
		)
		// Add custom route plugins with dependency injection
		.use(createPagesPlugin)
		.use(createPipelinePlugin)
		.use(createApplicationsPlugin)
		.use(createInterviewStagesPlugin)
		.use(createInterviewStageOperationsPlugin)
		.use(createContactsPlugin)
		.use(createContactOperationsPlugin)
		.listen(3000);

	console.log(
		`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
	);

	return app;
}
