import { describe, expect, it } from "bun:test";
import {
	createJobApplication,
	createJobApplicationId,
	type JobApplication,
} from "../entities/job-application.ts";
import { filterApplicationsByDateRange } from "./analytics.ts";

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
});
