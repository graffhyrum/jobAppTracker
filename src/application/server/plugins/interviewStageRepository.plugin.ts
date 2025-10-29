import { Elysia } from "elysia";
import { interviewStageRepository } from "#src/domain/use-cases/create-sqlite-interview-stage-repo.ts";

export const interviewStageRepositoryPlugin = new Elysia().decorate(
	"interviewStageRepository",
	interviewStageRepository,
);
