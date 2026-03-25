import type { Database } from "bun:sqlite";

import { ArkErrors } from "arktype";
import { Effect, Either } from "effect";

import { InterviewStageError } from "../../domain/entities/interview-stage-error.ts";
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
import type { ForUpdate } from "../../domain/ports/common-types.ts";
import type { InterviewStageRepository } from "../../domain/ports/interview-stage-repository.ts";
import { uuidProvider } from "../di/uuid-provider.ts";
import { normalizeInterviewStageRow } from "../sqlite/normalize-sqlite-row.ts";

export function createSQLiteInterviewStageRepository(
	db: Database,
): InterviewStageRepository {
	return {
		create(
			data: InterviewStageForCreate,
		): Effect.Effect<InterviewStage, InterviewStageError> {
			const stageResult = createInterviewStage(data, uuidProvider.generateUUID);
			if (Either.isLeft(stageResult)) {
				return Effect.fail(
					new InterviewStageError({
						detail: `Failed to create interview stage: ${stageResult.left.detail}`,
						operation: "create",
					}),
				);
			}

			const stage = stageResult.right;

			return Effect.tryPromise({
				try: () =>
					Promise.resolve().then(() => {
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
					}),
				catch: (err) =>
					new InterviewStageError({
						detail: `Failed to insert interview stage: ${err}`,
						operation: "create",
					}),
			});
		},

		getById(
			id: InterviewStageId,
		): Effect.Effect<InterviewStage, InterviewStageError> {
			return Effect.tryPromise({
				try: () =>
					Promise.resolve().then(() => {
						const query = db.prepare(
							"SELECT * FROM interview_stages WHERE id = $id",
						);
						const result = query.get({ $id: id });
						if (!result) {
							throw new Error(`Interview stage with id ${id} not found`);
						}
						return result;
					}),
				catch: (err) =>
					new InterviewStageError({
						detail: `Failed to query interview stage: ${err}`,
						operation: "getById",
					}),
			}).pipe(Effect.flatMap(parseInterviewStage));
		},

		getAll(): Effect.Effect<InterviewStage[], InterviewStageError> {
			return Effect.tryPromise({
				try: () =>
					Promise.resolve().then(() => {
						const query = db.prepare(
							"SELECT * FROM interview_stages ORDER BY jobApplicationId, round ASC",
						);
						return query.all();
					}),
				catch: (err) =>
					new InterviewStageError({
						detail: `Failed to query all interview stages: ${err}`,
						operation: "getAll",
					}),
			}).pipe(Effect.flatMap(parseInterviewStageArray));
		},

		getByJobApplicationId(
			jobAppId: JobApplicationId,
		): Effect.Effect<InterviewStage[], InterviewStageError> {
			return Effect.tryPromise({
				try: () =>
					Promise.resolve().then(() => {
						const query = db.prepare(
							"SELECT * FROM interview_stages WHERE jobApplicationId = $jobAppId ORDER BY round ASC",
						);
						return query.all({ $jobAppId: jobAppId });
					}),
				catch: (err) =>
					new InterviewStageError({
						detail: `Failed to query interview stages: ${err}`,
						operation: "getByJobApplicationId",
					}),
			}).pipe(Effect.flatMap(parseInterviewStageArray));
		},

		update(
			id: InterviewStageId,
			data: ForUpdate<InterviewStage>,
		): Effect.Effect<InterviewStage, InterviewStageError> {
			return Effect.tryPromise({
				try: () =>
					Promise.resolve().then(() => {
						const getQuery = db.prepare(
							"SELECT * FROM interview_stages WHERE id = $id",
						);
						const current = getQuery.get({ $id: id });
						if (!current) {
							throw new Error(`Interview stage with id ${id} not found`);
						}

						const normalized = normalizeInterviewStageRow(current) as Record<
							string,
							unknown
						>;
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
					}),
				catch: (err) =>
					new InterviewStageError({
						detail: `Failed to update interview stage: ${err}`,
						operation: "update",
					}),
			}).pipe(Effect.flatMap(parseInterviewStage));
		},

		delete(id: InterviewStageId): Effect.Effect<void, InterviewStageError> {
			return Effect.tryPromise({
				try: () =>
					Promise.resolve().then(() => {
						const query = db.prepare(
							"DELETE FROM interview_stages WHERE id = $id",
						);
						query.run({ $id: id });
					}),
				catch: (err) =>
					new InterviewStageError({
						detail: `Failed to delete interview stage: ${err}`,
						operation: "delete",
					}),
			});
		},
	};
}

function parseInterviewStageArray(
	maybeArray: unknown,
): Effect.Effect<InterviewStage[], InterviewStageError> {
	const normalizedArray = Array.isArray(maybeArray)
		? maybeArray.map(normalizeInterviewStageRow)
		: maybeArray;

	const parsedResult =
		interviewStageModule.InterviewStage.array()(normalizedArray);
	if (parsedResult instanceof ArkErrors) {
		return Effect.fail(
			new InterviewStageError({
				detail: JSON.stringify(parsedResult, null, 2),
				operation: "parseInterviewStageArray",
			}),
		);
	}
	return Effect.succeed(parsedResult);
}

function parseInterviewStage(
	maybeRecord: unknown,
): Effect.Effect<InterviewStage, InterviewStageError> {
	const normalized = normalizeInterviewStageRow(maybeRecord);
	const parseResult = interviewStageModule.InterviewStage(normalized);
	if (parseResult instanceof ArkErrors) {
		return Effect.fail(
			new InterviewStageError({
				detail: JSON.stringify(parseResult, null, 2),
				operation: "parseInterviewStage",
			}),
		);
	}
	return Effect.succeed(parseResult);
}
