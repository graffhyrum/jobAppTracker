import { expect, type Locator, type Page } from "@playwright/test";
import type { PageObject, PomFactory } from "../config/ScreenplayTypes.ts";
import { createNavBar } from "./navBarPOM.ts";

function createHomePagePOM(page: Page) {
	const locators = {
		addApplicationBtn: page.getByRole("link", {
			name: "+ Add New Application",
		}),
		pageTitle: page.locator("[data-testid='page-title']"),
	} as const satisfies Record<string, Locator>;

	const navBar = createNavBar(page);

	return {
		page,
		components: {},
		async goto() {
			await page.goto("/");
		},
		actions: {
			async clickAddApplication() {
				await locators.addApplicationBtn.click();
			},
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
	} as const satisfies PageObject;
}

export const createHomePage = createHomePagePOM satisfies PomFactory;
export type HomePageObject = ReturnType<typeof createHomePage>;
