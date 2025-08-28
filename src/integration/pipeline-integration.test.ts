import { beforeEach, describe, expect, test } from "bun:test";
import { createJobApplicationUseCases } from "../domain/use-cases/job-application-use-cases";
import { createPipelineConfigUseCases } from "../domain/use-cases/pipeline-config-use-cases";
import { getEntries } from "../helpers/entries.ts";
import { expectDefined } from "../helpers/expectDefined";
import { createJobApplicationMemoryRepository } from "../infrastructure/storage/job-application-memory-repository";
import { createPipelineConfigMemoryRepository } from "../infrastructure/storage/pipeline-config-memory-repository";

describe("Pipeline Integration", () => {
	let jobAppUseCases: ReturnType<typeof createJobApplicationUseCases>;
	let pipelineUseCases: ReturnType<typeof createPipelineConfigUseCases>;

	beforeEach(() => {
		const jobAppRepository = createJobApplicationMemoryRepository();
		const pipelineRepository = createPipelineConfigMemoryRepository();

		jobAppUseCases = createJobApplicationUseCases(jobAppRepository);
		pipelineUseCases = createPipelineConfigUseCases(pipelineRepository);
	});

	test("should create job application with status from pipeline config", async () => {
		const pipelineResult = await pipelineUseCases.getPipelineConfig();
		expect(pipelineResult.isOk()).toBe(true);
		if (!pipelineResult.isOk()) return;

		const pipeline = pipelineResult.value;
		const activeStatuses = pipeline.active;
		const appliedStatus = activeStatuses.find((status) => status === "applied");
		expectDefined(appliedStatus);

		const jobAppResult = await jobAppUseCases.createJobApplication({
			company: "Test Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
		});

		expect(jobAppResult.isOk()).toBe(true);
		if (!jobAppResult.isOk()) return;

		const jobApp = jobAppResult.value;
		jobApp.newStatus({
			category: "active",
			current: "applied",
		});

		await jobAppUseCases.updateJobApplication(jobApp);

		const currentStatus = jobApp.getCurrentStatus();
		expect(currentStatus?.category).toBe("active");
		expect(currentStatus?.current).toBe("applied");
	});

	test("should filter job applications by status category", async () => {
		// Create multiple applications with different statuses
		const app1Result = await jobAppUseCases.createJobApplication({
			company: "Active Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
		});

		const app2Result = await jobAppUseCases.createJobApplication({
			company: "Inactive Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
		});

		expect(app1Result.isOk()).toBe(true);
		expect(app2Result.isOk()).toBe(true);
		if (!app1Result.isOk() || !app2Result.isOk()) return;

		const activeApp = app1Result.value;
		const inactiveApp = app2Result.value;

		// Set statuses using pipeline config
		activeApp.newStatus({ category: "active", current: "interview" });
		inactiveApp.newStatus({ category: "inactive", current: "rejected" });

		await jobAppUseCases.updateJobApplication(activeApp);
		await jobAppUseCases.updateJobApplication(inactiveApp);

		// Test filtering
		const activeAppsResult = await jobAppUseCases.getActiveJobApplications();
		expect(activeAppsResult.isOk()).toBe(true);
		if (!activeAppsResult.isOk()) return;

		const inactiveAppsResult =
			await jobAppUseCases.getInactiveJobApplications();
		expect(inactiveAppsResult.isOk()).toBe(true);
		if (!inactiveAppsResult.isOk()) return;

		const activeApps = activeAppsResult.value;
		const inactiveApps = inactiveAppsResult.value;

		expect(activeApps).toHaveLength(1);
		expect(inactiveApps).toHaveLength(1);
		expectDefined(activeApps[0]);
		expectDefined(inactiveApps[0]);
		expect(activeApps[0].company).toBe("Active Company");
		expect(inactiveApps[0].company).toBe("Inactive Company");
	});

	test("should support custom pipeline statuses", async () => {
		// Add custom status to pipeline
		await pipelineUseCases.addActiveStatus("phone screening");

		const pipelineResult = await pipelineUseCases.getPipelineConfig();
		expect(pipelineResult.isOk()).toBe(true);
		if (!pipelineResult.isOk()) return;

		const pipeline = pipelineResult.value;
		expect(pipeline.active).toContain("phone screening");

		// Use custom status in job application
		const jobAppResult = await jobAppUseCases.createJobApplication({
			company: "Custom Status Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
		});

		expect(jobAppResult.isOk()).toBe(true);
		if (!jobAppResult.isOk()) return;

		const jobApp = jobAppResult.value;
		jobApp.newStatus({
			category: "active",
			current: "screening interview",
		});

		const currentStatus = jobApp.getCurrentStatus();
		expect(currentStatus?.current).toBe("screening interview");
		expect(currentStatus?.category).toBe("active");
	});

	test("should handle pipeline status removal gracefully", async () => {
		const jobAppResult = await jobAppUseCases.createJobApplication({
			company: "Test Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
		});

		expect(jobAppResult.isOk()).toBe(true);
		if (!jobAppResult.isOk()) return;

		const jobApp = jobAppResult.value;
		jobApp.newStatus({ category: "active", current: "applied" });

		// Remove status from pipeline (but job app still has it)
		await pipelineUseCases.removeStatus("applied");

		const pipelineResult = await pipelineUseCases.getPipelineConfig();
		expect(pipelineResult.isOk()).toBe(true);
		if (!pipelineResult.isOk()) return;

		const pipeline = pipelineResult.value;
		expect(pipeline.active).not.toContain("applied");

		// But job app should still have the status
		const currentStatus = jobApp.getCurrentStatus();
		expect(currentStatus?.current).toBe("applied");
	});

	test("should track status transitions over time", async () => {
		const jobAppResult = await jobAppUseCases.createJobApplication({
			company: "Progress Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
		});

		expect(jobAppResult.isOk()).toBe(true);
		if (!jobAppResult.isOk()) return;

		const jobApp = jobAppResult.value;

		// Simulate progression through pipeline
		jobApp.newStatus({ category: "active", current: "applied" });
		await new Promise((resolve) => setTimeout(resolve, 5));

		jobApp.newStatus({ category: "active", current: "screening interview" });
		await new Promise((resolve) => setTimeout(resolve, 5));

		jobApp.newStatus({ category: "active", current: "interview" });
		await new Promise((resolve) => setTimeout(resolve, 5));

		jobApp.newStatus({ category: "active", current: "offer" });

		// Check status log has all entries
		const statusEntries = getEntries(jobApp.statusLog);
		expect(statusEntries.length).toBe(4);

		// Check current status is latest
		const currentStatus = jobApp.getCurrentStatus();
		expect(currentStatus?.current).toBe("offer");

		// Check they're in chronological order (latest first when sorted by timestamp desc)
		const sortedEntries = statusEntries.sort(([a], [b]) => b.localeCompare(a));
		expectDefined(sortedEntries[0]);
		expectDefined(sortedEntries[3]);
		expect(sortedEntries[0][1].current).toBe("offer");
		expect(sortedEntries[3][1].current).toBe("applied");
	});
});
