import { describe, expect, it } from "bun:test";
import { assertDefined } from "#helpers/assertDefined.ts";
import type { InterviewStageForCreate } from "#src/domain/entities/interview-stage.ts";
import type { JobApplicationId } from "#src/domain/entities/job-application.ts";
import { createInMemoryInterviewStageRepository } from "./in-memory-interview-stage-repository.ts";

describe("InMemoryInterviewStageRepository", () => {
	const jobAppId1 = "123e4567-e89b-12d3-a456-000000000001" as JobApplicationId;
	const jobAppId2 = "123e4567-e89b-12d3-a456-000000000002" as JobApplicationId;

	// Test data factory
	const createValidStageData = (
		jobAppId: JobApplicationId = jobAppId1,
		round = 1,
	): InterviewStageForCreate => ({
		jobApplicationId: jobAppId,
		round,
		interviewType: "technical",
		isFinalRound: false,
		questions: [],
	});

	// Deterministic UUID generator
	const createMockUuidGenerator = (seed = 0) => {
		let counter = seed;
		return () =>
			`123e4567-e89b-12d3-a456-${String(counter++).padStart(12, "0")}`;
	};

	describe("create", () => {
		it("should create interview stage with valid data", async () => {
			const repository = createInMemoryInterviewStageRepository();
			const data = createValidStageData();

			const result = await repository.create(data);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const stage = result.value;
				expect(stage.jobApplicationId).toBe(data.jobApplicationId);
				expect(stage.round).toBe(data.round);
				expect(stage.interviewType).toBe(data.interviewType);
				expect(stage.isFinalRound).toBe(data.isFinalRound);
				assertDefined(stage.id);
				assertDefined(stage.createdAt);
				assertDefined(stage.updatedAt);
			}
		});

		it("should use provided UUID generator", async () => {
			const mockGenerator = createMockUuidGenerator();
			const repository = createInMemoryInterviewStageRepository(mockGenerator);
			const data = createValidStageData();

			const result = await repository.create(data);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.id).toBe("123e4567-e89b-12d3-a456-000000000000");
			}
		});

		it("should return error for invalid interview stage data", async () => {
			const repository = createInMemoryInterviewStageRepository();
			const invalidData = {
				jobApplicationId: jobAppId1,
				round: 0, // Invalid: must be >= 1
				interviewType: "technical",
				isFinalRound: false,
				questions: [],
			} as InterviewStageForCreate;

			const result = await repository.create(invalidData);

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toContain("Failed to create interview stage");
			}
		});

		it("should persist interview stage in memory", async () => {
			const repository = createInMemoryInterviewStageRepository();
			const data = createValidStageData();

			const createResult = await repository.create(data);
			expect(createResult.isOk()).toBe(true);

			if (createResult.isOk()) {
				const stage = createResult.value;
				const getResult = await repository.getById(stage.id);

				expect(getResult.isOk()).toBe(true);
				if (getResult.isOk()) {
					expect(getResult.value.id).toBe(stage.id);
					expect(getResult.value.round).toBe(stage.round);
				}
			}
		});
	});

	describe("getById", () => {
		it("should retrieve existing interview stage", async () => {
			const repository = createInMemoryInterviewStageRepository();
			const data = createValidStageData();

			const createResult = await repository.create(data);
			expect(createResult.isOk()).toBe(true);

			if (createResult.isOk()) {
				const created = createResult.value;
				const getResult = await repository.getById(created.id);

				expect(getResult.isOk()).toBe(true);
				if (getResult.isOk()) {
					expect(getResult.value.id).toBe(created.id);
					expect(getResult.value.interviewType).toBe(data.interviewType);
				}
			}
		});

		it("should return error for non-existent ID", async () => {
			const repository = createInMemoryInterviewStageRepository();
			const nonExistentId = "123e4567-e89b-12d3-a456-999999999999" as const;

			const result = await repository.getById(nonExistentId);

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toContain("not found");
			}
		});
	});

	describe("getByJobApplicationId", () => {
		it("should return empty array when no stages for job application", async () => {
			const repository = createInMemoryInterviewStageRepository();

			const result = await repository.getByJobApplicationId(jobAppId1);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value).toEqual([]);
			}
		});

		it("should return stages for specific job application", async () => {
			const repository = createInMemoryInterviewStageRepository();

			await repository.create(createValidStageData(jobAppId1, 1));
			await repository.create(createValidStageData(jobAppId1, 2));
			await repository.create(createValidStageData(jobAppId2, 1));

			const result = await repository.getByJobApplicationId(jobAppId1);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.length).toBe(2);
				for (const stage of result.value) {
					expect(stage.jobApplicationId).toBe(jobAppId1);
				}
			}
		});

		it("should return stages sorted by round ascending", async () => {
			const repository = createInMemoryInterviewStageRepository();

			// Create stages in reverse order
			await repository.create(createValidStageData(jobAppId1, 3));
			await repository.create(createValidStageData(jobAppId1, 1));
			await repository.create(createValidStageData(jobAppId1, 2));

			const result = await repository.getByJobApplicationId(jobAppId1);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const stages = result.value;
				expect(stages.length).toBe(3);
				const firstStage = stages[0];
				const secondStage = stages[1];
				const thirdStage = stages[2];
				assertDefined(firstStage);
				assertDefined(secondStage);
				assertDefined(thirdStage);
				expect(firstStage.round).toBe(1);
				expect(secondStage.round).toBe(2);
				expect(thirdStage.round).toBe(3);
			}
		});
	});

	describe("update", () => {
		it("should update existing interview stage", async () => {
			const repository = createInMemoryInterviewStageRepository();
			const data = createValidStageData();

			const createResult = await repository.create(data);
			expect(createResult.isOk()).toBe(true);

			if (createResult.isOk()) {
				const created = createResult.value;
				const scheduledDate = new Date().toISOString();
				const updateResult = await repository.update(created.id, {
					interviewType: "behavioral",
					isFinalRound: true,
					scheduledDate,
				});

				expect(updateResult.isOk()).toBe(true);
				if (updateResult.isOk()) {
					expect(updateResult.value.interviewType).toBe("behavioral");
					expect(updateResult.value.isFinalRound).toBe(true);
					expect(updateResult.value.scheduledDate).toBe(scheduledDate);
					expect(updateResult.value.round).toBe(data.round);
				}
			}
		});

		it("should update updatedAt timestamp", async () => {
			const repository = createInMemoryInterviewStageRepository();
			const data = createValidStageData();

			const createResult = await repository.create(data);
			expect(createResult.isOk()).toBe(true);

			if (createResult.isOk()) {
				const created = createResult.value;
				const originalUpdatedAt = created.updatedAt;

				// Wait a bit to ensure timestamp changes
				await new Promise((resolve) => setTimeout(resolve, 10));

				const updateResult = await repository.update(created.id, {
					notes: "Updated notes",
				});

				expect(updateResult.isOk()).toBe(true);
				if (updateResult.isOk()) {
					expect(updateResult.value.updatedAt).not.toBe(originalUpdatedAt);
				}
			}
		});

		it("should return error for non-existent ID", async () => {
			const repository = createInMemoryInterviewStageRepository();
			const nonExistentId = "123e4567-e89b-12d3-a456-999999999999" as const;

			const result = await repository.update(nonExistentId, {
				notes: "Updated notes",
			});

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toContain("not found");
			}
		});
	});

	describe("delete", () => {
		it("should delete existing interview stage", async () => {
			const repository = createInMemoryInterviewStageRepository();
			const data = createValidStageData();

			const createResult = await repository.create(data);
			expect(createResult.isOk()).toBe(true);

			if (createResult.isOk()) {
				const stage = createResult.value;
				const deleteResult = await repository.delete(stage.id);

				expect(deleteResult.isOk()).toBe(true);

				// Verify it's actually deleted
				const getResult = await repository.getById(stage.id);
				expect(getResult.isErr()).toBe(true);
			}
		});

		it("should not error when deleting non-existent ID", async () => {
			const repository = createInMemoryInterviewStageRepository();
			const nonExistentId = "123e4567-e89b-12d3-a456-999999999999" as const;

			const result = await repository.delete(nonExistentId);

			expect(result.isOk()).toBe(true);
		});
	});

	describe("isolation", () => {
		it("should maintain separate state between instances", async () => {
			const repository1 = createInMemoryInterviewStageRepository();
			const repository2 = createInMemoryInterviewStageRepository();

			await repository1.create(createValidStageData());

			const result1 = await repository1.getByJobApplicationId(jobAppId1);
			const result2 = await repository2.getByJobApplicationId(jobAppId1);

			expect(result1.isOk()).toBe(true);
			expect(result2.isOk()).toBe(true);

			if (result1.isOk() && result2.isOk()) {
				expect(result1.value.length).toBe(1);
				expect(result2.value.length).toBe(0);
			}
		});
	});
});
