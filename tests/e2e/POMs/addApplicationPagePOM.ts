import { expect, type Locator, type Page } from "@playwright/test";
import type { PageObject, PomFactory } from "../config/PomInterface.ts";
import { createNavBar } from "./navBarPOM.ts";

function createAddApplicationPagePOM(page: Page): PageObject {
	const _locators = {
		// Assuming the page title is present and meaningful for add page
		pageTitle: page.locator("[data-testid='page-title']"),
	} as const satisfies Record<string, Locator>;

	const navBar = createNavBar(page);

	return {
		page,
		async goto() {
			await page.goto("/applications/add");
		},
		actions: {
			async clickNavHome() {
				await navBar.actions.clickHome();
			},
			async clickNavHealth() {
				await navBar.actions.clickHealth();
			},
			async clickNavBrand() {
				await navBar.actions.clickBrand();
			},
		},
		assertions: {
			async atAddApplicationPage() {
				await expect(page).toHaveURL(/.*add/);
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
			async navBrandHrefIs(href: string) {
				await navBar.assertions.brandHrefIs(href);
			},
			async navHomeLinkVisible() {
				await navBar.assertions.homeLinkVisible();
			},
			async navHomeHrefIs(href: string) {
				await navBar.assertions.homeHrefIs(href);
			},
			async navHealthLinkVisible() {
				await navBar.assertions.healthLinkVisible();
			},
			async navHealthHrefIs(href: string) {
				await navBar.assertions.healthHrefIs(href);
			},
			async navHasDarkBackground() {
				await navBar.assertions.hasDarkBackground();
			},
			async navLinksAreWhite() {
				await navBar.assertions.linksAreWhite();
			},
		},
	};
}

export const createAddApplicationPage: PomFactory = createAddApplicationPagePOM;
export type AddApplicationPageObject = ReturnType<
	typeof createAddApplicationPage
>;
