import { describe, expect, it } from "bun:test";

import { Effect, Either } from "effect";

import { assertDefined } from "#helpers/assertDefined.ts";
import type { JobBoardForCreate } from "#src/domain/entities/job-board.ts";

import { createInMemoryJobBoardRepository } from "./in-memory-job-board-repository.ts";

/** Run an Effect and return an Either for test assertions. */
async function run<T, E>(
	effect: Effect.Effect<T, E>,
): Promise<Either.Either<T, E>> {
	return Effect.runPromise(Effect.either(effect));
}

describe("InMemoryJobBoardRepository", () => {
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

	// Deterministic UUID generator for testing
	const createMockUuidGenerator = (seed = 0) => {
		let counter = seed;
		return () =>
			`123e4567-e89b-12d3-a456-${String(counter++).padStart(12, "0")}`;
	};

	describe("create", () => {
		it("should create job board with valid data", async () => {
			const repository = createInMemoryJobBoardRepository();

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
		});

		it("should use provided UUID generator", async () => {
			const mockGenerator = createMockUuidGenerator();
			const repository = createInMemoryJobBoardRepository(mockGenerator);

			const result = await run(repository.create(validJobBoardData));

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				expect(result.right.id).toBe(
					"123e4567-e89b-12d3-a456-000000000000",
				);
			}
		});

		it("should return error for invalid job board data", async () => {
			const repository = createInMemoryJobBoardRepository();
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

		it("should persist job board in memory", async () => {
			const repository = createInMemoryJobBoardRepository();

			const createResult = await run(
				repository.create(validJobBoardData),
			);
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
		});
	});

	describe("getById", () => {
		it("should retrieve existing job board", async () => {
			const repository = createInMemoryJobBoardRepository();

			const createResult = await run(
				repository.create(validJobBoardData),
			);
			expect(Either.isRight(createResult)).toBe(true);

			if (Either.isRight(createResult)) {
				const created = createResult.right;
				const getResult = await run(repository.getById(created.id));

				expect(Either.isRight(getResult)).toBe(true);
				if (Either.isRight(getResult)) {
					expect(getResult.right.id).toBe(created.id);
					expect(getResult.right.name).toBe(validJobBoardData.name);
				}
			}
		});

		it("should return error for non-existent ID", async () => {
			const repository = createInMemoryJobBoardRepository();
			const nonExistentId =
				"123e4567-e89b-12d3-a456-999999999999" as const;

			const result = await run(repository.getById(nonExistentId));

			expect(Either.isLeft(result)).toBe(true);
			if (Either.isLeft(result)) {
				expect(result.left.detail).toContain("not found");
			}
		});
	});

	describe("getAll", () => {
		it("should return empty array when no boards exist", async () => {
			const repository = createInMemoryJobBoardRepository();

			const result = await run(repository.getAll());

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				expect(result.right).toEqual([]);
			}
		});

		it("should return all job boards", async () => {
			const repository = createInMemoryJobBoardRepository();

			await run(repository.create(validJobBoardData));
			await run(repository.create(validJobBoardData2));

			const result = await run(repository.getAll());

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				expect(result.right.length).toBe(2);
			}
		});

		it("should return boards sorted by name", async () => {
			const repository = createInMemoryJobBoardRepository();

			// Create boards in reverse alphabetical order
			await run(
				repository.create({
					name: "Zebra Board",
					rootDomain: "zebra.com",
					domains: ["zebra.com"],
				}),
			);
			await run(
				repository.create({
					name: "Alpha Board",
					rootDomain: "alpha.com",
					domains: ["alpha.com"],
				}),
			);
			await run(
				repository.create({
					name: "Middle Board",
					rootDomain: "middle.com",
					domains: ["middle.com"],
				}),
			);

			const result = await run(repository.getAll());

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				const boards = result.right;
				const firstBoard = boards[0];
				const secondBoard = boards[1];
				const thirdBoard = boards[2];
				assertDefined(firstBoard);
				assertDefined(secondBoard);
				assertDefined(thirdBoard);
				expect(firstBoard.name).toBe("Alpha Board");
				expect(secondBoard.name).toBe("Middle Board");
				expect(thirdBoard.name).toBe("Zebra Board");
			}
		});
	});

	describe("findByDomain", () => {
		it("should find board by rootDomain", async () => {
			const repository = createInMemoryJobBoardRepository();

			await run(repository.create(validJobBoardData));

			const result = await run(
				repository.findByDomain("testboard.com"),
			);

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				assertDefined(result.right);
				expect(result.right.name).toBe(validJobBoardData.name);
			}
		});

		it("should find board by domain in domains array", async () => {
			const repository = createInMemoryJobBoardRepository();

			await run(repository.create(validJobBoardData));

			const result = await run(
				repository.findByDomain("www.testboard.com"),
			);

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				assertDefined(result.right);
				expect(result.right.name).toBe(validJobBoardData.name);
			}
		});

		it("should prioritize rootDomain over domains array", async () => {
			const repository = createInMemoryJobBoardRepository();

			// Create board with rootDomain matching another board's domains array
			await run(
				repository.create({
					name: "Root Domain Board",
					rootDomain: "priority.com",
					domains: ["priority.com"],
				}),
			);
			await run(
				repository.create({
					name: "Domains Array Board",
					rootDomain: "other.com",
					domains: ["other.com", "priority.com"],
				}),
			);

			const result = await run(
				repository.findByDomain("priority.com"),
			);

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				assertDefined(result.right);
				expect(result.right.name).toBe("Root Domain Board");
			}
		});

		it("should return null for non-existent domain", async () => {
			const repository = createInMemoryJobBoardRepository();

			await run(repository.create(validJobBoardData));

			const result = await run(
				repository.findByDomain("nonexistent.com"),
			);

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				expect(result.right).toBeNull();
			}
		});
	});

	describe("delete", () => {
		it("should delete existing job board", async () => {
			const repository = createInMemoryJobBoardRepository();

			const createResult = await run(
				repository.create(validJobBoardData),
			);
			expect(Either.isRight(createResult)).toBe(true);

			if (Either.isRight(createResult)) {
				const board = createResult.right;
				const deleteResult = await run(repository.delete(board.id));

				expect(Either.isRight(deleteResult)).toBe(true);

				// Verify it's actually deleted
				const getResult = await run(repository.getById(board.id));
				expect(Either.isLeft(getResult)).toBe(true);
			}
		});

		it("should not error when deleting non-existent ID", async () => {
			const repository = createInMemoryJobBoardRepository();
			const nonExistentId =
				"123e4567-e89b-12d3-a456-999999999999" as const;

			const result = await run(repository.delete(nonExistentId));

			// Map.delete returns void regardless of whether key existed
			expect(Either.isRight(result)).toBe(true);
		});
	});

	describe("seedCommonBoards", () => {
		it("should return success", async () => {
			const repository = createInMemoryJobBoardRepository();

			const result = await run(repository.seedCommonBoards());

			expect(Either.isRight(result)).toBe(true);
		});
	});

	describe("isolation", () => {
		it("should maintain separate state between instances", async () => {
			const repository1 = createInMemoryJobBoardRepository();
			const repository2 = createInMemoryJobBoardRepository();

			await run(repository1.create(validJobBoardData));

			const result1 = await run(repository1.getAll());
			const result2 = await run(repository2.getAll());

			expect(Either.isRight(result1)).toBe(true);
			expect(Either.isRight(result2)).toBe(true);

			if (Either.isRight(result1) && Either.isRight(result2)) {
				expect(result1.right.length).toBe(1);
				expect(result2.right.length).toBe(0);
			}
		});
	});
});
