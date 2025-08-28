import { test as base } from "@playwright/test";
import type { PageObject } from "../config/PomInterface.ts";
import { createAddApplicationPage } from "../POMs/addApplicationPagePOM.ts";
import { createHealthPage } from "../POMs/healthPagePOM.ts";
import { createHomePage } from "../POMs/homePagePOM.ts";

type POMRegistry = {
	homePage: PageObject;
	healthPage: PageObject;
	addApplicationPage: PageObject;
};

export type TestFixtures = {
	POMs: POMRegistry;
};

export const test = base.extend<TestFixtures>({
	POMs: async ({ page }, use) => {
		const registry: POMRegistry = {
			homePage: createHomePage(page),
			healthPage: createHealthPage(page),
			addApplicationPage: createAddApplicationPage(page),
		};
		await use(registry);
	},
});
