import { describe, expect, it } from "bun:test";
import { assertDefined } from "#helpers/assertDefined.ts";
import type { JobBoardForCreate } from "#src/domain/entities/job-board.ts";
import { createInMemoryJobBoardRepository } from "./in-memory-job-board-repository.ts";

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
		});

		it("should use provided UUID generator", async () => {
			const mockGenerator = createMockUuidGenerator();
			const repository = createInMemoryJobBoardRepository(mockGenerator);

			const result = await repository.create(validJobBoardData);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.id).toBe("123e4567-e89b-12d3-a456-000000000000");
			}
		});

		it("should return error for invalid job board data", async () => {
			const repository = createInMemoryJobBoardRepository();
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

		it("should persist job board in memory", async () => {
			const repository = createInMemoryJobBoardRepository();

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
		});
	});

	describe("getById", () => {
		it("should retrieve existing job board", async () => {
			const repository = createInMemoryJobBoardRepository();

			const createResult = await repository.create(validJobBoardData);
			expect(createResult.isOk()).toBe(true);

			if (createResult.isOk()) {
				const created = createResult.value;
				const getResult = await repository.getById(created.id);

				expect(getResult.isOk()).toBe(true);
				if (getResult.isOk()) {
					expect(getResult.value.id).toBe(created.id);
					expect(getResult.value.name).toBe(validJobBoardData.name);
				}
			}
		});

		it("should return error for non-existent ID", async () => {
			const repository = createInMemoryJobBoardRepository();
			const nonExistentId = "123e4567-e89b-12d3-a456-999999999999" as const;

			const result = await repository.getById(nonExistentId);

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toContain("not found");
			}
		});
	});

	describe("getAll", () => {
		it("should return empty array when no boards exist", async () => {
			const repository = createInMemoryJobBoardRepository();

			const result = await repository.getAll();

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value).toEqual([]);
			}
		});

		it("should return all job boards", async () => {
			const repository = createInMemoryJobBoardRepository();

			await repository.create(validJobBoardData);
			await repository.create(validJobBoardData2);

			const result = await repository.getAll();

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.length).toBe(2);
			}
		});

		it("should return boards sorted by name", async () => {
			const repository = createInMemoryJobBoardRepository();

			// Create boards in reverse alphabetical order
			await repository.create({
				name: "Zebra Board",
				rootDomain: "zebra.com",
				domains: ["zebra.com"],
			});
			await repository.create({
				name: "Alpha Board",
				rootDomain: "alpha.com",
				domains: ["alpha.com"],
			});
			await repository.create({
				name: "Middle Board",
				rootDomain: "middle.com",
				domains: ["middle.com"],
			});

			const result = await repository.getAll();

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const boards = result.value;
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

			await repository.create(validJobBoardData);

			const result = await repository.findByDomain("testboard.com");

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				assertDefined(result.value);
				expect(result.value.name).toBe(validJobBoardData.name);
			}
		});

		it("should find board by domain in domains array", async () => {
			const repository = createInMemoryJobBoardRepository();

			await repository.create(validJobBoardData);

			const result = await repository.findByDomain("www.testboard.com");

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				assertDefined(result.value);
				expect(result.value.name).toBe(validJobBoardData.name);
			}
		});

		it("should prioritize rootDomain over domains array", async () => {
			const repository = createInMemoryJobBoardRepository();

			// Create board with rootDomain matching another board's domains array
			await repository.create({
				name: "Root Domain Board",
				rootDomain: "priority.com",
				domains: ["priority.com"],
			});
			await repository.create({
				name: "Domains Array Board",
				rootDomain: "other.com",
				domains: ["other.com", "priority.com"],
			});

			const result = await repository.findByDomain("priority.com");

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				assertDefined(result.value);
				expect(result.value.name).toBe("Root Domain Board");
			}
		});

		it("should return null for non-existent domain", async () => {
			const repository = createInMemoryJobBoardRepository();

			await repository.create(validJobBoardData);

			const result = await repository.findByDomain("nonexistent.com");

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value).toBeNull();
			}
		});
	});

	describe("delete", () => {
		it("should delete existing job board", async () => {
			const repository = createInMemoryJobBoardRepository();

			const createResult = await repository.create(validJobBoardData);
			expect(createResult.isOk()).toBe(true);

			if (createResult.isOk()) {
				const board = createResult.value;
				const deleteResult = await repository.delete(board.id);

				expect(deleteResult.isOk()).toBe(true);

				// Verify it's actually deleted
				const getResult = await repository.getById(board.id);
				expect(getResult.isErr()).toBe(true);
			}
		});

		it("should not error when deleting non-existent ID", async () => {
			const repository = createInMemoryJobBoardRepository();
			const nonExistentId = "123e4567-e89b-12d3-a456-999999999999" as const;

			const result = await repository.delete(nonExistentId);

			// Map.delete returns void regardless of whether key existed
			expect(result.isOk()).toBe(true);
		});
	});

	describe("seedCommonBoards", () => {
		it("should return success", async () => {
			const repository = createInMemoryJobBoardRepository();

			const result = await repository.seedCommonBoards();

			expect(result.isOk()).toBe(true);
		});
	});

	describe("isolation", () => {
		it("should maintain separate state between instances", async () => {
			const repository1 = createInMemoryJobBoardRepository();
			const repository2 = createInMemoryJobBoardRepository();

			await repository1.create(validJobBoardData);

			const result1 = await repository1.getAll();
			const result2 = await repository2.getAll();

			expect(result1.isOk()).toBe(true);
			expect(result2.isOk()).toBe(true);

			if (result1.isOk() && result2.isOk()) {
				expect(result1.value.length).toBe(1);
				expect(result2.value.length).toBe(0);
			}
		});
	});
});
