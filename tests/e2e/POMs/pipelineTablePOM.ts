import { expect, type Page } from "@playwright/test";
import type {
	ComponentFactory,
	ComponentObject,
	LocatorConfigMap,
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
		editingCells: page.locator("tr.editing"),

		// Error messages
		errorMessages: page.locator(".error-message"),

		// Table controls
		searchInput: page.locator('[data-testid="search-filter"]'),
		statusFilter: page.locator('[data-testid="status-filter"]'),
		interestFilter: page.locator('[data-testid="interest-filter"]'),
		overdueFilter: page.locator('[data-testid="overdue-filter"]'),
		timezoneSelect: page.locator('[data-testid="timezone-select"]'),
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

	async function setTimezone(tz: string) {
		await expect(locators.timezoneSelect).toBeVisible();
		await locators.timezoneSelect.selectOption(tz);
	}

	async function getUpdatedDateTextById(
		applicationId: string,
	): Promise<string> {
		const l = page.locator(
			`[data-testid="updated-date-cell-${applicationId}"]`,
		);
		await expect(l).toBeVisible();
		return (await l.textContent())?.trim() ?? "";
	}
	async function getAppliedDateTextById(
		applicationId: string,
	): Promise<string> {
		const l = page.locator(
			`[data-testid="application-date-cell-${applicationId}"]`,
		);
		await expect(l).toBeVisible();
		return (await l.textContent())?.trim() ?? "";
	}
	async function getNextEventTextById(applicationId: string): Promise<string> {
		const l = page.locator(`[data-testid="next-event-cell-${applicationId}"]`);
		await expect(l).toBeVisible();
		return (await l.textContent())?.trim() ?? "";
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

	// Table-level assertions
	async function tableIsVisible() {
		await expect(locators.table).toBeVisible();
	}

	async function hasApplications() {
		await expect(locators.tbody.locator("tr")).not.toHaveCount(0);
	}

	async function waitForTableDataToLoad() {
		// Wait for table to be visible first
		await expect(locators.table).toBeVisible();

		// Wait for tbody to have at least one row (not empty)
		await expect(locators.tbody.locator("tr")).not.toHaveCount(0);

		// Wait a bit more for HTMX to finish rendering
		await page.waitForTimeout(500);
	}

	async function debugTableState() {
		// Check if table exists
		const tableExists = await locators.table.isVisible();

		// Check tbody content
		const _rowCount = await locators.tbody.locator("tr").count();

		// Get all application IDs currently in the table
		const appIds = await getAllAppIds();
		console.log(`Application IDs found: ${JSON.stringify(appIds)}`);

		// Show table HTML for debugging
		if (tableExists) {
			const tableHTML = await locators.table.innerHTML();
			const lines = tableHTML.split("\n");
			const firstIndentMatch = lines[0]?.match(/^(\s*)/);
			const firstIndent = firstIndentMatch?.[1]
				? firstIndentMatch[1].length
				: 0;

			const normalized = lines
				.map((l) => l.replace(new RegExp(`^\\s{0,${firstIndent}}`), "")) // trim up to firstIndent spaces
				.join("\n");

			console.log(`Table HTML: \n${normalized.substring(0, 500)}...`);
		}

		console.log("========================");
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
		// Wait for the specific row to appear
		await expect(
			page.locator(`[data-testid="application-row-${applicationId}"]`),
		).toBeVisible();
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

	// Actions for working with row components
	function getRowComponent_ById(
		applicationId: string,
	): JobApplicationRowComponent {
		return getRowComponent(applicationId);
	}

	return {
		page,
		actions: {
			// Table-level actions
			searchApplications,
			filterByStatus,
			filterByInterest,
			filterByOverdue,
			setTimezone,
			getUpdatedDateTextById,
			getAppliedDateTextById,
			getNextEventTextById,

			// Row component access actions
			getRowById: getRowComponent_ById,
			getAllRowIds: getAllAppIds,
			getFirstRowId: getFirstAppId,

			// UUID-based row actions (primary interface)
			editCompanyNameById,
			editPositionTitleById,
			editStatusById,
			editInterestRatingById,
			editNextEventDateById,
		},
		assertions: {
			// Table-level assertions
			tableIsVisible,
			hasApplications,
			waitForTableDataToLoad,
			debugTableState,
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
		},
	} as const satisfies ComponentObject;
}

export const createPipelineTable =
	createPipelineTablePOM satisfies ComponentFactory;
export type PipelineTableObject = ReturnType<typeof createPipelineTable>;
