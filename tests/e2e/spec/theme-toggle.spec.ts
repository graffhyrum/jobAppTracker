import { expect } from "@playwright/test";

import { test } from "../fixtures/base.ts";

test.describe("Theme Toggle", () => {
	test.beforeEach(async ({ POMs }) => {
		await POMs.pages.homePage.goto();
	});

	test("should display theme toggle button in navbar", async ({ POMs }) => {
		const { themeToggle } = POMs.components;
		await themeToggle.assertions.isVisible();
		await themeToggle.assertions.hasAriaLabel("Switch to dark mode");
	});

	test("should toggle theme when button is clicked", async ({ POMs }) => {
		const { themeToggle } = POMs.components;

		// Get initial theme
		const initialTheme = await themeToggle.actions.getTheme();
		const initialIcon = await themeToggle.actions.getIcon();

		// Click the toggle button
		await themeToggle.actions.clickToggle();

		// Verify theme has changed via DOM assertion (replaces waitForTimeout)
		const expectedTheme = initialTheme === "dark" ? "light" : "dark";
		await themeToggle.assertions.themeIs(expectedTheme);

		// Verify icon has changed
		const newIcon = await themeToggle.actions.getIcon();
		expect(newIcon).not.toBe(initialIcon);

		// Verify icon is correct based on theme
		if (expectedTheme === "dark") {
			expect(newIcon).toBe("☀️");
		} else {
			expect(newIcon).toBe("🌙");
		}
	});

	test("should persist theme preference in localStorage", async ({
		page,
		POMs,
	}) => {
		const { themeToggle } = POMs.components;

		// Get initial theme
		const initialTheme = await themeToggle.actions.getTheme();

		// Toggle theme
		await themeToggle.actions.clickToggle();

		// Wait for theme change via DOM assertion (replaces waitForTimeout)
		const expectedTheme = initialTheme === "dark" ? "light" : "dark";
		await themeToggle.assertions.themeIs(expectedTheme);

		// Verify localStorage was updated
		const storedTheme = await page.evaluate(() => {
			return localStorage.getItem("job-app-tracker-theme");
		});
		expect(storedTheme).toBe(expectedTheme);
		expect(storedTheme).not.toBe(initialTheme);

		// Reload page and verify theme persists
		await page.reload();
		await themeToggle.assertions.themeIs(expectedTheme);
	});

	test("should toggle theme multiple times correctly", async ({ POMs }) => {
		const { themeToggle } = POMs.components;

		// Get initial state
		const initialTheme = await themeToggle.actions.getTheme();
		if (initialTheme === null) throw new Error("No initial theme found");
		const oppositeTheme = initialTheme === "dark" ? "light" : "dark";

		// Toggle once — should change
		await themeToggle.actions.clickToggle();
		await themeToggle.assertions.themeIs(oppositeTheme);

		// Toggle again — should return to initial
		await themeToggle.actions.clickToggle();
		await themeToggle.assertions.themeIs(initialTheme);
	});
});
