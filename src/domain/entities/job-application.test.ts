import { describe, expect, it } from "bun:test";
import { type } from "arktype";
import type { JobApplicationForCreate } from "./job-application";
import { createJobApplication } from "./job-application";

describe("createJobApplication", () => {
	const baseJobData: JobApplicationForCreate = {
		company: "  Tech Corp  ",
		positionTitle: "  Senior Developer  ",
		applicationDate: "2024-01-15T10:30:00.000Z",
	};

	// Test helper to unwrap Result and get JobApplication
	const unwrapJobApp = (result: ReturnType<typeof createJobApplication>) => {
		expect(result.isOk()).toBe(true);
		if (!result.isOk()) throw new Error("Expected Ok result");
		return result.value;
	};

	it("should create a job application with required fields", () => {
		const result = createJobApplication(baseJobData);
		const jobApp = unwrapJobApp(result);

		// Validate using ArkType that the object structure is valid
		const validation = type({
			id: "string.uuid",
			company: "string > 0",
			positionTitle: "string > 0",
		})(jobApp);
		expect(validation instanceof type.errors).toBe(false);

		// Test specific values that get trimmed
		expect(jobApp.company).toBe("Tech Corp");
		expect(jobApp.positionTitle).toBe("Senior Developer");
		expect(jobApp.applicationDate).toBe("2024-01-15T10:30:00.000Z");
	});

	it("should include optional fields when provided", () => {
		const dataWithOptionals: JobApplicationForCreate = {
			...baseJobData,
			interestRating: 3,
			nextEventDate: "2024-01-20T14:00:00.000Z",
			jobPostingUrl: "https://example.com/job/123",
			jobDescription: "Great opportunity for a senior developer",
		};

		const result = createJobApplication(dataWithOptionals);

		expect(result.isOk()).toBe(true);
		if (result.isOk()) {
			const jobApp = result.value;
			expect(jobApp.interestRating).toBe(3);
			expect(jobApp.nextEventDate).toBe("2024-01-20T14:00:00.000Z");
			expect(jobApp.jobPostingUrl).toBe("https://example.com/job/123");
			expect(jobApp.jobDescription).toBe(
				"Great opportunity for a senior developer",
			);
		}
	});

	it("should not include optional fields when not provided", () => {
		const result = createJobApplication(baseJobData);

		expect(result.isOk()).toBe(true);
		if (result.isOk()) {
			const jobApp = result.value;
			expect(jobApp.interestRating).toBeUndefined();
			expect(jobApp.nextEventDate).toBeUndefined();
			expect(jobApp.jobPostingUrl).toBeUndefined();
			expect(jobApp.jobDescription).toBeUndefined();
		}
	});

	it("should set createdAt and updatedAt to the same timestamp initially", () => {
		const result = createJobApplication(baseJobData);
		const jobApp = unwrapJobApp(result);

		expect(jobApp.createdAt).toBe(jobApp.updatedAt);
	});

	it("should initialize with empty status log", () => {
		const result = createJobApplication(baseJobData);
		const jobApp = unwrapJobApp(result);

		expect(jobApp.statusLog).toEqual({});
	});

	it("should initialize with notes collection", () => {
		const result = createJobApplication(baseJobData);
		const jobApp = unwrapJobApp(result);

		expect(jobApp.notes.notes).toEqual({});
		expect(jobApp.notes.operations.add).toBeFunction();
	});

	describe("newStatus method", () => {
		it("should add new status to status log", () => {
			const result = createJobApplication(baseJobData);
			const jobApp = unwrapJobApp(result);
			const initialUpdatedAt = jobApp.updatedAt;

			// Small delay to ensure different timestamp
			const status = {
				category: "active" as const,
				current: "applied" as const,
			};

			jobApp.newStatus(status);

			const statusLogKeys = Object.keys(jobApp.statusLog);
			expect(statusLogKeys).toHaveLength(1);
			expect(statusLogKeys[0]).toBeDefined();
			// @ts-expect-error
			expect(jobApp.statusLog[statusLogKeys[0]]).toEqual(status);
			expect(jobApp.updatedAt).not.toBe(initialUpdatedAt);
		});

		it("should add multiple status updates to the log", () => {
			const result = createJobApplication(baseJobData);
			const jobApp = unwrapJobApp(result);

			const status1 = {
				category: "active" as const,
				current: "applied" as const,
			};

			const status2 = {
				category: "active" as const,
				current: "interview" as const,
			};

			jobApp.newStatus(status1);
			jobApp.newStatus(status2);

			const statusLogKeys = Object.keys(jobApp.statusLog);
			expect(statusLogKeys).toHaveLength(2);
			// @ts-expect-error
			expect(jobApp.statusLog[statusLogKeys[0]]).toEqual(status1);
			// @ts-expect-error
			expect(jobApp.statusLog[statusLogKeys[1]]).toEqual(status2);
		});

		it("should update updatedAt timestamp when status is added", () => {
			const result = createJobApplication(baseJobData);
			const jobApp = unwrapJobApp(result);
			const initialUpdatedAt = jobApp.updatedAt;

			const status = {
				category: "active" as const,
				current: "screening interview" as const,
			};

			jobApp.newStatus(status);

			expect(jobApp.updatedAt).not.toBe(initialUpdatedAt);
		});

		it("should handle status with optional note field", () => {
			const result = createJobApplication(baseJobData);
			const jobApp = unwrapJobApp(result);

			const statusWithNote = {
				category: "inactive" as const,
				current: "rejected" as const,
				note: "Not a good fit for the role",
			};

			jobApp.newStatus(statusWithNote);

			const statusLogKeys = Object.keys(jobApp.statusLog);
			expect(statusLogKeys).toHaveLength(1);
			// @ts-expect-error
			expect(jobApp.statusLog[statusLogKeys[0]]).toEqual(statusWithNote);
		});
	});

	describe("update method", () => {
		it("should update job application properties", () => {
			const result = createJobApplication(baseJobData);
			const jobApp = unwrapJobApp(result);
			const initialUpdatedAt = jobApp.updatedAt;

			jobApp.update({
				id: jobApp.id, // Required for update type
				company: "New Company",
				interestRating: 2,
			});

			expect(jobApp.company).toBe("New Company");
			expect(jobApp.interestRating).toBe(2);
			expect(jobApp.positionTitle).toBe("Senior Developer"); // Should remain unchanged
			expect(jobApp.updatedAt).not.toBe(initialUpdatedAt);
		});

		it("should update updatedAt timestamp", () => {
			const result = createJobApplication(baseJobData);
			const jobApp = unwrapJobApp(result);
			const initialUpdatedAt = jobApp.updatedAt;

			jobApp.update({
				id: jobApp.id,
				company: "Updated Company",
			});

			expect(jobApp.updatedAt).not.toBe(initialUpdatedAt);
		});

		it("should preserve unchanged properties", () => {
			const result = createJobApplication(baseJobData);
			const jobApp = unwrapJobApp(result);
			const originalDate = jobApp.applicationDate;
			const originalCreatedAt = jobApp.createdAt;

			jobApp.update({
				id: jobApp.id,
				positionTitle: "Lead Developer",
			});

			expect(jobApp.positionTitle).toBe("Lead Developer");
			expect(jobApp.company).toBe("Tech Corp"); // Should remain unchanged
			expect(jobApp.applicationDate).toBe(originalDate); // Should remain unchanged
			expect(jobApp.createdAt).toBe(originalCreatedAt); // Should never change
		});
	});

	describe("generated ID", () => {
		it("should generate unique IDs for different job applications", () => {
			const result1 = createJobApplication(baseJobData);
			const result2 = createJobApplication(baseJobData);
			const jobApp1 = unwrapJobApp(result1);
			const jobApp2 = unwrapJobApp(result2);

			expect(jobApp1.id).not.toBe(jobApp2.id);
		});
	});

	describe("integration with notes", () => {
		it("should allow adding notes to the job application", () => {
			const result = createJobApplication(baseJobData);
			const jobApp = unwrapJobApp(result);
			const addResult = jobApp.notes.operations.add({
				content: "Interesting company culture",
			});

			expect(addResult.isOk()).toBe(true);
		});

		it("should maintain separate note collections for different job applications", () => {
			const result1 = createJobApplication(baseJobData);
			const result2 = createJobApplication(baseJobData);
			const jobApp1 = unwrapJobApp(result1);
			const jobApp2 = unwrapJobApp(result2);

			jobApp1.notes.operations.add({ content: "Note for job 1" });
			jobApp2.notes.operations.add({ content: "Note for job 2" });

			const notes1Result = jobApp1.notes.operations.getAll();
			const notes2Result = jobApp2.notes.operations.getAll();

			expect(notes1Result.isOk()).toBe(true);
			expect(notes2Result.isOk()).toBe(true);

			if (notes1Result.isOk() && notes2Result.isOk()) {
				const notes1 = notes1Result.value;
				const notes2 = notes2Result.value;

				expect(notes1).toHaveLength(1);
				expect(notes2).toHaveLength(1);
				// @ts-expect-error
				expect(notes1[0].content).toBe("Note for job 1");
				// @ts-expect-error
				expect(notes2[0].content).toBe("Note for job 2");
			}
		});
	});

	describe("edge cases", () => {
		it("should handle empty strings for company and position (after trimming)", () => {
			const dataWithEmptyStrings: JobApplicationForCreate = {
				company: "   ",
				positionTitle: "   ",
				applicationDate: "2024-01-15T10:30:00.000Z",
			};

			const result = createJobApplication(dataWithEmptyStrings);

			expect(result.isErr()).toBe(true);
		});

		it("should handle all interest rating values", () => {
			const ratings = [1, 2, 3] as const;

			for (const rating of ratings) {
				const dataWithRating: JobApplicationForCreate = {
					...baseJobData,
					interestRating: rating,
				};

				const result = createJobApplication(dataWithRating);
				const jobApp = unwrapJobApp(result);
				expect(jobApp.interestRating).toBe(rating);
			}
		});
	});
});
