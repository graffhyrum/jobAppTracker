import type { Effect } from "effect";

import type { InterviewStageError } from "../entities/interview-stage-error.ts";
import type {
	InterviewStage,
	InterviewStageForCreate,
	InterviewStageId,
} from "../entities/interview-stage.ts";
import type { JobApplicationId } from "../entities/job-application.ts";
import type { ForUpdate } from "./common-types.ts";

export interface InterviewStageRepository {
	create(
		data: InterviewStageForCreate,
	): Effect.Effect<InterviewStage, InterviewStageError>;

	getById(
		id: InterviewStageId,
	): Effect.Effect<InterviewStage, InterviewStageError>;

	getAll(): Effect.Effect<InterviewStage[], InterviewStageError>;

	getByJobApplicationId(
		jobAppId: JobApplicationId,
	): Effect.Effect<InterviewStage[], InterviewStageError>;

	update(
		id: InterviewStageId,
		data: ForUpdate<InterviewStage>,
	): Effect.Effect<InterviewStage, InterviewStageError>;

	delete(id: InterviewStageId): Effect.Effect<void, InterviewStageError>;
}
