import { Database } from "bun:sqlite";
import { processEnv } from "../../../processEnvFacade.ts";
import { createSQLiteContactRepository } from "../../infrastructure/adapters/sqlite-contact-repository.ts";
import { getDatabasePath } from "../../infrastructure/config/sqlite-config.ts";

// Get database connection from the same singleton instance used by job app manager
function getDatabase() {
	const dbPath = getDatabasePath(processEnv.JOB_APP_MANAGER_TYPE);
	return new Database(dbPath, { create: true });
}

export const contactRepository = createSQLiteContactRepository(getDatabase());
