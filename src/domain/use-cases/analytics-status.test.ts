import { describe, expect, it } from "bun:test";

import { assertDefined } from "#helpers/assertDefined.ts";

import { createMockApplicationWithStatus } from "../../../tests/helpers/analytics-fixtures.ts";
import { computeAnalytics } from "./analytics.ts";

describe("Analytics Use Cases - Status Distribution", () => {
	it("should group applications by status label", () => {
		const applications = [
			createMockApplicationWithStatus(
				"2024-01-15T10:00:00.000Z",
				{ category: "active", label: "applied" },
				1,
			),
			createMockApplicationWithStatus(
				"2024-02-20T10:00:00.000Z",
				{ category: "active", label: "applied" },
				2,
			),
			createMockApplicationWithStatus(
				"2024-03-10T10:00:00.000Z",
				{ category: "active", label: "interview" },
				3,
			),
			createMockApplicationWithStatus(
				"2024-04-05T10:00:00.000Z",
				{ category: "inactive", label: "rejected" },
				4,
			),
		];

		const result = computeAnalytics(applications);

		expect(result.statusDistribution.length).toBe(3);

		const applied = result.statusDistribution.find(
			(d) => d.label === "applied",
		);
		assertDefined(applied);
		expect(applied.count).toBe(2);
		expect(applied.category).toBe("active");

		const interview = result.statusDistribution.find(
			(d) => d.label === "interview",
		);
		assertDefined(interview);
		expect(interview.count).toBe(1);
		expect(interview.category).toBe("active");

		const rejected = result.statusDistribution.find(
			(d) => d.label === "rejected",
		);
		assertDefined(rejected);
		expect(rejected.count).toBe(1);
		expect(rejected.category).toBe("inactive");
	});

	it("should return empty array for empty applications", () => {
		const result = computeAnalytics([]);

		expect(result.statusDistribution).toEqual([]);
	});
});
