import { errAsync, okAsync, type ResultAsync } from "neverthrow";
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
import type { InterviewStageRepository } from "#src/domain/ports/interview-stage-repository.ts";
import type { ForUpdate } from "#src/infrastructure/storage/storage-provider-interface.ts";

export function createInMemoryInterviewStageRepository(
	generateUUID: () => string = () => crypto.randomUUID(),
): InterviewStageRepository {
	const stages = new Map<InterviewStageId, InterviewStage>();

	return {
		create(data: InterviewStageForCreate): ResultAsync<InterviewStage, string> {
			const result = createInterviewStage(data, generateUUID);
			if (result.isErr()) {
				return errAsync(
					`Failed to create interview stage: ${result.error.message}`,
				);
			}
			const stage = result.value;
			stages.set(stage.id, stage);
			return okAsync(stage);
		},

		getById(id: InterviewStageId): ResultAsync<InterviewStage, string> {
			const stage = stages.get(id);
			if (!stage) {
				return errAsync(`Interview stage with id ${id} not found`);
			}
			return okAsync(stage);
		},

		getByJobApplicationId(
			jobAppId: JobApplicationId,
		): ResultAsync<InterviewStage[], string> {
			const filtered = Array.from(stages.values())
				.filter((stage) => stage.jobApplicationId === jobAppId)
				.sort((a, b) => a.round - b.round);
			return okAsync(filtered);
		},

		update(
			id: InterviewStageId,
			data: ForUpdate<InterviewStage>,
		): ResultAsync<InterviewStage, string> {
			const existing = stages.get(id);
			if (!existing) {
				return errAsync(`Interview stage with id ${id} not found`);
			}

			const updated = updateInterviewStage(existing, data);
			stages.set(id, updated);
			return okAsync(updated);
		},

		delete(id: InterviewStageId): ResultAsync<void, string> {
			stages.delete(id);
			return okAsync(undefined);
		},
	};
}
