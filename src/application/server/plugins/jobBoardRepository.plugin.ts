import { Elysia } from "elysia";
import { jobBoardRepository } from "#src/domain/use-cases/create-sqlite-job-board-repo.ts";

export const jobBoardRepositoryPlugin = new Elysia().decorate(
	"jobBoardRepository",
	jobBoardRepository,
);
