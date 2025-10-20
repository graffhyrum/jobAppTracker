import { expect, type Locator, type Page } from "@playwright/test";
import type { PageObject, PomFactory } from "../config/ScreenplayTypes.ts";
import { createNavBar } from "./navBarPOM.ts";

function createHomePagePOM(page: Page) {
	const locators = {
		pageTitle: page.locator("[data-testid='page-title']"),
		addApplicationForm: page.locator(".add-application-form"),
	} as const satisfies Record<string, Locator>;

	const navBar = createNavBar(page);

	return {
		page,
		async goto() {
			await page.goto("/");
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
			async onHomePage() {
				await expect(locators.pageTitle).toHaveText("Job App Tracker");
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

export const createHomePage = createHomePagePOM satisfies PomFactory;
export type HomePageObject = ReturnType<typeof createHomePage>;
