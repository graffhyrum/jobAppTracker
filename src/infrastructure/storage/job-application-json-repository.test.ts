import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createJobApplication } from "../../domain/entities/job-application";
import type { JobApplicationRepository } from "../../domain/ports/job-application-repository";
import { expectDefined } from "../../helpers/expectDefined";
import { createJobApplicationJsonRepository } from "./job-application-json-repository";
import { createJobApplicationMemoryRepository } from "./job-application-memory-repository.ts";

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

function tempFile(prefix: string) {
	return `./test-results/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
}

describe("JobApplicationJsonRepository additional coverage", () => {
	test("save handles update path when application exists", async () => {
		const file = tempFile("jsonrepo-update");
		const repo = createJobApplicationJsonRepository(file);
		const app = createJobApplication({
			company: "A",
			positionTitle: "P",
			applicationDate: new Date().toISOString(),
		})._unsafeUnwrap();

		{
			const save1 = await repo.save(app);
			expect(save1.isOk()).toBe(true);
		}
		app.update({ id: app.id, jobDescription: "desc" });
		{
			const save2 = await repo.save(app); // should hit existingIndex >= 0 path
			expect(save2.isOk()).toBe(true);
		}

		const loadedRes = await repo.findById(app.id);
		expect(loadedRes.isOk()).toBe(true);
		if (!loadedRes.isOk()) return;
		const loaded = loadedRes.value;
		expect(loaded?.jobDescription).toBe("desc");
	});

	test("writeData error is mapped to DatabaseError", async () => {
		// Create a directory and use it as file path to force Bun.write to fail
		const dirPath = `./test-results/adir-${Date.now()}`;
		mkdirSync(dirPath, { recursive: true });
		const repo = createJobApplicationJsonRepository(dirPath); // wrong: path is a directory

		const app = createJobApplication({
			company: "B",
			positionTitle: "Q",
			applicationDate: new Date().toISOString(),
		})._unsafeUnwrap();

		const saveRes = await repo.save(app);
		expect(saveRes.isErr()).toBe(true);
		if (saveRes.isErr()) {
			expect(saveRes.error.name).toBe("DatabaseError");
		}
	});

	test("deserialize error path is handled in findAll", async () => {
		const file = tempFile("jsonrepo-bad-deser");
		// Write an invalid application entry (missing required fields or bad types)
		const bad = [
			{
				id: "1",
				company: "",
				positionTitle: "",
				applicationDate: "not-a-date",
			},
		];
		await Bun.write(file, JSON.stringify(bad));
		const repo = createJobApplicationJsonRepository(file);

		const allRes = await repo.findAll();
		expect(allRes.isErr()).toBe(true);
		if (allRes.isErr()) {
			expect(allRes.error.name).toBe("DatabaseError");
			expect(String(allRes.error.message)).toContain(
				"Failed to deserialize job application",
			);
		}
	});

	test("findByStatusCategory comparator chooses latest entry", async () => {
		const file = tempFile("jsonrepo-status-sort");
		const repo = createJobApplicationJsonRepository(file);

		const app = createJobApplication({
			company: "C",
			positionTitle: "Dev",
			applicationDate: new Date().toISOString(),
		})._unsafeUnwrap();
		app.newStatus({ current: "applied", category: "active" });
		app.newStatus({ current: "rejected", category: "inactive" });

		const saveOk = await repo.save(app);
		expect(saveOk.isOk()).toBe(true);

		const activeRes = await repo.findByStatusCategory("active");
		expect(activeRes.isOk()).toBe(true);
		if (!activeRes.isOk()) return;
		const active = activeRes.value;
		expect(active.find((a) => a.id === app.id)).toBeUndefined();
		const inactiveRes = await repo.findByStatusCategory("inactive");
		expect(inactiveRes.isOk()).toBe(true);
		if (!inactiveRes.isOk()) return;
		const inactive = inactiveRes.value;
		expect(inactive.find((a) => a.id === app.id)).toBeDefined();
	});
});

describe("JobApplicationMemoryRepository comparator coverage", () => {
	test("findByStatusCategory sorts statusLog by ISO timestamp to pick latest", async () => {
		const repo = createJobApplicationMemoryRepository();
		const app = createJobApplication({
			company: "Acme",
			positionTitle: "Dev",
			applicationDate: new Date("2020-01-01T00:00:00.000Z").toISOString(),
		})._unsafeUnwrap();

		// add two statuses to exercise toSorted comparator
		app.newStatus({ current: "applied", category: "active" });
		// advance time within entity logic
		app.newStatus({ current: "rejected", category: "inactive" });

		const saveRes = await repo.save(app);
		expect(saveRes.isOk()).toBe(true);

		const activeRes = await repo.findByStatusCategory("active");
		expect(activeRes.isOk()).toBe(true);
		if (!activeRes.isOk()) return;
		const active = activeRes.value;
		// latest status is inactive, so app should not be in active list
		expect(active.find((a) => a.id === app.id)).toBeUndefined();

		const inactiveRes = await repo.findByStatusCategory("inactive");
		expect(inactiveRes.isOk()).toBe(true);
		if (!inactiveRes.isOk()) return;
		const inactive = inactiveRes.value;
		expect(inactive.find((a) => a.id === app.id)).toBeDefined();
	});
});
