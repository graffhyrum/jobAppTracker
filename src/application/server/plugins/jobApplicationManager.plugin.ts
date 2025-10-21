import { Elysia } from "elysia";
import { jobApplicationManager } from "#src/domain/use-cases/create-sqlite-job-app-manager.ts";

export const jobApplicationManagerPlugin = new Elysia().decorate(
	"jobApplicationManager",
	jobApplicationManager,
);
