import type { Database } from "bun:sqlite";

import { ArkErrors } from "arktype";
import { Effect, Either } from "effect";

import type {
	JobBoard,
	JobBoardForCreate,
	JobBoardId,
} from "../../domain/entities/job-board.ts";
import {
	COMMON_JOB_BOARDS,
	createJobBoard,
	jobBoardModule,
} from "../../domain/entities/job-board.ts";
import { JobBoardError } from "../../domain/entities/job-board-error.ts";
import type { JobBoardRepository } from "../../domain/ports/job-board-repository.ts";
import { uuidProvider } from "../di/uuid-provider.ts";
import { normalizeJobBoardRow } from "../sqlite/normalize-sqlite-row.ts";

export function createSQLiteJobBoardRepository(
	db: Database,
): JobBoardRepository {
	return {
		create(
			data: JobBoardForCreate,
		): Effect.Effect<JobBoard, JobBoardError> {
			const jobBoardResult = createJobBoard(data, uuidProvider.generateUUID);
			if (Either.isLeft(jobBoardResult)) {
				return Effect.fail(
					new JobBoardError({
						detail: `Failed to create job board: ${jobBoardResult.left.detail}`,
						operation: "create",
					}),
				);
			}

			const jobBoard = jobBoardResult.right;

			return Effect.tryPromise({
				try: () =>
					Promise.resolve().then(() => {
						const query = db.prepare(`
                        INSERT INTO job_boards (id, name, rootDomain, domains, createdAt)
                        VALUES ($id, $name, $rootDomain, $domains, $createdAt)
                    `);

						query.run({
							$id: jobBoard.id,
							$name: jobBoard.name,
							$rootDomain: jobBoard.rootDomain,
							$domains: JSON.stringify(jobBoard.domains),
							$createdAt: jobBoard.createdAt,
						});

						return jobBoard;
					}),
				catch: (err) =>
					new JobBoardError({
						detail: `Failed to insert job board: ${err}`,
						operation: "create",
					}),
			});
		},

		getById(id: JobBoardId): Effect.Effect<JobBoard, JobBoardError> {
			return Effect.tryPromise({
				try: () =>
					Promise.resolve().then(() => {
						const query = db.prepare(
							"SELECT * FROM job_boards WHERE id = $id",
						);
						const result = query.get({ $id: id });
						if (!result) {
							throw new Error(`Job board with id ${id} not found`);
						}
						return result;
					}),
				catch: (err) =>
					new JobBoardError({
						detail: `Failed to query job board: ${err}`,
						operation: "getById",
					}),
			}).pipe(Effect.flatMap(parseJobBoard));
		},

		getAll(): Effect.Effect<JobBoard[], JobBoardError> {
			return Effect.tryPromise({
				try: () =>
					Promise.resolve().then(() => {
						const query = db.prepare(
							"SELECT * FROM job_boards ORDER BY name ASC",
						);
						return query.all();
					}),
				catch: (err) =>
					new JobBoardError({
						detail: `Failed to query job boards: ${err}`,
						operation: "getAll",
					}),
			}).pipe(Effect.flatMap(parseJobBoardArray));
		},

		findByDomain(
			domain: string,
		): Effect.Effect<JobBoard | null, JobBoardError> {
			return Effect.tryPromise({
				try: () =>
					Promise.resolve().then(() => {
						// Try exact match on rootDomain first
						const exactQuery = db.prepare(
							"SELECT * FROM job_boards WHERE rootDomain = $domain",
						);
						const exactResult = exactQuery.get({ $domain: domain });
						if (exactResult) {
							return exactResult;
						}

						// Then check domains array
						const allQuery = db.prepare("SELECT * FROM job_boards");
						const allBoards = allQuery.all();

						for (const board of allBoards) {
							const normalized = normalizeJobBoardRow(board);
							if (
								typeof normalized === "object" &&
								normalized !== null &&
								"domains" in normalized
							) {
								const domains = normalized.domains as string[];
								if (domains.includes(domain)) {
									return board;
								}
							}
						}

						return null;
					}),
				catch: (err) =>
					new JobBoardError({
						detail: `Failed to find job board by domain: ${err}`,
						operation: "findByDomain",
					}),
			}).pipe(
				Effect.flatMap((result) => {
					if (result === null) {
						return Effect.succeed(null);
					}
					return parseJobBoard(result);
				}),
			);
		},

		delete(id: JobBoardId): Effect.Effect<void, JobBoardError> {
			return Effect.tryPromise({
				try: () =>
					Promise.resolve().then(() => {
						const query = db.prepare(
							"DELETE FROM job_boards WHERE id = $id",
						);
						query.run({ $id: id });
					}),
				catch: (err) =>
					new JobBoardError({
						detail: `Failed to delete job board: ${err}`,
						operation: "delete",
					}),
			});
		},

		seedCommonBoards(): Effect.Effect<void, JobBoardError> {
			return Effect.tryPromise({
				try: () =>
					Promise.resolve().then(() => {
						for (const boardData of COMMON_JOB_BOARDS) {
							const boardResult = createJobBoard(
								boardData,
								uuidProvider.generateUUID,
							);
							if (Either.isRight(boardResult)) {
								const board = boardResult.right;
								const query = db.prepare(`
                                INSERT OR IGNORE INTO job_boards (id, name, rootDomain, domains, createdAt)
                                VALUES ($id, $name, $rootDomain, $domains, $createdAt)
                            `);

								query.run({
									$id: board.id,
									$name: board.name,
									$rootDomain: board.rootDomain,
									$domains: JSON.stringify(board.domains),
									$createdAt: board.createdAt,
								});
							}
						}
					}),
				catch: (err) =>
					new JobBoardError({
						detail: `Failed to seed job boards: ${err}`,
						operation: "seedCommonBoards",
					}),
			});
		},
	};
}

function parseJobBoardArray(
	maybeArray: unknown,
): Effect.Effect<JobBoard[], JobBoardError> {
	const normalizedArray = Array.isArray(maybeArray)
		? maybeArray.map(normalizeJobBoardRow)
		: maybeArray;

	const parsedResult = jobBoardModule.JobBoard.array()(normalizedArray);
	if (parsedResult instanceof ArkErrors) {
		return Effect.fail(
			new JobBoardError({
				detail: JSON.stringify(parsedResult, null, 2),
				operation: "parseJobBoardArray",
			}),
		);
	}
	return Effect.succeed(parsedResult);
}

function parseJobBoard(
	maybeRecord: unknown,
): Effect.Effect<JobBoard, JobBoardError> {
	const normalized = normalizeJobBoardRow(maybeRecord);
	const parseResult = jobBoardModule.JobBoard(normalized);
	if (parseResult instanceof ArkErrors) {
		return Effect.fail(
			new JobBoardError({
				detail: JSON.stringify(parseResult, null, 2),
				operation: "parseJobBoard",
			}),
		);
	}
	return Effect.succeed(parseResult);
}
