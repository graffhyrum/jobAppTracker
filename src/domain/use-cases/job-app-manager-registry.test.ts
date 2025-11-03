import { describe, expect, it } from "bun:test";
import { jobAppManagerRegistry } from "./create-sqlite-job-app-manager";

describe("JobAppManagerRegistry", () => {
	it("has default environment from process.env", () => {
		// The default environment comes from processEnv.JOB_APP_MANAGER_TYPE
		const defaultEnv = jobAppManagerRegistry.getDefaultEnvironment();
		expect(defaultEnv).toMatch(/^(test|prod)$/);
	});

	it("can get test environment manager", () => {
		const testManager = jobAppManagerRegistry.getManager("test");

		expect(testManager).toBeDefined();
		expect(typeof testManager.createJobApplication).toBe("function");
		expect(typeof testManager.getJobApplication).toBe("function");
		expect(typeof testManager.getAllJobApplications).toBe("function");
		expect(typeof testManager.updateJobApplication).toBe("function");
		expect(typeof testManager.deleteJobApplication).toBe("function");
	});

	it("can get prod environment manager", () => {
		const prodManager = jobAppManagerRegistry.getManager("prod");

		expect(prodManager).toBeDefined();
		expect(typeof prodManager.createJobApplication).toBe("function");
		expect(typeof prodManager.getJobApplication).toBe("function");
		expect(typeof prodManager.getAllJobApplications).toBe("function");
		expect(typeof prodManager.updateJobApplication).toBe("function");
		expect(typeof prodManager.deleteJobApplication).toBe("function");
	});

	it("returns same manager instance for same environment (cached)", () => {
		const testManager1 = jobAppManagerRegistry.getManager("test");
		const testManager2 = jobAppManagerRegistry.getManager("test");

		// Should be the same instance (cached)
		expect(testManager1).toBe(testManager2);

		const prodManager1 = jobAppManagerRegistry.getManager("prod");
		const prodManager2 = jobAppManagerRegistry.getManager("prod");

		// Should be the same instance (cached)
		expect(prodManager1).toBe(prodManager2);
	});

	it("returns different managers for different environments", async () => {
		// Get test and prod managers
		const testManager = jobAppManagerRegistry.getManager("test");
		const prodManager = jobAppManagerRegistry.getManager("prod");

		// Clear test database and create a test application
		await testManager.clearAllJobApplications();
		const testAppResult = await testManager.createJobApplication({
			company: "Test Company",
			positionTitle: "Test Position",
			applicationDate: new Date().toISOString(),
			interestRating: 3,
			sourceType: "company_website",
			isRemote: false,
		});

		expect(testAppResult.isOk()).toBe(true);

		const testAppsResult = await testManager.getAllJobApplications();
		expect(testAppsResult.isOk()).toBe(true);

		if (!testAppsResult.isOk()) {
			throw new Error("Failed to get test applications");
		}

		const testApps = testAppsResult.value;
		expect(testApps).toHaveLength(1);

		// Prod manager should have independent database
		const prodAppsResult = await prodManager.getAllJobApplications();
		expect(prodAppsResult.isOk()).toBe(true);

		if (!prodAppsResult.isOk()) {
			throw new Error("Failed to get prod applications");
		}

		const prodApps = prodAppsResult.value;

		// Prod database should not have the test application
		expect(prodApps).not.toContainEqual(testApps[0]);

		// Clean up test database
		await testManager.clearAllJobApplications();
	});
});
