import type { Column } from "#src/presentation/components/pipeline.ts";
import { processEnv } from "../../../processEnvFacade.ts";
import { jobApplicationManager } from "../../domain/use-cases/create-sqlite-job-app-manager.ts";
import { renderApplicationTableRow } from "../../presentation/components/table-row-renderer.ts";
import { healthcheckPage } from "../../presentation/pages/healthcheck.ts";
import { homepagePage } from "../../presentation/pages/homepage.ts";
import { createApplicationsRoutes } from "../../presentation/routes/applications.ts";
import { filterApplications } from "../use-cases/filterApplications.ts";
import { serveCSSFile } from "./serveCSSFile.ts";
import { serveJSFile } from "./serveJSFile.ts";

export function startBunServer() {
	// Set up dependencies following hexagonal architecture using DI
	const applicationRoutes = createApplicationsRoutes(jobApplicationManager);

	// Define CSS files to serve
	const cssFiles = [
		"base.css",
		"navbar.css",
		"forms.css",
		"pages.css",
		"pipeline.css",
	];
	const cssRoutes = createCSSRoutes(cssFiles);

	// Define TypeScript files to transpile and serve as JavaScript
	const jsFiles = [
		{ route: "pipeline-client.js", source: "pipeline-client.ts" },
	];
	const jsRoutes = createJSRoutes(jsFiles);

	const server = Bun.serve({
		port: 3000,
		routes: {
			"/": async () => {
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
				return new Response(homepagePage(applications), {
					headers: { "Content-Type": "text/html" },
				});
			},
			"/health": () => {
				const dbStatus = {}; // add later
				return new Response(healthcheckPage(dbStatus, processEnv), {
					headers: { "Content-Type": "text/html" },
				});
			},
			"/api/pipeline": {
				GET: async (req) => {
					console.log("🔄 [API] Pipeline refresh requested");

					// Parse query parameters for sorting
					const url = new URL(req.url);
					const sortColumn = url.searchParams.get("sortColumn");
					const sortDirection = url.searchParams.get("sortDirection") as
						| "asc"
						| "desc"
						| null;

					console.log(
						`🔍 [API] Sort parameters: column=${sortColumn}, direction=${sortDirection}`,
					);

					// Fetch fresh applications data
					const applicationsResult =
						await jobApplicationManager.getAllJobApplications();
					const applications = applicationsResult.isOk()
						? applicationsResult.value
						: [];

					// Import pipeline component here to avoid circular dependency
					const { pipelineComponent } = await import(
						"../../presentation/components/pipeline.ts"
					);
					return new Response(
						pipelineComponent(
							applications,
							(sortColumn as Column) || undefined,
							sortDirection || undefined,
						),
						{
							headers: { "Content-Type": "text/html" },
						},
					);
				},
			},
			"/applications": {
				POST: applicationRoutes.handleCreateApplication,
			},
			"/applications/:jaID": {
				GET: async (req) => {
					const { jaID } = req.params;
					return applicationRoutes.handleGetApplication(jaID);
				},
				PUT: async (req) => {
					const { jaID } = req.params;
					return applicationRoutes.handleUpdateApplication(req, jaID);
				},
				DELETE: async (req) => {
					const { jaID } = req.params;
					return applicationRoutes.handleDeleteApplication(jaID);
				},
			},
			"/applications/:jaID/edit": async (req) => {
				const { jaID } = req.params;
				console.log(`🔍 [EDIT] GET /applications/${jaID}/edit`);
				return await applicationRoutes.handleGetEditApplication(jaID);
			},
			"/applications/search": {
				GET: async (req) => {
					const url = new URL(req.url);
					const q = url.searchParams.get("q") ?? "";
					// Fetch applications
					const applicationsResult =
						await jobApplicationManager.getAllJobApplications();
					const all = applicationsResult.isOk() ? applicationsResult.value : [];
					const filtered = filterApplications(q, all);
					const rows = filtered.length
						? filtered.map(renderApplicationTableRow).join("")
						: `<tr><td colspan="8" class="empty-state">No applications found</td></tr>`;
					return new Response(rows, {
						headers: { "Content-Type": "text/html" },
					});
				},
			},
			// Dynamically generated CSS routes
			...cssRoutes,
			// Dynamically generated JavaScript routes
			...jsRoutes,
		},
		fetch(_request) {
			return new Response("Not Found", { status: 404 });
		},
		development: {
			hmr: true, // Enable Hot Module Reloading
			console: true, // Echo console logs from the browser to the terminal
		},
	});

	console.log(`Listening on ${server.url}`);
}

// Generate CSS routes dynamically
const createCSSRoutes = (cssFiles: string[]) => {
	const routes: Record<string, () => Promise<Response>> = {};
	for (const fileName of cssFiles) {
		const route = `/styles/${fileName}`;
		const filePath = `./src/presentation/styles/${fileName}`;
		routes[route] = serveCSSFile(filePath, fileName);
	}
	return routes;
};

// Generate JavaScript routes dynamically
const createJSRoutes = (jsFiles: { route: string; source: string }[]) => {
	const routes: Record<string, () => Promise<Response>> = {};
	for (const { route: routeName, source: sourceFile } of jsFiles) {
		const route = `/scripts/${routeName}`;
		const filePath = `./src/presentation/scripts/${sourceFile}`;
		routes[route] = serveJSFile(filePath, sourceFile);
	}
	return routes;
};
