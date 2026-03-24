import { expect, type Page } from "@playwright/test";

import type { ComponentObject } from "../config/ScreenplayTypes.ts";

function createThemeTogglePOM(page: Page) {
	const locators = {
		toggle: page.getByTestId("theme-toggle"),
		html: page.locator("html"),
	};

	const actions = {
		async clickToggle() {
			await locators.toggle.click();
		},
		async getTheme(): Promise<string | null> {
			return locators.html.evaluate((el) => el.dataset.theme ?? null);
		},
		async getIcon(): Promise<string | null> {
			return locators.toggle.locator(".theme-icon").textContent();
		},
	};

	const assertions = {
		async themeIs(expected: string) {
			await expect(locators.html).toHaveAttribute("data-theme", expected);
		},
		async isVisible() {
			await expect(locators.toggle).toBeVisible();
		},
		async hasAriaLabel(label: string) {
			await expect(locators.toggle).toHaveAttribute("aria-label", label);
		},
	};

	return {
		page,
		actions,
		assertions,
	} satisfies ComponentObject;
}

export type ThemeToggleObject = ReturnType<typeof createThemeTogglePOM>;
export const createThemeToggle = createThemeTogglePOM satisfies (
	page: Page,
) => ComponentObject;
