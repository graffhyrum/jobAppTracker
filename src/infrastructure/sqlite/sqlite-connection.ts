import { Database } from "bun:sqlite";

import { Effect } from "effect";

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
		this.configurePragmas(dbPath);
		initializeSchema(this.db);
		this.seedJobBoards();
		console.log(`[SQLite] Database initialized: ${dbPath}`);
	}

	private configurePragmas(dbPath: string): void {
		if (dbPath !== ":memory:") {
			this.db.run("PRAGMA journal_mode = WAL");
		}
		this.db.run("PRAGMA busy_timeout = 5000");
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
		Effect.runPromise(
			jobBoardRepo.seedCommonBoards().pipe(
				Effect.catchAll((err) => {
					console.warn(`[SQLite] Failed to seed job boards: ${err.detail}`);
					return Effect.void;
				}),
			),
		);
	}

	close(): void {
		this.db.close();
	}
}
