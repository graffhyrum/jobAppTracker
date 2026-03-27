import { describe, expect, it } from "bun:test";

import { assertDefined } from "#helpers/assertDefined.ts";

import { createMockApplicationWithStatus } from "../../../tests/helpers/analytics-fixtures.ts";
import { computeAnalytics } from "./analytics.ts";

describe("Analytics Use Cases - Summary Computation", () => {
	describe("computeAnalytics", () => {
		it("should compute all analytics data from applications", () => {
			const applications = [
				createMockApplicationWithStatus(
					"2024-01-15T10:00:00.000Z",
					{ category: "active", label: "applied" },
					1,
				),
				createMockApplicationWithStatus(
					"2024-02-20T10:00:00.000Z",
					{ category: "inactive", label: "rejected" },
					2,
				),
			];

			const result = computeAnalytics(applications);

			expect(result).toHaveProperty("summary");
			expect(result).toHaveProperty("statusDistribution");
			expect(result).toHaveProperty("applicationsByDate");
			expect(result).toHaveProperty("sourceEffectiveness");
			expect(result).toHaveProperty("timeInStatus");
			expect(result).toHaveProperty("interestRatingStats");
			expect(result).toHaveProperty("responseRate");
		});

		it("should handle empty applications array", () => {
			const result = computeAnalytics([]);

			expect(result.summary.totalApplications).toBe(0);
			expect(result.statusDistribution).toEqual([]);
			expect(result.applicationsByDate).toEqual([]);
			expect(result.sourceEffectiveness).toEqual([]);
			expect(result.timeInStatus).toEqual([]);
			expect(result.interestRatingStats).toEqual([]);
			expect(result.responseRate.totalApplications).toBe(0);
		});
	});

	describe("summary - activeApplications", () => {
		it("should count active applications", () => {
			const applications = [
				createMockApplicationWithStatus(
					"2024-01-15T10:00:00.000Z",
					{ category: "active", label: "applied" },
					1,
				),
				createMockApplicationWithStatus(
					"2024-02-20T10:00:00.000Z",
					{ category: "active", label: "interview" },
					2,
				),
				createMockApplicationWithStatus(
					"2024-03-10T10:00:00.000Z",
					{ category: "active", label: "offer" },
					3,
				),
			];

			const result = computeAnalytics(applications);

			assertDefined(result.summary.activeApplications);
			expect(result.summary.activeApplications).toBe(3);
		});

		it("should handle empty applications", () => {
			const result = computeAnalytics([]);

			assertDefined(result.summary.activeApplications);
			expect(result.summary.activeApplications).toBe(0);
		});
	});

	describe("summary - inactiveApplications", () => {
		it("should count inactive applications", () => {
			const applications = [
				createMockApplicationWithStatus(
					"2024-01-15T10:00:00.000Z",
					{ category: "inactive", label: "rejected" },
					1,
				),
				createMockApplicationWithStatus(
					"2024-04-05T10:00:00.000Z",
					{ category: "inactive", label: "no response" },
					2,
				),
			];

			const result = computeAnalytics(applications);

			assertDefined(result.summary.inactiveApplications);
			expect(result.summary.inactiveApplications).toBe(2);
		});

		it("should handle empty applications", () => {
			const result = computeAnalytics([]);

			assertDefined(result.summary.inactiveApplications);
			expect(result.summary.inactiveApplications).toBe(0);
		});
	});

	describe("summary - offersReceived", () => {
		it("should count offer applications", () => {
			const applications = [
				createMockApplicationWithStatus(
					"2024-01-15T10:00:00.000Z",
					{ category: "active", label: "offer" },
					1,
				),
			];

			const result = computeAnalytics(applications);

			assertDefined(result.summary.offersReceived);
			expect(result.summary.offersReceived).toBe(1);
		});

		it("should handle empty applications", () => {
			const result = computeAnalytics([]);

			assertDefined(result.summary.offersReceived);
			expect(result.summary.offersReceived).toBe(0);
		});
	});

	describe("summary - rejections", () => {
		it("should count rejected applications", () => {
			const applications = [
				createMockApplicationWithStatus(
					"2024-01-15T10:00:00.000Z",
					{ category: "inactive", label: "rejected" },
					1,
				),
			];

			const result = computeAnalytics(applications);

			assertDefined(result.summary.rejections);
			expect(result.summary.rejections).toBe(1);
		});

		it("should handle empty applications", () => {
			const result = computeAnalytics([]);

			assertDefined(result.summary.rejections);
			expect(result.summary.rejections).toBe(0);
		});
	});

	describe("summary - averageInterestRating", () => {
		it("should compute average interest rating", () => {
			const applications = [
				createMockApplicationWithStatus(
					"2024-01-15T10:00:00.000Z",
					{ category: "active", label: "applied" },
					1,
				),
				createMockApplicationWithStatus(
					"2024-02-20T10:00:00.000Z",
					{ category: "active", label: "interview" },
					2,
				),
				createMockApplicationWithStatus(
					"2024-03-10T10:00:00.000Z",
					{ category: "active", label: "offer" },
					3,
				),
			];

			applications[0]!.interestRating = 2;
			applications[1]!.interestRating = 3;
			applications[2]!.interestRating = 4;

			const result = computeAnalytics(applications);

			expect(result.summary.averageInterestRating).toBe(3);
		});

		it("should return 0 average when no ratings", () => {
			const applications = [
				createMockApplicationWithStatus(
					"2024-01-15T10:00:00.000Z",
					{ category: "active", label: "applied" },
					1,
				),
			];

			applications[0]!.interestRating = undefined;

			const result = computeAnalytics(applications);

			expect(result.summary.averageInterestRating).toBe(0);
		});

		it("should handle empty applications", () => {
			const result = computeAnalytics([]);

			assertDefined(result.summary.averageInterestRating);
			expect(result.summary.averageInterestRating).toBe(0);
		});
	});

	it("should handle empty applications", () => {
		const result = computeAnalytics([]);

		expect(result.summary.totalApplications).toBe(0);
	});

	it("should handle empty applications", () => {
		const result = computeAnalytics([]);

		expect(result.summary.totalApplications).toBe(0);
	});
});
