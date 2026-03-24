import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";

import { initializeSchema } from "./sqlite-schema.ts";

describe("initializeSchema", () => {
	test("creates all 4 tables", () => {
		const db = new Database(":memory:");
		initializeSchema(db);

		const tables = db
			.prepare(
				"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
			)
			.all() as { name: string }[];

		const tableNames = tables.map((t) => t.name);
		expect(tableNames).toContain("job_applications");
		expect(tableNames).toContain("contacts");
		expect(tableNames).toContain("interview_stages");
		expect(tableNames).toContain("job_boards");
	});

	test("creates all 15 indexes", () => {
		const db = new Database(":memory:");
		initializeSchema(db);

		const indexes = db
			.prepare(
				"SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name",
			)
			.all() as { name: string }[];

		expect(indexes).toHaveLength(15);
	});

	test("is idempotent — running twice does not error", () => {
		const db = new Database(":memory:");
		initializeSchema(db);
		expect(() => initializeSchema(db)).not.toThrow();
	});

	test("job_applications table has expected columns", () => {
		const db = new Database(":memory:");
		initializeSchema(db);

		const columns = db.prepare("PRAGMA table_info(job_applications)").all() as {
			name: string;
		}[];

		const columnNames = columns.map((c) => c.name);
		expect(columnNames).toContain("id");
		expect(columnNames).toContain("company");
		expect(columnNames).toContain("positionTitle");
		expect(columnNames).toContain("statusLog");
		expect(columnNames).toContain("notes");
		expect(columnNames).toContain("isRemote");
	});
});
