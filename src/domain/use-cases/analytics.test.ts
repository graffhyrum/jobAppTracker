import { describe, expect, it } from "bun:test";

import {
	type ApplicationStatus,
	createJobApplication,
	createJobApplicationId,
	createJobApplicationWithInitialStatus,
	type JobApplication,
	updateJobApplicationStatus,
} from "../entities/job-application.ts";
import {
	computeAnalytics,
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

	const createMockApplicationWithStatus = (
		applicationDate: string,
		status: ApplicationStatus,
		seed = 1000,
	): JobApplication => {
		const app = createJobApplicationWithInitialStatus(
			{
				company: "Test Company",
				positionTitle: "Software Engineer",
				applicationDate,
				interestRating: 3,
				sourceType: "job_board" as const,
				isRemote: false,
			},
			mockUuidGenerator(seed),
		);
		return updateJobApplicationStatus(app, status);
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

		it("should include applications on start date boundary", () => {
			const applications = [
				createMockApplication("2024-06-01T10:00:00.000Z", 1),
				createMockApplication("2024-06-02T10:00:00.000Z", 2),
			];

			const result = filterApplicationsByDateRange(applications, {
				startDate: "2024-06-01",
			});

			expect(result.length).toBe(2);
		});

		it("should include applications on end date boundary", () => {
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

		it("should return empty array when no applications match date range", () => {
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

			expect(result.startDate).toBe("2024-06-15");
			const today = new Date().toISOString().split("T")[0];
			expect(result.endDate).toBe(today);
		});
	});

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

	describe("computeAnalytics - summary section", () => {
		it("should compute summary statistics correctly", () => {
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
				createMockApplicationWithStatus(
					"2024-04-05T10:00:00.000Z",
					{ category: "inactive", label: "rejected" },
					4,
				),
				createMockApplicationWithStatus(
					"2024-05-01T10:00:00.000Z",
					{ category: "inactive", label: "no response" },
					5,
				),
			];

			const result = computeAnalytics(applications);

			expect(result.summary.totalApplications).toBe(5);
			expect(result.summary.activeApplications).toBe(3);
			expect(result.summary.inactiveApplications).toBe(2);
			expect(result.summary.offersReceived).toBe(1);
			expect(result.summary.rejections).toBe(1);
		});

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

			expect(result.summary.totalApplications).toBe(0);
			expect(result.summary.activeApplications).toBe(0);
			expect(result.summary.inactiveApplications).toBe(0);
			expect(result.summary.offersReceived).toBe(0);
			expect(result.summary.rejections).toBe(0);
			expect(result.summary.averageInterestRating).toBe(0);
		});
	});

	describe("computeAnalytics - statusDistribution section", () => {
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
			expect(applied).toBeDefined();
			expect(applied?.count).toBe(2);
			expect(applied?.category).toBe("active");

			const interview = result.statusDistribution.find(
				(d) => d.label === "interview",
			);
			expect(interview).toBeDefined();
			expect(interview?.count).toBe(1);
			expect(interview?.category).toBe("active");

			const rejected = result.statusDistribution.find(
				(d) => d.label === "rejected",
			);
			expect(rejected).toBeDefined();
			expect(rejected?.count).toBe(1);
			expect(rejected?.category).toBe("inactive");
		});

		it("should return empty array for empty applications", () => {
			const result = computeAnalytics([]);

			expect(result.statusDistribution).toEqual([]);
		});
	});

	describe("computeAnalytics - applicationsByDate section", () => {
		it("should group applications by date", () => {
			const applications = [
				createMockApplication("2024-01-15T10:00:00.000Z", 1),
				createMockApplication("2024-01-15T14:00:00.000Z", 2),
				createMockApplication("2024-02-20T10:00:00.000Z", 3),
				createMockApplication("2024-03-10T10:00:00.000Z", 4),
			];

			const result = computeAnalytics(applications);

			expect(result.applicationsByDate.length).toBe(3);

			const jan15 = result.applicationsByDate.find(
				(d) => d.date === "2024-01-15",
			);
			expect(jan15).toBeDefined();
			expect(jan15?.count).toBe(2);

			const feb20 = result.applicationsByDate.find(
				(d) => d.date === "2024-02-20",
			);
			expect(feb20).toBeDefined();
			expect(feb20?.count).toBe(1);

			const mar10 = result.applicationsByDate.find(
				(d) => d.date === "2024-03-10",
			);
			expect(mar10).toBeDefined();
			expect(mar10?.count).toBe(1);
		});

		it("should sort results by date", () => {
			const applications = [
				createMockApplication("2024-03-10T10:00:00.000Z", 1),
				createMockApplication("2024-01-15T10:00:00.000Z", 2),
				createMockApplication("2024-02-20T10:00:00.000Z", 3),
			];

			const result = computeAnalytics(applications);

			expect(result.applicationsByDate[0]?.date).toBe("2024-01-15");
			expect(result.applicationsByDate[1]?.date).toBe("2024-02-20");
			expect(result.applicationsByDate[2]?.date).toBe("2024-03-10");
		});

		it("should handle empty applications", () => {
			const result = computeAnalytics([]);

			expect(result.applicationsByDate).toEqual([]);
		});
	});

	describe("computeAnalytics - sourceEffectiveness section", () => {
		it("should calculate source effectiveness metrics", () => {
			const applications = [
				{
					...createMockApplicationWithStatus(
						"2024-01-15T10:00:00.000Z",
						{ category: "active", label: "applied" },
						1,
					),
					sourceType: "job_board" as const,
				},
				{
					...createMockApplicationWithStatus(
						"2024-02-20T10:00:00.000Z",
						{ category: "active", label: "offer" },
						2,
					),
					sourceType: "referral" as const,
				},
				{
					...createMockApplicationWithStatus(
						"2024-03-10T10:00:00.000Z",
						{ category: "inactive", label: "rejected" },
						3,
					),
					sourceType: "job_board" as const,
				},
			];

			const result = computeAnalytics(applications);

			expect(result.sourceEffectiveness.length).toBe(2);

			const jobBoard = result.sourceEffectiveness.find(
				(s) => s.sourceType === "job_board",
			);
			expect(jobBoard).toBeDefined();
			expect(jobBoard?.total).toBe(2);
			expect(jobBoard?.active).toBe(1);
			expect(jobBoard?.offers).toBe(0);
			expect(jobBoard?.rejected).toBe(1);
			expect(jobBoard?.successRate).toBe(0);

			const referral = result.sourceEffectiveness.find(
				(s) => s.sourceType === "referral",
			);
			expect(referral).toBeDefined();
			expect(referral?.total).toBe(1);
			expect(referral?.active).toBe(1);
			expect(referral?.offers).toBe(1);
			expect(referral?.rejected).toBe(0);
			expect(referral?.successRate).toBe(1);
		});

		it("should return 0 success rate when no offers or rejections", () => {
			const applications = [
				{
					...createMockApplicationWithStatus(
						"2024-01-15T10:00:00.000Z",
						{ category: "active", label: "applied" },
						1,
					),
					sourceType: "job_board" as const,
				},
			];

			const result = computeAnalytics(applications);

			expect(result.sourceEffectiveness[0]?.successRate).toBe(0);
		});

		it("should handle empty applications", () => {
			const result = computeAnalytics([]);

			expect(result.sourceEffectiveness).toEqual([]);
		});
	});

	describe("computeAnalytics - timeInStatus section", () => {
		it("should calculate time in status metrics", () => {
			const baseDate = new Date("2024-01-01T10:00:00.000Z");
			const twoDaysLater = new Date(
				baseDate.getTime() + 2 * 24 * 60 * 60 * 1000,
			).toISOString();
			const fourDaysLater = new Date(
				baseDate.getTime() + 4 * 24 * 60 * 60 * 1000,
			).toISOString();

			const applications = [
				createMockApplication("2024-01-01T10:00:00.000Z", 1),
			];

			applications[0]!.statusLog = [
				[baseDate.toISOString(), { category: "active", label: "applied" }],
				[twoDaysLater, { category: "active", label: "interview" }],
				[fourDaysLater, { category: "active", label: "offer" }],
			];

			const result = computeAnalytics(applications);

			expect(result.timeInStatus.length).toBe(3);

			const applied = result.timeInStatus.find((t) => t.label === "applied");
			expect(applied).toBeDefined();
			expect(applied?.averageDays).toBe(2);
			expect(applied?.minDays).toBe(2);
			expect(applied?.maxDays).toBe(2);
			expect(applied?.sampleSize).toBe(1);

			const interview = result.timeInStatus.find(
				(t) => t.label === "interview",
			);
			expect(interview).toBeDefined();
			expect(interview?.averageDays).toBe(2);
			expect(interview?.sampleSize).toBe(1);

			const offer = result.timeInStatus.find((t) => t.label === "offer");
			expect(offer).toBeDefined();
			expect(offer?.sampleSize).toBe(1);
		});

		it("should calculate median correctly for even number of samples", () => {
			const baseDate = new Date("2024-01-01T10:00:00.000Z");
			const durations = [1, 2, 3, 4];
			const applications = durations.map((days, i) => {
				const app = createMockApplication("2024-01-01T10:00:00.000Z", i + 1);
				app.statusLog = [
					[baseDate.toISOString(), { category: "active", label: "applied" }],
					[
						new Date(
							baseDate.getTime() + days * 24 * 60 * 60 * 1000,
						).toISOString(),
						{ category: "active", label: "interview" },
					],
				];
				return app;
			});

			const result = computeAnalytics(applications);
			const applied = result.timeInStatus.find((t) => t.label === "applied");

			// even-length sorted array: median = average of two middle values
			expect(applied?.medianDays).toBe(2.5);
		});

		it("should calculate median correctly for odd number of samples", () => {
			const baseDate = new Date("2024-01-01T10:00:00.000Z");
			const durations = [1, 2, 3, 4, 5];
			const applications = durations.map((days, i) => {
				const app = createMockApplication("2024-01-01T10:00:00.000Z", i + 1);
				app.statusLog = [
					[baseDate.toISOString(), { category: "active", label: "applied" }],
					[
						new Date(
							baseDate.getTime() + days * 24 * 60 * 60 * 1000,
						).toISOString(),
						{ category: "active", label: "interview" },
					],
				];
				return app;
			});

			const result = computeAnalytics(applications);
			const applied = result.timeInStatus.find((t) => t.label === "applied");

			// odd-length sorted array: median = middle value
			expect(applied?.medianDays).toBe(3);
		});

		it("should use current time for active status (no next entry)", () => {
			const applications = [
				createMockApplication("2024-01-01T10:00:00.000Z", 1),
			];

			applications[0]!.statusLog = [
				[
					new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
					{ category: "active", label: "applied" },
				],
			];

			const result = computeAnalytics(applications);
			const applied = result.timeInStatus.find((t) => t.label === "applied");

			expect(applied?.minDays).toBeGreaterThan(4);
			expect(applied?.minDays).toBeLessThan(6);
		});

		it("should handle empty applications", () => {
			const result = computeAnalytics([]);

			expect(result.timeInStatus).toEqual([]);
		});

		it("should handle applications with no status log", () => {
			const applications = [
				createMockApplication("2024-01-01T10:00:00.000Z", 1),
			];

			applications[0]!.statusLog = [];

			const result = computeAnalytics(applications);

			expect(result.timeInStatus).toEqual([]);
		});
	});

	describe("computeAnalytics - interestRatingStats section", () => {
		it("should calculate stats by interest rating", () => {
			const applications = [
				{
					...createMockApplicationWithStatus(
						"2024-01-15T10:00:00.000Z",
						{ category: "active", label: "applied" },
						1,
					),
					interestRating: 1,
				},
				{
					...createMockApplicationWithStatus(
						"2024-02-20T10:00:00.000Z",
						{ category: "active", label: "offer" },
						2,
					),
					interestRating: 1,
				},
				{
					...createMockApplicationWithStatus(
						"2024-03-10T10:00:00.000Z",
						{ category: "inactive", label: "rejected" },
						3,
					),
					interestRating: 2,
				},
			];

			const result = computeAnalytics(applications);

			expect(result.interestRatingStats.length).toBe(2);

			const rating1 = result.interestRatingStats.find((r) => r.rating === 1);
			expect(rating1).toBeDefined();
			expect(rating1?.total).toBe(2);
			expect(rating1?.active).toBe(2);
			expect(rating1?.offers).toBe(1);
			expect(rating1?.rejected).toBe(0);
			expect(rating1?.successRate).toBe(1);

			const rating2 = result.interestRatingStats.find((r) => r.rating === 2);
			expect(rating2).toBeDefined();
			expect(rating2?.total).toBe(1);
			expect(rating2?.offers).toBe(0);
			expect(rating2?.rejected).toBe(1);
			expect(rating2?.successRate).toBe(0);
		});

		it("should exclude unrated applications (rating = undefined)", () => {
			const applications = [
				{
					...createMockApplicationWithStatus(
						"2024-01-15T10:00:00.000Z",
						{ category: "active", label: "applied" },
						1,
					),
					interestRating: 1,
				},
				{
					...createMockApplicationWithStatus(
						"2024-02-20T10:00:00.000Z",
						{ category: "active", label: "interview" },
						2,
					),
					interestRating: undefined,
				},
			];

			const result = computeAnalytics(applications);

			expect(result.interestRatingStats.length).toBe(1);
			expect(result.interestRatingStats[0]?.rating).toBe(1);
		});

		it("should sort results by rating", () => {
			const applications = [
				{
					...createMockApplicationWithStatus(
						"2024-01-15T10:00:00.000Z",
						{ category: "active", label: "applied" },
						1,
					),
					interestRating: 3,
				},
				{
					...createMockApplicationWithStatus(
						"2024-02-20T10:00:00.000Z",
						{ category: "active", label: "interview" },
						2,
					),
					interestRating: 1,
				},
				{
					...createMockApplicationWithStatus(
						"2024-03-10T10:00:00.000Z",
						{ category: "active", label: "offer" },
						3,
					),
					interestRating: 2,
				},
			];

			const result = computeAnalytics(applications);

			expect(result.interestRatingStats[0]?.rating).toBe(1);
			expect(result.interestRatingStats[1]?.rating).toBe(2);
			expect(result.interestRatingStats[2]?.rating).toBe(3);
		});

		it("should handle empty applications", () => {
			const result = computeAnalytics([]);

			expect(result.interestRatingStats).toEqual([]);
		});
	});

	describe("computeAnalytics - responseRate section", () => {
		it("should calculate response rate statistics", () => {
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
				createMockApplicationWithStatus(
					"2024-04-05T10:00:00.000Z",
					{ category: "inactive", label: "rejected" },
					4,
				),
				createMockApplicationWithStatus(
					"2024-05-01T10:00:00.000Z",
					{ category: "inactive", label: "no response" },
					5,
				),
			];

			const result = computeAnalytics(applications);

			expect(result.responseRate.totalApplications).toBe(5);
			expect(result.responseRate.noResponse).toBe(1);
			expect(result.responseRate.withResponse).toBe(4);
			expect(result.responseRate.responseRate).toBe(80);
		});

		it("should handle 100% response rate", () => {
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

			expect(result.responseRate.responseRate).toBe(100);
		});

		it("should handle 0% response rate", () => {
			const applications = [
				createMockApplicationWithStatus(
					"2024-01-15T10:00:00.000Z",
					{ category: "inactive", label: "no response" },
					1,
				),
			];

			const result = computeAnalytics(applications);

			expect(result.responseRate.responseRate).toBe(0);
		});

		it("should handle empty applications", () => {
			const result = computeAnalytics([]);

			expect(result.responseRate.totalApplications).toBe(0);
			expect(result.responseRate.noResponse).toBe(0);
			expect(result.responseRate.withResponse).toBe(0);
			expect(result.responseRate.responseRate).toBe(0);
		});
	});
});
