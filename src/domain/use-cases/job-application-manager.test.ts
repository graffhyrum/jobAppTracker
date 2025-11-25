import { describe, expect, it } from "bun:test";
import { assertDefined } from "#helpers/assertDefined.ts";
import { createInMemoryJobApplicationManager } from "../../../tests/adapters/in-memory-job-application-manager.ts";
import type { ForUpdate } from "../../infrastructure/storage/storage-provider-interface.ts";
import type {
	JobApplication,
	JobApplicationForCreate,
} from "../entities/job-application.ts";

/**
 * Unit tests for JobApplicationManager interface using in-memory adapter.
 * These tests focus on business logic without database interactions.
 */
describe("JobApplicationManager (Unit Tests)", () => {
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

	describe("Factory Function", () => {
		it("should return object with correct JobApplicationManager interface", () => {
			const manager = createInMemoryJobApplicationManager();

			// Verify all required methods exist and are functions
			expect(typeof manager.createJobApplication).toBe("function");
			expect(typeof manager.getJobApplication).toBe("function");
			expect(typeof manager.getAllJobApplications).toBe("function");
			expect(typeof manager.updateJobApplication).toBe("function");
			expect(typeof manager.deleteJobApplication).toBe("function");
			expect(typeof manager.getActiveJobApplications).toBe("function");
			expect(typeof manager.getInactiveJobApplications).toBe("function");
			expect(typeof manager.clearAllJobApplications).toBe("function");
		});
	});

	describe("createJobApplication", () => {
		it("should successfully create application with valid data", async () => {
			const manager = createInMemoryJobApplicationManager();
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

		it("should create application with initial 'applied' status", async () => {
			const manager = createInMemoryJobApplicationManager();
			const result = await manager.createJobApplication(
				validJobApplicationData,
			);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const application = result.value;
				expect(application.statusLog.length).toBe(1);
				const statusEntry = application.statusLog[0];
				assertDefined(statusEntry);
				const [, status] = statusEntry;
				assertDefined(status);
				expect(status.category).toBe("active");
				expect(status.label).toBe("applied");
			}
		});

		it("should set createdAt and updatedAt timestamps", async () => {
			const manager = createInMemoryJobApplicationManager();
			const beforeCreate = new Date().toISOString();
			const result = await manager.createJobApplication(
				validJobApplicationData,
			);
			const afterCreate = new Date().toISOString();

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const application = result.value;
				expect(application.createdAt >= beforeCreate).toBe(true);
				expect(application.createdAt <= afterCreate).toBe(true);
				expect(application.updatedAt >= beforeCreate).toBe(true);
				expect(application.updatedAt <= afterCreate).toBe(true);
			}
		});
	});

	describe("getJobApplication", () => {
		it("should retrieve created application by ID", async () => {
			const manager = createInMemoryJobApplicationManager();
			const createResult = await manager.createJobApplication(
				validJobApplicationData,
			);

			expect(createResult.isOk()).toBe(true);
			if (createResult.isOk()) {
				const created = createResult.value;
				const getResult = await manager.getJobApplication(created.id);

				expect(getResult.isOk()).toBe(true);
				if (getResult.isOk()) {
					const retrieved = getResult.value;
					expect(retrieved.id).toBe(created.id);
					expect(retrieved.company).toBe(created.company);
					expect(retrieved.positionTitle).toBe(created.positionTitle);
				}
			}
		});

		it("should return error for non-existent ID", async () => {
			const manager = createInMemoryJobApplicationManager();
			const nonExistentId = "123e4567-e89b-12d3-a456-999999999999" as const;

			const result = await manager.getJobApplication(nonExistentId);

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toContain("not found");
			}
		});
	});

	describe("getAllJobApplications", () => {
		it("should return empty array when no applications exist", async () => {
			const manager = createInMemoryJobApplicationManager();
			const result = await manager.getAllJobApplications();

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value).toEqual([]);
			}
		});

		it("should return all created applications", async () => {
			const manager = createInMemoryJobApplicationManager();

			await manager.createJobApplication(validJobApplicationData);
			await manager.createJobApplication({
				...validJobApplicationData,
				company: "Another Company",
			});

			const result = await manager.getAllJobApplications();

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.length).toBe(2);
			}
		});
	});

	describe("updateJobApplication", () => {
		it("should successfully update application", async () => {
			const manager = createInMemoryJobApplicationManager();
			const createResult = await manager.createJobApplication(
				validJobApplicationData,
			);

			expect(createResult.isOk()).toBe(true);
			if (createResult.isOk()) {
				const created = createResult.value;
				const updateResult = await manager.updateJobApplication(
					created.id,
					validUpdateData,
				);

				expect(updateResult.isOk()).toBe(true);
				if (updateResult.isOk()) {
					const updated = updateResult.value;
					expect(updated.company).toBe(validUpdateData.company);
					expect(updated.interestRating).toBe(validUpdateData.interestRating);
					expect(updated.positionTitle).toBe(created.positionTitle);
				}
			}
		});

		it("should update updatedAt timestamp", async () => {
			const manager = createInMemoryJobApplicationManager();
			const createResult = await manager.createJobApplication(
				validJobApplicationData,
			);

			expect(createResult.isOk()).toBe(true);
			if (createResult.isOk()) {
				const created = createResult.value;
				const originalUpdatedAt = created.updatedAt;

				// Wait to ensure timestamp changes
				await new Promise((resolve) => setTimeout(resolve, 10));

				const updateResult = await manager.updateJobApplication(created.id, {
					company: "New Company",
				});

				expect(updateResult.isOk()).toBe(true);
				if (updateResult.isOk()) {
					expect(updateResult.value.updatedAt).not.toBe(originalUpdatedAt);
				}
			}
		});

		it("should return error for non-existent ID", async () => {
			const manager = createInMemoryJobApplicationManager();
			const nonExistentId = "123e4567-e89b-12d3-a456-999999999999" as const;

			const result = await manager.updateJobApplication(
				nonExistentId,
				validUpdateData,
			);

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toContain("not found");
			}
		});
	});

	describe("deleteJobApplication", () => {
		it("should successfully delete application", async () => {
			const manager = createInMemoryJobApplicationManager();
			const createResult = await manager.createJobApplication(
				validJobApplicationData,
			);

			expect(createResult.isOk()).toBe(true);
			if (createResult.isOk()) {
				const created = createResult.value;
				const deleteResult = await manager.deleteJobApplication(created.id);

				expect(deleteResult.isOk()).toBe(true);

				// Verify deletion
				const getResult = await manager.getJobApplication(created.id);
				expect(getResult.isErr()).toBe(true);
			}
		});

		it("should not error when deleting non-existent ID", async () => {
			const manager = createInMemoryJobApplicationManager();
			const nonExistentId = "123e4567-e89b-12d3-a456-999999999999" as const;

			const result = await manager.deleteJobApplication(nonExistentId);

			expect(result.isOk()).toBe(true);
		});
	});

	describe("getActiveJobApplications", () => {
		it("should return only active applications", async () => {
			const manager = createInMemoryJobApplicationManager();
			const createResult = await manager.createJobApplication(
				validJobApplicationData,
			);

			expect(createResult.isOk()).toBe(true);
			if (createResult.isOk()) {
				const result = await manager.getActiveJobApplications();

				expect(result.isOk()).toBe(true);
				if (result.isOk()) {
					expect(result.value.length).toBe(1);
					const firstApp = result.value[0];
					assertDefined(firstApp);
					expect(firstApp.company).toBe(validJobApplicationData.company);
				}
			}
		});

		it("should filter out inactive applications", async () => {
			const manager = createInMemoryJobApplicationManager();

			// Create active application
			const createResult = await manager.createJobApplication(
				validJobApplicationData,
			);
			expect(createResult.isOk()).toBe(true);

			if (createResult.isOk()) {
				const app = createResult.value;

				// Update to inactive status
				await manager.updateJobApplication(app.id, {
					statusLog: [
						...app.statusLog,
						[
							new Date().toISOString(),
							{ category: "inactive", label: "rejected" },
						],
					],
				});

				const result = await manager.getActiveJobApplications();

				expect(result.isOk()).toBe(true);
				if (result.isOk()) {
					expect(result.value.length).toBe(0);
				}
			}
		});

		it("should return empty array when no active applications", async () => {
			const manager = createInMemoryJobApplicationManager();
			const result = await manager.getActiveJobApplications();

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value).toEqual([]);
			}
		});
	});

	describe("getInactiveJobApplications", () => {
		it("should return only inactive applications", async () => {
			const manager = createInMemoryJobApplicationManager();

			// Create application and make it inactive
			const createResult = await manager.createJobApplication(
				validJobApplicationData,
			);
			expect(createResult.isOk()).toBe(true);

			if (createResult.isOk()) {
				const app = createResult.value;
				await manager.updateJobApplication(app.id, {
					statusLog: [
						...app.statusLog,
						[
							new Date().toISOString(),
							{ category: "inactive", label: "rejected" },
						],
					],
				});

				const result = await manager.getInactiveJobApplications();

				expect(result.isOk()).toBe(true);
				if (result.isOk()) {
					expect(result.value.length).toBe(1);
					const firstApp = result.value[0];
					assertDefined(firstApp);
					expect(firstApp.company).toBe(validJobApplicationData.company);
				}
			}
		});

		it("should return empty array when no inactive applications", async () => {
			const manager = createInMemoryJobApplicationManager();
			const result = await manager.getInactiveJobApplications();

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value).toEqual([]);
			}
		});
	});

	describe("clearAllJobApplications", () => {
		it("should remove all applications", async () => {
			const manager = createInMemoryJobApplicationManager();

			await manager.createJobApplication(validJobApplicationData);
			await manager.createJobApplication({
				...validJobApplicationData,
				company: "Another Company",
			});

			const clearResult = await manager.clearAllJobApplications();
			expect(clearResult.isOk()).toBe(true);

			const getAllResult = await manager.getAllJobApplications();
			expect(getAllResult.isOk()).toBe(true);
			if (getAllResult.isOk()) {
				expect(getAllResult.value).toEqual([]);
			}
		});

		it("should not error on empty state", async () => {
			const manager = createInMemoryJobApplicationManager();
			const result = await manager.clearAllJobApplications();

			expect(result.isOk()).toBe(true);
		});
	});
});
