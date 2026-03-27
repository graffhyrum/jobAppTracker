import { describe, expect, test } from "bun:test";

import { createMockApplication } from "../../../tests/helpers/analytics-fixtures.ts";
import {
	filterByAppIds,
	resolveEffectiveDateRange,
} from "./analytics-utils.ts";

describe("filterByAppIds", () => {
	const apps = [
		createMockApplication("2026-01-01", 1),
		createMockApplication("2026-01-02", 2),
	];
	const [app1, app2] = apps;

	test("filters items to only those matching application IDs", () => {
		const items = [
			{ jobApplicationId: app1!.id, value: 1 },
			{ jobApplicationId: app2!.id, value: 2 },
			{ jobApplicationId: "nonexistent", value: 3 },
		];
		const result = filterByAppIds(items, apps);
		expect(result).toHaveLength(2);
		expect(result.map((r) => r.value)).toEqual([1, 2]);
	});

	test("returns empty array when no items match", () => {
		const items = [{ jobApplicationId: "x1", value: 1 }];
		expect(filterByAppIds(items, apps)).toEqual([]);
	});

	test("returns empty array for empty items", () => {
		expect(filterByAppIds([], apps)).toEqual([]);
	});

	test("returns empty array for empty applications", () => {
		const items = [{ jobApplicationId: app1!.id, value: 1 }];
		expect(filterByAppIds(items, [])).toEqual([]);
	});
});

describe("resolveEffectiveDateRange", () => {
	const apps = [
		createMockApplication("2026-01-15", 1),
		createMockApplication("2026-02-20", 2),
	];

	test("returns provided range when startDate is set", () => {
		const range = { startDate: "2026-01-01" };
		expect(resolveEffectiveDateRange(apps, range)).toEqual(range);
	});

	test("returns provided range when endDate is set", () => {
		const range = { endDate: "2026-12-31" };
		expect(resolveEffectiveDateRange(apps, range)).toEqual(range);
	});

	test("computes default range when no range provided", () => {
		const result = resolveEffectiveDateRange(apps);
		expect(result).toBeDefined();
	});

	test("computes default range when empty range provided", () => {
		const result = resolveEffectiveDateRange(apps, {});
		expect(result).toBeDefined();
	});
});
