import { expect, type Page } from "@playwright/test";

type NavigationKey = "Tab" | "Shift+Tab";

export async function pressKeyUntilFocused(
	page: Page,
	targetLocator: ReturnType<typeof page.locator>,
	key: NavigationKey,
) {
	let found = false;
	const start = Date.now();
	const timeout = 10 * 1000;

	while (!found && start + timeout > Date.now()) {
		await page.keyboard.press(key);
		const isFocused = await targetLocator
			.evaluate((el) => document.activeElement === el)
			.catch(() => false);
		if (isFocused) found = true;
	}

	expect(found, `Target element was never focused using ${key}`).toBeTruthy();
}
