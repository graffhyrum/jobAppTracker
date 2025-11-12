import { expect } from "@playwright/test";
import { test } from "../fixtures/base.ts";

test.beforeEach(async ({ POMs, testJobApplication }) => {
	const home = POMs.pages.homePage;
	const pipeline = POMs.components.pipelineTable;

	// Navigate to homepage and ensure table is loaded
	await home.goto();
	await pipeline.assertions.waitForTableDataToLoad();

	// Verify our test application is visible in the table
	await pipeline.assertions.containsApplicationById(testJobApplication.id);
});

test.describe("Application table sorting - column name validation", () => {
	test("should accept updatedAt as valid sortColumn", async ({
		POMs: {
			components: { pipelineTable },
		},
		page,
	}) => {
		// Navigate with updatedAt sort parameter
		const response = await page.goto(
			"http://localhost:3000/?sortColumn=updatedAt&sortDirection=asc",
		);

		// Page should load successfully (no 400 error from validation)
		expect(response?.status()).not.toBe(400);

		// Table should be visible with data
		await pipelineTable.assertions.hasApplications();
	});

	test("should accept positionTitle as valid sortColumn", async ({
		POMs: {
			components: { pipelineTable },
		},
		page,
	}) => {
		// Navigate with positionTitle sort parameter
		const response = await page.goto(
			"http://localhost:3000/?sortColumn=positionTitle&sortDirection=asc",
		);

		// Page should load successfully (no 400 error from validation)
		expect(response?.status()).not.toBe(400);

		// Table should be visible with data
		await pipelineTable.assertions.hasApplications();
	});

	test("should handle deprecated column name 'lastUpdated' gracefully", async ({
		POMs: {
			components: { pipelineTable },
		},
		page,
	}) => {
		// Try to sort by deprecated lastUpdated column
		await page.goto(
			"http://localhost:3000/?sortColumn=lastUpdated&sortDirection=asc",
		);

		// Application should still load (likely with validation error or fallback)
		await page.waitForLoadState("networkidle");

		// Table should still be visible and functional
		await pipelineTable.assertions.tableIsVisible();
	});

	test("should handle deprecated column name 'position' gracefully", async ({
		POMs: {
			components: { pipelineTable },
		},
		page,
	}) => {
		// Try to sort by deprecated position column
		await page.goto(
			"http://localhost:3000/?sortColumn=position&sortDirection=asc",
		);

		// Application should still load (likely with validation error or fallback)
		await page.waitForLoadState("networkidle");

		// Table should still be visible and functional
		await pipelineTable.assertions.tableIsVisible();
	});
});
