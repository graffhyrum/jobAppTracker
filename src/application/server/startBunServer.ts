import { createJobApplicationUseCases } from "../../domain/use-cases/job-application-use-cases.ts";
import { jobApplicationRepositoryProvider } from "../../infrastructure/di/repository-provider.ts";
import { addApplicationPage } from "../../presentation/pages/add-application.ts";
import { healthcheckPage } from "../../presentation/pages/healthcheck.ts";
import { homepagePage } from "../../presentation/pages/homepage.ts";
import { createApplicationsRoutes } from "../../presentation/routes/applications.ts";
import { serveCSSFile } from "./serveCSSFile.ts";

export function startBunServer() {
	// Set up dependencies following hexagonal architecture using DI
	const jobApplicationUseCases = createJobApplicationUseCases(
		jobApplicationRepositoryProvider,
	);
	const applicationRoutes = createApplicationsRoutes(jobApplicationUseCases);

	// Define CSS files to serve
	const cssFiles = [
		"base.css",
		"navbar.css",
		"forms.css",
		"pages.css",
		"pipeline.css",
	];
	const cssRoutes = createCSSRoutes(cssFiles);

	const server = Bun.serve({
		port: 3000,
		routes: {
			"/": async () => {
				// Fetch applications to show in the pipeline
				const applicationsResult =
					await jobApplicationUseCases.getAllJobApplications();
				const applications = applicationsResult.isOk()
					? applicationsResult.value
					: [];

				return new Response(homepagePage(applications), {
					headers: { "Content-Type": "text/html" },
				});
			},
			"/health": () => {
				return new Response(healthcheckPage(), {
					headers: { "Content-Type": "text/html" },
				});
			},
			"/add": () => {
				return new Response(addApplicationPage(), {
					headers: { "Content-Type": "text/html" },
				});
			},
			"/applications": {
				POST: applicationRoutes.handleCreateApplication,
			},
			// Dynamically generated CSS routes
			...cssRoutes,
		},
		fetch(request) {
			const url = new URL(request.url);
			const pathname = url.pathname;

			// Handle parameterized application routes
			const applicationEditMatch = pathname.match(
				/^\/applications\/([^/]+)\/edit\/([^/]+)$/,
			);
			if (applicationEditMatch) {
				const [, applicationId, field] = applicationEditMatch;
				if (applicationId && field) {
					return applicationRoutes.handleGetEditField(
						request,
						applicationId,
						field,
					);
				}
			}

			const applicationMatch = pathname.match(/^\/applications\/([^/]+)$/);
			if (applicationMatch) {
				const [, applicationId] = applicationMatch;
				if (applicationId) {
					if (request.method === "GET") {
						return applicationRoutes.handleGetApplication(
							request,
							applicationId,
						);
					} else if (request.method === "PUT") {
						return applicationRoutes.handleUpdateApplication(
							request,
							applicationId,
						);
					}
				}
			}

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
