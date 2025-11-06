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
	});
});
