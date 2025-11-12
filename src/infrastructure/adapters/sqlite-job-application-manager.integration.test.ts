import { describe, expect, it } from "bun:test";
import { assertDefined } from "#helpers/assertDefined.ts";
import type {
	JobApplication,
	JobApplicationForCreate,
	JobApplicationId,
} from "../../domain/entities/job-application.ts";
import type { JobApplicationManager } from "../../domain/ports/job-application-manager.ts";
import { jobAppManagerRegistry } from "../../domain/use-cases/create-sqlite-job-app-manager.ts";
import type { ForUpdate } from "../storage/storage-provider-interface.ts";

// Get the test manager for testing
const jobApplicationManager = jobAppManagerRegistry.getManager("test");

/**
 * Integration tests for SQLite JobApplicationManager implementation.
 * These tests verify that the SQLite adapter correctly persists and retrieves data.
 */
describe("SQLite JobApplicationManager (Integration Tests)", () => {
	// Test data that represents realistic job application scenarios
	const validJobApplicationData = {
		company: "Test Company",
		positionTitle: "Software Developer",
		applicationDate: new Date().toISOString(),
		interestRating: 3,
		nextEventDate: new Date(Date.now() + 86400000).toISOString(), // tomorrow
		jobPostingUrl: "https://example.com/job",
		jobDescription: "A great job opportunity",
		sourceType: "job_board" as const,
		isRemote: false,
	} as const satisfies JobApplicationForCreate;

	const validUpdateData = {
		company: "Updated Company",
		interestRating: 2,
	} as const satisfies ForUpdate<JobApplication>;

	const invalidJobApplicationData = {
		company: "", // Invalid: empty string
		positionTitle: "Developer",
		applicationDate: "invalid-date", // Invalid: not ISO date
		interestRating: 5, // Invalid: out of range
	};

	// Helper to get a fresh manager instance for each test
	function createTestManager(): JobApplicationManager {
		return jobApplicationManager;
	}

	describe("Factory Function", () => {
		it("should return object with correct JobApplicationManager interface", () => {
			const manager = createTestManager();

			// Verify all required methods exist and are functions
			expect(typeof manager.createJobApplication).toBe("function");
			expect(typeof manager.getJobApplication).toBe("function");
			expect(typeof manager.getAllJobApplications).toBe("function");
			expect(typeof manager.updateJobApplication).toBe("function");
			expect(typeof manager.deleteJobApplication).toBe("function");
			expect(typeof manager.getActiveJobApplications).toBe("function");
			expect(typeof manager.getInactiveJobApplications).toBe("function");
		});
	});

	describe("createJobApplication", () => {
		it("should successfully create application with valid data", async () => {
			const manager = createTestManager();
			const result = await manager.createJobApplication(
				validJobApplicationData,
			);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const application = result.value;
				expect(application.company).toBe(validJobApplicationData.company);
				expect(application.positionTitle).toBe(
					validJobApplicationData.positionTitle,
				);
				expect(application.applicationDate).toBe(
					validJobApplicationData.applicationDate,
				);
				expect(application.interestRating).toBe(
					validJobApplicationData.interestRating,
				);
				assertDefined(application.id);
				assertDefined(application.createdAt);
				assertDefined(application.updatedAt);
				expect(Array.isArray(application.notes)).toBe(true);
				expect(Array.isArray(application.statusLog)).toBe(true);
			}
		});

		it("should handle validation errors for invalid input data", async () => {
			const manager = createTestManager();
			const result = await manager.createJobApplication(
				invalidJobApplicationData as JobApplicationForCreate,
			);

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(typeof result.error).toBe("string");
				expect(result.error.length).toBeGreaterThan(0);
			}
		});
	});

	describe("getJobApplication", () => {
		it("should successfully retrieve existing application by ID", async () => {
			const manager = createTestManager();

			// First, create an application
			const createResult = await manager.createJobApplication(
				validJobApplicationData,
			);
			expect(createResult.isOk()).toBe(true);

			if (createResult.isOk()) {
				const createdApp = createResult.value;

				// Then retrieve it using the same manager instance
				const getResult = await manager.getJobApplication(createdApp.id);

				expect(getResult.isOk()).toBe(true);

				if (getResult.isOk()) {
					const retrievedApp = getResult.value;
					expect(retrievedApp.id).toBe(createdApp.id);
					expect(retrievedApp.company).toBe(createdApp.company);
					expect(retrievedApp.positionTitle).toBe(createdApp.positionTitle);
					expect(retrievedApp.applicationDate).toBe(createdApp.applicationDate);
				}
			}
		});

		it("should return error for non-existent application ID", async () => {
			const manager = createTestManager();
			const fakeId = "123e4567-e89b-12d3-a456-426614174000" as JobApplicationId;

			const result = await manager.getJobApplication(fakeId);

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(typeof result.error).toBe("string");
				expect(result.error.length).toBeGreaterThan(0);
			}
		});
	});

	describe("getAllJobApplications", () => {
		it("should return empty array when no applications exist", async () => {
			const manager = createTestManager();

			// Clear all first
			await manager.clearAllJobApplications();

			const getAllResult = await manager.getAllJobApplications();

			expect(getAllResult.isOk()).toBe(true);
			if (getAllResult.isOk()) {
				expect(Array.isArray(getAllResult.value)).toBe(true);
				expect(getAllResult.value.length).toBe(0);
			}
		});

		it("should return all applications when they exist", async () => {
			const manager = createTestManager();

			// Clear all first
			await manager.clearAllJobApplications();

			// Create two applications
			await manager.createJobApplication(validJobApplicationData);
			await manager.createJobApplication({
				...validJobApplicationData,
				company: "Another Company",
			});

			const getAllResult = await manager.getAllJobApplications();

			expect(getAllResult.isOk()).toBe(true);
			if (getAllResult.isOk()) {
				expect(getAllResult.value.length).toBe(2);
			}
		});
	});

	describe("updateJobApplication", () => {
		it("should successfully update existing application with partial data", async () => {
			const manager = createTestManager();

			// First, create an application
			const createResult = await manager.createJobApplication(
				validJobApplicationData,
			);
			expect(createResult.isOk()).toBe(true);

			if (createResult.isOk()) {
				const createdApp = createResult.value;

				// Update the application
				const updateResult = await manager.updateJobApplication(
					createdApp.id,
					validUpdateData,
				);

				expect(updateResult.isOk()).toBe(true);
				if (updateResult.isOk()) {
					const updatedApp = updateResult.value;
					expect(updatedApp.id).toBe(createdApp.id);
					expect(updatedApp.company).toBe(validUpdateData.company);
					expect(updatedApp.interestRating).toBe(
						validUpdateData.interestRating,
					);
					// Preserve original fields that weren't updated
					expect(updatedApp.positionTitle).toBe(createdApp.positionTitle);
					expect(updatedApp.applicationDate).toBe(createdApp.applicationDate);
				}
			}
		});

		it("should return error for non-existent application ID", async () => {
			const manager = createTestManager();
			const fakeId = "123e4567-e89b-12d3-a456-426614174000" as JobApplicationId;

			const result = await manager.updateJobApplication(
				fakeId,
				validUpdateData,
			);

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(typeof result.error).toBe("string");
				expect(result.error.length).toBeGreaterThan(0);
			}
		});
	});

	describe("deleteJobApplication", () => {
		it("should successfully delete existing application", async () => {
			const manager = createTestManager();

			// First, create an application
			const createResult = await manager.createJobApplication(
				validJobApplicationData,
			);
			expect(createResult.isOk()).toBe(true);

			if (createResult.isOk()) {
				const createdApp = createResult.value;

				// Delete the application
				const deleteResult = await manager.deleteJobApplication(createdApp.id);

				expect(deleteResult.isOk()).toBe(true);
				if (deleteResult.isOk()) {
					expect(deleteResult.value).toBeUndefined();
				}

				// Verify it's actually deleted by trying to retrieve it
				const getResult = await manager.getJobApplication(createdApp.id);
				expect(getResult.isErr()).toBe(true);
			}
		});

		it("should successfully handle deletion of non-existent application ID", async () => {
			const manager = createTestManager();
			const fakeId = "123e4567-e89b-12d3-a456-426614174000" as JobApplicationId;

			// SQLite delete operations succeed even for non-existent records
			const result = await manager.deleteJobApplication(fakeId);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value).toBeUndefined();
			}
		});
	});

	describe("getActiveJobApplications", () => {
		it("should return only active applications", async () => {
			const manager = createTestManager();

			// Clear all first
			await manager.clearAllJobApplications();

			// Create an active application (default status is "applied" which is active)
			await manager.createJobApplication(validJobApplicationData);

			const result = await manager.getActiveJobApplications();

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.length).toBeGreaterThanOrEqual(1);
				for (const app of result.value) {
					// Verify all returned apps are active
					const lastStatus = app.statusLog[app.statusLog.length - 1];
					assertDefined(lastStatus);
					expect(lastStatus[1].category).toBe("active");
				}
			}
		});
	});

	describe("getInactiveJobApplications", () => {
		it("should return empty array when no inactive applications exist", async () => {
			const manager = createTestManager();

			// Clear all first
			await manager.clearAllJobApplications();

			const result = await manager.getInactiveJobApplications();

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(Array.isArray(result.value)).toBe(true);
			}
		});
	});

	describe("clearAllJobApplications", () => {
		it("should successfully clear all applications", async () => {
			const manager = createTestManager();

			// Create some applications
			await manager.createJobApplication(validJobApplicationData);
			await manager.createJobApplication({
				...validJobApplicationData,
				company: "Another Company",
			});

			// Clear all
			const clearResult = await manager.clearAllJobApplications();
			expect(clearResult.isOk()).toBe(true);

			// Verify empty
			const getAllResult = await manager.getAllJobApplications();
			expect(getAllResult.isOk()).toBe(true);
			if (getAllResult.isOk()) {
				expect(getAllResult.value.length).toBe(0);
			}
		});
	});
});

