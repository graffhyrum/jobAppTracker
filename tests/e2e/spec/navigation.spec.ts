import type { PageLinkKeys } from "#src/presentation/components/pageConfig.ts";
import { type PagePOMRegistry, test } from "../fixtures/base.ts";

const pageMatrix = [
	{
		name: "Homepage",
		pomKey: "homePage",
		linkKey: "home",
	},
	{
		name: "Health Check",
		pomKey: "healthPage",
		linkKey: "health",
	},
] as const satisfies Array<{
	name: string;
	linkKey: string & PageLinkKeys;
	pomKey: keyof PagePOMRegistry;
}>;

for (const { name, pomKey } of pageMatrix) {
	test.beforeEach(async ({ POMs }) => {
		const thisPageObject = POMs.pages[pomKey];
		await thisPageObject.goto();
	});
	test.describe(`Navigation - ${name}`, () => {
		test(`should display navbar on ${name}`, async ({ POMs }) => {
			const { navbar } = POMs.components;
			await navbar.assertions.isValid();
		});

		// from each page, navigate to all other pages, assert url and nav visibility
		test(`should navigate from ${name}`, async ({ POMs }) => {
			const { navbar } = POMs.components;
			const otherMatrixItems = pageMatrix.filter((p) => p.pomKey !== pomKey);
			for (const otherMatrixItem of otherMatrixItems) {
				await test.step(`click link ${otherMatrixItem.name}`, async () => {
					await navbar.actions[
						`click${otherMatrixItem.linkKey.toUpperCase() as Capitalize<PageLinkKeys>}`
					]();
				});

				await test.step("assert navbar", async () => {
					await navbar.assertions.isValid();
				});
			}
		});
	});
}

test.describe("Navigation - Application Details", () => {
	test.beforeEach(async ({ POMs, testJobApplication }) => {
		const home = POMs.pages.homePage;
		const pipeline = POMs.components.pipelineTable;

		// Navigate to homepage and ensure table is loaded
		await home.goto();
		await pipeline.assertions.waitForTableDataToLoad();

		// Verify our test application is visible in the table
		await pipeline.assertions.containsApplicationById(testJobApplication.id);
	});

	test("should have exactly one navbar when navigating from list to details page", async ({
		page,
		POMs,
		testJobApplication,
	}) => {
		const pipeline = POMs.components.pipelineTable;

		// Get the row component for our test application
		const appRow = pipeline.actions.getRowById(testJobApplication.id);

		// Click the view button to navigate to details page
		await appRow.actions.fromView.clickViewButton();

		// Wait for navigation to complete
		await page.waitForURL(`**/applications/${testJobApplication.id}/details`);

		// Wait for page to be loaded (check for details content)
		await page
			.locator(`[data-testid="details-content-${testJobApplication.id}"]`)
			.waitFor();

		// Assert that there is exactly one navbar
		const { navbar } = POMs.components;
		await navbar.assertions.isValid();
	});

	test("should have exactly one navbar after edit and cancel on details page", async ({
		page,
		POMs,
		testJobApplication,
	}) => {
		const pipeline = POMs.components.pipelineTable;

		// Get the row component and navigate to details
		const appRow = pipeline.actions.getRowById(testJobApplication.id);
		await appRow.actions.fromView.clickViewButton();

		// Wait for navigation to details page
		await page.waitForURL(`**/applications/${testJobApplication.id}/details`);
		await page
			.locator(`[data-testid="details-content-${testJobApplication.id}"]`)
			.waitFor();

		// Verify initial state: one navbar
		const { navbar } = POMs.components;
		await navbar.assertions.isValid();

		// Click the Edit button on the details page
		const editButton = page.locator(
			`[data-testid="edit-details-btn-${testJobApplication.id}"]`,
		);
		await editButton.click();

		// Wait for edit mode to activate (form should be visible)
		await page.locator("#details-form").waitFor();

		// Verify navbar count during edit mode: still one navbar
		await navbar.assertions.isValid();

		// Click the Cancel button to return to view mode
		const cancelButton = page.locator(
			`[data-testid="cancel-details-btn-${testJobApplication.id}"]`,
		);
		await cancelButton.click();

		// Wait for view mode to return (edit form should be hidden)
		await page.locator("#details-form").waitFor({ state: "hidden" });

		// Verify final state: exactly one navbar
		await navbar.assertions.isValid();
	});
});
