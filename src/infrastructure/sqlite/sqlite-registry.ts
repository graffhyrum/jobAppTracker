import type { Database } from "bun:sqlite";

import type { ProcessEnvSchema } from "../../../processEnvFacade.ts";
import { processEnv } from "../../../processEnvFacade.ts";
import type { JobApplicationManager } from "../../domain/ports/job-application-manager.ts";
import { createSQLiteJobAppManager } from "../adapters/sqlite-job-application-manager.ts";
import { SQLiteConnection } from "./sqlite-connection.ts";

export type ManagerType = ProcessEnvSchema["JOB_APP_MANAGER_TYPE"];

function createJobAppManagerRegistry(initialEnvironment: ManagerType) {
	const managers = new Map<ManagerType, JobApplicationManager>();

	function getOrCreateManager(env: ManagerType): JobApplicationManager {
		const existing = managers.get(env);
		if (existing) {
			return existing;
		}

		const db = SQLiteConnection.getInstance(env).getDatabase();
		const newManager = createSQLiteJobAppManager(db);
		managers.set(env, newManager);
		return newManager;
	}

	getOrCreateManager("test");
	getOrCreateManager("prod");

	return {
		getManager(env: ManagerType): JobApplicationManager {
			return getOrCreateManager(env);
		},

		getDefaultEnvironment(): ManagerType {
			return initialEnvironment;
		},

		getDatabase(env: ManagerType): Database {
			getOrCreateManager(env);
			return SQLiteConnection.getInstance(env).getDatabase();
		},
	};
}

const registry = createJobAppManagerRegistry(processEnv.JOB_APP_MANAGER_TYPE);

export const jobAppManagerRegistry = registry;
