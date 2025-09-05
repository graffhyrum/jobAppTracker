import { expect, type Page } from "@playwright/test";
import type {
	LocatorConfigMap,
	PageObject,
	PomFactory,
} from "../config/ScreenplayTypes.ts";
import {
	createJobApplicationRowComponent,
	type JobApplicationRowComponent,
} from "./jobApplicationRowComponent.ts";

function createPipelineTablePOM(page: Page) {
	const locators = {
		// Table structure
		table: page.locator('[data-testid="applications-table"]'),
		tbody: page.locator('[data-testid="applications-tbody"]'),
		container: page.locator('[data-testid="pipeline-container"]'),

		// Generic selectors for when we don't know the app ID
		editableCells: page.locator(".editable-cell"),
		editingCells: page.locator(".editing"),

		// Error messages
		errorMessages: page.locator(".error-message"),

		// Table controls
		searchInput: page.locator('[data-testid="search-filter"]'),
		statusFilter: page.locator('[data-testid="status-filter"]'),
		interestFilter: page.locator('[data-testid="interest-filter"]'),
		overdueFilter: page.locator('[data-testid="overdue-filter"]'),
	} as const satisfies LocatorConfigMap;

	// Helper function to get JobApplicationRowComponent for a specific app ID
	const getRowComponent = (appId: string): JobApplicationRowComponent => {
		return createJobApplicationRowComponent(page, appId);
	};

	// Helper to get all application IDs from the table
	async function getAllAppIds(): Promise<string[]> {
		const rows = await locators.tbody.locator("tr").all();
		const appIds: string[] = [];

		for (const row of rows) {
			const testId = await row.getAttribute("data-testid");
			if (testId?.includes("application-row-")) {
				const appId = testId.replace("application-row-", "");
				appIds.push(appId);
			}
		}

		return appIds;
	}

	// Helper to get the first application ID from the table
	async function getFirstAppId(): Promise<string> {
		const appIds = await getAllAppIds();
		const maybeFirstId = appIds[0];
		if (!maybeFirstId) {
			throw new Error("No application rows found");
		}
		return maybeFirstId;
	}

	// Helper to get app ID for a specific row index (kept for backward compatibility)
	async function getAppIdByIndex(index: number): Promise<string> {
		const appIds = await getAllAppIds();
		const maybeID = appIds[index];
		if (!maybeID) {
			throw new Error(`No application row found at index ${index}`);
		}
		return maybeID;
	}

	// Helper to get a row component by index
	async function getRowComponentByIndex(
		index: number,
	): Promise<JobApplicationRowComponent> {
		const appId = await getAppIdByIndex(index);
		return getRowComponent(appId);
	}

	// Backward compatibility actions
	async function clickCompanyCell(index: number = 0) {
		const rowComponent = await getRowComponentByIndex(index);
		await rowComponent.actions.clickCompanyCell();
	}

	async function enterTextValue(value: string, index: number = 0) {
		const rowComponent = await getRowComponentByIndex(index);
		await rowComponent.actions.enterTextValue(value);
	}

	async function clickSave(index: number = 0) {
		const rowComponent = await getRowComponentByIndex(index);
		await rowComponent.actions.clickSave();
	}

	async function clickEditableCell(cellSelector: string, index: number = 0) {
		await page.locator(cellSelector).nth(index).click();
	}

	async function clickPositionCell(index: number = 0) {
		const rowComponent = await getRowComponentByIndex(index);
		await rowComponent.actions.clickPositionCell();
	}

	async function clickStatusCell(index: number = 0) {
		const rowComponent = await getRowComponentByIndex(index);
		await rowComponent.actions.clickStatusCell();
	}

	// Table-level actions
	async function searchApplications(searchTerm: string) {
		await locators.searchInput.fill(searchTerm);
	}

	async function filterByStatus(status: string) {
		await locators.statusFilter.selectOption(status);
	}

	async function filterByInterest(rating: string) {
		await locators.interestFilter.selectOption(rating);
	}

	async function filterByOverdue(filter: string) {
		await locators.overdueFilter.selectOption(filter);
	}

	// UUID-based row actions (primary interface)
	async function editCompanyNameById(applicationId: string, newValue: string) {
		const rowComponent = getRowComponent(applicationId);
		await rowComponent.actions.editCompanyName(newValue);
	}

	async function editPositionTitleById(
		applicationId: string,
		newValue: string,
	) {
		const rowComponent = getRowComponent(applicationId);
		await rowComponent.actions.editPositionTitle(newValue);
	}

	async function editStatusById(applicationId: string, newStatus: string) {
		const rowComponent = getRowComponent(applicationId);
		await rowComponent.actions.editStatus(newStatus);
	}

	async function editInterestRatingById(applicationId: string, rating: string) {
		const rowComponent = getRowComponent(applicationId);
		await rowComponent.actions.editInterestRating(rating);
	}

	async function editNextEventDateById(applicationId: string, date: string) {
		const rowComponent = getRowComponent(applicationId);
		await rowComponent.actions.editNextEventDate(date);
	}

	// Legacy index-based actions
	async function clickInterestCell(index: number = 0) {
		const rowComponent = await getRowComponentByIndex(index);
		await rowComponent.actions.clickInterestCell();
	}

	async function clickNextEventCell(index: number = 0) {
		const rowComponent = await getRowComponentByIndex(index);
		await rowComponent.actions.clickNextEventCell();
	}

	async function selectDropdownValue(value: string, index: number = 0) {
		const rowComponent = await getRowComponentByIndex(index);
		await rowComponent.actions.selectDropdownValue(value);
	}

	async function clickCancel(index: number = 0) {
		const rowComponent = await getRowComponentByIndex(index);
		await rowComponent.actions.clickCancel();
	}

	async function editCompanyName(index: number, newValue: string) {
		const rowComponent = await getRowComponentByIndex(index);
		await rowComponent.actions.editCompanyName(newValue);
	}

	async function editPositionTitle(index: number, newValue: string) {
		const rowComponent = await getRowComponentByIndex(index);
		await rowComponent.actions.editPositionTitle(newValue);
	}

	async function editStatus(index: number, newStatus: string) {
		const rowComponent = await getRowComponentByIndex(index);
		await rowComponent.actions.editStatus(newStatus);
	}

	async function editInterestRating(index: number, rating: string) {
		const rowComponent = await getRowComponentByIndex(index);
		await rowComponent.actions.editInterestRating(rating);
	}

	async function editNextEventDate(index: number, date: string) {
		const rowComponent = await getRowComponentByIndex(index);
		await rowComponent.actions.editNextEventDate(date);
	}

	// Table-level assertions
	async function tableIsVisible() {
		await expect(locators.table).toBeVisible();
	}

	async function hasApplications() {
		await expect(locators.tbody.locator("tr")).not.toHaveCount(0);
	}

	async function cellIsInEditMode() {
		await expect(locators.editingCells).toBeVisible();
	}

	async function noEditFormVisible() {
		await expect(locators.editingCells).not.toBeVisible();
	}

	async function errorMessageIsVisible() {
		await expect(locators.errorMessages).toBeVisible();
	}

	async function noErrorMessageVisible() {
		await expect(locators.errorMessages).not.toBeVisible();
	}

	async function hasExactApplicationCount(count: number) {
		const rows = locators.tbody.locator("tr:not(:has(.empty-state))");
		await expect(rows).toHaveCount(count);
	}

	async function containsApplicationWithCompany(companyName: string) {
		const companyCell = page
			.locator(`[data-testid*="company-cell-"]`)
			.filter({
				hasText: companyName,
			})
			.first();
		await expect(companyCell).toBeVisible();
	}

	async function containsApplicationById(applicationId: string) {
		const rowComponent = getRowComponent(applicationId);
		await rowComponent.assertions.isVisible();
	}

	// UUID-based row assertions (primary interface)
	async function companyNameEqualsById(
		applicationId: string,
		expectedValue: string,
	) {
		const rowComponent = getRowComponent(applicationId);
		await rowComponent.assertions.companyNameEquals(expectedValue);
	}

	async function positionTitleEqualsById(
		applicationId: string,
		expectedValue: string,
	) {
		const rowComponent = getRowComponent(applicationId);
		await rowComponent.assertions.positionTitleEquals(expectedValue);
	}

	async function statusEqualsById(
		applicationId: string,
		expectedValue: string,
	) {
		const rowComponent = getRowComponent(applicationId);
		await rowComponent.assertions.statusEquals(expectedValue);
	}

	async function interestRatingEqualsById(
		applicationId: string,
		expectedRating: string,
	) {
		const rowComponent = getRowComponent(applicationId);
		await rowComponent.assertions.interestRatingEquals(expectedRating);
	}

	async function nextEventDateContainsById(
		applicationId: string,
		expectedDate: string,
	) {
		const rowComponent = getRowComponent(applicationId);
		await rowComponent.assertions.nextEventDateContains(expectedDate);
	}

	async function editFormIsVisibleById(applicationId: string) {
		const rowComponent = getRowComponent(applicationId);
		await rowComponent.assertions.editFormIsVisible();
	}

	async function editableHoverStateVisibleById(
		applicationId: string,
		cellType: "company" | "position" | "status" | "interest" | "nextEvent",
	) {
		const rowComponent = getRowComponent(applicationId);
		await rowComponent.assertions.editableHoverStateVisible(cellType);
	}

	// Backward compatibility - Index-based assertions (deprecated)
	async function editFormIsVisible(index: number = 0) {
		const rowComponent = await getRowComponentByIndex(index);
		await rowComponent.assertions.editFormIsVisible();
	}

	async function cellValueEquals(
		cellSelector: string,
		index: number,
		expectedValue: string,
	) {
		const cell = page.locator(cellSelector).nth(index);
		await expect(cell).toHaveText(expectedValue);
	}

	async function companyNameEquals(index: number, expectedValue: string) {
		const rowComponent = await getRowComponentByIndex(index);
		await rowComponent.assertions.companyNameEquals(expectedValue);
	}

	async function positionTitleEquals(index: number, expectedValue: string) {
		const rowComponent = await getRowComponentByIndex(index);
		await rowComponent.assertions.positionTitleEquals(expectedValue);
	}

	async function statusEquals(index: number, expectedValue: string) {
		const rowComponent = await getRowComponentByIndex(index);
		await rowComponent.assertions.statusEquals(expectedValue);
	}

	async function interestRatingEquals(index: number, expectedRating: string) {
		const rowComponent = await getRowComponentByIndex(index);
		await rowComponent.assertions.interestRatingEquals(expectedRating);
	}

	async function nextEventDateContains(index: number, expectedDate: string) {
		const rowComponent = await getRowComponentByIndex(index);
		await rowComponent.assertions.nextEventDateContains(expectedDate);
	}

	async function editableHoverStateVisible(
		cellType: "company" | "position" | "status" | "interest" | "nextEvent",
		index: number = 0,
	) {
		const rowComponent = await getRowComponentByIndex(index);
		await rowComponent.assertions.editableHoverStateVisible(cellType);
	}

	async function goto() {
		await page.goto("/");
	}

	// Actions for working with row components
	function getRowComponent_ById(
		applicationId: string,
	): JobApplicationRowComponent {
		return getRowComponent(applicationId);
	}

	async function getRowComponent_ByIndex(
		index: number,
	): Promise<JobApplicationRowComponent> {
		const appId = await getAppIdByIndex(index);
		return getRowComponent(appId);
	}

	return {
		page,
		components: {},
		goto,
		actions: {
			// Table-level actions
			searchApplications,
			filterByStatus,
			filterByInterest,
			filterByOverdue,

			// Row component access actions
			getRowById: getRowComponent_ById,
			getRowByIndex: getRowComponent_ByIndex,
			getAllRowIds: getAllAppIds,
			getFirstRowId: getFirstAppId,

			// UUID-based row actions (primary interface)
			editCompanyNameById,
			editPositionTitleById,
			editStatusById,
			editInterestRatingById,
			editNextEventDateById,

			// Backward compatibility - Index-based actions (deprecated)
			clickEditableCell,
			clickCompanyCell,
			clickPositionCell,
			clickStatusCell,
			clickInterestCell,
			clickNextEventCell,
			enterTextValue,
			selectDropdownValue,
			clickSave,
			clickCancel,
			editCompanyName,
			editPositionTitle,
			editStatus,
			editInterestRating,
			editNextEventDate,
		},
		assertions: {
			// Table-level assertions
			tableIsVisible,
			hasApplications,
			cellIsInEditMode,
			noEditFormVisible,
			errorMessageIsVisible,
			noErrorMessageVisible,
			hasExactApplicationCount,
			containsApplicationWithCompany,
			containsApplicationById,

			// UUID-based row assertions (primary interface)
			companyNameEqualsById,
			positionTitleEqualsById,
			statusEqualsById,
			interestRatingEqualsById,
			nextEventDateContainsById,
			editFormIsVisibleById,
			editableHoverStateVisibleById,

			// Backward compatibility - Index-based assertions (deprecated)
			editFormIsVisible,
			cellValueEquals,
			companyNameEquals,
			positionTitleEquals,
			statusEquals,
			interestRatingEquals,
			nextEventDateContains,
			editableHoverStateVisible,
		},
	} as const satisfies PageObject;
}

export const createPipelineTable = createPipelineTablePOM satisfies PomFactory;
export type PipelineTableObject = ReturnType<typeof createPipelineTable>;
