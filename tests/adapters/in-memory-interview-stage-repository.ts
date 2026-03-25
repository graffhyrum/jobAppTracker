import { Effect, Either } from "effect";

import { InterviewStageError } from "#src/domain/entities/interview-stage-error.ts";
import type {
	InterviewStage,
	InterviewStageForCreate,
	InterviewStageId,
} from "#src/domain/entities/interview-stage.ts";
import {
	createInterviewStage,
	updateInterviewStage,
} from "#src/domain/entities/interview-stage.ts";
import type { JobApplicationId } from "#src/domain/entities/job-application.ts";
import type { ForUpdate } from "#src/domain/ports/common-types.ts";
import type { InterviewStageRepository } from "#src/domain/ports/interview-stage-repository.ts";

export function createInMemoryInterviewStageRepository(
	generateUUID: () => string = () => crypto.randomUUID(),
): InterviewStageRepository {
	const stages = new Map<InterviewStageId, InterviewStage>();

	return {
		create(
			data: InterviewStageForCreate,
		): Effect.Effect<InterviewStage, InterviewStageError> {
			const result = createInterviewStage(data, generateUUID);
			if (Either.isLeft(result)) {
				return Effect.fail(
					new InterviewStageError({
						detail: `Failed to create interview stage: ${result.left.detail}`,
						operation: "create",
					}),
				);
			}
			const stage = result.right;
			stages.set(stage.id, stage);
			return Effect.succeed(stage);
		},

		getById(
			id: InterviewStageId,
		): Effect.Effect<InterviewStage, InterviewStageError> {
			const stage = stages.get(id);
			if (!stage) {
				return Effect.fail(
					new InterviewStageError({
						detail: `Interview stage with id ${id} not found`,
						operation: "getById",
					}),
				);
			}
			return Effect.succeed(stage);
		},

		getByJobApplicationId(
			jobAppId: JobApplicationId,
		): Effect.Effect<InterviewStage[], InterviewStageError> {
			const filtered = Array.from(stages.values())
				.filter((stage) => stage.jobApplicationId === jobAppId)
				.sort((a, b) => a.round - b.round);
			return Effect.succeed(filtered);
		},

		getAll(): Effect.Effect<InterviewStage[], InterviewStageError> {
			return Effect.succeed(Array.from(stages.values()));
		},

		update(
			id: InterviewStageId,
			data: ForUpdate<InterviewStage>,
		): Effect.Effect<InterviewStage, InterviewStageError> {
			const existing = stages.get(id);
			if (!existing) {
				return Effect.fail(
					new InterviewStageError({
						detail: `Interview stage with id ${id} not found`,
						operation: "update",
					}),
				);
			}

			const updated = updateInterviewStage(existing, data);
			stages.set(id, updated);
			return Effect.succeed(updated);
		},

		delete(id: InterviewStageId): Effect.Effect<void, InterviewStageError> {
			stages.delete(id);
			return Effect.succeed(undefined);
		},
	};
}
