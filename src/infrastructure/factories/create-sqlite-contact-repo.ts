import { processEnv } from "../../../processEnvFacade.ts";
import { createSQLiteContactRepository } from "../adapters/sqlite-contact-repository.ts";
import { jobAppManagerRegistry } from "../sqlite/sqlite-registry.ts";

export const contactRepository = createSQLiteContactRepository(
	jobAppManagerRegistry.getDatabase(processEnv.JOB_APP_MANAGER_TYPE),
);
