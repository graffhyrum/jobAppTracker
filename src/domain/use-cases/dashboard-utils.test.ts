import { describe, expect, test } from "bun:test";

import {
	createMockApplication,
	createMockApplicationWithStatus,
} from "../../../tests/helpers/analytics-fixtures.ts";
import type { JobApplication } from "../entities/job-application.ts";
import {
	type DashboardStats,
	type OverdueItem,
	computeDashboardStats,
	getOverdueApplications,
	getRecentActivity,
} from "./dashboard-utils.ts";

describe("computeDashboardStats", () => {
	test("returns zeroed stats for empty array", () => {
		const result = computeDashboardStats([], new Date("2026-03-27"));
		expect(result).toEqual({
			totalApplications: 0,
			activeApplications: 0,
			upcomingInSevenDays: 0,
		} satisfies DashboardStats);
	});

	test("counts total applications", () => {
		const apps = [
			createMockApplication("2026-01-01", 1),
			createMockApplication("2026-01-02", 2),
			createMockApplication("2026-01-03", 3),
		];
		const result = computeDashboardStats(apps, new Date("2026-03-27"));
		expect(result.totalApplications).toBe(3);
	});

	test("counts active applications", () => {
		const activeApp = createMockApplicationWithStatus(
			"2026-01-01",
			{
				category: "active",
				label: "interview",
			},
			1,
		);
		const inactiveApp = createMockApplicationWithStatus(
			"2026-01-02",
			{
				category: "inactive",
				label: "rejected",
			},
			2,
		);
		const result = computeDashboardStats(
			[activeApp, inactiveApp],
			new Date("2026-03-27"),
		);
		expect(result.activeApplications).toBe(1);
	});

	test("counts applications with nextEventDate within 7 days", () => {
		const now = new Date("2026-03-27T00:00:00.000Z");
		const app1 = createMockApplication("2026-01-01", 1);
		// Within 7 days
		const appWithin: JobApplication = {
			...app1,
			nextEventDate: "2026-03-30T00:00:00.000Z",
		};
		const app2 = createMockApplication("2026-01-02", 2);
		// Beyond 7 days
		const appBeyond: JobApplication = {
			...app2,
			nextEventDate: "2026-04-10T00:00:00.000Z",
		};
		const app3 = createMockApplication("2026-01-03", 3);
		// Past (overdue, not upcoming)
		const appPast: JobApplication = {
			...app3,
			nextEventDate: "2026-03-20T00:00:00.000Z",
		};
		const app4 = createMockApplication("2026-01-04", 4);
		// No nextEventDate
		const appNone: JobApplication = { ...app4 };

		const result = computeDashboardStats(
			[appWithin, appBeyond, appPast, appNone],
			now,
		);
		expect(result.upcomingInSevenDays).toBe(1);
	});
});

describe("getOverdueApplications", () => {
	test("returns empty array when no applications", () => {
		expect(getOverdueApplications([], new Date("2026-03-27"))).toEqual([]);
	});

	test("returns empty array when no overdue items", () => {
		const app = createMockApplication("2026-01-01", 1);
		const futureApp: JobApplication = {
			...app,
			nextEventDate: "2026-12-01T00:00:00.000Z",
		};
		expect(getOverdueApplications([futureApp], new Date("2026-03-27"))).toEqual(
			[],
		);
	});

	test("returns overdue items sorted by nextEventDate ascending", () => {
		const now = new Date("2026-03-27T00:00:00.000Z");
		const app1 = createMockApplication("2026-01-01", 1);
		const overdue1: JobApplication = {
			...app1,
			company: "Company A",
			nextEventDate: "2026-03-25T00:00:00.000Z",
		};
		const app2 = createMockApplication("2026-01-02", 2);
		const overdue2: JobApplication = {
			...app2,
			company: "Company B",
			nextEventDate: "2026-03-20T00:00:00.000Z",
		};

		const result = getOverdueApplications([overdue1, overdue2], now);
		expect(result).toHaveLength(2);
		// Most overdue first (earliest date)
		expect(result[0]!.company).toBe("Company B");
		expect(result[1]!.company).toBe("Company A");
	});

	test("maps to OverdueItem shape", () => {
		const now = new Date("2026-03-27T00:00:00.000Z");
		const app = createMockApplication("2026-01-01", 1);
		const overdue: JobApplication = {
			...app,
			company: "Acme Corp",
			positionTitle: "Engineer",
			nextEventDate: "2026-03-20T00:00:00.000Z",
		};

		const result = getOverdueApplications([overdue], now);
		expect(result[0]).toEqual({
			id: app.id,
			company: "Acme Corp",
			positionTitle: "Engineer",
			nextEventDate: "2026-03-20T00:00:00.000Z",
		} satisfies OverdueItem);
	});
});

describe("getRecentActivity", () => {
	test("returns empty array for no applications", () => {
		expect(getRecentActivity([])).toEqual([]);
	});

	test("returns empty array for applications with single status entry", () => {
		// Apps created via createMockApplication have one statusLog entry (initial "applied")
		const app = createMockApplication("2026-01-01", 1);
		// Single entry means no transition to show
		expect(getRecentActivity([app])).toEqual([]);
	});

	test("returns activity entries for status transitions", () => {
		const app = createMockApplicationWithStatus(
			"2026-01-01",
			{
				category: "active",
				label: "interview",
			},
			1,
		);
		// This app has 2 statusLog entries: [applied, interview]
		const result = getRecentActivity([app]);
		expect(result).toHaveLength(1);
		expect(result[0]!.company).toBe("Test Company");
		expect(result[0]!.oldStatusLabel).toBe("applied");
		expect(result[0]!.newStatusLabel).toBe("interview");
	});

	test("limits results to specified count", () => {
		// Create many apps with transitions
		const apps: JobApplication[] = [];
		for (let i = 0; i < 15; i++) {
			apps.push(
				createMockApplicationWithStatus(
					`2026-01-${String(i + 1).padStart(2, "0")}`,
					{
						category: "active",
						label: "interview",
					},
					i + 1,
				),
			);
		}
		const result = getRecentActivity(apps, 5);
		expect(result).toHaveLength(5);
	});

	test("defaults limit to 10", () => {
		const apps: JobApplication[] = [];
		for (let i = 0; i < 15; i++) {
			apps.push(
				createMockApplicationWithStatus(
					`2026-01-${String(i + 1).padStart(2, "0")}`,
					{
						category: "active",
						label: "interview",
					},
					i + 1,
				),
			);
		}
		const result = getRecentActivity(apps);
		expect(result).toHaveLength(10);
	});

	test("sorts by timestamp descending (most recent first)", () => {
		const app1 = createMockApplicationWithStatus(
			"2026-01-01",
			{
				category: "active",
				label: "screening interview",
			},
			1,
		);
		const app2 = createMockApplicationWithStatus(
			"2026-03-01",
			{
				category: "active",
				label: "interview",
			},
			2,
		);

		const result = getRecentActivity([app1, app2]);
		// app2's transition timestamp should be more recent
		expect(new Date(result[0]!.timestamp).getTime()).toBeGreaterThanOrEqual(
			new Date(result[1]!.timestamp).getTime(),
		);
	});
});
