import { Effect, Either } from "effect";

import { JobBoardError } from "#src/domain/entities/job-board-error.ts";
import type {
	JobBoard,
	JobBoardForCreate,
	JobBoardId,
} from "#src/domain/entities/job-board.ts";
import { createJobBoard } from "#src/domain/entities/job-board.ts";
import type { JobBoardRepository } from "#src/domain/ports/job-board-repository.ts";

export function createInMemoryJobBoardRepository(
	generateUUID: () => string = () => crypto.randomUUID(),
): JobBoardRepository {
	const boards = new Map<JobBoardId, JobBoard>();

	return {
		create(data: JobBoardForCreate): Effect.Effect<JobBoard, JobBoardError> {
			const result = createJobBoard(data, generateUUID);
			if (Either.isLeft(result)) {
				return Effect.fail(
					new JobBoardError({
						detail: `Failed to create job board: ${result.left.detail}`,
						operation: "create",
					}),
				);
			}
			const board = result.right;
			boards.set(board.id, board);
			return Effect.succeed(board);
		},

		getById(id: JobBoardId): Effect.Effect<JobBoard, JobBoardError> {
			const board = boards.get(id);
			if (!board) {
				return Effect.fail(
					new JobBoardError({
						detail: `Job board with id ${id} not found`,
						operation: "getById",
					}),
				);
			}
			return Effect.succeed(board);
		},

		getAll(): Effect.Effect<JobBoard[], JobBoardError> {
			// Sort by name like SQLite implementation
			const sorted = Array.from(boards.values()).sort((a, b) =>
				a.name.localeCompare(b.name),
			);
			return Effect.succeed(sorted);
		},

		findByDomain(
			domain: string,
		): Effect.Effect<JobBoard | null, JobBoardError> {
			// Search by rootDomain first
			for (const board of boards.values()) {
				if (board.rootDomain === domain) {
					return Effect.succeed(board);
				}
			}

			// Then search in domains array
			for (const board of boards.values()) {
				if (board.domains.includes(domain)) {
					return Effect.succeed(board);
				}
			}

			return Effect.succeed(null);
		},

		delete(id: JobBoardId): Effect.Effect<void, JobBoardError> {
			boards.delete(id);
			return Effect.succeed(undefined);
		},

		seedCommonBoards(): Effect.Effect<void, JobBoardError> {
			// For tests, seeding is optional - just return success
			// If needed, can implement using COMMON_JOB_BOARDS
			return Effect.succeed(undefined);
		},
	};
}
