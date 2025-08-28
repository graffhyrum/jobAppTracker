import { beforeEach, describe, expect, test } from "bun:test";
import { expectDefined } from "../../helpers/expectDefined";
import { createJobApplicationMemoryRepository } from "../../infrastructure/storage/job-application-memory-repository";
import type { JobApplicationUseCases } from "./job-application-use-cases";
import { createJobApplicationUseCases } from "./job-application-use-cases";

describe("JobApplicationUseCases", () => {
	let useCases: JobApplicationUseCases;

	beforeEach(() => {
		const repository = createJobApplicationMemoryRepository();
		useCases = createJobApplicationUseCases(repository);
	});

	test("should create a new job application", async () => {
		const result = await useCases.createJobApplication({
			company: "Test Company",
			positionTitle: "Software Developer",
			applicationDate: new Date().toISOString(),
		});

		expect(result.isOk()).toBe(true);
		if (!result.isOk()) return;

		const app = result.value;
		expect(app.company).toBe("Test Company");
		expect(app.positionTitle).toBe("Software Developer");
		expectDefined(app.id);
	});

	test("should get a job application by id", async () => {
		const createResult = await useCases.createJobApplication({
			company: "Test Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
		});

		expect(createResult.isOk()).toBe(true);
		if (!createResult.isOk()) return;

		const createdApp = createResult.value;
		const getResult = await useCases.getJobApplication(createdApp.id);

		expect(getResult.isOk()).toBe(true);
		if (!getResult.isOk()) return;

		const retrievedApp = getResult.value;
		expect(retrievedApp).not.toBeNull();
		expect(retrievedApp?.id).toBe(createdApp.id);
		expect(retrievedApp?.company).toBe("Test Company");
	});

	test("should get all job applications", async () => {
		await useCases.createJobApplication({
			company: "Company 1",
			positionTitle: "Developer 1",
			applicationDate: new Date().toISOString(),
		});

		await useCases.createJobApplication({
			company: "Company 2",
			positionTitle: "Developer 2",
			applicationDate: new Date().toISOString(),
		});

		const result = await useCases.getAllJobApplications();
		expect(result.isOk()).toBe(true);
		if (!result.isOk()) return;

		const apps = result.value;
		expect(apps).toHaveLength(2);
		expect(apps.map((app) => app.company)).toEqual(
			expect.arrayContaining(["Company 1", "Company 2"]),
		);
	});

	test("should update a job application", async () => {
		const createResult = await useCases.createJobApplication({
			company: "Original Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
		});

		expect(createResult.isOk()).toBe(true);
		if (!createResult.isOk()) return;

		const app = createResult.value;
		app.update({
			id: createResult._unsafeUnwrap().id,
			company: "Updated Company",
		});

		const updateResult = await useCases.updateJobApplication(app);
		expect(updateResult.isOk()).toBe(true);

		const getResult = await useCases.getJobApplication(app.id);
		expect(getResult.isOk()).toBe(true);
		if (!getResult.isOk()) return;

		const updatedApp = getResult.value;
		expect(updatedApp?.company).toBe("Updated Company");
	});

	test("should delete a job application", async () => {
		const createResult = await useCases.createJobApplication({
			company: "Test Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
		});

		expect(createResult.isOk()).toBe(true);
		if (!createResult.isOk()) return;

		const app = createResult.value;
		const deleteResult = await useCases.deleteJobApplication(app.id);
		expect(deleteResult.isOk()).toBe(true);

		const getResult = await useCases.getJobApplication(app.id);
		expect(getResult.isOk()).toBe(true);
		if (!getResult.isOk()) return;
		expect(getResult.value).toBeNull();
	});

	test("should get active job applications", async () => {
		const activeAppResult = await useCases.createJobApplication({
			company: "Active Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
		});

		const inactiveAppResult = await useCases.createJobApplication({
			company: "Inactive Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
		});

		expect(activeAppResult.isOk()).toBe(true);
		expect(inactiveAppResult.isOk()).toBe(true);
		if (!activeAppResult.isOk() || !inactiveAppResult.isOk()) return;

		const activeApp = activeAppResult.value;
		const inactiveApp = inactiveAppResult.value;

		activeApp.newStatus({ category: "active", current: "applied" });
		inactiveApp.newStatus({ category: "inactive", current: "rejected" });

		await useCases.updateJobApplication(activeApp);
		await useCases.updateJobApplication(inactiveApp);

		const activeResult = await useCases.getActiveJobApplications();
		expect(activeResult.isOk()).toBe(true);
		if (!activeResult.isOk()) return;

		const activeApps = activeResult.value;
		expect(activeApps).toHaveLength(1);
		expectDefined(activeApps[0]);
		expect(activeApps[0].company).toBe("Active Company");
	});

	test("should get inactive job applications", async () => {
		const inactiveAppResult = await useCases.createJobApplication({
			company: "Inactive Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
		});

		expect(inactiveAppResult.isOk()).toBe(true);
		if (!inactiveAppResult.isOk()) return;

		const inactiveApp = inactiveAppResult.value;
		inactiveApp.newStatus({ category: "inactive", current: "rejected" });
		await useCases.updateJobApplication(inactiveApp);

		const inactiveResult = await useCases.getInactiveJobApplications();
		expect(inactiveResult.isOk()).toBe(true);
		if (!inactiveResult.isOk()) return;

		const inactiveApps = inactiveResult.value;
		expect(inactiveApps).toHaveLength(1);
		expectDefined(inactiveApps[0]);
		expect(inactiveApps[0].company).toBe("Inactive Company");
	});

	test("should get overdue job applications", async () => {
		const now = new Date();
		const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago

		const overdueAppResult = await useCases.createJobApplication({
			company: "Overdue Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
			nextEventDate: pastDate.toISOString(),
		});

		expect(overdueAppResult.isOk()).toBe(true);
		if (!overdueAppResult.isOk()) return;

		const overdueResult = await useCases.getOverdueJobApplications();
		expect(overdueResult.isOk()).toBe(true);
		if (!overdueResult.isOk()) return;

		const overdueApps = overdueResult.value;
		expect(overdueApps).toHaveLength(1);
		expectDefined(overdueApps[0]);
		expect(overdueApps[0].company).toBe("Overdue Company");
		expect(overdueApps[0].isOverdue()).toBe(true);
	});
});
