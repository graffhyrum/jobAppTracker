import { createJobApplicationUseCases } from "./domain/use-cases/job-application-use-cases";
import { createJobApplicationJsonRepository } from "./infrastructure/storage/job-application-json-repository";
import { addApplicationPage } from "./presentation/pages/add-application";
import { healthcheckPage } from "./presentation/pages/healthcheck";
import { homepagePage } from "./presentation/pages/homepage";
import { createApplicationsRoutes } from "./presentation/routes/applications";

// Helper function to serve CSS files with proper error handling
const serveCSSFile = (filePath: string, fileName: string) => {
	return async (): Promise<Response> => {
		try {
			const file = Bun.file(filePath);
			const exists = await file.exists();
			if (!exists) {
				return new Response("CSS file not found", {
					status: 404,
					headers: { "Content-Type": "text/plain" },
				});
			}
			return new Response(file, {
				headers: {
					"Content-Type": "text/css",
					"Cache-Control": "public, max-age=3600",
				},
			});
		} catch (error) {
			console.error(`Error serving ${fileName}:`, error);
			return new Response("Internal server error", {
				status: 500,
				headers: { "Content-Type": "text/plain" },
			});
		}
	};
};

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

main();

function main() {
	console.log("Hello via Bun!");
	startBunServer();
}

function startBunServer() {
	// Set up dependencies following hexagonal architecture
	const jobApplicationRepository = createJobApplicationJsonRepository(
		"./data/job-applications.json",
	);
	const jobApplicationUseCases = createJobApplicationUseCases(
		jobApplicationRepository,
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
