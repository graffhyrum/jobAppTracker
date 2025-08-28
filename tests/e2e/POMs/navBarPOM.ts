import { expect, type Locator, type Page } from "@playwright/test";
import type { PageObject, PomFactory } from "../config/PomInterface.ts";

function createNavBarPOM(page: Page): PageObject {
	const locators = {
		navbar: page.getByTestId("navbar"),
		brand: page.getByTestId("navbar-brand"),
		homeLink: page.getByTestId("nav-link-home"),
		healthLink: page.getByTestId("nav-link-health"),
		pageTitle: page.getByTestId("page-title"),
	} as const satisfies Record<string, Locator>;

	return {
		page,
		async goto() {
			// NavBar itself doesn't own navigation; noop
		},
		actions: {
			async clickHome() {
				await locators.homeLink.click();
			},
			async clickHealth() {
				await locators.healthLink.waitFor();
				await locators.healthLink.click();
			},
			async clickBrand() {
				await locators.brand.click();
			},
		},
		assertions: {
			async isVisible() {
				await expect(locators.navbar).toBeVisible();
			},
			async brandIsVisible() {
				await expect(locators.brand).toBeVisible();
			},
			async brandHasText(text: string) {
				await expect(locators.brand).toHaveText(text);
			},
			async brandHrefIs(href: string) {
				await expect(locators.brand).toHaveAttribute("href", href);
			},
			async homeLinkVisible() {
				await expect(locators.homeLink).toBeVisible();
			},
			async homeHrefIs(href: string) {
				await expect(locators.homeLink).toHaveAttribute("href", href);
			},
			async healthLinkVisible() {
				await expect(locators.healthLink).toBeVisible();
			},
			async healthHrefIs(href: string) {
				await expect(locators.healthLink).toHaveAttribute("href", href);
			},
			async hasDarkBackground() {
				await expect(locators.navbar).toHaveCSS(
					"background-color",
					"rgb(52, 58, 64)",
				);
			},
			async linksAreWhite() {
				await expect(locators.homeLink).toHaveCSS(
					"color",
					"rgb(255, 255, 255)",
				);
			},
			async pageTitleIs(text: string) {
				await expect(locators.pageTitle).toHaveText(text);
			},
		},
	} as const;
}

export const createNavBar: PomFactory = createNavBarPOM;
export type NavBarObject = ReturnType<typeof createNavBar>;
