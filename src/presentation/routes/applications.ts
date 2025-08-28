import type { JobApplicationForCreate } from "../../domain/entities/job-application";
import { createDefaultPipelineConfig } from "../../domain/entities/pipeline-config";
import type { JobApplicationUseCases } from "../../domain/use-cases/job-application-use-cases";

export function createApplicationsRoutes(useCases: JobApplicationUseCases) {
	return {
		handleCreateApplication: async (request: Request): Promise<Response> => {
			try {
				const formData = await request.formData();
				const applicationData = extractApplicationData(
					formData as globalThis.FormData,
				);

				const result = await useCases.createJobApplication(applicationData);

				if (result.isErr()) {
					console.error("Failed to create application:", result.error);
					return new Response(`Error: ${result.error.message}`, {
						status: 400,
						headers: { "Content-Type": "text/plain" },
					});
				}

				// Set initial status to the first active status
				const newApplication = result.value;
				const pipelineConfig = createDefaultPipelineConfig();
				const firstActiveStatus = pipelineConfig.active[0];

				if (firstActiveStatus) {
					newApplication.newStatus({
						category: "active",
						current: firstActiveStatus as
							| "applied"
							| "screening interview"
							| "interview"
							| "onsite"
							| "online test"
							| "take-home assignment"
							| "offer",
					});

					// Save the application with the new status
					const saveResult =
						await useCases.updateJobApplication(newApplication);
					if (saveResult.isErr()) {
						console.error(
							"Failed to save application with status:",
							saveResult.error,
						);
						return new Response(`Error: ${saveResult.error.message}`, {
							status: 500,
							headers: { "Content-Type": "text/plain" },
						});
					}
				}

				// Get all applications to refresh the pipeline view
				const applicationsResult = await useCases.getAllJobApplications();
				if (applicationsResult.isErr()) {
					console.error(
						"Failed to fetch applications:",
						applicationsResult.error,
					);
					return new Response(`Error: ${applicationsResult.error.message}`, {
						status: 500,
						headers: { "Content-Type": "text/plain" },
					});
				}

				// Redirect to homepage to show the updated pipeline
				return new Response("", {
					status: 303,
					headers: {
						Location: "/",
						"HX-Redirect": "/",
					},
				});
			} catch (error) {
				console.error("Unexpected error creating application:", error);
				return new Response(
					`Error: ${error instanceof Error ? error.message : String(error)}`,
					{
						status: 500,
						headers: { "Content-Type": "text/plain" },
					},
				);
			}
		},
	};
}

function extractApplicationData(
	formData: globalThis.FormData,
): JobApplicationForCreate {
	const company = formData.get("company")?.toString().trim();
	const positionTitle = formData.get("positionTitle")?.toString().trim();
	const applicationDate = formData.get("applicationDate")?.toString();
	const interestRating = formData.get("interestRating")?.toString();
	const nextEventDate = formData.get("nextEventDate")?.toString();
	const jobPostingUrl = formData.get("jobPostingUrl")?.toString().trim();
	const jobDescription = formData.get("jobDescription")?.toString().trim();

	if (!company || !positionTitle || !applicationDate) {
		throw new Error(
			"Company, position title, and application date are required",
		);
	}

	const data: JobApplicationForCreate = {
		company,
		positionTitle,
		applicationDate,
	};

	// Add optional fields only if they have values
	if (interestRating && ["1", "2", "3"].includes(interestRating)) {
		data.interestRating = Number(interestRating) as 1 | 2 | 3;
	}

	if (nextEventDate) {
		data.nextEventDate = nextEventDate;
	}

	if (jobPostingUrl) {
		data.jobPostingUrl = jobPostingUrl;
	}

	if (jobDescription) {
		data.jobDescription = jobDescription;
	}

	return data;
}
