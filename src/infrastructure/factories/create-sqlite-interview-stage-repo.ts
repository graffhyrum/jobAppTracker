import { processEnv } from "../../../processEnvFacade.ts";
import { createSQLiteInterviewStageRepository } from "../adapters/sqlite-interview-stage-repository.ts";
import { jobAppManagerRegistry } from "./create-sqlite-job-app-manager.ts";

export const interviewStageRepository =
	createSQLiteInterviewStageRepository(
		jobAppManagerRegistry.getDatabase(processEnv.JOB_APP_MANAGER_TYPE),
	);
