import { expect, type Page } from "@playwright/test";
import type { ComponentObject } from "../config/ScreenplayTypes.ts";

export function createJobApplicationRowComponent(
	page: Page,
	applicationId: string,
) {
	const locators = {
		row: page.locator(`[data-testid="application-row-${applicationId}"]`),
		companyCell: page.locator(`[data-testid="company-cell-${applicationId}"]`),
		positionCell: page.locator(
			`[data-testid="position-cell-${applicationId}"]`,
		),
		statusCell: page.locator(`[data-testid="status-cell-${applicationId}"]`),
		statusBadge: page.locator(`[data-testid="status-badge-${applicationId}"]`),
		interestCell: page.locator(
			`[data-testid="interest-cell-${applicationId}"]`,
		),
		nextEventCell: page.locator(
			`[data-testid="next-event-cell-${applicationId}"]`,
		),
		nextEventDate: page.locator(
			`[data-testid="next-event-date-${applicationId}"]`,
		),
		actionsCell: page.locator(`[data-testid="actions-cell-${applicationId}"]`),
		editBtn: page.locator(`[data-testid="edit-btn-${applicationId}"]`),
		viewBtn: page.locator(`[data-testid="view-btn-${applicationId}"]`),
		deleteBtn: page.locator(`[data-testid="delete-btn-${applicationId}"]`),

		// Edit mode elements (row-level)
		companyInput: page.locator(
			`[data-testid="edit-input-company-${applicationId}"]`,
		),
		positionInput: page.locator(
			`[data-testid="edit-input-position-${applicationId}"]`,
		),
		statusSelect: page.locator(
			`[data-testid="edit-select-status-${applicationId}"]`,
		),
		interestSelect: page.locator(
			`[data-testid="edit-select-interest-${applicationId}"]`,
		),
		nextEventInput: page.locator(
			`[data-testid="edit-input-nextEvent-${applicationId}"]`,
		),
		saveBtn: page.locator(`[data-testid="save-btn-${applicationId}"]`),
		cancelBtn: page.locator(`[data-testid="cancel-btn-${applicationId}"]`),
	};

	async function clickEditButton() {
		await expect(locators.editBtn).toBeVisible({ timeout: 10000 });
		await locators.editBtn.click();
		await locators.editBtn.waitFor({ state: "hidden" });
	}

	async function clickViewButton() {
		await locators.viewBtn.click();
	}

	async function enterTextValue(value: string) {
		// Prefer company input if present, otherwise position or next event
		if (await locators.companyInput.isVisible().catch(() => false)) {
			await locators.companyInput.fill(value);
			return;
		}
		if (await locators.positionInput.isVisible().catch(() => false)) {
			await locators.positionInput.fill(value);
			return;
		}
		if (await locators.nextEventInput.isVisible().catch(() => false)) {
			await locators.nextEventInput.fill(value);
		}
	}

	async function selectDropdownValue(value: string) {
		if (await locators.statusSelect.isVisible().catch(() => false)) {
			await locators.statusSelect.selectOption(value);
			return;
		}
		if (await locators.interestSelect.isVisible().catch(() => false)) {
			await locators.interestSelect.selectOption(value);
		}
	}

	async function clickSave() {
		await locators.saveBtn.click();
	}

	async function clickCancel() {
		await locators.cancelBtn.click();
	}

	async function editCompanyName(newValue: string) {
		await clickEditButton();
		await locators.companyInput.fill(newValue);
		await clickSave();
		await expect(locators.companyInput).not.toBeVisible();
	}

	async function editPositionTitle(newValue: string) {
		await clickEditButton();
		await locators.positionInput.fill(newValue);
		await clickSave();
		await expect(locators.positionInput).not.toBeVisible();
	}

	async function editStatus(newStatus: string) {
		await clickEditButton();
		await locators.statusSelect.selectOption(newStatus);
		await clickSave();
		await expect(locators.statusSelect).not.toBeVisible();
	}

	async function editInterestRating(rating: string) {
		await clickEditButton();
		await locators.interestSelect.selectOption(rating);
		await clickSave();
		await expect(locators.interestSelect).not.toBeVisible();
	}

	async function editNextEventDate(date: string) {
		await clickEditButton();
		await locators.nextEventInput.fill(date);
		await clickSave();
		await expect(locators.nextEventInput).not.toBeVisible();
	}

	async function cancelEdit() {
		await clickCancel();
	}

	async function isVisible() {
		await expect(locators.row).toBeVisible();
	}

	async function companyNameEquals(expectedValue: string) {
		await expect(locators.companyCell).toHaveText(expectedValue);
	}

	async function positionTitleEquals(expectedValue: string) {
		await expect(locators.positionCell).toHaveText(expectedValue);
	}

	async function statusEquals(expectedValue: string) {
		await expect(locators.statusBadge).toHaveText(expectedValue);
	}

	async function interestRatingEquals(expectedRating: string) {
		await expect(locators.interestCell).toHaveText(expectedRating);
	}

	async function nextEventDateContains(expectedDate: string) {
		await expect(locators.nextEventDate).toContainText(expectedDate);
	}

	async function editFormIsVisible() {
		await expect(locators.row).toHaveClass(/editing/);
		await expect(locators.saveBtn).toBeVisible();
		await expect(locators.cancelBtn).toBeVisible();
	}

	async function noEditFormVisible() {
		await expect(locators.row).not.toHaveClass(/editing/);
	}

	async function editableHoverStateVisible(
		_cellType: "company" | "position" | "status" | "interest" | "nextEvent",
	) {
		// In the new pattern, ensure the Edit button is visible in the actions cell
		await expect(locators.editBtn).toBeVisible();
	}

	async function clickDeleteButton() {
		await expect(locators.deleteBtn).toBeVisible();
		await locators.deleteBtn.click();
	}

	async function deleteAndConfirm() {
		page.once("dialog", (d) => d.accept());
		await locators.deleteBtn.click();
	}

	async function deleteAndCancel() {
		page.once("dialog", (d) => d.dismiss());
		await locators.deleteBtn.click();
	}

	async function rowIsNotVisible() {
		await expect(locators.row).toHaveCount(0);
	}

	return {
		page,
		locators,
		actions: {
			clickEditButton,
			clickViewButton,
			enterTextValue,
			selectDropdownValue,
			clickSave,
			clickCancel,
			editCompanyName,
			editPositionTitle,
			editStatus,
			editInterestRating,
			editNextEventDate,
			cancelEdit,
			clickDeleteButton,
			deleteAndConfirm,
			deleteAndCancel,
		},
		assertions: {
			isVisible,
			companyNameEquals,
			positionTitleEquals,
			statusEquals,
			interestRatingEquals,
			nextEventDateContains,
			editFormIsVisible,
			noEditFormVisible,
			editableHoverStateVisible,
			rowIsNotVisible,
		},
	} as const satisfies ComponentObject;
}

export type JobApplicationRowComponent = ReturnType<
	typeof createJobApplicationRowComponent
>;
