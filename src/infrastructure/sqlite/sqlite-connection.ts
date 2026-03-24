import { Database } from "bun:sqlite";

import type { ProcessEnvSchema } from "../../../processEnvFacade.ts";
import { createSQLiteJobBoardRepository } from "../adapters/sqlite-job-board-repository.ts";
import { getDatabasePath } from "../config/sqlite-config.ts";
import { initializeSchema } from "./sqlite-schema.ts";

export type EnvironmentType = ProcessEnvSchema["JOB_APP_MANAGER_TYPE"];

export class SQLiteConnection {
	private static readonly instances = new Map<
		EnvironmentType,
		SQLiteConnection
	>();

	private readonly db: Database;

	private constructor(environment: EnvironmentType) {
		const dbPath = getDatabasePath(environment);
		this.db = new Database(dbPath, { create: true });
		initializeSchema(this.db);
		this.seedJobBoards();
		console.log(`[SQLite] Database initialized: ${dbPath}`);
	}

	static getInstance(environment: EnvironmentType): SQLiteConnection {
		const connection =
			SQLiteConnection.instances.get(environment) ??
			new SQLiteConnection(environment);
		SQLiteConnection.instances.set(environment, connection);
		return connection;
	}

	getDatabase(): Database {
		return this.db;
	}

	private seedJobBoards(): void {
		const jobBoardRepo = createSQLiteJobBoardRepository(this.db);
		jobBoardRepo.seedCommonBoards().mapErr((err) => {
			console.warn(`[SQLite] Failed to seed job boards: ${err}`);
		});
	}

	close(): void {
		this.db.close();
	}
}