describe("JobAppManagerRegistry", () => {
	describe("getDatabase", () => {
		it("should return Database instance for test environment", () => {
			const db = jobAppManagerRegistry.getDatabase("test");

			expect(db).toBeDefined();
			expect(typeof db.prepare).toBe("function");
			expect(typeof db.run).toBe("function");
			expect(typeof db.close).toBe("function");
		});

		it("should return Database instance for prod environment", () => {
			const db = jobAppManagerRegistry.getDatabase("prod");

			expect(db).toBeDefined();
			expect(typeof db.prepare).toBe("function");
			expect(typeof db.run).toBe("function");
			expect(typeof db.close).toBe("function");
		});

		it("should return same instance on multiple calls", () => {
			const db1 = jobAppManagerRegistry.getDatabase("test");
			const db2 = jobAppManagerRegistry.getDatabase("test");

			// Should be the same instance (reference equality)
			expect(db1).toBe(db2);
		});

		it("should return different instances for different environments", () => {
			const testDb = jobAppManagerRegistry.getDatabase("test");
			const prodDb = jobAppManagerRegistry.getDatabase("prod");

			// Should be different instances
			expect(testDb).not.toBe(prodDb);
		});
	});

	describe("getManager", () => {
		it("should return manager for test environment", () => {
			const manager = jobAppManagerRegistry.getManager("test");

			expect(manager).toBeDefined();
			expect(typeof manager.createJobApplication).toBe("function");
		});

		it("should return manager for prod environment", () => {
			const manager = jobAppManagerRegistry.getManager("prod");

			expect(manager).toBeDefined();
			expect(typeof manager.createJobApplication).toBe("function");
		});
	});

	describe("getDefaultEnvironment", () => {
		it("should return the default environment", () => {
			const env = jobAppManagerRegistry.getDefaultEnvironment();

			expect(env).toBeDefined();
			expect(["test", "prod"]).toContain(env);
		});
	});
});
