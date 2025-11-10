import { type } from "arktype";
import { Elysia } from "elysia";
import { jobApplicationManagerPlugin } from "#src/application/server/plugins/jobApplicationManager.plugin.ts";
import { jobApplicationModule } from "#src/domain/entities/job-application.ts";

/**
 * Schema for extension API request body
 * Note: status is not included - applications are always created with "applied" status
 */
const extensionCreateApplicationSchema = type({
	company: type.string,
	position: type.string,
	"applicationDate?": "Date | string",
	"interestRating?": type.number,
	"jobPostingUrl?": type.string,
	"jobDescription?": type.string,
});

/**
 * Simple API key authentication middleware
 * Checks for X-API-Key header and validates against environment variable
 */
const apiKeyAuth = () => (app: Elysia) =>
	app.derive({ as: "scoped" }, ({ request, set }) => {
		const apiKey = request.headers.get("X-API-Key");
		const validApiKey = process.env.BROWSER_EXTENSION_API_KEY || "dev-api-key";

		if (!apiKey || apiKey !== validApiKey) {
			set.status = 401;
			throw new Error("Unauthorized: Invalid or missing API key");
		}

		return {};
	});

/**
 * CORS middleware for browser extension
 */
const extensionCors = () => (app: Elysia) =>
	app
		.onBeforeHandle(({ request, set }) => {
			// Allow requests from browser extensions (chrome-extension:// and moz-extension://)
			const origin = request.headers.get("Origin");

			if (
				origin?.startsWith("chrome-extension://") ||
				origin?.startsWith("moz-extension://")
			) {
				set.headers["Access-Control-Allow-Origin"] = origin;
				set.headers["Access-Control-Allow-Methods"] =
					"GET, POST, PUT, DELETE, OPTIONS";
				set.headers["Access-Control-Allow-Headers"] =
					"Content-Type, X-API-Key";
				set.headers["Access-Control-Max-Age"] = "86400";
			}
		})
		.options("/*", ({ request, set }) => {
			// Handle preflight requests - set CORS headers directly
			const origin = request.headers.get("Origin");

			if (
				origin?.startsWith("chrome-extension://") ||
				origin?.startsWith("moz-extension://")
			) {
				set.headers["Access-Control-Allow-Origin"] = origin;
				set.headers["Access-Control-Allow-Methods"] =
					"GET, POST, PUT, DELETE, OPTIONS";
				set.headers["Access-Control-Allow-Headers"] =
					"Content-Type, X-API-Key";
				set.headers["Access-Control-Max-Age"] = "86400";
			}

			set.status = 204;
			return "";
		});

/**
 * Browser extension API endpoints
 */
export const createExtensionApiPlugin = new Elysia({ prefix: "/api" })
	.use(jobApplicationManagerPlugin)
	.use(extensionCors())
	// Health check endpoint (public, no auth required)
	.get("/health", () => ({
		status: "ok",
		service: "Job Application Tracker",
		timestamp: new Date().toISOString(),
	}))
	// POST /api/applications/from-extension - Create application from browser extension
	.group("/applications", (app) =>
		app
			.use(apiKeyAuth())
			.post(
				"/from-extension",
				async ({ jobApplicationManager, body, set }) => {
					try {
						// Transform and validate the data
						const applicationData = {
							company: body.company,
							positionTitle: body.position,
							applicationDate: body.applicationDate
								? new Date(body.applicationDate).toISOString()
								: new Date().toISOString(),
							sourceType: "job_board" as const,
							isRemote: false,
							...(body.interestRating && {
								interestRating: body.interestRating,
							}),
							...(body.jobPostingUrl && { jobPostingUrl: body.jobPostingUrl }),
							...(body.jobDescription && {
								jobDescription: body.jobDescription,
							}),
						};

						// Validate using domain schema
						const validationResult =
							jobApplicationModule.forCreate(applicationData);

						if (validationResult instanceof type.errors) {
							set.status = 400;
							return {
								error: "Validation Error",
								message: validationResult.summary,
							};
						}

						// Create the application
						const result =
							await jobApplicationManager.createJobApplication(validationResult);

						if (result.isErr()) {
							set.status = 500;
							return {
								error: "Failed to create application",
								message: result.error,
							};
						}

						// Return success response
						set.status = 201;
						return {
							success: true,
							id: result.value.id,
							message: "Application created successfully",
						};
					} catch (error) {
						console.error("Extension API error:", error);
						set.status = 500;
						return {
							error: "Internal server error",
							message: error instanceof Error ? error.message : String(error),
						};
					}
				},
				{
					body: extensionCreateApplicationSchema,
				},
			),
	);
