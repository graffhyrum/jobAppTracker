import { expect, type Page } from "@playwright/test";

import type { ComponentObject } from "../config/ScreenplayTypes.ts";

function createApplicationDetailsPOM(page: Page) {
	const locators = {
		detailsForm: page.locator("#details-form"),
	};

	function forApp(appId: string) {
		const appLocators = {
			content: page.locator(`[data-testid="details-content-${appId}"]`),
			editButton: page.locator(`[data-testid="edit-details-btn-${appId}"]`),
			cancelButton: page.locator(`[data-testid="cancel-details-btn-${appId}"]`),
		};

		return {
			actions: {
				async waitForContent() {
					await appLocators.content.waitFor();
				},
				async clickEdit() {
					await appLocators.editButton.click();
				},
				async clickCancel() {
					await appLocators.cancelButton.click();
				},
			},
			assertions: {
				async contentIsVisible() {
					await expect(appLocators.content).toBeVisible();
				},
			},
		};
	}

	const actions = {
		forApp,
	};

	const assertions = {
		async editFormIsVisible() {
			await locators.detailsForm.waitFor();
		},
		async editFormIsHidden() {
			await locators.detailsForm.waitFor({ state: "hidden" });
		},
	};

	return {
		page,
		actions,
		assertions,
	} satisfies ComponentObject;
}

export type ApplicationDetailsObject = ReturnType<
	typeof createApplicationDetailsPOM
>;
export const createApplicationDetails = createApplicationDetailsPOM satisfies (
	page: Page,
) => ComponentObject;
