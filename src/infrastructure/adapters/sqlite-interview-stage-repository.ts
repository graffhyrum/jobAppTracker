import type { Database } from "bun:sqlite";
import { ArkErrors } from "arktype";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import type {
	InterviewStage,
	InterviewStageForCreate,
	InterviewStageId,
} from "../../domain/entities/interview-stage.ts";
import {
	createInterviewStage,
	interviewStageModule,
} from "../../domain/entities/interview-stage.ts";
import type { JobApplicationId } from "../../domain/entities/job-application.ts";
import type { InterviewStageRepository } from "../../domain/ports/interview-stage-repository.ts";
import { uuidProvider } from "../di/uuid-provider.ts";
import type { ForUpdate } from "../storage/storage-provider-interface.ts";

export function createSQLiteInterviewStageRepository(
	db: Database,
): InterviewStageRepository {
	return {
		create(data: InterviewStageForCreate): ResultAsync<InterviewStage, string> {
			const stageResult = createInterviewStage(data, uuidProvider.generateUUID);
			if (stageResult.isErr()) {
				return errAsync(
					`Failed to create interview stage: ${stageResult.error}`,
				);
			}

			const stage = stageResult.value;

			return ResultAsync.fromPromise(
				(async () => {
					const query = db.prepare(`
                        INSERT INTO interview_stages (id, jobApplicationId, round, interviewType, isFinalRound,
                                                      scheduledDate, completedDate, notes, questions,
                                                      createdAt, updatedAt)
                        VALUES ($id, $jobApplicationId, $round, $interviewType, $isFinalRound,
                                $scheduledDate, $completedDate, $notes, $questions,
                                $createdAt, $updatedAt)
                    `);

					query.run({
						$id: stage.id,
						$jobApplicationId: stage.jobApplicationId,
						$round: stage.round,
						$interviewType: stage.interviewType,
						$isFinalRound: stage.isFinalRound ? 1 : 0,
						$scheduledDate: stage.scheduledDate ?? null,
						$completedDate: stage.completedDate ?? null,
						$notes: stage.notes ?? null,
						$questions: JSON.stringify(stage.questions),
						$createdAt: stage.createdAt,
						$updatedAt: stage.updatedAt,
					});

					return stage;
				})(),
				(err) => `Failed to insert interview stage: ${err}`,
			);
		},

		getById(id: InterviewStageId): ResultAsync<InterviewStage, string> {
			return ResultAsync.fromPromise(
				(async () => {
					const query = db.prepare(
						"SELECT * FROM interview_stages WHERE id = $id",
					);
					const result = query.get({ $id: id });
					if (!result) {
						throw new Error(`Interview stage with id ${id} not found`);
					}
					return result;
				})(),
				(err) => `Failed to query interview stage: ${err}`,
			).andThen(parseInterviewStage);
		},

		getAll(): ResultAsync<InterviewStage[], string> {
			return ResultAsync.fromPromise(
				(async () => {
					const query = db.prepare(
						"SELECT * FROM interview_stages ORDER BY jobApplicationId, round ASC",
					);
					return query.all();
				})(),
				(err) => `Failed to query all interview stages: ${err}`,
			).andThen(parseInterviewStageArray);
		},

		getByJobApplicationId(
			jobAppId: JobApplicationId,
		): ResultAsync<InterviewStage[], string> {
			return ResultAsync.fromPromise(
				(async () => {
					const query = db.prepare(
						"SELECT * FROM interview_stages WHERE jobApplicationId = $jobAppId ORDER BY round ASC",
					);
					return query.all({ $jobAppId: jobAppId });
				})(),
				(err) => `Failed to query interview stages: ${err}`,
			).andThen(parseInterviewStageArray);
		},

		update(
			id: InterviewStageId,
			data: ForUpdate<InterviewStage>,
		): ResultAsync<InterviewStage, string> {
			return ResultAsync.fromPromise(
				(async () => {
					const getQuery = db.prepare(
						"SELECT * FROM interview_stages WHERE id = $id",
					);
					const current = getQuery.get({ $id: id });
					if (!current) {
						throw new Error(`Interview stage with id ${id} not found`);
					}

					const normalized = normalizeRow(current) as Record<string, unknown>;
					const updated = {
						...normalized,
						...data,
						updatedAt: new Date().toISOString(),
					} as Record<string, unknown>;

					const updateQuery = db.prepare(`
                        UPDATE interview_stages
                        SET jobApplicationId = $jobApplicationId,
                            round            = $round,
                            interviewType    = $interviewType,
                            isFinalRound     = $isFinalRound,
                            scheduledDate    = $scheduledDate,
                            completedDate    = $completedDate,
                            notes            = $notes,
                            questions        = $questions,
                            updatedAt        = $updatedAt
                        WHERE id = $id
                    `);

					updateQuery.run({
						$id: id,
						$jobApplicationId: updated.jobApplicationId as string,
						$round: updated.round as number,
						$interviewType: updated.interviewType as string,
						$isFinalRound: (updated.isFinalRound as boolean) ? 1 : 0,
						$scheduledDate:
							(updated.scheduledDate as string | undefined) ?? null,
						$completedDate:
							(updated.completedDate as string | undefined) ?? null,
						$notes: (updated.notes as string | undefined) ?? null,
						$questions:
							typeof updated.questions === "string"
								? updated.questions
								: JSON.stringify(updated.questions),
						$updatedAt: updated.updatedAt as string,
					});

					return updated;
				})(),
				(err) => `Failed to update interview stage: ${err}`,
			).andThen(parseInterviewStage);
		},

		delete(id: InterviewStageId): ResultAsync<void, string> {
			return ResultAsync.fromPromise(
				(async () => {
					const query = db.prepare(
						"DELETE FROM interview_stages WHERE id = $id",
					);
					query.run({ $id: id });
				})(),
				(err) => `Failed to delete interview stage: ${err}`,
			);
		},
	};
}

function parseInterviewStageArray(maybeArray: unknown) {
	const normalizedArray = Array.isArray(maybeArray)
		? maybeArray.map(normalizeRow)
		: maybeArray;

	const parsedResult =
		interviewStageModule.InterviewStage.array()(normalizedArray);
	if (parsedResult instanceof ArkErrors) {
		return errAsync(JSON.stringify(parsedResult, null, 2));
	}
	return okAsync(parsedResult);
}

function parseInterviewStage(maybeRecord: unknown) {
	const normalized = normalizeRow(maybeRecord);
	const parseResult = interviewStageModule.InterviewStage(normalized);
	if (parseResult instanceof ArkErrors) {
		return errAsync(JSON.stringify(parseResult, null, 2));
	}
	return okAsync(parseResult);
}

function normalizeRow(record: unknown): unknown {
	if (typeof record === "object" && record !== null) {
		const row = record as Record<string, unknown>;
		const normalized: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(row)) {
			if (value === null) {
				continue;
			}

			if (key === "questions" && typeof value === "string") {
				normalized[key] = JSON.parse(value);
			} else if (key === "isFinalRound" && typeof value === "number") {
				normalized[key] = value === 1;
			} else {
				normalized[key] = value;
			}
		}

		return normalized;
	}
	return record;
}
