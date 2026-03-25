import { describe, expect, it } from "bun:test";
import { Either } from "effect";

import { assertDefined } from "#helpers/assertDefined.ts";
import { runEffect } from "#src/application/server/utils/run-effect.ts";
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

			const result = await runEffect(repository.create(data));

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				const stage = result.right;
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

			const result = await runEffect(repository.create(data));

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				expect(result.right.id).toBe("123e4567-e89b-12d3-a456-000000000000");
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

			const result = await runEffect(repository.create(invalidData));

			expect(Either.isLeft(result)).toBe(true);
			if (Either.isLeft(result)) {
				expect(result.left.detail).toContain("Failed to create interview stage");
			}
		});

		it("should persist interview stage in memory", async () => {
			const repository = createInMemoryInterviewStageRepository();
			const data = createValidStageData();

			const createResult = await runEffect(repository.create(data));
			expect(Either.isRight(createResult)).toBe(true);

			if (Either.isRight(createResult)) {
				const stage = createResult.right;
				const getResult = await runEffect(repository.getById(stage.id));

				expect(Either.isRight(getResult)).toBe(true);
				if (Either.isRight(getResult)) {
					expect(getResult.right.id).toBe(stage.id);
					expect(getResult.right.round).toBe(stage.round);
				}
			}
		});
	});

	describe("getById", () => {
		it("should retrieve existing interview stage", async () => {
			const repository = createInMemoryInterviewStageRepository();
			const data = createValidStageData();

			const createResult = await runEffect(repository.create(data));
			expect(Either.isRight(createResult)).toBe(true);

			if (Either.isRight(createResult)) {
				const created = createResult.right;
				const getResult = await runEffect(repository.getById(created.id));

				expect(Either.isRight(getResult)).toBe(true);
				if (Either.isRight(getResult)) {
					expect(getResult.right.id).toBe(created.id);
					expect(getResult.right.interviewType).toBe(data.interviewType);
				}
			}
		});

		it("should return error for non-existent ID", async () => {
			const repository = createInMemoryInterviewStageRepository();
			const nonExistentId = "123e4567-e89b-12d3-a456-999999999999" as const;

			const result = await runEffect(repository.getById(nonExistentId));

			expect(Either.isLeft(result)).toBe(true);
			if (Either.isLeft(result)) {
				expect(result.left.detail).toContain("not found");
			}
		});
	});

	describe("getByJobApplicationId", () => {
		it("should return empty array when no stages for job application", async () => {
			const repository = createInMemoryInterviewStageRepository();

			const result = await runEffect(
				repository.getByJobApplicationId(jobAppId1),
			);

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				expect(result.right).toEqual([]);
			}
		});

		it("should return stages for specific job application", async () => {
			const repository = createInMemoryInterviewStageRepository();

			await runEffect(repository.create(createValidStageData(jobAppId1, 1)));
			await runEffect(repository.create(createValidStageData(jobAppId1, 2)));
			await runEffect(repository.create(createValidStageData(jobAppId2, 1)));

			const result = await runEffect(
				repository.getByJobApplicationId(jobAppId1),
			);

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				expect(result.right.length).toBe(2);
				for (const stage of result.right) {
					expect(stage.jobApplicationId).toBe(jobAppId1);
				}
			}
		});

		it("should return stages sorted by round ascending", async () => {
			const repository = createInMemoryInterviewStageRepository();

			// Create stages in reverse order
			await runEffect(repository.create(createValidStageData(jobAppId1, 3)));
			await runEffect(repository.create(createValidStageData(jobAppId1, 1)));
			await runEffect(repository.create(createValidStageData(jobAppId1, 2)));

			const result = await runEffect(
				repository.getByJobApplicationId(jobAppId1),
			);

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				const stages = result.right;
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

			const createResult = await runEffect(repository.create(data));
			expect(Either.isRight(createResult)).toBe(true);

			if (Either.isRight(createResult)) {
				const created = createResult.right;
				const scheduledDate = new Date().toISOString();
				const updateResult = await runEffect(
					repository.update(created.id, {
						interviewType: "behavioral",
						isFinalRound: true,
						scheduledDate,
					}),
				);

				expect(Either.isRight(updateResult)).toBe(true);
				if (Either.isRight(updateResult)) {
					expect(updateResult.right.interviewType).toBe("behavioral");
					expect(updateResult.right.isFinalRound).toBe(true);
					expect(updateResult.right.scheduledDate).toBe(scheduledDate);
					expect(updateResult.right.round).toBe(data.round);
				}
			}
		});

		it("should update updatedAt timestamp", async () => {
			const repository = createInMemoryInterviewStageRepository();
			const data = createValidStageData();

			const createResult = await runEffect(repository.create(data));
			expect(Either.isRight(createResult)).toBe(true);

			if (Either.isRight(createResult)) {
				const created = createResult.right;
				const originalUpdatedAt = created.updatedAt;

				// Wait a bit to ensure timestamp changes
				await new Promise((resolve) => setTimeout(resolve, 10));

				const updateResult = await runEffect(
					repository.update(created.id, {
						notes: "Updated notes",
					}),
				);

				expect(Either.isRight(updateResult)).toBe(true);
				if (Either.isRight(updateResult)) {
					expect(updateResult.right.updatedAt).not.toBe(originalUpdatedAt);
				}
			}
		});

		it("should return error for non-existent ID", async () => {
			const repository = createInMemoryInterviewStageRepository();
			const nonExistentId = "123e4567-e89b-12d3-a456-999999999999" as const;

			const result = await runEffect(
				repository.update(nonExistentId, {
					notes: "Updated notes",
				}),
			);

			expect(Either.isLeft(result)).toBe(true);
			if (Either.isLeft(result)) {
				expect(result.left.detail).toContain("not found");
			}
		});
	});

	describe("delete", () => {
		it("should delete existing interview stage", async () => {
			const repository = createInMemoryInterviewStageRepository();
			const data = createValidStageData();

			const createResult = await runEffect(repository.create(data));
			expect(Either.isRight(createResult)).toBe(true);

			if (Either.isRight(createResult)) {
				const stage = createResult.right;
				const deleteResult = await runEffect(repository.delete(stage.id));

				expect(Either.isRight(deleteResult)).toBe(true);

				// Verify it's actually deleted
				const getResult = await runEffect(repository.getById(stage.id));
				expect(Either.isLeft(getResult)).toBe(true);
			}
		});

		it("should not error when deleting non-existent ID", async () => {
			const repository = createInMemoryInterviewStageRepository();
			const nonExistentId = "123e4567-e89b-12d3-a456-999999999999" as const;

			const result = await runEffect(repository.delete(nonExistentId));

			expect(Either.isRight(result)).toBe(true);
		});
	});

	describe("isolation", () => {
		it("should maintain separate state between instances", async () => {
			const repository1 = createInMemoryInterviewStageRepository();
			const repository2 = createInMemoryInterviewStageRepository();

			await runEffect(repository1.create(createValidStageData()));

			const result1 = await runEffect(
				repository1.getByJobApplicationId(jobAppId1),
			);
			const result2 = await runEffect(
				repository2.getByJobApplicationId(jobAppId1),
			);

			expect(Either.isRight(result1)).toBe(true);
			expect(Either.isRight(result2)).toBe(true);

			if (Either.isRight(result1) && Either.isRight(result2)) {
				expect(result1.right.length).toBe(1);
				expect(result2.right.length).toBe(0);
			}
		});
	});
});
