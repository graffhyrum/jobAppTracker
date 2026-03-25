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
	test.beforeEach(async ({ POMs, immutableApp }) => {
		const home = POMs.pages.homePage;
		const pipeline = POMs.components.pipelineTable;

		await home.goto();
		await pipeline.assertions.waitForTableDataToLoad();
		await pipeline.assertions.containsApplicationById(immutableApp.id);
	});

	test("should have exactly one navbar when navigating from list to details page", async ({
		page,
		POMs,
		immutableApp,
	}) => {
		const pipeline = POMs.components.pipelineTable;
		const details = POMs.components.applicationDetails;

		const appRow = pipeline.actions.getRowById(immutableApp.id);
		await appRow.actions.fromView.clickViewButton();

		await page.waitForURL(`**/applications/${immutableApp.id}/details`);

		const appDetails = details.actions.forApp(immutableApp.id);
		await appDetails.actions.waitForContent();

		const { navbar } = POMs.components;
		await navbar.assertions.isValid();
	});

	test("should have exactly one navbar after edit and cancel on details page", async ({
		page,
		POMs,
		immutableApp,
	}) => {
		const pipeline = POMs.components.pipelineTable;
		const details = POMs.components.applicationDetails;

		const appRow = pipeline.actions.getRowById(immutableApp.id);
		await appRow.actions.fromView.clickViewButton();

		await page.waitForURL(`**/applications/${immutableApp.id}/details`);
		const appDetails = details.actions.forApp(immutableApp.id);
		await appDetails.actions.waitForContent();

		const { navbar } = POMs.components;
		await navbar.assertions.isValid();

		await appDetails.actions.clickEdit();
		await details.assertions.editFormIsVisible();
		await navbar.assertions.isValid();

		await appDetails.actions.clickCancel();
		await details.assertions.editFormIsHidden();
		await navbar.assertions.isValid();
	});
});
