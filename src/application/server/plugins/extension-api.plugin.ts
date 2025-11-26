import { type } from "arktype";
import { Elysia } from "elysia";
import type { HTTPHeaders } from "elysia/types";
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
 * Extracts API key from request headers
 */
const extractApiKey = (request: Request): string | null =>
	request.headers.get("X-API-Key");

/**
 * Gets valid API key from environment
 */
const getValidApiKey = (): string =>
	process.env.BROWSER_EXTENSION_API_KEY || "dev-api-key";

/**
 * Validates API key against valid key
 */
const validateApiKey = (apiKey: string | null, validApiKey: string): boolean =>
	Boolean(apiKey && apiKey === validApiKey);

/**
 * Simple API key authentication middleware
 * Checks for X-API-Key header and validates against environment variable
 */
const apiKeyAuth = () => (app: Elysia) =>
	app.derive({ as: "scoped" }, ({ request, set }) => {
		const apiKey = extractApiKey(request);
		const validApiKey = getValidApiKey();

		if (!validateApiKey(apiKey, validApiKey)) {
			set.status = 401;
			throw new Error("Unauthorized: Invalid or missing API key");
		}

		return {};
	});

/**
 * Checks if origin is from a browser extension
 */
const isExtensionOrigin = (origin: string | null): boolean =>
	Boolean(
		origin?.startsWith("chrome-extension://") ||
			origin?.startsWith("moz-extension://"),
	);

/**
 * Sets allowed origin header
 */
const setAllowedOrigin = (
	origin: string | null,
	headers: HTTPHeaders,
): void => {
	if (origin) {
		headers["Access-Control-Allow-Origin"] = origin;
	}
};

/**
 * Sets allowed methods header
 */
const setAllowedMethods = (headers: HTTPHeaders): void => {
	headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
};

/**
 * Sets allowed headers header
 */
const setAllowedHeaders = (headers: HTTPHeaders): void => {
	headers["Access-Control-Allow-Headers"] = "Content-Type, X-API-Key";
};

/**
 * Sets max age header
 */
const setMaxAge = (headers: HTTPHeaders): void => {
	headers["Access-Control-Max-Age"] = "86400";
};

/**
 * Helper to set CORS headers for browser extensions
 */
const setCorsHeaders = (
	origin: string | null,
	set: { headers: HTTPHeaders },
): void => {
	if (isExtensionOrigin(origin)) {
		setAllowedOrigin(origin, set.headers);
		setAllowedMethods(set.headers);
		setAllowedHeaders(set.headers);
		setMaxAge(set.headers);
	}
};

/**
 * CORS middleware for browser extension
 */
const extensionCors = () => (app: Elysia) =>
	app.onBeforeHandle(({ request, set }) => {
		// Allow requests from browser extensions
		const origin = request.headers.get("Origin");
		setCorsHeaders(origin, set);
	});

/**
 * Formats application date to ISO string
 */
const formatApplicationDate = (date: Date | string | undefined): string =>
	date ? new Date(date).toISOString() : new Date().toISOString();

/**
 * Creates optional fields object from request body
 */
const createOptionalFields = (body: any) => ({
	...(body.interestRating && { interestRating: body.interestRating }),
	...(body.jobPostingUrl && { jobPostingUrl: body.jobPostingUrl }),
	...(body.jobDescription && { jobDescription: body.jobDescription }),
});

/**
 * Transforms extension request body to application data
 */
const transformExtensionBodyToApplicationData = (body: any) => ({
	company: body.company,
	positionTitle: body.position,
	applicationDate: formatApplicationDate(body.applicationDate),
	sourceType: "job_board" as const,
	isRemote: false,
	...createOptionalFields(body),
});

/**
 * Validates application data using domain schema
 */
const validateApplicationData = (applicationData: any) => {
	const validationResult = jobApplicationModule.forCreate(applicationData);
	return validationResult instanceof type.errors
		? validationResult
		: applicationData;
};

/**
 * Creates validation error response
 */
const createValidationErrorResponse = (validationResult: any) => ({
	error: "Validation Error",
	message: validationResult.summary,
});

/**
 * Creates job application via manager
 */
const createJobApplication = async (
	jobApplicationManager: any,
	applicationData: any,
) => await jobApplicationManager.createJobApplication(applicationData);

/**
 * Creates creation error response
 */
const createCreationErrorResponse = (error: any) => ({
	error: "Failed to create application",
	message: error,
});

/**
 * Creates success response
 */
const createSuccessResponse = (result: any) => ({
	success: true,
	id: result.value.id,
	message: "Application created successfully",
});

/**
 * Creates internal server error response
 */
const createInternalServerErrorResponse = (error: any) => ({
	error: "Internal server error",
	message: error instanceof Error ? error.message : String(error),
});

/**
 * Handles extension application creation request
 */
const handleExtensionApplicationCreation = async (
	jobApplicationManager: any,
	body: any,
	set: any,
) => {
	const applicationData = transformExtensionBodyToApplicationData(body);
	const validationResult = validateApplicationData(applicationData);

	if (validationResult instanceof type.errors) {
		set.status = 400;
		return createValidationErrorResponse(validationResult);
	}

	const creationResult = await createJobApplication(
		jobApplicationManager,
		validationResult,
	);

	if (creationResult.isErr()) {
		set.status = 500;
		return createCreationErrorResponse(creationResult.error);
	}

	set.status = 201;
	return createSuccessResponse(creationResult);
};

/**
 * Creates health check response
 */
const createHealthCheckResponse = () => ({
	status: "ok",
	service: "Job Application Tracker",
	timestamp: new Date().toISOString(),
});

/**
 * Handles CORS preflight request
 */
const handleCorsPreflight = ({ request, set }: any) => {
	const origin = request.headers.get("Origin");
	setCorsHeaders(origin, set);
	set.status = 204;
	return "";
};

/**
 * Browser extension API endpoints
 */
export const createExtensionApiPlugin = new Elysia({ prefix: "/api" })
	.use(jobApplicationManagerPlugin)
	.use(extensionCors())
	// Health check endpoint (public, no auth required)
	.get("/health", createHealthCheckResponse)
	// POST /api/applications/from-extension - Create application from browser extension
	.group("/applications", (app) =>
		app
			// OPTIONS handler for CORS preflight (no auth required)
			.options("/from-extension", handleCorsPreflight)
			.use(apiKeyAuth())
			.post(
				"/from-extension",
				async ({ jobApplicationManager, body, set }) => {
					try {
						return await handleExtensionApplicationCreation(
							jobApplicationManager,
							body,
							set,
						);
					} catch (error) {
						console.error("Extension API error:", error);
						set.status = 500;
						return createInternalServerErrorResponse(error);
					}
				},
				{
					body: extensionCreateApplicationSchema,
				},
			),
	);
