import type { ResultAsync } from "neverthrow";
import type {
	JobBoard,
	JobBoardForCreate,
	JobBoardId,
} from "../entities/job-board.ts";

export interface JobBoardRepository {
	create(data: JobBoardForCreate): ResultAsync<JobBoard, string>;

	getById(id: JobBoardId): ResultAsync<JobBoard, string>;

	getAll(): ResultAsync<JobBoard[], string>;

	findByDomain(domain: string): ResultAsync<JobBoard | null, string>;

	delete(id: JobBoardId): ResultAsync<void, string>;

	seedCommonBoards(): ResultAsync<void, string>;
}
