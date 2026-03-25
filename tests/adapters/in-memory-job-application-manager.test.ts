import { describe, expect, it } from "bun:test";
import { Effect, Either } from "effect";
import { runEffect } from "#src/application/server/utils/run-effect.ts";

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

			const result = await runEffect(manager.createJobApplication(data));

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				const app = result.right;
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

			const result = await runEffect(manager.createJobApplication(data));

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				expect(result.right.id).toBe("123e4567-e89b-12d3-a456-000000000000");
			}
		});

		it("should create job application with initial 'applied' status", async () => {
			const manager = createInMemoryJobApplicationManager();
			const data = createValidJobAppData();

			const result = await runEffect(manager.createJobApplication(data));

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				const app = result.right;
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

			const createResult = await runEffect(manager.createJobApplication(data));
			expect(Either.isRight(createResult)).toBe(true);

			if (Either.isRight(createResult)) {
				const created = createResult.right;
				const getResult = await runEffect(manager.getJobApplication(created.id));

				expect(Either.isRight(getResult)).toBe(true);
				if (Either.isRight(getResult)) {
					expect(getResult.right.id).toBe(created.id);
					expect(getResult.right.company).toBe(data.company);
				}
			}
		});

		it("should return error for non-existent ID", async () => {
			const manager = createInMemoryJobApplicationManager();
			const nonExistentId = "123e4567-e89b-12d3-a456-999999999999" as const;

			const result = await runEffect(manager.getJobApplication(nonExistentId));

			expect(Either.isLeft(result)).toBe(true);
			if (Either.isLeft(result)) {
				expect(result.left.detail).toContain("not found");
			}
		});
	});

	describe("getAllJobApplications", () => {
		it("should return empty array when no applications exist", async () => {
			const manager = createInMemoryJobApplicationManager();

			const result = await runEffect(manager.getAllJobApplications());

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				expect(result.right).toEqual([]);
			}
		});

		it("should return all job applications", async () => {
			const manager = createInMemoryJobApplicationManager();
			const data1 = createValidJobAppData();
			const data2 = {
				...createValidJobAppData(),
				company: "Different Company",
			};

			await runEffect(manager.createJobApplication(data1));
			await runEffect(manager.createJobApplication(data2));

			const result = await runEffect(manager.getAllJobApplications());

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				expect(result.right.length).toBe(2);
			}
		});
	});

	describe("updateJobApplication", () => {
		it("should update existing job application", async () => {
			const manager = createInMemoryJobApplicationManager();
			const data = createValidJobAppData();

			const createResult = await runEffect(manager.createJobApplication(data));
			expect(Either.isRight(createResult)).toBe(true);

			if (Either.isRight(createResult)) {
				const created = createResult.right;
				const updateResult = await runEffect(manager.updateJobApplication(created.id, {
					company: "Updated Company",
				}));

				expect(Either.isRight(updateResult)).toBe(true);
				if (Either.isRight(updateResult)) {
					expect(updateResult.right.company).toBe("Updated Company");
					expect(updateResult.right.positionTitle).toBe(data.positionTitle);
				}
			}
		});

		it("should update updatedAt timestamp", async () => {
			const manager = createInMemoryJobApplicationManager();
			const data = createValidJobAppData();

			const createResult = await runEffect(manager.createJobApplication(data));
			expect(Either.isRight(createResult)).toBe(true);

			if (Either.isRight(createResult)) {
				const created = createResult.right;
				const originalUpdatedAt = created.updatedAt;

				// Wait a bit to ensure timestamp changes
				await new Promise((resolve) => setTimeout(resolve, 10));

				const updateResult = await runEffect(manager.updateJobApplication(created.id, {
					company: "Updated Company",
				}));

				expect(Either.isRight(updateResult)).toBe(true);
				if (Either.isRight(updateResult)) {
					expect(updateResult.right.updatedAt).not.toBe(originalUpdatedAt);
				}
			}
		});

		it("should return error for non-existent ID", async () => {
			const manager = createInMemoryJobApplicationManager();
			const nonExistentId = "123e4567-e89b-12d3-a456-999999999999" as const;

			const result = await runEffect(manager.updateJobApplication(nonExistentId, {
				company: "Updated Company",
			}));

			expect(Either.isLeft(result)).toBe(true);
			if (Either.isLeft(result)) {
				expect(result.left.detail).toContain("not found");
			}
		});
	});

	describe("deleteJobApplication", () => {
		it("should delete existing job application", async () => {
			const manager = createInMemoryJobApplicationManager();
			const data = createValidJobAppData();

			const createResult = await runEffect(manager.createJobApplication(data));
			expect(Either.isRight(createResult)).toBe(true);

			if (Either.isRight(createResult)) {
				const created = createResult.right;
				const deleteResult = await runEffect(manager.deleteJobApplication(created.id));

				expect(Either.isRight(deleteResult)).toBe(true);

				// Verify it's actually deleted
				const getResult = await runEffect(manager.getJobApplication(created.id));
				expect(Either.isLeft(getResult)).toBe(true);
			}
		});

		it("should not error when deleting non-existent ID", async () => {
			const manager = createInMemoryJobApplicationManager();
			const nonExistentId = "123e4567-e89b-12d3-a456-999999999999" as const;

			const result = await runEffect(manager.deleteJobApplication(nonExistentId));

			// Map.delete returns void regardless of whether key existed
			expect(Either.isRight(result)).toBe(true);
		});
	});

	describe("getActiveJobApplications", () => {
		it("should return only active applications", async () => {
			const manager = createInMemoryJobApplicationManager();
			const activeData = createValidJobAppData();

			const createResult = await runEffect(manager.createJobApplication(activeData));
			expect(Either.isRight(createResult)).toBe(true);

			const result = await runEffect(manager.getActiveJobApplications());

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				expect(result.right.length).toBe(1);
				const firstApp = result.right[0];
				assertDefined(firstApp);
				expect(firstApp.company).toBe(activeData.company);
			}
		});

		it("should return empty array when no active applications", async () => {
			const manager = createInMemoryJobApplicationManager();

			const result = await runEffect(manager.getActiveJobApplications());

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				expect(result.right).toEqual([]);
			}
		});

		it("should filter out inactive applications", async () => {
			const manager = createInMemoryJobApplicationManager();
			const activeData = createValidJobAppData();

			// Create active application
			const createActiveResult = await runEffect(manager.createJobApplication(activeData));
			expect(Either.isRight(createActiveResult)).toBe(true);

			if (Either.isRight(createActiveResult)) {
				const activeApp = createActiveResult.right;

				// Update to inactive status
				await Effect.runPromise(manager.updateJobApplication(activeApp.id, {
					statusLog: [
						...activeApp.statusLog,
						[
							new Date().toISOString(),
							{ category: "inactive", label: "rejected" },
						],
					],
				}));

				const result = await runEffect(manager.getActiveJobApplications());

				expect(Either.isRight(result)).toBe(true);
				if (Either.isRight(result)) {
					expect(result.right.length).toBe(0);
				}
			}
		});
	});

	describe("getInactiveJobApplications", () => {
		it("should return only inactive applications", async () => {
			const manager = createInMemoryJobApplicationManager();
			const data = createValidJobAppData();

			const createResult = await runEffect(manager.createJobApplication(data));
			expect(Either.isRight(createResult)).toBe(true);

			if (Either.isRight(createResult)) {
				const app = createResult.right;

				// Update to inactive status
				await Effect.runPromise(manager.updateJobApplication(app.id, {
					statusLog: [
						...app.statusLog,
						[
							new Date().toISOString(),
							{ category: "inactive", label: "rejected" },
						],
					],
				}));

				const result = await runEffect(manager.getInactiveJobApplications());

				expect(Either.isRight(result)).toBe(true);
				if (Either.isRight(result)) {
					expect(result.right.length).toBe(1);
					const firstApp = result.right[0];
					assertDefined(firstApp);
					expect(firstApp.company).toBe(data.company);
				}
			}
		});

		it("should return empty array when no inactive applications", async () => {
			const manager = createInMemoryJobApplicationManager();

			const result = await runEffect(manager.getInactiveJobApplications());

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				expect(result.right).toEqual([]);
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

			await runEffect(manager.createJobApplication(data1));
			await runEffect(manager.createJobApplication(data2));

			const clearResult = await runEffect(manager.clearAllJobApplications());
			expect(Either.isRight(clearResult)).toBe(true);

			const getAllResult = await runEffect(manager.getAllJobApplications());
			expect(Either.isRight(getAllResult)).toBe(true);
			if (Either.isRight(getAllResult)) {
				expect(getAllResult.right).toEqual([]);
			}
		});

		it("should not error on empty state", async () => {
			const manager = createInMemoryJobApplicationManager();

			const result = await runEffect(manager.clearAllJobApplications());

			expect(Either.isRight(result)).toBe(true);
		});
	});

	describe("isolation", () => {
		it("should maintain separate state between instances", async () => {
			const manager1 = createInMemoryJobApplicationManager();
			const manager2 = createInMemoryJobApplicationManager();

			const data = createValidJobAppData();
			await Effect.runPromise(manager1.createJobApplication(data));

			const result1 = await runEffect(manager1.getAllJobApplications());
			const result2 = await runEffect(manager2.getAllJobApplications());

			expect(Either.isRight(result1)).toBe(true);
			expect(Either.isRight(result2)).toBe(true);

			if (Either.isRight(result1) && Either.isRight(result2)) {
				expect(result1.right.length).toBe(1);
				expect(result2.right.length).toBe(0);
			}
		});
	});
});
