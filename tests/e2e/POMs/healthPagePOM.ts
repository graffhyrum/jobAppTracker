import { expect, type Locator, type Page } from "@playwright/test";
import type { PageObject, PomFactory } from "../config/ScreenplayTypes.ts";
import { createNavBar } from "./navBarPOM.ts";

function createHealthPagePOM(page: Page) {
	const locators = {
		pageTitle: page.locator("[data-testid='page-title']"),
	} as const satisfies Record<string, Locator>;

	const navBar = createNavBar(page);

	return {
		page,
		async goto() {
			await page.goto("/health");
		},
		actions: {
			async clickNavHome() {
				await navBar.actions.clickHome();
			},
			async clickNavHealth() {
				await navBar.actions.clickHealth();
			},
		},
		assertions: {
			async onHealthPage() {
				await expect(locators.pageTitle).toHaveText("System Health Check");
			},
			async navIsVisible() {
				await navBar.assertions.isVisible();
			},
			async navBrandIsVisible() {
				await navBar.assertions.brandIsVisible();
			},
			async navBrandHasText(text: string) {
				await navBar.assertions.brandHasText(text);
			},
		},
	} as const satisfies PageObject;
}

export const createHealthPage = createHealthPagePOM satisfies PomFactory;
export type HealthPageObject = ReturnType<typeof createHealthPage>;
