import { type } from "arktype";
import { Elysia } from "elysia";
import type { HTTPHeaders } from "elysia/types";
import type { ResultAsync } from "neverthrow";
import { jobApplicationManagerPlugin } from "#src/application/server/plugins/jobApplicationManager.plugin.ts";
import type {
	JobApplication,
	JobApplicationForCreate,
} from "#src/domain/entities/job-application.ts";
import { jobApplicationModule } from "#src/domain/entities/job-application.ts";
import type { JobApplicationManager } from "#src/domain/ports/job-application-manager.ts";

// Type definitions
type ExtensionRequestBody = {
	company: string;
	position: string;
	applicationDate?: Date | string;
	interestRating?: number;
	jobPostingUrl?: string;
	jobDescription?: string;
};

type ApiResponse = {
	error?: string;
	message?: string;
	success?: boolean;
	id?: string;
	status?: string;
	service?: string;
	timestamp?: string;
};

type ElysiaSet = {
	status?: number | string;
	headers: HTTPHeaders;
};

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

// Authentication module
const createAuthModule = () => {
	const extractApiKey = (request: Request): string | null =>
		request.headers.get("X-API-Key");

	const getValidApiKey = (): string =>
		process.env.BROWSER_EXTENSION_API_KEY ?? "dev-api-key";

	const validateApiKey = (
		apiKey: string | null,
		validApiKey: string,
	): boolean => Boolean(apiKey && apiKey === validApiKey);

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

	return { apiKeyAuth };
};

// CORS module
const createCorsModule = () => {
	const isExtensionOrigin = (origin: string | null): boolean =>
		Boolean(
			origin?.startsWith("chrome-extension://") ||
				origin?.startsWith("moz-extension://"),
		);

	const setAllowedOrigin = (
		origin: string | null,
		headers: HTTPHeaders,
	): void => {
		if (origin) {
			headers["Access-Control-Allow-Origin"] = origin;
		}
	};

	const setAllowedMethods = (headers: HTTPHeaders): void => {
		headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
	};

	const setAllowedHeaders = (headers: HTTPHeaders): void => {
		headers["Access-Control-Allow-Headers"] = "Content-Type, X-API-Key";
	};

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
			const origin = request.headers.get("Origin");
			setCorsHeaders(origin, set);
		});

	return { extensionCors, setCorsHeaders };
};

