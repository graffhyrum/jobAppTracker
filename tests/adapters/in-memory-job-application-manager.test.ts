import { describe, expect, it } from "bun:test";
import { assertDefined } from "#helpers/assertDefined.ts";
import type { JobApplicationForCreate } from "#src/domain/entities/job-application.ts";
import { createInMemoryJobApplicationManager } from "./in-memory-job-application-manager.ts";

describe("InMemoryJobApplicationManager", () => {
	// Test data factory
	const createValidJobAppData = (): JobApplicationForCreate => ({
		company: "Test Company",
		positionTitle: "Software Engineer",
		applicationDate: new Date().toISOString(),
		sourceType: "job_board",
		isRemote: true,
	});

	// Deterministic UUID generator for testing
	const createMockUuidGenerator = (seed = 0) => {
		let counter = seed;
		return () =>
			`123e4567-e89b-12d3-a456-${String(counter++).padStart(12, "0")}`;
	};

	describe("createJobApplication", () => {
		it("should create job application with generated ID", async () => {
			const manager = createInMemoryJobApplicationManager();
			const data = createValidJobAppData();

			const result = await manager.createJobApplication(data);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const app = result.value;
				expect(app.company).toBe(data.company);
				expect(app.positionTitle).toBe(data.positionTitle);
				assertDefined(app.id);
				assertDefined(app.createdAt);
				assertDefined(app.updatedAt);
				expect(app.statusLog.length).toBeGreaterThan(0);
			}
		});

		it("should use provided UUID generator", async () => {
			const mockGenerator = createMockUuidGenerator();
			const manager = createInMemoryJobApplicationManager(mockGenerator);
			const data = createValidJobAppData();

			const result = await manager.createJobApplication(data);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.id).toBe("123e4567-e89b-12d3-a456-000000000000");
			}
		});

		it("should create job application with initial 'applied' status", async () => {
			const manager = createInMemoryJobApplicationManager();
			const data = createValidJobAppData();

			const result = await manager.createJobApplication(data);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const app = result.value;
				expect(app.statusLog.length).toBe(1);
				const statusEntry = app.statusLog[0];
				assertDefined(statusEntry);
				const [, status] = statusEntry;
				assertDefined(status);
				expect(status.category).toBe("active");
				expect(status.label).toBe("applied");
			}
		});
	});

	describe("getJobApplication", () => {
		it("should retrieve existing job application", async () => {
			const manager = createInMemoryJobApplicationManager();
			const data = createValidJobAppData();

			const createResult = await manager.createJobApplication(data);
			expect(createResult.isOk()).toBe(true);

			if (createResult.isOk()) {
				const created = createResult.value;
				const getResult = await manager.getJobApplication(created.id);

				expect(getResult.isOk()).toBe(true);
				if (getResult.isOk()) {
					expect(getResult.value.id).toBe(created.id);
					expect(getResult.value.company).toBe(data.company);
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

		it("should return all job applications", async () => {
			const manager = createInMemoryJobApplicationManager();
			const data1 = createValidJobAppData();
			const data2 = {
				...createValidJobAppData(),
				company: "Different Company",
			};

			await manager.createJobApplication(data1);
			await manager.createJobApplication(data2);

			const result = await manager.getAllJobApplications();

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.length).toBe(2);
			}
		});
	});

	describe("updateJobApplication", () => {
		it("should update existing job application", async () => {
			const manager = createInMemoryJobApplicationManager();
			const data = createValidJobAppData();

			const createResult = await manager.createJobApplication(data);
			expect(createResult.isOk()).toBe(true);

			if (createResult.isOk()) {
				const created = createResult.value;
				const updateResult = await manager.updateJobApplication(created.id, {
					company: "Updated Company",
				});

				expect(updateResult.isOk()).toBe(true);
				if (updateResult.isOk()) {
					expect(updateResult.value.company).toBe("Updated Company");
					expect(updateResult.value.positionTitle).toBe(data.positionTitle);
				}
			}
		});

		it("should update updatedAt timestamp", async () => {
			const manager = createInMemoryJobApplicationManager();
			const data = createValidJobAppData();

			const createResult = await manager.createJobApplication(data);
			expect(createResult.isOk()).toBe(true);

			if (createResult.isOk()) {
				const created = createResult.value;
				const originalUpdatedAt = created.updatedAt;

				// Wait a bit to ensure timestamp changes
				await new Promise((resolve) => setTimeout(resolve, 10));

				const updateResult = await manager.updateJobApplication(created.id, {
					company: "Updated Company",
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

			const result = await manager.updateJobApplication(nonExistentId, {
				company: "Updated Company",
			});

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toContain("not found");
			}
		});
	});

	describe("deleteJobApplication", () => {
		it("should delete existing job application", async () => {
			const manager = createInMemoryJobApplicationManager();
			const data = createValidJobAppData();

			const createResult = await manager.createJobApplication(data);
			expect(createResult.isOk()).toBe(true);

			if (createResult.isOk()) {
				const created = createResult.value;
				const deleteResult = await manager.deleteJobApplication(created.id);

				expect(deleteResult.isOk()).toBe(true);

				// Verify it's actually deleted
				const getResult = await manager.getJobApplication(created.id);
				expect(getResult.isErr()).toBe(true);
			}
		});

		it("should not error when deleting non-existent ID", async () => {
			const manager = createInMemoryJobApplicationManager();
			const nonExistentId = "123e4567-e89b-12d3-a456-999999999999" as const;

			const result = await manager.deleteJobApplication(nonExistentId);

			// Map.delete returns void regardless of whether key existed
			expect(result.isOk()).toBe(true);
		});
	});

	describe("getActiveJobApplications", () => {
		it("should return only active applications", async () => {
			const manager = createInMemoryJobApplicationManager();
			const activeData = createValidJobAppData();

			const createResult = await manager.createJobApplication(activeData);
			expect(createResult.isOk()).toBe(true);

			const result = await manager.getActiveJobApplications();

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.length).toBe(1);
				const firstApp = result.value[0];
				assertDefined(firstApp);
				expect(firstApp.company).toBe(activeData.company);
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

		it("should filter out inactive applications", async () => {
			const manager = createInMemoryJobApplicationManager();
			const activeData = createValidJobAppData();

			// Create active application
			const createActiveResult = await manager.createJobApplication(activeData);
			expect(createActiveResult.isOk()).toBe(true);

			if (createActiveResult.isOk()) {
				const activeApp = createActiveResult.value;

				// Update to inactive status
				await manager.updateJobApplication(activeApp.id, {
					statusLog: [
						...activeApp.statusLog,
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
	});

	describe("getInactiveJobApplications", () => {
		it("should return only inactive applications", async () => {
			const manager = createInMemoryJobApplicationManager();
			const data = createValidJobAppData();

			const createResult = await manager.createJobApplication(data);
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

				const result = await manager.getInactiveJobApplications();

				expect(result.isOk()).toBe(true);
				if (result.isOk()) {
					expect(result.value.length).toBe(1);
					const firstApp = result.value[0];
					assertDefined(firstApp);
					expect(firstApp.company).toBe(data.company);
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
		it("should remove all job applications", async () => {
			const manager = createInMemoryJobApplicationManager();
			const data1 = createValidJobAppData();
			const data2 = {
				...createValidJobAppData(),
				company: "Different Company",
			};

			await manager.createJobApplication(data1);
			await manager.createJobApplication(data2);

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

	describe("isolation", () => {
		it("should maintain separate state between instances", async () => {
			const manager1 = createInMemoryJobApplicationManager();
			const manager2 = createInMemoryJobApplicationManager();

			const data = createValidJobAppData();
			await manager1.createJobApplication(data);

			const result1 = await manager1.getAllJobApplications();
			const result2 = await manager2.getAllJobApplications();

			expect(result1.isOk()).toBe(true);
			expect(result2.isOk()).toBe(true);

			if (result1.isOk() && result2.isOk()) {
				expect(result1.value.length).toBe(1);
				expect(result2.value.length).toBe(0);
			}
		});
	});
});
