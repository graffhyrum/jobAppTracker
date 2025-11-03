import type { Database } from "bun:sqlite";
import { createSQLiteJobBoardRepository } from "../../infrastructure/adapters/sqlite-job-board-repository.ts";

/**
 * Factory function to create a SQLite job board repository using the provided database connection.
 * This ensures all repositories share the same initialized database instance.
 */
export const createSQLiteJobBoardRepo = (db: Database) =>
	createSQLiteJobBoardRepository(db);
