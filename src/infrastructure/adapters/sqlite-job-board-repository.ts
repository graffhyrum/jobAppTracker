import type { Database } from "bun:sqlite";
import { ArkErrors } from "arktype";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
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
import type { JobBoardRepository } from "../../domain/ports/job-board-repository.ts";
import { uuidProvider } from "../di/uuid-provider.ts";

export function createSQLiteJobBoardRepository(
	db: Database,
): JobBoardRepository {
	return {
		create(data: JobBoardForCreate): ResultAsync<JobBoard, string> {
			const jobBoardResult = createJobBoard(data, uuidProvider.generateUUID);
			if (jobBoardResult.isErr()) {
				return errAsync(`Failed to create job board: ${jobBoardResult.error}`);
			}

			const jobBoard = jobBoardResult.value;

			return ResultAsync.fromPromise(
				(async () => {
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
				})(),
				(err) => `Failed to insert job board: ${err}`,
			);
		},

		getById(id: JobBoardId): ResultAsync<JobBoard, string> {
			return ResultAsync.fromPromise(
				(async () => {
					const query = db.prepare("SELECT * FROM job_boards WHERE id = $id");
					const result = query.get({ $id: id });
					if (!result) {
						throw new Error(`Job board with id ${id} not found`);
					}
					return result;
				})(),
				(err) => `Failed to query job board: ${err}`,
			).andThen(parseJobBoard);
		},

		getAll(): ResultAsync<JobBoard[], string> {
			return ResultAsync.fromPromise(
				(async () => {
					const query = db.prepare(
						"SELECT * FROM job_boards ORDER BY name ASC",
					);
					return query.all();
				})(),
				(err) => `Failed to query job boards: ${err}`,
			).andThen(parseJobBoardArray);
		},

		findByDomain(domain: string): ResultAsync<JobBoard | null, string> {
			return ResultAsync.fromPromise(
				(async () => {
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
						const normalized = normalizeRow(board);
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
				})(),
				(err) => `Failed to find job board by domain: ${err}`,
			).andThen((result) => {
				if (result === null) {
					return okAsync(null);
				}
				return parseJobBoard(result).map((board) => board);
			});
		},

		delete(id: JobBoardId): ResultAsync<void, string> {
			return ResultAsync.fromPromise(
				(async () => {
					const query = db.prepare("DELETE FROM job_boards WHERE id = $id");
					query.run({ $id: id });
				})(),
				(err) => `Failed to delete job board: ${err}`,
			);
		},

		seedCommonBoards(): ResultAsync<void, string> {
			return ResultAsync.fromPromise(
				(async () => {
					for (const boardData of COMMON_JOB_BOARDS) {
						const boardResult = createJobBoard(
							boardData,
							uuidProvider.generateUUID,
						);
						if (boardResult.isOk()) {
							const board = boardResult.value;
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
				})(),
				(err) => `Failed to seed job boards: ${err}`,
			);
		},
	};
}

function parseJobBoardArray(maybeArray: unknown) {
	const normalizedArray = Array.isArray(maybeArray)
		? maybeArray.map(normalizeRow)
		: maybeArray;

	const parsedResult = jobBoardModule.JobBoard.array()(normalizedArray);
	if (parsedResult instanceof ArkErrors) {
		return errAsync(JSON.stringify(parsedResult, null, 2));
	}
	return okAsync(parsedResult);
}

function parseJobBoard(maybeRecord: unknown) {
	const normalized = normalizeRow(maybeRecord);
	const parseResult = jobBoardModule.JobBoard(normalized);
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

			if (key === "domains" && typeof value === "string") {
				normalized[key] = JSON.parse(value);
			} else {
				normalized[key] = value;
			}
		}

		return normalized;
	}
	return record;
}
