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
		viewBtn: page.locator(`[data-testid="view-btn-${applicationId}"]`),

		// Edit form elements
		editForm: page.locator(`[data-testid="edit-form-${applicationId}"]`),
		editInput: page.locator(`[data-testid="edit-input-${applicationId}"]`),
		editSelect: page.locator(`[data-testid="edit-select-${applicationId}"]`),
		saveBtn: page.locator(`[data-testid="save-btn-${applicationId}"]`),
		cancelBtn: page.locator(`[data-testid="cancel-btn-${applicationId}"]`),
		editButtons: page.locator(`[data-testid="edit-buttons-${applicationId}"]`),
	};

	async function clickCompanyCell() {
		await locators.companyCell.click();
	}

	async function clickPositionCell() {
		await locators.positionCell.click();
	}

	async function clickStatusCell() {
		await locators.statusCell.click();
	}

	async function clickInterestCell() {
		await locators.interestCell.click();
	}

	async function clickNextEventCell() {
		await locators.nextEventCell.click();
	}

	async function clickViewButton() {
		await locators.viewBtn.click();
	}

	async function enterTextValue(value: string) {
		await locators.editInput.fill(value);
	}

	async function selectDropdownValue(value: string) {
		await locators.editSelect.selectOption(value);
	}

	async function clickSave() {
		await locators.saveBtn.click();
	}

	async function clickCancel() {
		await locators.cancelBtn.click();
	}

	async function editCompanyName(newValue: string) {
		await clickCompanyCell();
		await enterTextValue(newValue);
		await clickSave();
		// Wait for the edit form to disappear (indicates the update completed)
		await expect(locators.editInput.or(locators.editSelect)).not.toBeVisible();
	}

	async function editPositionTitle(newValue: string) {
		await clickPositionCell();
		await enterTextValue(newValue);
		await clickSave();
		// Wait for the edit form to disappear (indicates the update completed)
		await expect(locators.editInput.or(locators.editSelect)).not.toBeVisible();
	}

	async function editStatus(newStatus: string) {
		await clickStatusCell();
		await selectDropdownValue(newStatus);
		await clickSave();
		// Wait for the edit form to disappear (indicates the update completed)
		await expect(locators.editInput.or(locators.editSelect)).not.toBeVisible();
	}

	async function editInterestRating(rating: string) {
		await clickInterestCell();
		await selectDropdownValue(rating);
		await clickSave();
		// Wait for the edit form to disappear (indicates the update completed)
		await expect(locators.editInput.or(locators.editSelect)).not.toBeVisible();
	}

	async function editNextEventDate(date: string) {
		await clickNextEventCell();
		await locators.editInput.fill(date);
		await clickSave();
		// Wait for the edit form to disappear (indicates the update completed)
		await expect(locators.editInput.or(locators.editSelect)).not.toBeVisible();
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
		await expect(locators.editInput.or(locators.editSelect)).toBeVisible();
		await expect(locators.saveBtn).toBeVisible();
		await expect(locators.cancelBtn).toBeVisible();
	}

	async function noEditFormVisible() {
		await expect(locators.editForm).not.toBeVisible();
	}

	async function editableHoverStateVisible(
		cellType: "company" | "position" | "status" | "interest" | "nextEvent",
	) {
		const cellLocatorMap = {
			company: locators.companyCell,
			position: locators.positionCell,
			status: locators.statusCell,
			interest: locators.interestCell,
			nextEvent: locators.nextEventCell,
		} as const;

		const cellLocator = cellLocatorMap[cellType];
		if (!cellLocator) {
			throw new Error(`Invalid cell type: ${cellType}`);
		}

		await cellLocator.hover();
		await expect(cellLocator).toHaveCSS("cursor", "pointer");
	}

	return {
		page,
		components: {},
		actions: {
			clickCompanyCell,
			clickPositionCell,
			clickStatusCell,
			clickInterestCell,
			clickNextEventCell,
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
		},
	} as const satisfies ComponentObject;
}

export type JobApplicationRowComponent = ReturnType<
	typeof createJobApplicationRowComponent
>;
