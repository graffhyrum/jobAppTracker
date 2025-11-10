import { expect } from "@playwright/test";
import { test } from "../fixtures/base.ts";

test.describe("Theme Toggle", () => {
	test.beforeEach(async ({ POMs }) => {
		await POMs.pages.homePage.goto();
	});

	test("should display theme toggle button in navbar", async ({ page }) => {
		const themeToggle = page.getByTestId("theme-toggle");
		await expect(themeToggle).toBeVisible();
		await expect(themeToggle).toHaveAttribute("aria-label", "Toggle dark mode");
	});

	test("should toggle theme when button is clicked", async ({ page }) => {
		const themeToggle = page.getByTestId("theme-toggle");
		const html = page.locator("html");

		// Get initial theme (might be light or dark based on system preference)
		const initialTheme = await html.evaluate((el) => el.dataset.theme);
		const initialIcon = await themeToggle.locator(".theme-icon").textContent();

		// Click the toggle button
		await themeToggle.click();

		// Wait for theme to change
		await page.waitForTimeout(100);

		// Verify theme has changed
		const newTheme = await html.evaluate((el) => el.dataset.theme);
		expect(newTheme).not.toBe(initialTheme);

		// Verify icon has changed
		const newIcon = await themeToggle.locator(".theme-icon").textContent();
		expect(newIcon).not.toBe(initialIcon);

		// Verify icon is correct based on theme
		if (newTheme === "dark") {
			expect(newIcon).toBe("☀️");
		} else {
			expect(newIcon).toBe("🌙");
		}
	});

	test("should persist theme preference in localStorage", async ({ page }) => {
		const themeToggle = page.getByTestId("theme-toggle");
		const html = page.locator("html");

		// Get initial theme
		const initialTheme = await html.evaluate((el) => el.dataset.theme);

		// Toggle theme
		await themeToggle.click();
		await page.waitForTimeout(100);

		// Verify localStorage was updated
		const storedTheme = await page.evaluate(() => {
			return localStorage.getItem("job-app-tracker-theme");
		});
		const newTheme = await html.evaluate((el) => el.dataset.theme);
		expect(storedTheme).toBe(newTheme);
		expect(storedTheme).not.toBe(initialTheme);

		// Reload page and verify theme persists
		await page.reload();
		await page.waitForTimeout(100);

		const persistedTheme = await html.evaluate((el) => el.dataset.theme);
		expect(persistedTheme).toBe(newTheme);
	});

	test("should toggle theme multiple times correctly", async ({ page }) => {
		const themeToggle = page.getByTestId("theme-toggle");
		const html = page.locator("html");

		// Get initial state
		const initialTheme = await html.evaluate((el) => el.dataset.theme);

		// Toggle twice (should return to initial)
		await themeToggle.click();
		await page.waitForTimeout(100);
		const firstToggleTheme = await html.evaluate((el) => el.dataset.theme);

		await themeToggle.click();
		await page.waitForTimeout(100);
		const secondToggleTheme = await html.evaluate((el) => el.dataset.theme);

		// After two toggles, should be back to initial
		expect(secondToggleTheme).toBe(initialTheme);
		expect(firstToggleTheme).not.toBe(initialTheme);
	});
});
