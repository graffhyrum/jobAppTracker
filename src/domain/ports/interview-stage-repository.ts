import type { ResultAsync } from "neverthrow";
import type { ForUpdate } from "../../infrastructure/storage/storage-provider-interface.ts";
import type {
	InterviewStage,
	InterviewStageForCreate,
	InterviewStageId,
} from "../entities/interview-stage.ts";
import type { JobApplicationId } from "../entities/job-application.ts";

export interface InterviewStageRepository {
	create(data: InterviewStageForCreate): ResultAsync<InterviewStage, string>;

	getById(id: InterviewStageId): ResultAsync<InterviewStage, string>;

	getAll(): ResultAsync<InterviewStage[], string>;

	getByJobApplicationId(
		jobAppId: JobApplicationId,
	): ResultAsync<InterviewStage[], string>;

	update(
		id: InterviewStageId,
		data: ForUpdate<InterviewStage>,
	): ResultAsync<InterviewStage, string>;

	delete(id: InterviewStageId): ResultAsync<void, string>;
}
