import { describe, expect, it } from "bun:test";

import { Effect, Either } from "effect";

import { assertDefined } from "#helpers/assertDefined.ts";

import { createInMemoryJobApplicationManager } from "../../../tests/adapters/in-memory-job-application-manager.ts";
import { runEffect } from "../../application/server/utils/run-effect.ts";
import type {
	JobApplication,
	JobApplicationForCreate,
} from "../entities/job-application.ts";
import type { ForUpdate } from "../ports/common-types.ts";

/**
 * Unit tests for JobApplicationManager interface using in-memory adapter.
 * These tests focus on business logic without database interactions.
 */
describe("JobApplicationManager (Unit Tests)", () => {
	const validJobApplicationData = {
		company: "Test Company",
		positionTitle: "Software Developer",
		applicationDate: new Date().toISOString(),
		interestRating: 3,
		nextEventDate: new Date(Date.now() + 86400000).toISOString(),
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
			const result = await runEffect(
				manager.createJobApplication(validJobApplicationData),
			);

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				const application = result.right;
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
			const result = await runEffect(
				manager.createJobApplication(validJobApplicationData),
			);

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				const application = result.right;
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
			const result = await runEffect(
				manager.createJobApplication(validJobApplicationData),
			);
			const afterCreate = new Date().toISOString();

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				const application = result.right;
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
			const createResult = await runEffect(
				manager.createJobApplication(validJobApplicationData),
			);

			expect(Either.isRight(createResult)).toBe(true);
			if (Either.isRight(createResult)) {
				const created = createResult.right;
				const getResult = await runEffect(
					manager.getJobApplication(created.id),
				);

				expect(Either.isRight(getResult)).toBe(true);
				if (Either.isRight(getResult)) {
					const retrieved = getResult.right;
					expect(retrieved.id).toBe(created.id);
					expect(retrieved.company).toBe(created.company);
					expect(retrieved.positionTitle).toBe(created.positionTitle);
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

		it("should return all created applications", async () => {
			const manager = createInMemoryJobApplicationManager();

			await Effect.runPromise(
				manager.createJobApplication(validJobApplicationData),
			);
			await Effect.runPromise(
				manager.createJobApplication({
					...validJobApplicationData,
					company: "Another Company",
				}),
			);

			const result = await runEffect(manager.getAllJobApplications());

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				expect(result.right.length).toBe(2);
			}
		});
	});

	describe("updateJobApplication", () => {
		it("should successfully update application", async () => {
			const manager = createInMemoryJobApplicationManager();
			const createResult = await runEffect(
				manager.createJobApplication(validJobApplicationData),
			);

			expect(Either.isRight(createResult)).toBe(true);
			if (Either.isRight(createResult)) {
				const created = createResult.right;
				const updateResult = await runEffect(
					manager.updateJobApplication(created.id, validUpdateData),
				);

				expect(Either.isRight(updateResult)).toBe(true);
				if (Either.isRight(updateResult)) {
					const updated = updateResult.right;
					expect(updated.company).toBe(validUpdateData.company);
					expect(updated.interestRating).toBe(validUpdateData.interestRating);
					expect(updated.positionTitle).toBe(created.positionTitle);
				}
			}
		});

		it("should update updatedAt timestamp", async () => {
			const manager = createInMemoryJobApplicationManager();
			const createResult = await runEffect(
				manager.createJobApplication(validJobApplicationData),
			);

			expect(Either.isRight(createResult)).toBe(true);
			if (Either.isRight(createResult)) {
				const created = createResult.right;
				const originalUpdatedAt = created.updatedAt;

				await new Promise((resolve) => setTimeout(resolve, 10));

				const updateResult = await runEffect(
					manager.updateJobApplication(created.id, { company: "New Company" }),
				);

				expect(Either.isRight(updateResult)).toBe(true);
				if (Either.isRight(updateResult)) {
					expect(updateResult.right.updatedAt).not.toBe(originalUpdatedAt);
				}
			}
		});

		it("should return error for non-existent ID", async () => {
			const manager = createInMemoryJobApplicationManager();
			const nonExistentId = "123e4567-e89b-12d3-a456-999999999999" as const;

			const result = await runEffect(
				manager.updateJobApplication(nonExistentId, validUpdateData),
			);

			expect(Either.isLeft(result)).toBe(true);
			if (Either.isLeft(result)) {
				expect(result.left.detail).toContain("not found");
			}
		});
	});

	describe("deleteJobApplication", () => {
		it("should successfully delete application", async () => {
			const manager = createInMemoryJobApplicationManager();
			const createResult = await runEffect(
				manager.createJobApplication(validJobApplicationData),
			);

			expect(Either.isRight(createResult)).toBe(true);
			if (Either.isRight(createResult)) {
				const created = createResult.right;
				const deleteResult = await runEffect(
					manager.deleteJobApplication(created.id),
				);

				expect(Either.isRight(deleteResult)).toBe(true);

				const getResult = await runEffect(
					manager.getJobApplication(created.id),
				);
				expect(Either.isLeft(getResult)).toBe(true);
			}
		});

		it("should not error when deleting non-existent ID", async () => {
			const manager = createInMemoryJobApplicationManager();
			const nonExistentId = "123e4567-e89b-12d3-a456-999999999999" as const;

			const result = await runEffect(
				manager.deleteJobApplication(nonExistentId),
			);

			expect(Either.isRight(result)).toBe(true);
		});
	});

	describe("getActiveJobApplications", () => {
		it("should return only active applications", async () => {
			const manager = createInMemoryJobApplicationManager();
			const createResult = await runEffect(
				manager.createJobApplication(validJobApplicationData),
			);

			expect(Either.isRight(createResult)).toBe(true);
			if (Either.isRight(createResult)) {
				const result = await runEffect(manager.getActiveJobApplications());

				expect(Either.isRight(result)).toBe(true);
				if (Either.isRight(result)) {
					expect(result.right.length).toBe(1);
					const firstApp = result.right[0];
					assertDefined(firstApp);
					expect(firstApp.company).toBe(validJobApplicationData.company);
				}
			}
		});

		it("should filter out inactive applications", async () => {
			const manager = createInMemoryJobApplicationManager();

			const createResult = await runEffect(
				manager.createJobApplication(validJobApplicationData),
			);
			expect(Either.isRight(createResult)).toBe(true);

			if (Either.isRight(createResult)) {
				const app = createResult.right;

				await Effect.runPromise(
					manager.updateJobApplication(app.id, {
						statusLog: [
							...app.statusLog,
							[
								new Date().toISOString(),
								{ category: "inactive", label: "rejected" },
							],
						],
					}),
				);

				const result = await runEffect(manager.getActiveJobApplications());

				expect(Either.isRight(result)).toBe(true);
				if (Either.isRight(result)) {
					expect(result.right.length).toBe(0);
				}
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
	});

	describe("getInactiveJobApplications", () => {
		it("should return only inactive applications", async () => {
			const manager = createInMemoryJobApplicationManager();

			const createResult = await runEffect(
				manager.createJobApplication(validJobApplicationData),
			);
			expect(Either.isRight(createResult)).toBe(true);

			if (Either.isRight(createResult)) {
				const app = createResult.right;
				await Effect.runPromise(
					manager.updateJobApplication(app.id, {
						statusLog: [
							...app.statusLog,
							[
								new Date().toISOString(),
								{ category: "inactive", label: "rejected" },
							],
						],
					}),
				);

				const result = await runEffect(manager.getInactiveJobApplications());

				expect(Either.isRight(result)).toBe(true);
				if (Either.isRight(result)) {
					expect(result.right.length).toBe(1);
					const firstApp = result.right[0];
					assertDefined(firstApp);
					expect(firstApp.company).toBe(validJobApplicationData.company);
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
		it("should remove all applications", async () => {
			const manager = createInMemoryJobApplicationManager();

			await Effect.runPromise(
				manager.createJobApplication(validJobApplicationData),
			);
			await Effect.runPromise(
				manager.createJobApplication({
					...validJobApplicationData,
					company: "Another Company",
				}),
			);

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
});
