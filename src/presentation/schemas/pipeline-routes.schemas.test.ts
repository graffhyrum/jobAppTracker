import { describe, expect, test } from "bun:test";
import { type } from "arktype";
import { pipelineQuerySchema } from "./pipeline-routes.schemas";

describe("pipelineQuerySchema", () => {
	describe("sortColumn validation", () => {
		const validColumns = [
			"company",
			"positionTitle",
			"applicationDate",
			"status",
			"interestRating",
			"nextEventDate",
			"updatedAt",
		];

		test.each(validColumns)("accepts valid sortColumn value: %s", (column) => {
			const result = pipelineQuerySchema({
				sortColumn: column,
				sortDirection: "asc",
			});

			expect(result).not.toBeInstanceOf(type.errors);
		});

		test("rejects invalid sortColumn value", () => {
			const result = pipelineQuerySchema({
				sortColumn: "invalidColumn",
				sortDirection: "asc",
			});

			expect(result).toBeInstanceOf(type.errors);
		});

		test("rejects old column name 'lastUpdated'", () => {
			const result = pipelineQuerySchema({
				sortColumn: "lastUpdated",
				sortDirection: "asc",
			});

			expect(result).toBeInstanceOf(type.errors);
		});

		test("rejects old column name 'position'", () => {
			const result = pipelineQuerySchema({
				sortColumn: "position",
				sortDirection: "asc",
			});

			expect(result).toBeInstanceOf(type.errors);
		});

		test("accepts query without sortColumn (optional)", () => {
			const result = pipelineQuerySchema({
				sortDirection: "asc",
			});

			expect(result).not.toBeInstanceOf(type.errors);
		});
	});

	describe("sortDirection validation", () => {
		test("accepts 'asc' as sortDirection", () => {
			const result = pipelineQuerySchema({
				sortColumn: "company",
				sortDirection: "asc",
			});

			expect(result).not.toBeInstanceOf(type.errors);
		});

		test("accepts 'desc' as sortDirection", () => {
			const result = pipelineQuerySchema({
				sortColumn: "company",
				sortDirection: "desc",
			});

			expect(result).not.toBeInstanceOf(type.errors);
		});

		test("rejects invalid sortDirection value", () => {
			const result = pipelineQuerySchema({
				sortColumn: "company",
				sortDirection: "invalid",
			});

			expect(result).toBeInstanceOf(type.errors);
		});

		test("accepts query without sortDirection (optional)", () => {
			const result = pipelineQuerySchema({
				sortColumn: "company",
			});

			expect(result).not.toBeInstanceOf(type.errors);
		});
	});

	describe("combined validation", () => {
		test("accepts valid query with both parameters", () => {
			const result = pipelineQuerySchema({
				sortColumn: "updatedAt",
				sortDirection: "desc",
			});

			expect(result).not.toBeInstanceOf(type.errors);
		});

		test("accepts empty query (all parameters optional)", () => {
			const result = pipelineQuerySchema({});

			expect(result).not.toBeInstanceOf(type.errors);
		});
	});
});
