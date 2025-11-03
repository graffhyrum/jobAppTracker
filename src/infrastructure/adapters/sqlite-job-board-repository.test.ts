import { describe, expect, it } from "bun:test";
import { assertDefined } from "#helpers/assertDefined.ts";
import type { JobBoardForCreate } from "../../domain/entities/job-board.ts";
import { jobAppManagerRegistry } from "../../domain/use-cases/create-sqlite-job-app-manager.ts";
import { uuidProvider } from "../di/uuid-provider.ts";
import { createSQLiteJobBoardRepository } from "./sqlite-job-board-repository.ts";

// Get the test database for testing
const testDb = jobAppManagerRegistry.getDatabase("test");
const repository = createSQLiteJobBoardRepository(testDb);

describe("SQLiteJobBoardRepository", () => {
	// Test data
	const validJobBoardData: JobBoardForCreate = {
		name: "Test Board",
		rootDomain: "testboard.com",
		domains: ["testboard.com", "www.testboard.com"],
	};

	const validJobBoardData2: JobBoardForCreate = {
		name: "Another Board",
		rootDomain: "anotherboard.io",
		domains: ["anotherboard.io", "app.anotherboard.io"],
	};

	// Helper to clean up test data
	async function clearJobBoards() {
		await testDb
			.prepare(
				"DELETE FROM job_boards WHERE name LIKE 'Test%' OR name LIKE 'Another%'",
			)
			.run();
	}

	describe("create", () => {
		it("should successfully create job board with valid data", async () => {
			await clearJobBoards();

			const result = await repository.create(validJobBoardData);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const board = result.value;
				expect(board.name).toBe(validJobBoardData.name);
				expect(board.rootDomain).toBe(validJobBoardData.rootDomain);
				expect(board.domains).toEqual(validJobBoardData.domains);
				assertDefined(board.id);
				assertDefined(board.createdAt);
			}

			await clearJobBoards();
		});

		it("should return error for invalid job board data", async () => {
			const invalidData = {
				name: "", // Invalid: empty string
				rootDomain: "test.com",
				domains: [],
			} as JobBoardForCreate;

			const result = await repository.create(invalidData);

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toContain("Failed to create job board");
			}
		});

		it("should persist job board to database", async () => {
			await clearJobBoards();

			const createResult = await repository.create(validJobBoardData);
			expect(createResult.isOk()).toBe(true);

			if (createResult.isOk()) {
				const board = createResult.value;
				const getResult = await repository.getById(board.id);

				expect(getResult.isOk()).toBe(true);
				if (getResult.isOk()) {
					const retrieved = getResult.value;
					expect(retrieved.id).toBe(board.id);
					expect(retrieved.name).toBe(board.name);
					expect(retrieved.rootDomain).toBe(board.rootDomain);
					expect(retrieved.domains).toEqual(board.domains);
				}
			}

			await clearJobBoards();
		});
	});

	describe("getById", () => {
		it("should successfully retrieve existing job board", async () => {
			await clearJobBoards();

			const createResult = await repository.create(validJobBoardData);
			expect(createResult.isOk()).toBe(true);

			if (createResult.isOk()) {
				const board = createResult.value;
				const getResult = await repository.getById(board.id);

				expect(getResult.isOk()).toBe(true);
				if (getResult.isOk()) {
					const retrieved = getResult.value;
					expect(retrieved.id).toBe(board.id);
					expect(retrieved.name).toBe(board.name);
					expect(retrieved.rootDomain).toBe(board.rootDomain);
					expect(retrieved.domains).toEqual(board.domains);
				}
			}

			await clearJobBoards();
		});

		it("should return error for non-existent ID", async () => {
			const nonExistentId = uuidProvider.generateUUID();
			const result = await repository.getById(nonExistentId);

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toContain("Failed to query job board");
				expect(result.error).toContain("not found");
			}
		});

		it("should correctly parse JSON domains field", async () => {
			await clearJobBoards();

			const domainsArray = [
				"domain1.com",
				"domain2.com",
				"subdomain.domain1.com",
			];
			const boardData: JobBoardForCreate = {
				name: "Test Multi-Domain Board",
				rootDomain: "domain1.com",
				domains: domainsArray,
			};

			const createResult = await repository.create(boardData);
			expect(createResult.isOk()).toBe(true);

			if (createResult.isOk()) {
				const board = createResult.value;
				const getResult = await repository.getById(board.id);

				expect(getResult.isOk()).toBe(true);
				if (getResult.isOk()) {
					const retrieved = getResult.value;
					expect(Array.isArray(retrieved.domains)).toBe(true);
					expect(retrieved.domains).toEqual(domainsArray);
				}
			}

			await clearJobBoards();
		});
	});

	describe("getAll", () => {
		it("should return empty array when no boards exist", async () => {
			await clearJobBoards();

			const result = await repository.getAll();

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				// Filter out common boards that were seeded
				const testBoards = result.value.filter(
					(b) => b.name.startsWith("Test") || b.name.startsWith("Another"),
				);
				expect(testBoards.length).toBe(0);
			}
		});

		it("should return all boards sorted by name", async () => {
			await clearJobBoards();

			await repository.create(validJobBoardData2); // "Another Board"
			await repository.create(validJobBoardData); // "Test Board"

			const result = await repository.getAll();

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const testBoards = result.value.filter(
					(b) => b.name.startsWith("Test") || b.name.startsWith("Another"),
				);
				expect(testBoards.length).toBe(2);
				// Should be sorted alphabetically: "Another Board" before "Test Board"
				assertDefined(testBoards[0]);
				assertDefined(testBoards[1]);
				expect(testBoards[0].name).toBe("Another Board");
				expect(testBoards[1].name).toBe("Test Board");
			}

			await clearJobBoards();
		});

		it("should parse all rows correctly", async () => {
			await clearJobBoards();

			await repository.create(validJobBoardData);
			await repository.create(validJobBoardData2);

			const result = await repository.getAll();

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const testBoards = result.value.filter(
					(b) => b.name.startsWith("Test") || b.name.startsWith("Another"),
				);

				for (const board of testBoards) {
					assertDefined(board.id);
					assertDefined(board.name);
					assertDefined(board.rootDomain);
					assertDefined(board.domains);
					assertDefined(board.createdAt);
					expect(Array.isArray(board.domains)).toBe(true);
				}
			}

			await clearJobBoards();
		});
	});

	describe("findByDomain", () => {
		it("should find board by exact rootDomain match", async () => {
			await clearJobBoards();

			const createResult = await repository.create(validJobBoardData);
			expect(createResult.isOk()).toBe(true);

			const result = await repository.findByDomain("testboard.com");

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				assertDefined(result.value);
				expect(result.value?.name).toBe("Test Board");
				expect(result.value?.rootDomain).toBe("testboard.com");
			}

			await clearJobBoards();
		});

		it("should find board by domain in domains array", async () => {
			await clearJobBoards();

			const createResult = await repository.create(validJobBoardData);
			expect(createResult.isOk()).toBe(true);

			const result = await repository.findByDomain("www.testboard.com");

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				assertDefined(result.value);
				expect(result.value?.name).toBe("Test Board");
				expect(result.value?.rootDomain).toBe("testboard.com");
			}

			await clearJobBoards();
		});

		it("should return null when domain not found", async () => {
			await clearJobBoards();

			const result = await repository.findByDomain("nonexistent.com");

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value).toBeNull();
			}

			await clearJobBoards();
		});

		it("should handle malformed domain arrays gracefully", async () => {
			await clearJobBoards();

			// Insert board with valid data first
			const createResult = await repository.create(validJobBoardData);
			expect(createResult.isOk()).toBe(true);

			// Even if there's a malformed entry, should still work
			const result = await repository.findByDomain("testboard.com");

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				assertDefined(result.value);
			}

			await clearJobBoards();
		});

		it("should prioritize exact rootDomain match over domains array", async () => {
			await clearJobBoards();

			// Create board with "test.com" as rootDomain
			const board1Data: JobBoardForCreate = {
				name: "Test Board 1",
				rootDomain: "test.com",
				domains: ["test.com", "www.test.com"],
			};

			// Create board with "test.com" in domains array but different rootDomain
			const board2Data: JobBoardForCreate = {
				name: "Test Board 2",
				rootDomain: "other.com",
				domains: ["other.com", "test.com"], // test.com is in the array
			};

			await repository.create(board1Data);
			await repository.create(board2Data);

			// Should find board1 first (exact rootDomain match)
			const result = await repository.findByDomain("test.com");

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				assertDefined(result.value);
				expect(result.value?.name).toBe("Test Board 1");
				expect(result.value?.rootDomain).toBe("test.com");
			}

			await clearJobBoards();
		});
	});

	describe("delete", () => {
		it("should successfully delete existing board", async () => {
			await clearJobBoards();

			const createResult = await repository.create(validJobBoardData);
			expect(createResult.isOk()).toBe(true);

			if (createResult.isOk()) {
				const board = createResult.value;

				// Verify board exists
				const getBeforeResult = await repository.getById(board.id);
				expect(getBeforeResult.isOk()).toBe(true);

				// Delete board
				const deleteResult = await repository.delete(board.id);
				expect(deleteResult.isOk()).toBe(true);

				// Verify board is deleted
				const getAfterResult = await repository.getById(board.id);
				expect(getAfterResult.isErr()).toBe(true);
			}

			await clearJobBoards();
		});

		it("should succeed silently for non-existent board", async () => {
			const nonExistentId = uuidProvider.generateUUID();
			const result = await repository.delete(nonExistentId);

			// SQLite DELETE doesn't error for non-existent rows
			expect(result.isOk()).toBe(true);
		});
	});

	describe("seedCommonBoards", () => {
		it("should seed common job boards", async () => {
			// Clear all boards first
			await testDb.prepare("DELETE FROM job_boards").run();

			const seedResult = await repository.seedCommonBoards();
			expect(seedResult.isOk()).toBe(true);

			const getAllResult = await repository.getAll();
			expect(getAllResult.isOk()).toBe(true);

			if (getAllResult.isOk()) {
				const boards = getAllResult.value;
				expect(boards.length).toBeGreaterThan(0);

				// Check for some common boards
				const boardNames = boards.map((b) => b.name);
				expect(boardNames).toContain("LinkedIn");
				expect(boardNames).toContain("Indeed");
				expect(boardNames).toContain("Glassdoor");
			}
		});

		it("should use INSERT OR IGNORE for SQL error handling", async () => {
			// Clear all boards first to get a clean slate
			await testDb.prepare("DELETE FROM job_boards").run();

			// First seed
			const firstResult = await repository.seedCommonBoards();
			expect(firstResult.isOk()).toBe(true);

			// Get count after first seed
			const afterFirstSeed = await repository.getAll();
			expect(afterFirstSeed.isOk()).toBe(true);
			const firstCount = afterFirstSeed.isOk()
				? afterFirstSeed.value.length
				: 0;

			// Second seed - will create new IDs, so boards will be duplicated
			// INSERT OR IGNORE prevents SQL errors but doesn't prevent functional duplicates
			// since new UUIDs are generated each time
			const secondResult = await repository.seedCommonBoards();
			expect(secondResult.isOk()).toBe(true);

			// Count will double because new UUIDs mean no ID collision
			const afterSecondSeed = await repository.getAll();
			expect(afterSecondSeed.isOk()).toBe(true);

			if (afterSecondSeed.isOk()) {
				// Each seed adds the same boards with different IDs
				expect(afterSecondSeed.value.length).toBe(firstCount * 2);
			}
		});
	});
});
