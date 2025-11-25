import { beforeEach, describe, expect, it } from "bun:test";
import { type } from "arktype";
import { Elysia } from "elysia";
import { jobApplicationModule } from "#src/domain/entities/job-application.ts";
import { jobAppManagerRegistry } from "#src/domain/use-cases/create-sqlite-job-app-manager.ts";

// Get the test manager for testing
const jobApplicationManager = jobAppManagerRegistry.getManager("test");

// Create a test-specific version of the extension API plugin that doesn't use the jobApplicationManagerPlugin
const createTestExtensionApiPlugin = new Elysia({ prefix: "/api" })
	// Health check endpoint (public, no auth required)
	.get("/health", () => ({
		status: "ok",
		service: "Job Application Tracker",
		timestamp: new Date().toISOString(),
	}))
	// POST /api/applications/from-extension - Create application from browser extension
	.group("/applications", (app) =>
		app
			// OPTIONS handler for CORS preflight (no auth required)
			.options("/from-extension", ({ request, set }) => {
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
				}
				set.status = 204;
				return "";
			})
			// Simple API key authentication middleware
			.derive({ as: "scoped" }, ({ request, set }) => {
				const apiKey = request.headers.get("X-API-Key");
				const validApiKey =
					process.env.BROWSER_EXTENSION_API_KEY || "dev-api-key";

				if (!apiKey || apiKey !== validApiKey) {
					set.status = 401;
					throw new Error("Unauthorized: Invalid or missing API key");
				}

				return {};
			})
			.post(
				"/from-extension",
				async ({ body, set }) => {
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
							await jobApplicationManager.createJobApplication(
								validationResult,
							);

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
					body: type({
						company: type.string,
						position: type.string,
						"applicationDate?": "Date | string",
						"interestRating?": type.number,
						"jobPostingUrl?": type.string,
						"jobDescription?": type.string,
					}),
				},
			),
	);

let app = new Elysia().use(createTestExtensionApiPlugin);

