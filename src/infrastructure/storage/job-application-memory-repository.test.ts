import { beforeEach, describe, expect, test } from "bun:test";
import { createJobApplication } from "../../domain/entities/job-application";
import type { JobApplicationRepository } from "../../domain/ports/job-application-repository";
import { expectDefined } from "../../helpers/expectDefined";
import { createJobApplicationMemoryRepository } from "./job-application-memory-repository";

describe("JobApplicationMemoryRepository", () => {
	let repository: JobApplicationRepository;

	beforeEach(() => {
		repository = createJobApplicationMemoryRepository();
	});

	test("should save and retrieve a job application", async () => {
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

		const foundResult = await repository.findById(app.id);
		expect(foundResult.isOk()).toBe(true);
		if (!foundResult.isOk()) return;

		const found = foundResult.value;
		expect(found).not.toBeNull();
		expect(found?.id).toBe(app.id);
		expect(found?.company).toBe("Test Company");
		expect(found?.positionTitle).toBe("Developer");
	});

	test("should return null for non-existent application", async () => {
		const result = await repository.findById("non-existent-id");
		expect(result.isOk()).toBe(true);
		if (!result.isOk()) return;
		expect(result.value).toBeNull();
	});

	test("should find all applications", async () => {
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

	test("should update an existing application", async () => {
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

	test("should fail to update non-existent application", async () => {
		const appResult = createJobApplication({
			company: "Test Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
		});

		expect(appResult.isOk()).toBe(true);
		if (!appResult.isOk()) return;

		const updateResult = await repository.update(appResult.value);
		expect(updateResult.isErr()).toBe(true);
	});

	test("should delete an application", async () => {
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

	test("should fail to delete non-existent application", async () => {
		const deleteResult = await repository.deleteById("non-existent-id");
		expect(deleteResult.isErr()).toBe(true);
	});

	test("should find applications by status category", async () => {
		const app1Result = createJobApplication({
			company: "Company 1",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
		});
		const app2Result = createJobApplication({
			company: "Company 2",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
		});

		expect(app1Result.isOk()).toBe(true);
		expect(app2Result.isOk()).toBe(true);
		if (!app1Result.isOk() || !app2Result.isOk()) return;

		const app1 = app1Result.value;
		const app2 = app2Result.value;

		// Add statuses to applications
		app1.newStatus({ category: "active", current: "applied" });
		app2.newStatus({ category: "inactive", current: "rejected" });

		await repository.save(app1);
		await repository.save(app2);

		const activeResult = await repository.findByStatusCategory("active");
		expect(activeResult.isOk()).toBe(true);
		if (!activeResult.isOk()) return;
		expect(activeResult.value).toHaveLength(1);
		expectDefined(activeResult.value[0]);
		expect(activeResult.value[0].company).toBe("Company 1");

		const inactiveResult = await repository.findByStatusCategory("inactive");
		expect(inactiveResult.isOk()).toBe(true);
		if (!inactiveResult.isOk()) return;
		expect(inactiveResult.value).toHaveLength(1);
		expectDefined(inactiveResult.value[0]);
		expect(inactiveResult.value[0].company).toBe("Company 2");
	});

	test("should find overdue applications", async () => {
		const now = new Date();
		const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
		const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day from now

		const overdueAppResult = createJobApplication({
			company: "Overdue Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
			nextEventDate: pastDate.toISOString(),
		});

		const notOverdueAppResult = createJobApplication({
			company: "Not Overdue Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
			nextEventDate: futureDate.toISOString(),
		});

		expect(overdueAppResult.isOk()).toBe(true);
		expect(notOverdueAppResult.isOk()).toBe(true);
		if (!overdueAppResult.isOk() || !notOverdueAppResult.isOk()) return;

		await repository.save(overdueAppResult.value);
		await repository.save(notOverdueAppResult.value);

		const overdueResult = await repository.findOverdue();
		expect(overdueResult.isOk()).toBe(true);
		if (!overdueResult.isOk()) return;

		expect(overdueResult.value).toHaveLength(1);
		expectDefined(overdueResult.value[0]);
		expect(overdueResult.value[0].company).toBe("Overdue Company");
	});
});
