import { errAsync, okAsync, type ResultAsync } from "neverthrow";
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
		create(data: JobBoardForCreate): ResultAsync<JobBoard, string> {
			const result = createJobBoard(data, generateUUID);
			if (result.isErr()) {
				return errAsync(`Failed to create job board: ${result.error.message}`);
			}
			const board = result.value;
			boards.set(board.id, board);
			return okAsync(board);
		},

		getById(id: JobBoardId): ResultAsync<JobBoard, string> {
			const board = boards.get(id);
			if (!board) {
				return errAsync(`Job board with id ${id} not found`);
			}
			return okAsync(board);
		},

		getAll(): ResultAsync<JobBoard[], string> {
			// Sort by name like SQLite implementation
			const sorted = Array.from(boards.values()).sort((a, b) =>
				a.name.localeCompare(b.name),
			);
			return okAsync(sorted);
		},

		findByDomain(domain: string): ResultAsync<JobBoard | null, string> {
			// Search by rootDomain first
			for (const board of boards.values()) {
				if (board.rootDomain === domain) {
					return okAsync(board);
				}
			}

			// Then search in domains array
			for (const board of boards.values()) {
				if (board.domains.includes(domain)) {
					return okAsync(board);
				}
			}

			return okAsync(null);
		},

		delete(id: JobBoardId): ResultAsync<void, string> {
			boards.delete(id);
			return okAsync(undefined);
		},

		seedCommonBoards(): ResultAsync<void, string> {
			// For tests, seeding is optional - just return success
			// If needed, can implement using COMMON_JOB_BOARDS
			return okAsync(undefined);
		},
	};
}
