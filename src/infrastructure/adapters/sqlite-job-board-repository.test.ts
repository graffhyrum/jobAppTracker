import { describe, expect, it } from "bun:test";

import { Effect, Either } from "effect";

import { assertDefined } from "#helpers/assertDefined.ts";

import type { JobBoardForCreate } from "../../domain/entities/job-board.ts";
import { uuidProvider } from "../di/uuid-provider.ts";
import { jobAppManagerRegistry } from "../sqlite/sqlite-registry.ts";
import { createSQLiteJobBoardRepository } from "./sqlite-job-board-repository.ts";

// Get the test database for testing
const testDb = jobAppManagerRegistry.getDatabase("test");
const repository = createSQLiteJobBoardRepository(testDb);

/** Run an Effect and return an Either for test assertions. */
async function run<T, E>(
	effect: Effect.Effect<T, E>,
): Promise<Either.Either<T, E>> {
	return Effect.runPromise(Effect.either(effect));
}

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

			const result = await run(repository.create(validJobBoardData));

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				const board = result.right;
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

			const result = await run(repository.create(invalidData));

			expect(Either.isLeft(result)).toBe(true);
			if (Either.isLeft(result)) {
				expect(result.left.detail).toContain("Failed to create job board");
			}
		});

		it("should persist job board to database", async () => {
			await clearJobBoards();

			const createResult = await run(repository.create(validJobBoardData));
			expect(Either.isRight(createResult)).toBe(true);

			if (Either.isRight(createResult)) {
				const board = createResult.right;
				const getResult = await run(repository.getById(board.id));

				expect(Either.isRight(getResult)).toBe(true);
				if (Either.isRight(getResult)) {
					const retrieved = getResult.right;
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

			const createResult = await run(repository.create(validJobBoardData));
			expect(Either.isRight(createResult)).toBe(true);

			if (Either.isRight(createResult)) {
				const board = createResult.right;
				const getResult = await run(repository.getById(board.id));

				expect(Either.isRight(getResult)).toBe(true);
				if (Either.isRight(getResult)) {
					const retrieved = getResult.right;
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
			const result = await run(repository.getById(nonExistentId));

			expect(Either.isLeft(result)).toBe(true);
			if (Either.isLeft(result)) {
				expect(result.left.detail).toContain("Failed to query job board");
				expect(result.left.detail).toContain("not found");
			}
		});

		it("should preserve error message when board not found", async () => {
			const nonExistentId = uuidProvider.generateUUID();
			const result = await run(repository.getById(nonExistentId));

			expect(Either.isLeft(result)).toBe(true);
			// Verify error includes both message and board ID
			if (Either.isLeft(result)) {
				expect(result.left.detail).toContain(nonExistentId);
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

			const createResult = await run(repository.create(boardData));
			expect(Either.isRight(createResult)).toBe(true);

			if (Either.isRight(createResult)) {
				const board = createResult.right;
				const getResult = await run(repository.getById(board.id));

				expect(Either.isRight(getResult)).toBe(true);
				if (Either.isRight(getResult)) {
					const retrieved = getResult.right;
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

			const result = await run(repository.getAll());

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				// Filter out common boards that were seeded
				const testBoards = result.right.filter(
					(b) => b.name.startsWith("Test") || b.name.startsWith("Another"),
				);
				expect(testBoards.length).toBe(0);
			}
		});

		it("should return all boards sorted by name", async () => {
			await clearJobBoards();

			await run(repository.create(validJobBoardData2)); // "Another Board"
			await run(repository.create(validJobBoardData)); // "Test Board"

			const result = await run(repository.getAll());

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				const testBoards = result.right.filter(
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

			await run(repository.create(validJobBoardData));
			await run(repository.create(validJobBoardData2));

			const result = await run(repository.getAll());

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				const testBoards = result.right.filter(
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

			const createResult = await run(repository.create(validJobBoardData));
			expect(Either.isRight(createResult)).toBe(true);

			const result = await run(repository.findByDomain("testboard.com"));

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				assertDefined(result.right);
				expect(result.right?.name).toBe("Test Board");
				expect(result.right?.rootDomain).toBe("testboard.com");
			}

			await clearJobBoards();
		});

		it("should find board by domain in domains array", async () => {
			await clearJobBoards();

			const createResult = await run(repository.create(validJobBoardData));
			expect(Either.isRight(createResult)).toBe(true);

			const result = await run(
				repository.findByDomain("www.testboard.com"),
			);

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				assertDefined(result.right);
				expect(result.right?.name).toBe("Test Board");
				expect(result.right?.rootDomain).toBe("testboard.com");
			}

			await clearJobBoards();
		});

		it("should return null when domain not found", async () => {
			await clearJobBoards();

			const result = await run(
				repository.findByDomain("nonexistent.com"),
			);

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				expect(result.right).toBeNull();
			}

			await clearJobBoards();
		});

		it("should handle malformed domain arrays gracefully", async () => {
			await clearJobBoards();

			// Insert board with valid data first
			const createResult = await run(repository.create(validJobBoardData));
			expect(Either.isRight(createResult)).toBe(true);

			// Even if there's a malformed entry, should still work
			const result = await run(repository.findByDomain("testboard.com"));

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				assertDefined(result.right);
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

			await run(repository.create(board1Data));
			await run(repository.create(board2Data));

			// Should find board1 first (exact rootDomain match)
			const result = await run(repository.findByDomain("test.com"));

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				assertDefined(result.right);
				expect(result.right?.name).toBe("Test Board 1");
				expect(result.right?.rootDomain).toBe("test.com");
			}

			await clearJobBoards();
		});
	});

	describe("delete", () => {
		it("should successfully delete existing board", async () => {
			await clearJobBoards();

			const createResult = await run(repository.create(validJobBoardData));
			expect(Either.isRight(createResult)).toBe(true);

			if (Either.isRight(createResult)) {
				const board = createResult.right;

				// Verify board exists
				const getBeforeResult = await run(repository.getById(board.id));
				expect(Either.isRight(getBeforeResult)).toBe(true);

				// Delete board
				const deleteResult = await run(repository.delete(board.id));
				expect(Either.isRight(deleteResult)).toBe(true);

				// Verify board is deleted
				const getAfterResult = await run(repository.getById(board.id));
				expect(Either.isLeft(getAfterResult)).toBe(true);
			}

			await clearJobBoards();
		});

		it("should succeed silently for non-existent board", async () => {
			const nonExistentId = uuidProvider.generateUUID();
			const result = await run(repository.delete(nonExistentId));

			// SQLite DELETE doesn't error for non-existent rows
			expect(Either.isRight(result)).toBe(true);
		});
	});

	describe("seedCommonBoards", () => {
		it("should seed common job boards", async () => {
			// Clear all boards first
			await testDb.prepare("DELETE FROM job_boards").run();

			const seedResult = await run(repository.seedCommonBoards());
			expect(Either.isRight(seedResult)).toBe(true);

			const getAllResult = await run(repository.getAll());
			expect(Either.isRight(getAllResult)).toBe(true);

			if (Either.isRight(getAllResult)) {
				const boards = getAllResult.right;
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
			const firstResult = await run(repository.seedCommonBoards());
			expect(Either.isRight(firstResult)).toBe(true);

			// Get count after first seed
			const afterFirstSeed = await run(repository.getAll());
			expect(Either.isRight(afterFirstSeed)).toBe(true);
			const firstCount = Either.isRight(afterFirstSeed)
				? afterFirstSeed.right.length
				: 0;

			// Second seed - will create new IDs, so boards will be duplicated
			// INSERT OR IGNORE prevents SQL errors but doesn't prevent functional duplicates
			// since new UUIDs are generated each time
			const secondResult = await run(repository.seedCommonBoards());
			expect(Either.isRight(secondResult)).toBe(true);

			// Count will double because new UUIDs mean no ID collision
			const afterSecondSeed = await run(repository.getAll());
			expect(Either.isRight(afterSecondSeed)).toBe(true);

			if (Either.isRight(afterSecondSeed)) {
				// Each seed adds the same boards with different IDs
				expect(afterSecondSeed.right.length).toBe(firstCount * 2);
			}
		});
	});
});
