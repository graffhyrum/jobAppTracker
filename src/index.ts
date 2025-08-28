import { createJobApplicationUseCases } from "./domain/use-cases/job-application-use-cases";
import { createJobApplicationJsonRepository } from "./infrastructure/storage/job-application-json-repository";
import { addApplicationPage } from "./presentation/pages/add-application";
import { healthcheckPage } from "./presentation/pages/healthcheck";
import { homepagePage } from "./presentation/pages/homepage";
import { createApplicationsRoutes } from "./presentation/routes/applications";

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
