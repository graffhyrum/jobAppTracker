import { describe, expect, test } from "bun:test";

import {
	createJobApplication,
	createJobApplicationId,
	type JobApplication,
} from "../entities/job-application.ts";
import {
	filterByAppIds,
	resolveEffectiveDateRange,
} from "./analytics-utils.ts";

const mockUuidGenerator = (seed: number) => () =>
	`123e4567-e89b-12d3-a456-42661417${String(seed).padStart(4, "0")}`;

function makeApp(seed: number, date: string): JobApplication {
	return createJobApplication(
		{
			company: "Test Co",
			positionTitle: "Engineer",
			applicationDate: date,
			sourceType: "company_website",
			isRemote: false,
		},
		createJobApplicationId(mockUuidGenerator(seed)),
	);
}

describe("filterByAppIds", () => {
	const apps = [makeApp(1, "2026-01-01"), makeApp(2, "2026-01-02")];
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
	const apps = [makeApp(1, "2026-01-15"), makeApp(2, "2026-02-20")];

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
