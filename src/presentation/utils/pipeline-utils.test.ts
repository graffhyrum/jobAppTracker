import { describe, expect, it } from "bun:test";
import { assertDefined } from "#helpers/assertDefined.ts";
import type { JobApplication } from "../../domain/entities/job-application";
import {
	formatInterestRating,
	getStatusInfo,
	isApplicationOverdue,
	processApplicationData,
} from "./pipeline-utils";

describe("Pipeline Utils", () => {
	describe("formatInterestRating", () => {
		it("should return empty string for no rating", () => {
			expect(formatInterestRating()).toBe("");
			expect(formatInterestRating(0)).toBe("");
		});

		it("should format rating 1 correctly", () => {
			const result = formatInterestRating(1);
			expect(result).toBe("★☆☆");
		});

		it("should format rating 2 correctly", () => {
			const result = formatInterestRating(2);
			expect(result).toBe("★★☆");
		});

		it("should format rating 3 correctly", () => {
			const result = formatInterestRating(3);
			expect(result).toBe("★★★");
		});
	});

	describe("getStatusInfo", () => {
		it("should return status info for application with valid status", () => {
			const app: JobApplication = {
				id: "test-id",
				company: "Test Company",
				positionTitle: "Test Position",
				applicationDate: "2024-01-01",
				updatedAt: "2024-01-01",
				createdAt: "2024-01-01",
				notes: [],
				statusLog: [["2024-01-01", { category: "active", label: "applied" }]],
			} as JobApplication;

			const result = getStatusInfo(app);
			expect(result.category).toBe("active");
			expect(result.label).toBe("applied");
		});
	});

	describe("isApplicationOverdue", () => {
		it("should return false for application without next event date", () => {
			const app: JobApplication = {
				id: "test-id",
				company: "Test Company",
				positionTitle: "Test Position",
				applicationDate: "2024-01-01",
				updatedAt: "2024-01-01",
				createdAt: "2024-01-01",
				notes: [],
				statusLog: [["2024-01-01", { category: "active", label: "applied" }]],
			} as JobApplication;

			const result = isApplicationOverdue(app);
			expect(result).toBe(false);
		});

		it("should return true for past next event date", () => {
			const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
			const app: JobApplication = {
				id: "test-id",
				company: "Test Company",
				positionTitle: "Test Position",
				applicationDate: "2024-01-01",
				updatedAt: "2024-01-01",
				createdAt: "2024-01-01",
				notes: [],
				nextEventDate: pastDate.toISOString(),
				statusLog: [["2024-01-01", { category: "active", label: "applied" }]],
			} as JobApplication;

			const result = isApplicationOverdue(app);
			expect(result).toBe(true);
		});

		it("should return false for future next event date", () => {
			const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now
			const app: JobApplication = {
				id: "test-id",
				company: "Test Company",
				positionTitle: "Test Position",
				applicationDate: "2024-01-01",
				updatedAt: "2024-01-01",
				createdAt: "2024-01-01",
				notes: [],
				nextEventDate: futureDate.toISOString(),
				statusLog: [["2024-01-01", { category: "active", label: "applied" }]],
			} as JobApplication;

			const result = isApplicationOverdue(app);
			expect(result).toBe(false);
		});
	});

	describe("processApplicationData", () => {
		it("should process empty applications array", () => {
			const result = processApplicationData([]);

			expect(result.processedApps).toHaveLength(0);
			expect(result.stats).toEqual({
				active: 0,
				inactive: 0,
				total: 0,
			});
		});

		it("should process single application correctly", () => {
			const app: JobApplication = {
				id: "test-id",
				company: "Test Company",
				positionTitle: "Test Position",
				applicationDate: "2024-01-01",
				updatedAt: "2024-01-01",
				createdAt: "2024-01-01",
				notes: [],
				interestRating: 3,
				statusLog: [["2024-01-01", { category: "active", label: "applied" }]],
			} as JobApplication;

			const result = processApplicationData([app]);

			expect(result.processedApps).toHaveLength(1);
			expect(result.processedApps[0]).toEqual({
				id: "test-id",
				company: "Test Company",
				positionTitle: "Test Position",
				applicationDate: "2024-01-01",
				updatedAt: "2024-01-01",
				interestRating: 3,
				nextEventDate: null,
				status: "applied",
				statusCategory: "active",
				isOverdue: false,
			});

			expect(result.stats).toEqual({
				active: 1,
				inactive: 0,
				total: 1,
			});
		});

		it("should handle mixed active/inactive applications", () => {
			const activeApp: JobApplication = {
				id: "active-id",
				company: "Active Company",
				positionTitle: "Active Position",
				applicationDate: "2024-01-01",
				updatedAt: "2024-01-01",
				createdAt: "2024-01-01",
				notes: [],
				statusLog: [["2024-01-01", { category: "active", label: "interview" }]],
			} as JobApplication;

			const inactiveApp: JobApplication = {
				id: "inactive-id",
				company: "Inactive Company",
				positionTitle: "Inactive Position",
				applicationDate: "2024-01-01",
				updatedAt: "2024-01-01",
				createdAt: "2024-01-01",
				notes: [],
				statusLog: [
					["2024-01-01", { category: "inactive", label: "rejected" }],
				],
			} as JobApplication;

			const result = processApplicationData([activeApp, inactiveApp]);

			expect(result.processedApps).toHaveLength(2);
			expect(result.stats).toEqual({
				active: 1,
				inactive: 1,
				total: 2,
			});
		});

		it("should handle applications with overdue next event dates", () => {
			const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
			const app: JobApplication = {
				id: "overdue-id",
				company: "Overdue Company",
				positionTitle: "Overdue Position",
				applicationDate: "2024-01-01",
				updatedAt: "2024-01-01",
				createdAt: "2024-01-01",
				notes: [],
				nextEventDate: pastDate.toISOString(),
				statusLog: [["2024-01-01", { category: "active", label: "applied" }]],
			};

			const result = processApplicationData([app]);

			const processedApp = result.processedApps[0];
			assertDefined(processedApp);
			expect(processedApp.isOverdue).toBe(true);
			expect(processedApp.nextEventDate).toBe(pastDate.toISOString());
		});

		it("should handle missing interest rating", () => {
			const app: JobApplication = {
				id: "no-interest-id",
				company: "No Interest Company",
				positionTitle: "No Interest Position",
				applicationDate: "2024-01-01",
				updatedAt: "2024-01-01",
				createdAt: "2024-01-01",
				notes: [],
				statusLog: [["2024-01-01", { category: "active", label: "applied" }]],
			};

			const result = processApplicationData([app]);

			const processedApp = result.processedApps[0];
			assertDefined(processedApp);
			expect(processedApp.interestRating).toBe(0);
		});
	});
});
