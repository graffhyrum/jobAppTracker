import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createJobApplication } from "../../domain/entities/job-application";
import type { JobApplicationRepository } from "../../domain/ports/job-application-repository";
import { expectDefined } from "../../helpers/expectDefined";
import { createJobApplicationJsonRepository } from "./job-application-json-repository";

describe("JobApplicationJsonRepository", () => {
	let repository: JobApplicationRepository;
	let testFilePath: string;

	beforeEach(() => {
		testFilePath = join(tmpdir(), `test-job-apps-${Date.now()}.json`);
		repository = createJobApplicationJsonRepository(testFilePath);
	});

	afterEach(() => {
		if (existsSync(testFilePath)) {
			unlinkSync(testFilePath);
		}
	});

	test("should save and retrieve a job application from JSON file", async () => {
		const appResult = createJobApplication({
			company: "Test Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
		});

		expect(appResult.isOk()).toBe(true);
		if (!appResult.isOk()) return;

		const app = appResult.value;
		const saveResult = await repository.save(app);
		expect(saveResult.isOk()).toBe(true);

		// Verify the file was created
		expect(existsSync(testFilePath)).toBe(true);

		const foundResult = await repository.findById(app.id);
		expect(foundResult.isOk()).toBe(true);
		if (!foundResult.isOk()) return;

		const found = foundResult.value;
		expect(found).not.toBeNull();
		expect(found?.id).toBe(app.id);
		expect(found?.company).toBe("Test Company");
		expect(found?.positionTitle).toBe("Developer");
	});

	test("should handle non-existent file gracefully", async () => {
		const result = await repository.findAll();
		expect(result.isOk()).toBe(true);
		if (!result.isOk()) return;
		expect(result.value).toEqual([]);
	});

	test("should save multiple applications to JSON file", async () => {
		const app1Result = createJobApplication({
			company: "Company 1",
			positionTitle: "Developer 1",
			applicationDate: new Date().toISOString(),
		});
		const app2Result = createJobApplication({
			company: "Company 2",
			positionTitle: "Developer 2",
			applicationDate: new Date().toISOString(),
		});

		expect(app1Result.isOk()).toBe(true);
		expect(app2Result.isOk()).toBe(true);
		if (!app1Result.isOk() || !app2Result.isOk()) return;

		await repository.save(app1Result.value);
		await repository.save(app2Result.value);

		const allResult = await repository.findAll();
		expect(allResult.isOk()).toBe(true);
		if (!allResult.isOk()) return;

		const apps = allResult.value;
		expect(apps).toHaveLength(2);
		expect(apps.map((app) => app.company)).toEqual(
			expect.arrayContaining(["Company 1", "Company 2"]),
		);
	});

	test("should update existing application in JSON file", async () => {
		const appResult = createJobApplication({
			company: "Original Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
		});

		expect(appResult.isOk()).toBe(true);
		if (!appResult.isOk()) return;

		const app = appResult.value;
		await repository.save(app);

		app.update({ id: app.id, company: "Updated Company" });
		const updateResult = await repository.update(app);
		expect(updateResult.isOk()).toBe(true);

		const foundResult = await repository.findById(app.id);
		expect(foundResult.isOk()).toBe(true);
		if (!foundResult.isOk()) return;

		const found = foundResult.value;
		expect(found?.company).toBe("Updated Company");
	});

	test("should delete application from JSON file", async () => {
		const appResult = createJobApplication({
			company: "Test Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
		});

		expect(appResult.isOk()).toBe(true);
		if (!appResult.isOk()) return;

		const app = appResult.value;
		await repository.save(app);

		const deleteResult = await repository.deleteById(app.id);
		expect(deleteResult.isOk()).toBe(true);

		const foundResult = await repository.findById(app.id);
		expect(foundResult.isOk()).toBe(true);
		if (!foundResult.isOk()) return;
		expect(foundResult.value).toBeNull();
	});

	test("should preserve status log and notes in JSON persistence", async () => {
		const appResult = createJobApplication({
			company: "Test Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
		});

		expect(appResult.isOk()).toBe(true);
		if (!appResult.isOk()) return;

		const app = appResult.value;

		// Add status and notes
		app.newStatus({ category: "active", current: "applied" });
		const noteResult = app.notes.operations.add({ content: "Test note" });
		expect(noteResult.isOk()).toBe(true);

		await repository.save(app);

		const foundResult = await repository.findById(app.id);
		expect(foundResult.isOk()).toBe(true);
		if (!foundResult.isOk()) return;

		const found = foundResult.value;
		expect(found).not.toBeNull();
		if (!found) return;

		// Check status was preserved
		const currentStatus = found.getCurrentStatus();
		expect(currentStatus?.current).toBe("applied");
		expect(currentStatus?.category).toBe("active");

		// Check notes were preserved
		const notesResult = found.notes.operations.getAll();
		expect(notesResult.isOk()).toBe(true);
		if (!notesResult.isOk()) return;
		expect(notesResult.value).toHaveLength(1);
		expectDefined(notesResult.value[0]);
		expect(notesResult.value[0].content).toBe("Test note");
	});

	test("should find applications by status category in JSON file", async () => {
		const app1Result = createJobApplication({
			company: "Active Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
		});
		const app2Result = createJobApplication({
			company: "Inactive Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
		});

		expect(app1Result.isOk()).toBe(true);
		expect(app2Result.isOk()).toBe(true);
		if (!app1Result.isOk() || !app2Result.isOk()) return;

		const app1 = app1Result.value;
		const app2 = app2Result.value;

		app1.newStatus({ category: "active", current: "applied" });
		app2.newStatus({ category: "inactive", current: "rejected" });

		await repository.save(app1);
		await repository.save(app2);

		const activeResult = await repository.findByStatusCategory("active");
		expect(activeResult.isOk()).toBe(true);
		if (!activeResult.isOk()) return;
		expect(activeResult.value).toHaveLength(1);
		expectDefined(activeResult.value[0]);
		expect(activeResult.value[0].company).toBe("Active Company");

		const inactiveResult = await repository.findByStatusCategory("inactive");
		expect(inactiveResult.isOk()).toBe(true);
		if (!inactiveResult.isOk()) return;
		expect(inactiveResult.value).toHaveLength(1);
		expectDefined(inactiveResult.value[0]);
		expect(inactiveResult.value[0].company).toBe("Inactive Company");
	});

	test("should handle corrupted JSON file gracefully", async () => {
		// Write invalid JSON to the file
		await Bun.write(testFilePath, "invalid json content");

		const result = await repository.findAll();
		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.name).toBe("DatabaseError");
		}
	});

	test("should handle empty JSON file gracefully", async () => {
		// Write empty string to the file
		await Bun.write(testFilePath, "");

		const result = await repository.findAll();
		expect(result.isOk()).toBe(true);
		if (!result.isOk()) return;
		expect(result.value).toEqual([]);
	});

	test("should handle non-array JSON content gracefully", async () => {
		// Write non-array JSON to the file
		await Bun.write(testFilePath, '{"not": "array"}');

		const result = await repository.findAll();
		expect(result.isOk()).toBe(true);
		if (!result.isOk()) return;
		expect(result.value).toEqual([]);
	});

	test("should return error when updating non-existent application", async () => {
		const appResult = createJobApplication({
			company: "Test Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
		});

		expect(appResult.isOk()).toBe(true);
		if (!appResult.isOk()) return;

		const app = appResult.value;
		const updateResult = await repository.update(app);

		expect(updateResult.isErr()).toBe(true);
		if (updateResult.isErr()) {
			expect(updateResult.error.name).toBe("DatabaseError");
		}
	});

	test("should return error when deleting non-existent application", async () => {
		const deleteResult = await repository.deleteById("non-existent-id");

		expect(deleteResult.isErr()).toBe(true);
		if (deleteResult.isErr()) {
			expect(deleteResult.error.name).toBe("DatabaseError");
		}
	});

	test("should find overdue applications", async () => {
		const overdueDate = new Date();
		overdueDate.setDate(overdueDate.getDate() - 1); // Yesterday

		const futureDate = new Date();
		futureDate.setDate(futureDate.getDate() + 1); // Tomorrow

		const overdueAppResult = createJobApplication({
			company: "Overdue Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
			nextEventDate: overdueDate.toISOString(),
		});

		const futureAppResult = createJobApplication({
			company: "Future Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
			nextEventDate: futureDate.toISOString(),
		});

		const noEventAppResult = createJobApplication({
			company: "No Event Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
		});

		expect(overdueAppResult.isOk()).toBe(true);
		expect(futureAppResult.isOk()).toBe(true);
		expect(noEventAppResult.isOk()).toBe(true);
		if (
			!overdueAppResult.isOk() ||
			!futureAppResult.isOk() ||
			!noEventAppResult.isOk()
		)
			return;

		await repository.save(overdueAppResult.value);
		await repository.save(futureAppResult.value);
		await repository.save(noEventAppResult.value);

		const overdueResult = await repository.findOverdue();
		expect(overdueResult.isOk()).toBe(true);
		if (!overdueResult.isOk()) return;

		expect(overdueResult.value).toHaveLength(1);
		expectDefined(overdueResult.value[0]);
		expect(overdueResult.value[0].company).toBe("Overdue Company");
	});

	test("should handle optional fields correctly during serialization", async () => {
		const appResult = createJobApplication({
			company: "Test Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
			interestRating: 3,
			nextEventDate: new Date().toISOString(),
			jobPostingUrl: "https://example.com",
			jobDescription: "Test description",
		});

		expect(appResult.isOk()).toBe(true);
		if (!appResult.isOk()) return;

		const app = appResult.value;
		const saveResult = await repository.save(app);
		expect(saveResult.isOk()).toBe(true);

		const foundResult = await repository.findById(app.id);
		expect(foundResult.isOk()).toBe(true);
		if (!foundResult.isOk()) return;

		const found = foundResult.value;
		expect(found).not.toBeNull();
		if (!found) return;

		expect(found.interestRating).toBe(3);
		expectDefined(app.nextEventDate);
		expect(found.nextEventDate).toBe(app.nextEventDate);
		expect(found.jobPostingUrl).toBe("https://example.com");
		expect(found.jobDescription).toBe("Test description");
	});
});
