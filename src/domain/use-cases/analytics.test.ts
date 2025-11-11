import { describe, expect, it } from "bun:test";
import {
	createJobApplication,
	createJobApplicationId,
	createJobApplicationWithInitialStatus,
	type JobApplication,
} from "../entities/job-application.ts";
import {
	computeDefaultDateRange,
	filterApplicationsByDateRange,
} from "./analytics.ts";

describe("Analytics Use Cases", () => {
	const mockUuidGenerator = (seed: number) => () =>
		`123e4567-e89b-12d3-a456-42661417${String(seed).padStart(4, "0")}`;

	const createMockApplication = (
		applicationDate: string,
		seed = 1000,
	): JobApplication => {
		return createJobApplication(
			{
				company: "Test Company",
				positionTitle: "Software Engineer",
				applicationDate,
				interestRating: 3,
				sourceType: "job_board" as const,
				isRemote: false,
			},
			createJobApplicationId(mockUuidGenerator(seed)),
		);
	};

	describe("filterApplicationsByDateRange", () => {
		it("should return all applications when no date range is specified", () => {
			const applications = [
				createMockApplication("2024-01-15T10:00:00.000Z", 1),
				createMockApplication("2024-06-20T10:00:00.000Z", 2),
				createMockApplication("2024-12-10T10:00:00.000Z", 3),
			];

			const result = filterApplicationsByDateRange(applications, {});

			expect(result).toEqual(applications);
			expect(result.length).toBe(3);
		});

		it("should filter applications by start date only", () => {
			const applications = [
				createMockApplication("2024-01-15T10:00:00.000Z", 1),
				createMockApplication("2024-06-20T10:00:00.000Z", 2),
				createMockApplication("2024-12-10T10:00:00.000Z", 3),
			];

			const result = filterApplicationsByDateRange(applications, {
				startDate: "2024-06-01",
			});

			expect(result.length).toBe(2);
			expect(result[0]?.applicationDate).toBe("2024-06-20T10:00:00.000Z");
			expect(result[1]?.applicationDate).toBe("2024-12-10T10:00:00.000Z");
		});

		it("should filter applications by end date only", () => {
			const applications = [
				createMockApplication("2024-01-15T10:00:00.000Z", 1),
				createMockApplication("2024-06-20T10:00:00.000Z", 2),
				createMockApplication("2024-12-10T10:00:00.000Z", 3),
			];

			const result = filterApplicationsByDateRange(applications, {
				endDate: "2024-06-30",
			});

			expect(result.length).toBe(2);
			expect(result[0]?.applicationDate).toBe("2024-01-15T10:00:00.000Z");
			expect(result[1]?.applicationDate).toBe("2024-06-20T10:00:00.000Z");
		});

		it("should filter applications by both start and end date", () => {
			const applications = [
				createMockApplication("2024-01-15T10:00:00.000Z", 1),
				createMockApplication("2024-06-20T10:00:00.000Z", 2),
				createMockApplication("2024-08-10T10:00:00.000Z", 3),
				createMockApplication("2024-12-10T10:00:00.000Z", 4),
			];

			const result = filterApplicationsByDateRange(applications, {
				startDate: "2024-06-01",
				endDate: "2024-09-30",
			});

			expect(result.length).toBe(2);
			expect(result[0]?.applicationDate).toBe("2024-06-20T10:00:00.000Z");
			expect(result[1]?.applicationDate).toBe("2024-08-10T10:00:00.000Z");
		});

		it("should include applications on the start date boundary", () => {
			const applications = [
				createMockApplication("2024-06-01T10:00:00.000Z", 1),
				createMockApplication("2024-06-02T10:00:00.000Z", 2),
			];

			const result = filterApplicationsByDateRange(applications, {
				startDate: "2024-06-01",
			});

			expect(result.length).toBe(2);
		});

		it("should include applications on the end date boundary", () => {
			const applications = [
				createMockApplication("2024-06-30T10:00:00.000Z", 1),
				createMockApplication("2024-07-01T10:00:00.000Z", 2),
			];

			const result = filterApplicationsByDateRange(applications, {
				endDate: "2024-06-30",
			});

			expect(result.length).toBe(1);
			expect(result[0]?.applicationDate).toBe("2024-06-30T10:00:00.000Z");
		});

		it("should return empty array when no applications match the date range", () => {
			const applications = [
				createMockApplication("2024-01-15T10:00:00.000Z", 1),
				createMockApplication("2024-02-20T10:00:00.000Z", 2),
			];

			const result = filterApplicationsByDateRange(applications, {
				startDate: "2024-06-01",
				endDate: "2024-12-31",
			});

			expect(result.length).toBe(0);
		});

		it("should handle empty applications array", () => {
			const result = filterApplicationsByDateRange([], {
				startDate: "2024-01-01",
				endDate: "2024-12-31",
			});

			expect(result).toEqual([]);
		});
	});

	describe("computeDefaultDateRange", () => {
		const createMockApplicationWithStatus = (
			applicationDate: string,
			status: { category: "active" | "inactive"; label: string },
			seed = 1000,
		): JobApplication => {
			return createJobApplicationWithInitialStatus(
				{
					company: "Test Company",
					positionTitle: "Software Engineer",
					applicationDate,
					interestRating: 3,
					sourceType: "job_board" as const,
					isRemote: false,
				},
				status,
				createJobApplicationId(mockUuidGenerator(seed)),
			);
		};

		it("should return date range from oldest active application to today", () => {
			const applications = [
				createMockApplicationWithStatus(
					"2024-01-15T10:00:00.000Z",
					{ category: "active", label: "applied" },
					1,
				),
				createMockApplicationWithStatus(
					"2024-06-20T10:00:00.000Z",
					{ category: "active", label: "interview" },
					2,
				),
				createMockApplicationWithStatus(
					"2024-08-10T10:00:00.000Z",
					{ category: "active", label: "applied" },
					3,
				),
			];

			const result = computeDefaultDateRange(applications);

			expect(result.startDate).toBe("2024-01-15");
			// endDate should be today
			const today = new Date().toISOString().split("T")[0];
			expect(result.endDate).toBe(today);
		});

		it("should only consider active applications, ignoring inactive ones", () => {
			const applications = [
				createMockApplicationWithStatus(
					"2023-11-15T10:00:00.000Z",
					{ category: "inactive", label: "rejected" },
					1,
				),
				createMockApplicationWithStatus(
					"2024-03-20T10:00:00.000Z",
					{ category: "active", label: "applied" },
					2,
				),
				createMockApplicationWithStatus(
					"2024-01-10T10:00:00.000Z",
					{ category: "inactive", label: "no response" },
					3,
				),
				createMockApplicationWithStatus(
					"2024-07-05T10:00:00.000Z",
					{ category: "active", label: "interview" },
					4,
				),
			];

			const result = computeDefaultDateRange(applications);

			// Should use oldest active application (2024-03-20), not the inactive one from 2023
			expect(result.startDate).toBe("2024-03-20");
			const today = new Date().toISOString().split("T")[0];
			expect(result.endDate).toBe(today);
		});

		it("should return empty range when no active applications exist", () => {
			const applications = [
				createMockApplicationWithStatus(
					"2024-01-15T10:00:00.000Z",
					{ category: "inactive", label: "rejected" },
					1,
				),
				createMockApplicationWithStatus(
					"2024-06-20T10:00:00.000Z",
					{ category: "inactive", label: "no response" },
					2,
				),
			];

			const result = computeDefaultDateRange(applications);

			expect(result).toEqual({});
		});

		it("should return empty range when applications array is empty", () => {
			const result = computeDefaultDateRange([]);

			expect(result).toEqual({});
		});

		it("should handle single active application", () => {
			const applications = [
				createMockApplicationWithStatus(
					"2024-05-15T10:00:00.000Z",
					{ category: "active", label: "applied" },
					1,
				),
			];

			const result = computeDefaultDateRange(applications);

			expect(result.startDate).toBe("2024-05-15");
			const today = new Date().toISOString().split("T")[0];
			expect(result.endDate).toBe(today);
		});

		it("should find oldest among multiple active applications with same dates", () => {
			const applications = [
				createMockApplicationWithStatus(
					"2024-06-15T10:00:00.000Z",
					{ category: "active", label: "applied" },
					1,
				),
				createMockApplicationWithStatus(
					"2024-06-15T14:00:00.000Z",
					{ category: "active", label: "interview" },
					2,
				),
				createMockApplicationWithStatus(
					"2024-06-15T08:00:00.000Z",
					{ category: "active", label: "applied" },
					3,
				),
			];

			const result = computeDefaultDateRange(applications);

			// All applications have same date (2024-06-15), so that should be the start date
			expect(result.startDate).toBe("2024-06-15");
			const today = new Date().toISOString().split("T")[0];
			expect(result.endDate).toBe(today);
		});
	});
});
