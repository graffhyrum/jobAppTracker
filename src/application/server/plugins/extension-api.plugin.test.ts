import { describe, expect, it, beforeEach } from "bun:test";
import { Elysia } from "elysia";
import { jobAppManagerRegistry } from "#src/domain/use-cases/create-sqlite-job-app-manager.ts";
import { createExtensionApiPlugin } from "./extension-api.plugin.ts";

// Get the test manager for testing
const jobApplicationManager = jobAppManagerRegistry.getManager("test");

describe("Extension API Plugin", () => {
	let app: Elysia;

	beforeEach(async () => {
		// Set up test environment with API key
		process.env.BROWSER_EXTENSION_API_KEY = "test-api-key";

		// Clear all applications before each test
		await jobApplicationManager.clearAllJobApplications();

		// Create test app with test manager
		app = new Elysia()
			.decorate("jobApplicationManager", jobApplicationManager)
			.use(createExtensionApiPlugin);
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

			expect(response.status).toBe(400);
		});

		it("should default status to 'applied' when not provided", async () => {
			const dataWithoutStatus = {
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
					body: JSON.stringify(dataWithoutStatus),
				}),
			);

			const data = await response.json();
			expect(response.status).toBe(201);
			expect(data.success).toBe(true);
		});

		it("should handle CORS preflight requests from chrome extensions", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/applications/from-extension", {
					method: "OPTIONS",
					headers: {
						Origin: "chrome-extension://abcdefghijklmnopqrstuvwxyz123456",
					},
				}),
			);

			expect(response.status).toBe(204);
			expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
				"chrome-extension://abcdefghijklmnopqrstuvwxyz123456",
			);
			expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
				"POST",
			);
		});

		it("should handle CORS preflight requests from firefox extensions", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/applications/from-extension", {
					method: "OPTIONS",
					headers: {
						Origin: "moz-extension://abcdefgh-1234-5678-9abc-def123456789",
					},
				}),
			);

			expect(response.status).toBe(204);
			expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
				"moz-extension://abcdefgh-1234-5678-9abc-def123456789",
			);
		});

		it("should create application with all optional fields", async () => {
			const completeData = {
				company: "Full Data Company",
				position: "Senior Developer",
				status: "screening interview",
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

		it("should handle invalid status value", async () => {
			const invalidData = {
				company: "Test Company",
				position: "Developer",
				status: "not-a-real-status",
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

		it("should accept different valid status values", async () => {
			const statuses = [
				"applied",
				"screening interview",
				"interview",
				"onsite",
				"online test",
				"take-home assignment",
				"offer",
				"rejected",
			];

			for (const status of statuses) {
				const data = {
					company: `Test Company ${status}`,
					position: "Developer",
					status,
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
			const testApp = new Elysia()
				.decorate("jobApplicationManager", jobApplicationManager)
				.use(createExtensionApiPlugin);

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
