import { expect, type Locator, type Page } from "@playwright/test";
import type { Fn } from "#rootTypes/generic-function.ts";
import {
	LINK_KEYS,
	PAGE_CONFIG,
	type PageConfig,
	type PageLinkKeys,
} from "#src/presentation/components/pageConfig.ts";
import type {
	ComponentFactory,
	ComponentObject,
} from "../config/ScreenplayTypes.ts";

function createNavBarPOM(page: Page) {
	const locators = {
		navbar: page.getByTestId("navbar"),
		brand: page.getByTestId(PAGE_CONFIG.brand.testId),
		homeLink: page.getByTestId(PAGE_CONFIG.links.home.testId),
		healthLink: page.getByTestId(PAGE_CONFIG.links.health.testId),
		pageTitle: page.getByTestId("page-title"),
	} as const satisfies Record<string, Locator>;

	async function clickLink(key: keyof PageConfig["links"]) {
		await page.getByTestId(PAGE_CONFIG.links[key].testId).click();
	}

	/**
	 * Generates reusable action and assertion methods for each link in the navbarConfig.
	 * This avoids repetitive code and ensures consistency across link interactions.
	 */
	function getLinkMethods() {
		return {
			actions: Object.fromEntries(
				LINK_KEYS.flatMap((key) => [
					[`click${key.toUpperCase()}`, async () => await clickLink(key)],
				]),
			) as {
				[K in PageLinkKeys as `click${Capitalize<string & K>}`]: () => Promise<void>;
			},
			assertions: Object.fromEntries(
				LINK_KEYS.flatMap(
					(key) =>
						[
							// return an array of [methodKey, assertionMethod] pairs
							[
								`${key}IsVisible`,
								async () =>
									await expect(
										page.getByTestId(PAGE_CONFIG.links[key].testId),
									).toBeVisible(),
							],
							[
								`${key}HasText`,
								async (text: string) =>
									await expect(
										page.getByTestId(PAGE_CONFIG.links[key].testId),
									).toHaveText(text),
							],
						] as const satisfies Array<[MethodKey, AssertionMethod]>,
				),
			) as {
				[K in keyof PageConfig["links"] as `${string & K}IsVisible`]: () => Promise<void>;
			} & {
				[K in keyof PageConfig["links"] as `${string & K}HasText`]: (
					text: string,
				) => Promise<void>;
			},
		} as const;
	}

	const linkMethods = getLinkMethods();

	// region assertions

	async function isVisible() {
		await expect(locators.navbar).toBeVisible();
	}

	async function brandIsVisible() {
		await expect(locators.brand).toBeVisible();
	}

	async function brandHasText(text: string) {
		await expect(locators.brand).toHaveText(text);
	}

	async function pageHasTitle(text: string) {
		await expect(locators.pageTitle).toHaveText(text);
	}

	// endregion assertions

	return {
		page,
		actions: {
			...linkMethods.actions,
		},
		assertions: {
			...linkMethods.assertions,
			isVisible,
			brandIsVisible,
			brandHasText,
			pageHasTitle,

			async isValid() {
				await isVisible();
				for (const linkKey of LINK_KEYS) {
					await linkMethods.assertions[`${linkKey}IsVisible`]();
					await linkMethods.assertions[`${linkKey}HasText`](
						PAGE_CONFIG.links[linkKey].text,
					);
				}
			},
		},
	} as const satisfies ComponentObject;
}

export const createNavBar = createNavBarPOM satisfies ComponentFactory;
export type NavBarObject = ReturnType<typeof createNavBar>;

type MethodKey = string;
type AssertionMethod = Fn<Promise<void>>;
