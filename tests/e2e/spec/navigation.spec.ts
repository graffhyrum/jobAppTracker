import { expect } from "@playwright/test";
import { test } from "../fixtures/base.ts";

// Using POMs injected via our custom fixture

test.describe("Navigation", () => {
	test("should display navbar on homepage", async ({ POMs }) => {
		const home = POMs.homePage;
		await home.goto();

		await home.assertions.navIsVisible();
		await home.assertions.navBrandIsVisible();
		await home.assertions.navBrandHasText("Job App Tracker");
		await home.assertions.navBrandHrefIs("/");

		await home.assertions.navHomeLinkVisible();
		await home.assertions.navHomeHrefIs("/");

		await home.assertions.navHealthLinkVisible();
		await home.assertions.navHealthHrefIs("/health");
	});

	test("should display navbar on health check page", async ({ POMs }) => {
		const health = POMs.healthPage;
		await health.goto();

		await health.assertions.navIsVisible();
		await health.assertions.navBrandIsVisible();
		await health.assertions.navBrandHasText("Job App Tracker");

		await health.assertions.navHomeLinkVisible();
		await health.assertions.navHealthLinkVisible();
	});

	test("should navigate from homepage to health check", async ({ POMs }) => {
		const home = POMs.homePage;
		const health = POMs.healthPage;

		await home.goto();
		await home.assertions.onHomePage();

		await home.actions.clickNavHealth();
		await expect(health.page).toHaveURL("/health");
		await health.assertions.onHealthPage();
	});

	test("should navigate from health check to homepage", async ({ POMs }) => {
		const health = POMs.healthPage;
		const home = POMs.homePage;

		await health.goto();
		await health.assertions.onHealthPage();

		await health.actions.clickNavHome();
		await expect(home.page).toHaveURL("/");
		await home.assertions.onHomePage();
	});

	test("should navigate via brand logo", async ({ POMs }) => {
		const health = POMs.healthPage;
		const home = POMs.homePage;

		await health.goto();
		await health.assertions.onHealthPage();

		await health.actions.clickNavBrand();
		await expect(home.page).toHaveURL("/");
		await home.assertions.onHomePage();
	});

	test("should have proper navbar styling", async ({ POMs }) => {
		const home = POMs.homePage;
		await home.goto();

		await home.assertions.navHasDarkBackground();
		await home.assertions.navLinksAreWhite();
	});

	test("should be responsive on mobile", async ({ POMs }) => {
		const home = POMs.homePage;
		const health = POMs.healthPage;
		await home.page.setViewportSize({ width: 375, height: 667 });
		await home.goto();

		await home.assertions.navIsVisible();

		await home.actions.clickNavHealth();
		await expect(health.page).toHaveURL("/health");
	});
});