describe("Extension API Plugin", () => {
	beforeEach(async () => {
		// Set up test environment with API key
		process.env.BROWSER_EXTENSION_API_KEY = "test-api-key";
		// Force test environment for job application manager
		process.env.JOB_APP_MANAGER_TYPE = "test";

		// Clear all applications before each test
		await jobApplicationManager.clearAllJobApplications();

		// Create test app with test manager
		app = new Elysia().use(createTestExtensionApiPlugin);
	});

	describe("GET /api/health", () => {
		it("should return health status without authentication", async () => {
			const response = await app
				.handle(new Request("http://localhost/api/health"))
				.then((res) => res.json());

			expect(response).toMatchObject({
				status: "ok",
				service: "Job Application Tracker",
			});
			expect(response.timestamp).toBeDefined();
		});
	});

	describe("POST /api/applications/from-extension", () => {
		const validApplicationData = {
			company: "Test Company",
			position: "Software Engineer",
			status: "applied",
			applicationDate: new Date().toISOString(),
			interestRating: 3,
			jobPostingUrl: "https://example.com/job",
			jobDescription: "Great opportunity",
		};

		it("should create application with valid API key", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/applications/from-extension", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-API-Key": "test-api-key",
					},
					body: JSON.stringify(validApplicationData),
				}),
			);

			const data = await response.json();

			expect(response.status).toBe(201);
			expect(data).toMatchObject({
				success: true,
				message: "Application created successfully",
			});
			expect(data.id).toBeDefined();
		});

		it("should reject request without API key", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/applications/from-extension", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(validApplicationData),
				}),
			);

			expect(response.status).toBe(401);
		});

		it("should reject request with invalid API key", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/applications/from-extension", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-API-Key": "wrong-key",
					},
					body: JSON.stringify(validApplicationData),
				}),
			);

			expect(response.status).toBe(401);
		});

		it("should create application with minimal required fields", async () => {
			const minimalData = {
				company: "Test Company",
				position: "Software Engineer",
			};

			const response = await app.handle(
				new Request("http://localhost/api/applications/from-extension", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-API-Key": "test-api-key",
					},
					body: JSON.stringify(minimalData),
				}),
			);

			const data = await response.json();

			expect(response.status).toBe(201);
			expect(data.success).toBe(true);
		});

		it("should reject application with missing required fields", async () => {
			const invalidData = {
				company: "Test Company",
				// Missing position
			};

			const response = await app.handle(
				new Request("http://localhost/api/applications/from-extension", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-API-Key": "test-api-key",
					},
					body: JSON.stringify(invalidData),
				}),
			);

			// Elysia returns 422 for schema validation failures
			expect(response.status).toBe(422);
		});

		it("should create application with default 'applied' status", async () => {
			const minimalData = {
				company: "Test Company",
				position: "Software Engineer",
			};

			const response = await app.handle(
				new Request("http://localhost/api/applications/from-extension", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-API-Key": "test-api-key",
					},
					body: JSON.stringify(minimalData),
				}),
			);

			const data = await response.json();
			expect(response.status).toBe(201);
			expect(data.success).toBe(true);

			// Verify the application was created with "applied" status
			const getResult = await jobApplicationManager.getJobApplication(data.id);
			if (getResult.isOk()) {
				const statusLog = getResult.value.statusLog;
				expect(statusLog.length).toBeGreaterThan(0);
				const currentStatus = statusLog[statusLog.length - 1]?.[1];
				expect(currentStatus?.label).toBe("applied");
			}
		});

		it("should create application with all optional fields", async () => {
			const completeData = {
				company: "Full Data Company",
				position: "Senior Developer",
				applicationDate: new Date("2025-01-15").toISOString(),
				interestRating: 2,
				jobPostingUrl: "https://jobs.example.com/12345",
				jobDescription:
					"Looking for a senior developer with 5+ years experience in web development. Must know TypeScript, React, and Node.js.",
			};

			const response = await app.handle(
				new Request("http://localhost/api/applications/from-extension", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-API-Key": "test-api-key",
					},
					body: JSON.stringify(completeData),
				}),
			);

			const data = await response.json();

			expect(response.status).toBe(201);
			expect(data.success).toBe(true);
			expect(data.id).toBeDefined();

			// Verify the application was actually created with correct data
			const getResult = await jobApplicationManager.getJobApplication(data.id);
			expect(getResult.isOk()).toBe(true);

			if (getResult.isOk()) {
				const app = getResult.value;
				expect(app.company).toBe("Full Data Company");
				expect(app.positionTitle).toBe("Senior Developer");
				expect(app.interestRating).toBe(2);
				expect(app.jobPostingUrl).toBe("https://jobs.example.com/12345");
				// Verify default status is "applied"
				const statusLog = app.statusLog;
				expect(statusLog.length).toBeGreaterThan(0);
				const currentStatus = statusLog[statusLog.length - 1]?.[1];
				expect(currentStatus?.label).toBe("applied");
				expect(currentStatus?.category).toBe("active");
			}
		});

		it("should handle empty company name validation", async () => {
			const invalidData = {
				company: "",
				position: "Developer",
			};

			const response = await app.handle(
				new Request("http://localhost/api/applications/from-extension", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-API-Key": "test-api-key",
					},
					body: JSON.stringify(invalidData),
				}),
			);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.error).toBeDefined();
		});

		it("should handle empty position name validation", async () => {
			const invalidData = {
				company: "Test Company",
				position: "",
			};

			const response = await app.handle(
				new Request("http://localhost/api/applications/from-extension", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-API-Key": "test-api-key",
					},
					body: JSON.stringify(invalidData),
				}),
			);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.error).toBeDefined();
		});

		it("should handle invalid interest rating", async () => {
			const invalidData = {
				company: "Test Company",
				position: "Developer",
				interestRating: 5, // Invalid: should be 1-3
			};

			const response = await app.handle(
				new Request("http://localhost/api/applications/from-extension", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-API-Key": "test-api-key",
					},
					body: JSON.stringify(invalidData),
				}),
			);

			expect(response.status).toBe(400);
		});

		it("should handle malformed JSON body", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/applications/from-extension", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-API-Key": "test-api-key",
					},
					body: "{ invalid json }",
				}),
			);

			expect(response.status).toBeGreaterThanOrEqual(400);
		});

		it("should accept interest ratings 1, 2, and 3", async () => {
			const ratings = [1, 2, 3];

			for (const rating of ratings) {
				const data = {
					company: `Test Company Rating ${rating}`,
					position: "Developer",
					interestRating: rating,
				};

				const response = await app.handle(
					new Request("http://localhost/api/applications/from-extension", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"X-API-Key": "test-api-key",
						},
						body: JSON.stringify(data),
					}),
				);

				const result = await response.json();
				expect(response.status).toBe(201);
				expect(result.success).toBe(true);
			}
		});

		it("should preserve special characters in company and position names", async () => {
			const data = {
				company: "Tech Co. & Partners, Inc.",
				position: "Senior C++ Developer / Team Lead",
			};

			const response = await app.handle(
				new Request("http://localhost/api/applications/from-extension", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-API-Key": "test-api-key",
					},
					body: JSON.stringify(data),
				}),
			);

			const result = await response.json();
			expect(response.status).toBe(201);

			const getResult = await jobApplicationManager.getJobApplication(
				result.id,
			);
			if (getResult.isOk()) {
				expect(getResult.value.company).toBe("Tech Co. & Partners, Inc.");
				expect(getResult.value.positionTitle).toBe(
					"Senior C++ Developer / Team Lead",
				);
			}
		});

		it("should handle very long job descriptions", async () => {
			const longDescription = "A".repeat(10000); // 10k character description

			const data = {
				company: "Test Company",
				position: "Developer",
				jobDescription: longDescription,
			};

			const response = await app.handle(
				new Request("http://localhost/api/applications/from-extension", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-API-Key": "test-api-key",
					},
					body: JSON.stringify(data),
				}),
			);

			const result = await response.json();
			expect(response.status).toBe(201);
			expect(result.success).toBe(true);
		});

		it("should handle URLs with query parameters", async () => {
			const data = {
				company: "Test Company",
				position: "Developer",
				jobPostingUrl:
					"https://jobs.example.com/view?id=12345&source=linkedin&ref=social",
			};

			const response = await app.handle(
				new Request("http://localhost/api/applications/from-extension", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-API-Key": "test-api-key",
					},
					body: JSON.stringify(data),
				}),
			);

			const result = await response.json();
			expect(response.status).toBe(201);

			const getResult = await jobApplicationManager.getJobApplication(
				result.id,
			);
			if (getResult.isOk()) {
				expect(getResult.value.jobPostingUrl).toContain("id=12345");
				expect(getResult.value.jobPostingUrl).toContain("source=linkedin");
			}
		});

		it("should not allow CORS from non-extension origins", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/applications/from-extension", {
					method: "OPTIONS",
					headers: {
						Origin: "https://evil-site.com",
					},
				}),
			);

			// Should not set CORS headers for non-extension origins
			expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
		});

		it("should handle concurrent requests", async () => {
			const requests = Array.from({ length: 5 }, (_, i) => ({
				company: `Company ${i}`,
				position: `Position ${i}`,
			}));

			const responses = await Promise.all(
				requests.map((data) =>
					app.handle(
						new Request("http://localhost/api/applications/from-extension", {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								"X-API-Key": "test-api-key",
							},
							body: JSON.stringify(data),
						}),
					),
				),
			);

			for (const response of responses) {
				expect(response.status).toBe(201);
				const data = await response.json();
				expect(data.success).toBe(true);
			}

			// Verify all were created
			const allApps = await jobApplicationManager.getAllJobApplications();
			if (allApps.isOk()) {
				expect(allApps.value.length).toBeGreaterThanOrEqual(5);
			}
		});
	});

	describe("API Key Environment Variable", () => {
		it("should use default dev-api-key when environment variable not set", async () => {
			const originalKey = process.env.BROWSER_EXTENSION_API_KEY;
			delete process.env.BROWSER_EXTENSION_API_KEY;

			// Recreate app without API key in env
			const testApp = new Elysia().use(createTestExtensionApiPlugin);

			const response = await testApp.handle(
				new Request("http://localhost/api/applications/from-extension", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-API-Key": "dev-api-key", // Default key
					},
					body: JSON.stringify({
						company: "Test",
						position: "Dev",
					}),
				}),
			);

			expect(response.status).toBe(201);

			// Restore original
			if (originalKey) {
				process.env.BROWSER_EXTENSION_API_KEY = originalKey;
			}
		});
	});
});