// Application creation module
const createApplicationModule = () => {
	const formatApplicationDate = (date: Date | string | undefined): string =>
		date ? new Date(date).toISOString() : new Date().toISOString();

	const createOptionalFields = (body: ExtensionRequestBody) => ({
		...(body.interestRating && { interestRating: body.interestRating }),
		...(body.jobPostingUrl && { jobPostingUrl: body.jobPostingUrl }),
		...(body.jobDescription && { jobDescription: body.jobDescription }),
	});

	/**
	 * Transforms extension request body to application data
	 */
	const transformExtensionBodyToApplicationData = (
		body: ExtensionRequestBody,
	): JobApplicationForCreate => ({
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
	const validateApplicationData = (
		applicationData: JobApplicationForCreate,
	): JobApplicationForCreate | type.errors => {
		const validationResult = jobApplicationModule.forCreate(applicationData);
		return validationResult instanceof type.errors
			? validationResult
			: applicationData;
	};

	/**
	 * Creates job application via manager
	 */
	const createJobApplication = async (
		jobApplicationManager: JobApplicationManager,
		applicationData: JobApplicationForCreate,
	): Promise<ResultAsync<JobApplication, string>> =>
		jobApplicationManager.createJobApplication(applicationData);

	return {
		transformExtensionBodyToApplicationData,
		validateApplicationData,
		createJobApplication,
	};
};

// Response module
const createResponseModule = () => {
	/**
	 * Creates validation error response
	 */
	const createValidationErrorResponse = (
		validationResult: type.errors,
	): ApiResponse => ({
		error: "Validation Error",
		message: validationResult.summary,
	});

	/**
	 * Creates creation error response
	 */
	const createCreationErrorResponse = (error: string): ApiResponse => ({
		error: "Failed to create application",
		message: error,
	});

	/**
	 * Creates success response
	 */
	const createSuccessResponse = (result: {
		value: JobApplication;
	}): ApiResponse => ({
		success: true,
		id: result.value.id,
		message: "Application created successfully",
	});

	/**
	 * Creates internal server error response
	 */
	const createInternalServerErrorResponse = (error: unknown): ApiResponse => ({
		error: "Internal server error",
		message: error instanceof Error ? error.message : String(error),
	});

	/**
	 * Creates health check response
	 */
	const createHealthCheckResponse = (): ApiResponse => ({
		status: "ok",
		service: "Job Application Tracker",
		timestamp: new Date().toISOString(),
	});

	return {
		createValidationErrorResponse,
		createCreationErrorResponse,
		createSuccessResponse,
		createInternalServerErrorResponse,
		createHealthCheckResponse,
	};
};

// Main handler
const createExtensionApplicationCreationHandler = (
	applicationModule: ReturnType<typeof createApplicationModule>,
	responseModule: ReturnType<typeof createResponseModule>,
) => {
	/**
	 * Handles extension application creation request
	 */
	const handleExtensionApplicationCreation = async (
		jobApplicationManager: JobApplicationManager,
		body: ExtensionRequestBody,
		set: ElysiaSet,
	): Promise<ApiResponse> => {
		const applicationData =
			applicationModule.transformExtensionBodyToApplicationData(body);
		const validationResult =
			applicationModule.validateApplicationData(applicationData);

		if (validationResult instanceof type.errors) {
			set.status = 400;
			return responseModule.createValidationErrorResponse(validationResult);
		}

		const creationResult = await applicationModule.createJobApplication(
			jobApplicationManager,
			validationResult,
		);

		if (creationResult.isErr()) {
			set.status = 500;
			return responseModule.createCreationErrorResponse(creationResult.error);
		}

		set.status = 201;
		return responseModule.createSuccessResponse(creationResult);
	};

	return { handleExtensionApplicationCreation };
};

// CORS preflight handler
const createCorsPreflightHandler = (
	corsModule: ReturnType<typeof createCorsModule>,
) => {
	/**
	 * Handles CORS preflight request
	 */
	const handleCorsPreflight = (context: {
		request: Request;
		set: ElysiaSet;
	}): string => {
		const origin = context.request.headers.get("Origin");
		corsModule.setCorsHeaders(origin, context.set);
		context.set.status = 204;
		return "";
	};

	return { handleCorsPreflight };
};

/**
 * Browser extension API endpoints
 */
export const createExtensionApiPlugin = (() => {
	// Initialize modules
	const authModule = createAuthModule();
	const corsModule = createCorsModule();
	const applicationModule = createApplicationModule();
	const responseModule = createResponseModule();
	const { handleExtensionApplicationCreation } =
		createExtensionApplicationCreationHandler(
			applicationModule,
			responseModule,
		);
	const { handleCorsPreflight } = createCorsPreflightHandler(corsModule);

	return (
		new Elysia({ prefix: "/api" })
			.use(jobApplicationManagerPlugin)
			.use(corsModule.extensionCors())
			// Health check endpoint (public, no auth required)
			.get("/health", responseModule.createHealthCheckResponse)
			// POST /api/applications/from-extension - Create application from browser extension
			.group("/applications", (app) =>
				app
					// OPTIONS handler for CORS preflight (no auth required)
					.options("/from-extension", handleCorsPreflight)
					.use(authModule.apiKeyAuth())
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
								return responseModule.createInternalServerErrorResponse(error);
							}
						},
						{
							body: extensionCreateApplicationSchema,
						},
					),
			)
	);
})();
