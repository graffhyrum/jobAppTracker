import { expect } from "@playwright/test";
import { test } from "../fixtures/base.ts";

test.describe("Application CRUD", () => {
	test("Click 'add' button", async ({ POMs }) => {
		const home = POMs.homePage;
		const add = POMs.addApplicationPage;

		await home.goto();
		await home.actions.clickAddApplication();

		await expect(add.page).toHaveURL(/.*add/);
		await add.assertions.atAddApplicationPage();
	});
});
