import { Elysia } from "elysia";
import type { JobBoardRepository } from "#src/domain/ports/job-board-repository.ts";

/**
 * Factory function to create an Elysia plugin that decorates the context with a job board repository.
 * Accepts a JobBoardRepository instance to allow dependency injection.
 */
export const createJobBoardRepositoryPlugin = (
	jobBoardRepository: JobBoardRepository,
) => new Elysia().decorate("jobBoardRepository", jobBoardRepository);
