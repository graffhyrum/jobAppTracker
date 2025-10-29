import { Database } from "bun:sqlite";
import { processEnv } from "../../../processEnvFacade.ts";
import { createSQLiteInterviewStageRepository } from "../../infrastructure/adapters/sqlite-interview-stage-repository.ts";
import { getDatabasePath } from "../../infrastructure/config/sqlite-config.ts";

// Get database connection from the same singleton instance used by job app manager
function getDatabase() {
	const dbPath = getDatabasePath(processEnv.JOB_APP_MANAGER_TYPE);
	return new Database(dbPath, { create: true });
}

export const interviewStageRepository = createSQLiteInterviewStageRepository(
	getDatabase(),
);
