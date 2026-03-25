import { expect } from "@playwright/test";

import { test } from "../fixtures/base.ts";

test.beforeEach(async ({ POMs, immutableApp }) => {
	const home = POMs.pages.homePage;
	const pipeline = POMs.components.pipelineTable;

	await home.goto();
	await pipeline.assertions.waitForTableDataToLoad();
	await pipeline.assertions.containsApplicationById(immutableApp.id);
});

test.describe("Application table sorting - column name validation", () => {
	test("should accept updatedAt as valid sortColumn", async ({
		POMs: {
			components: { pipelineTable },
		},
		page,
	}) => {
		const response = await page.goto(
			"/?sortColumn=updatedAt&sortDirection=asc",
		);

		expect(response?.status()).not.toBe(400);
		await pipelineTable.assertions.hasApplications();
	});

	test("should accept positionTitle as valid sortColumn", async ({
		POMs: {
			components: { pipelineTable },
		},
		page,
	}) => {
		const response = await page.goto(
			"/?sortColumn=positionTitle&sortDirection=asc",
		);

		expect(response?.status()).not.toBe(400);
		await pipelineTable.assertions.hasApplications();
	});

	test("should handle deprecated column name 'lastUpdated' gracefully", async ({
		POMs: {
			components: { pipelineTable },
		},
		page,
	}) => {
		await page.goto(
			"/?sortColumn=lastUpdated&sortDirection=asc",
		);

		await pipelineTable.assertions.tableIsVisible();
	});

	test("should handle deprecated column name 'position' gracefully", async ({
		POMs: {
			components: { pipelineTable },
		},
		page,
	}) => {
		await page.goto(
			"/?sortColumn=position&sortDirection=asc",
		);

		await pipelineTable.assertions.tableIsVisible();
	});
});
