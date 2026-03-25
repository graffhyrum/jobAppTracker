import type { Effect } from "effect";

import type { JobBoardError } from "../entities/job-board-error.ts";
import type {
	JobBoard,
	JobBoardForCreate,
	JobBoardId,
} from "../entities/job-board.ts";

export interface JobBoardRepository {
	create(data: JobBoardForCreate): Effect.Effect<JobBoard, JobBoardError>;

	getById(id: JobBoardId): Effect.Effect<JobBoard, JobBoardError>;

	getAll(): Effect.Effect<JobBoard[], JobBoardError>;

	findByDomain(
		domain: string,
	): Effect.Effect<JobBoard | null, JobBoardError>;

	delete(id: JobBoardId): Effect.Effect<void, JobBoardError>;

	seedCommonBoards(): Effect.Effect<void, JobBoardError>;
}
