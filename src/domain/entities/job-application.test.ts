import { describe, expect, it } from "bun:test";
import { assertDefined } from "#helpers/assertDefined.ts";
import {
	createJobApplication,
	createJobApplicationId,
	createJobApplicationWithIdGen,
	createJobApplicationWithInitialStatus,
	getCurrentStatus,
	getStatusCategory,
	hasStatus,
	isActive,
	isInactive,
	isJobAppOverdue,
	type JobApplicationForCreate,
	jobApplicationModule,
	updateJobApplicationData,
	updateJobApplicationStatus,
} from "./job-application.ts";

describe("JobApplication Domain Entity", () => {
	const mockUuidGenerator = () => "123e4567-e89b-12d3-a456-426614174000";

	const validJobApplicationData = {
		company: "Test Company",
		positionTitle: "Software Engineer",
		applicationDate: "2025-09-10T10:00:00.000Z",
		interestRating: 3,
		nextEventDate: "2025-09-15T10:00:00.000Z",
		jobPostingUrl: "https://example.com/job",
		jobDescription: "Great opportunity",
		sourceType: "job_board" as const,
		isRemote: false,
	} as const satisfies JobApplicationForCreate;

	const validApplicationStatus = {
		category: "active" as const,
		label: "applied" as const,
	};

	describe("createJobApplicationId", () => {
		it("should create a valid JobApplicationId using provided UUID generator", () => {
			const id = createJobApplicationId(mockUuidGenerator);

			expect(typeof id).toBe("string");
			expect(id).toBe("123e4567-e89b-12d3-a456-426614174000");
		});

		it("should validate UUID format through ArkType schema", () => {
			const validId = createJobApplicationId(mockUuidGenerator);
			const parseResult = jobApplicationModule.JobAppId(validId);

			expect(parseResult).toBe(validId);
		});
	});

	describe("createJobApplication", () => {
		it("should create a job application with provided ID", () => {
			const id = createJobApplicationId(mockUuidGenerator);
			const application = createJobApplication(validJobApplicationData, id);

			expect(application.id).toBe(id);
			expect(application.company).toBe(validJobApplicationData.company);
			expect(application.positionTitle).toBe(
				validJobApplicationData.positionTitle,
			);
			expect(application.applicationDate).toBe(
				validJobApplicationData.applicationDate,
			);
			if (validJobApplicationData.interestRating !== undefined) {
				expect(application.interestRating).toBe(
					validJobApplicationData.interestRating,
				);
			}
			if (validJobApplicationData.nextEventDate !== undefined) {
				expect(application.nextEventDate).toBe(
					validJobApplicationData.nextEventDate,
				);
			}
			assertDefined(application.createdAt);
			assertDefined(application.updatedAt);
			expect(application.statusLog).toEqual([]);
			expect(application.notes).toEqual([]);
		});

		it("should set createdAt and updatedAt to current timestamp", () => {
			const beforeCreate = new Date().toISOString();
			const id = createJobApplicationId(mockUuidGenerator);
			const application = createJobApplication(validJobApplicationData, id);
			const afterCreate = new Date().toISOString();

			expect(application.createdAt >= beforeCreate).toBe(true);
			expect(application.createdAt <= afterCreate).toBe(true);
			expect(application.updatedAt >= beforeCreate).toBe(true);
			expect(application.updatedAt <= afterCreate).toBe(true);
		});
	});

	describe("createJobApplicationWithIdGen", () => {
		it("should create job application with generated ID", () => {
			const application = createJobApplicationWithIdGen(
				validJobApplicationData,
				mockUuidGenerator,
			);

			expect(application.id).toBe("123e4567-e89b-12d3-a456-426614174000");
			expect(application.company).toBe(validJobApplicationData.company);
			expect(application.positionTitle).toBe(
				validJobApplicationData.positionTitle,
			);
		});
	});

	describe("createJobApplicationWithInitialStatus", () => {
		it("should create job application with initial applied status", () => {
			const application = createJobApplicationWithInitialStatus(
				validJobApplicationData,
				mockUuidGenerator,
			);

			expect(application.id).toBe("123e4567-e89b-12d3-a456-426614174000");
			expect(application.company).toBe(validJobApplicationData.company);
			expect(application.positionTitle).toBe(
				validJobApplicationData.positionTitle,
			);
			expect(application.statusLog).toHaveLength(1);

			const statusResult = getCurrentStatus(application);
			expect(statusResult.isOk()).toBe(true);
			if (statusResult.isOk()) {
				expect(statusResult.value.category).toBe("active");
				expect(statusResult.value.label).toBe("applied");
			}
		});

		it("should create application that is active by default", () => {
			const application = createJobApplicationWithInitialStatus(
				validJobApplicationData,
				mockUuidGenerator,
			);

			expect(isActive(application)).toBe(true);
			expect(isInactive(application)).toBe(false);
			expect(hasStatus(application)).toBe(true);
		});
	});

	describe("isJobAppOverdue", () => {
		it("should return false when nextEventDate is not set", () => {
			const id = createJobApplicationId(mockUuidGenerator);
			const application = createJobApplication(
				{ ...validJobApplicationData, nextEventDate: undefined },
				id,
			);

			expect(isJobAppOverdue(application)).toBe(false);
		});

		it("should return true when nextEventDate is in the past", () => {
			const pastDate = new Date(Date.now() - 86400000).toISOString(); // Yesterday
			const id = createJobApplicationId(mockUuidGenerator);
			const application = createJobApplication(
				{ ...validJobApplicationData, nextEventDate: pastDate },
				id,
			);

			expect(isJobAppOverdue(application)).toBe(true);
		});

		it("should return false when nextEventDate is in the future", () => {
			const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
			const id = createJobApplicationId(mockUuidGenerator);
			const application = createJobApplication(
				{ ...validJobApplicationData, nextEventDate: futureDate },
				id,
			);

			expect(isJobAppOverdue(application)).toBe(false);
		});
	});

	describe("updateJobApplicationStatus", () => {
		it("should add new status to statusLog and update timestamp", async () => {
			const id = createJobApplicationId(mockUuidGenerator);
			const application = createJobApplication(validJobApplicationData, id);
			const originalUpdatedAt = application.updatedAt;

			// Add small delay to ensure timestamp difference
			await new Promise((resolve) => setTimeout(resolve, 1));

			const updatedApplication = updateJobApplicationStatus(
				application,
				validApplicationStatus,
			);

			expect(updatedApplication.statusLog).toHaveLength(1);
			expect(updatedApplication.statusLog[0]?.[1]).toEqual(
				validApplicationStatus,
			);
			expect(updatedApplication.updatedAt >= originalUpdatedAt).toBe(true);
			expect(updatedApplication.id).toBe(application.id);
			expect(updatedApplication.company).toBe(application.company);
		});

		it("should append to existing statusLog", () => {
			const id = createJobApplicationId(mockUuidGenerator);
			const application = createJobApplication(validJobApplicationData, id);

			const firstUpdate = updateJobApplicationStatus(
				application,
				validApplicationStatus,
			);
			const secondStatus = {
				category: "inactive" as const,
				label: "rejected" as const,
			};
			const secondUpdate = updateJobApplicationStatus(
				firstUpdate,
				secondStatus,
			);

			expect(secondUpdate.statusLog).toHaveLength(2);
			expect(secondUpdate.statusLog[0]?.[1]).toEqual(validApplicationStatus);
			expect(secondUpdate.statusLog[1]?.[1]).toEqual(secondStatus);
		});
	});

	describe("getCurrentStatus", () => {
		it("should return error when no status entries exist", () => {
			const id = createJobApplicationId(mockUuidGenerator);
			const application = createJobApplication(validJobApplicationData, id);

			const result = getCurrentStatus(application);

			expect(result.isErr()).toBe(true);
		});

		it("should return latest status when statusLog has entries", () => {
			const id = createJobApplicationId(mockUuidGenerator);
			const application = createJobApplication(validJobApplicationData, id);
			const updatedApp = updateJobApplicationStatus(
				application,
				validApplicationStatus,
			);

			const result = getCurrentStatus(updatedApp);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value).toEqual(validApplicationStatus);
			}
		});
	});

	describe("getStatusCategory", () => {
		it("should return error when no status exists", () => {
			const id = createJobApplicationId(mockUuidGenerator);
			const application = createJobApplication(validJobApplicationData, id);

			const result = getStatusCategory(application);

			expect(result.isErr()).toBe(true);
		});

		it("should return status category when status exists", () => {
			const id = createJobApplicationId(mockUuidGenerator);
			const application = createJobApplication(validJobApplicationData, id);
			const updatedApp = updateJobApplicationStatus(
				application,
				validApplicationStatus,
			);

			const result = getStatusCategory(updatedApp);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value).toBe("active");
			}
		});
	});

	describe("updateJobApplicationData", () => {
		it("should update specified fields and updatedAt timestamp", async () => {
			const id = createJobApplicationId(mockUuidGenerator);
			const application = createJobApplication(validJobApplicationData, id);
			const originalUpdatedAt = application.updatedAt;

			// Add small delay to ensure timestamp difference
			await new Promise((resolve) => setTimeout(resolve, 1));

			const updates = {
				company: "Updated Company",
				interestRating: 2,
			};

			const updatedApplication = updateJobApplicationData(application, updates);

			expect(updatedApplication.company).toBe("Updated Company");
			expect(updatedApplication.interestRating).toBe(2);
			expect(updatedApplication.positionTitle).toBe(
				validJobApplicationData.positionTitle,
			);
			expect(updatedApplication.updatedAt >= originalUpdatedAt).toBe(true);
			expect(updatedApplication.id).toBe(application.id);
		});
	});

	describe("hasStatus", () => {
		it("should return false when no status entries exist", () => {
			const id = createJobApplicationId(mockUuidGenerator);
			const application = createJobApplication(validJobApplicationData, id);

			expect(hasStatus(application)).toBe(false);
		});

		it("should return true when status entries exist", () => {
			const id = createJobApplicationId(mockUuidGenerator);
			const application = createJobApplication(validJobApplicationData, id);
			const updatedApp = updateJobApplicationStatus(
				application,
				validApplicationStatus,
			);

			expect(hasStatus(updatedApp)).toBe(true);
		});
	});

	describe("isActive", () => {
		it("should return false when no status exists", () => {
			const id = createJobApplicationId(mockUuidGenerator);
			const application = createJobApplication(validJobApplicationData, id);

			expect(isActive(application)).toBe(false);
		});

		it("should return true when application has active status", () => {
			const id = createJobApplicationId(mockUuidGenerator);
			const application = createJobApplication(validJobApplicationData, id);
			const updatedApp = updateJobApplicationStatus(
				application,
				validApplicationStatus,
			);

			expect(isActive(updatedApp)).toBe(true);
		});

		it("should return false when application has inactive status", () => {
			const id = createJobApplicationId(mockUuidGenerator);
			const application = createJobApplication(validJobApplicationData, id);
			const inactiveStatus = {
				category: "inactive" as const,
				label: "rejected" as const,
			};
			const updatedApp = updateJobApplicationStatus(
				application,
				inactiveStatus,
			);

			expect(isActive(updatedApp)).toBe(false);
		});
	});

	describe("isInactive", () => {
		it("should return false when no status exists", () => {
			const id = createJobApplicationId(mockUuidGenerator);
			const application = createJobApplication(validJobApplicationData, id);

			expect(isInactive(application)).toBe(false);
		});

		it("should return false when application has active status", () => {
			const id = createJobApplicationId(mockUuidGenerator);
			const application = createJobApplication(validJobApplicationData, id);
			const updatedApp = updateJobApplicationStatus(
				application,
				validApplicationStatus,
			);

			expect(isInactive(updatedApp)).toBe(false);
		});

		it("should return true when application has inactive status", () => {
			const id = createJobApplicationId(mockUuidGenerator);
			const application = createJobApplication(validJobApplicationData, id);
			const inactiveStatus = {
				category: "inactive" as const,
				label: "rejected" as const,
			};
			const updatedApp = updateJobApplicationStatus(
				application,
				inactiveStatus,
			);

			expect(isInactive(updatedApp)).toBe(true);
		});
	});
});
