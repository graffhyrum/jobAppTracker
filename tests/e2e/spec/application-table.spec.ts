import { expect } from "@playwright/test";
import { test } from "../fixtures/base.ts";

test.describe("Application CRUD", () => {
	test("Click 'add' button", async ({ POMs }) => {
		const home = POMs.homePage;
		const add = POMs.addApplicationPage;

		await home.goto();
		await home.actions.clickAddApplication();

		await expect(add.page).toHaveURL(/.*add/);
		await add.assertions.atAddApplicationPage();
	});
});

test.describe("Application inline editing", () => {
	test.beforeEach(async ({ POMs }) => {
		const home = POMs.homePage;
		const pipeline = POMs.pipelineTable;

		// Navigate to homepage and ensure table is loaded
		await home.goto();
		await pipeline.assertions.tableIsVisible();
	});

	test("should display editable cells with hover indicators", async ({
		POMs,
	}) => {
		const pipeline = POMs.pipelineTable;

		await pipeline.assertions.tableIsVisible();
		await pipeline.assertions.hasApplications();

		// Get the first application ID and test hover states for editable cells
		const applicationId = await pipeline.actions.getFirstRowId();
		await pipeline.assertions.editableHoverStateVisibleById(
			applicationId,
			"company",
		);
		await pipeline.assertions.editableHoverStateVisibleById(
			applicationId,
			"position",
		);
		await pipeline.assertions.editableHoverStateVisibleById(
			applicationId,
			"status",
		);
		await pipeline.assertions.editableHoverStateVisibleById(
			applicationId,
			"interest",
		);
		await pipeline.assertions.editableHoverStateVisibleById(
			applicationId,
			"nextEvent",
		);
	});

	test("should edit company name successfully", async ({
		POMs,
		testJobApplication,
	}) => {
		const pipeline = POMs.pipelineTable;

		await pipeline.assertions.tableIsVisible();

		// Use the test job application ID
		const applicationId = testJobApplication.id;
		const rowComponent = pipeline.actions.getRowById(applicationId);

		// Verify the initial company name
		const expectedCompany = testJobApplication.company;
		await pipeline.assertions.companyNameEqualsById(
			applicationId,
			expectedCompany,
		);

		// Edit the company name using the row component
		const newCompanyName = `Updated ${expectedCompany}`;
		await rowComponent.actions.editCompanyName(newCompanyName);

		// Verify the change was saved - search for the updated company name in the table
		await pipeline.assertions.containsApplicationWithCompany(newCompanyName);
	});

	test("should edit position title successfully", async ({ POMs }) => {
		const pipeline = POMs.pipelineTable;

		await pipeline.assertions.tableIsVisible();

		// Get the first application ID and edit the position title
		const applicationId = await pipeline.actions.getFirstRowId();
		await pipeline.actions.editPositionTitleById(
			applicationId,
			"Senior Software Engineer",
		);

		// Verify the change
		await pipeline.assertions.positionTitleEqualsById(
			applicationId,
			"Senior Software Engineer",
		);
	});

	test("should edit status via dropdown successfully", async ({ POMs }) => {
		const pipeline = POMs.pipelineTable;

		await pipeline.assertions.tableIsVisible();

		// Get the first application ID and edit the status
		const applicationId = await pipeline.actions.getFirstRowId();
		await pipeline.actions.editStatusById(applicationId, "interview");

		// Verify the change
		await pipeline.assertions.statusEqualsById(applicationId, "interview");
	});

	test("should edit interest rating via dropdown successfully", async ({
		POMs,
	}) => {
		const pipeline = POMs.pipelineTable;

		await pipeline.assertions.tableIsVisible();

		// Get the first application ID and edit interest rating
		const applicationId = await pipeline.actions.getFirstRowId();
		await pipeline.actions.editInterestRatingById(applicationId, "3");

		// Verify the change (should show ★★★)
		await pipeline.assertions.interestRatingEqualsById(applicationId, "★★★");
	});

	test("should edit next event date successfully", async ({
		POMs,
		testJobApplication,
	}) => {
		const pipeline = POMs.pipelineTable;

		await pipeline.assertions.tableIsVisible();

		// Get the application ID and edit next event date
		const applicationId = testJobApplication.id;
		await pipeline.actions.editNextEventDateById(applicationId, "2024-03-15");

		// Verify the change (US date format)
		await pipeline.assertions.nextEventDateContainsById(
			applicationId,
			"3/15/2024",
		);
	});

	test("should cancel edit operation", async ({ POMs, testJobApplication }) => {
		const pipeline = POMs.pipelineTable;

		await pipeline.assertions.tableIsVisible();

		// Get application ID and verify original company name
		const applicationId = testJobApplication.id;
		const rowComponent = pipeline.actions.getRowById(applicationId);
		const expectedCompany = testJobApplication.company;
		await pipeline.assertions.companyNameEqualsById(
			applicationId,
			expectedCompany,
		);

		// Start editing but cancel
		await rowComponent.actions.clickCompanyCell();
		await pipeline.assertions.cellIsInEditMode();
		await rowComponent.actions.enterTextValue("Should Not Save");
		await rowComponent.actions.clickCancel();

		// Wait for edit mode to exit and verify nothing changed
		await pipeline.assertions.noEditFormVisible();
		await pipeline.assertions.companyNameEqualsById(
			applicationId,
			expectedCompany,
		);
	});

	test("should work after filtering applications", async ({ POMs }) => {
		const pipeline = POMs.pipelineTable;

		await pipeline.assertions.tableIsVisible();

		// Filter by company name
		await pipeline.actions.searchApplications("Test Company");

		// Verify filtering worked
		await pipeline.assertions.containsApplicationWithCompany("Test Company");

		// Get the first visible application ID and edit after filtering
		const applicationId = await pipeline.actions.getFirstRowId();
		await pipeline.actions.editCompanyNameById(
			applicationId,
			"Filtered Edit Test",
		);

		// Clear filter and verify change persisted
		await pipeline.actions.searchApplications("");
		await pipeline.assertions.companyNameEqualsById(
			applicationId,
			"Filtered Edit Test",
		);
	});

	test("should work after sorting applications", async ({ POMs }) => {
		const pipeline = POMs.pipelineTable;

		await pipeline.assertions.tableIsVisible();

		// Click company header to sort
		await pipeline.page.locator('th[data-column="company"]').click();

		// Get the first application ID after sorting and edit
		const applicationId = await pipeline.actions.getFirstRowId();
		await pipeline.actions.editCompanyNameById(
			applicationId,
			"Sorted Edit Test",
		);

		// Verify change persisted
		await pipeline.assertions.companyNameEqualsById(
			applicationId,
			"Sorted Edit Test",
		);
	});

	test("should handle network errors gracefully", async ({
		POMs,
		page,
		testJobApplication,
	}) => {
		const pipeline = POMs.pipelineTable;

		await pipeline.assertions.tableIsVisible();

		// Get application ID and row component
		const applicationId = testJobApplication.id;
		const rowComponent = pipeline.actions.getRowById(applicationId);

		// Start editing and wait for edit form to appear
		await rowComponent.actions.clickCompanyCell();
		await pipeline.assertions.cellIsInEditMode();
		await pipeline.assertions.editFormIsVisibleById(applicationId);

		// Intercept the save request to fail it
		await page.route("**/applications/*/edit/*", (route) => {
			route.abort("failed");
		});

		// Try to edit - should show error
		await rowComponent.actions.enterTextValue("This Should Fail");
		await rowComponent.actions.clickSave();

		// Wait for error message to appear (user-visible feedback)
		await pipeline.assertions.errorMessageIsVisible();

		// Remove route intercept
		await page.unroute("**/applications/*/edit/*");
	});

	test("should handle server errors gracefully", async ({
		POMs,
		page,
		testJobApplication,
	}) => {
		const pipeline = POMs.pipelineTable;

		await pipeline.assertions.tableIsVisible();

		// Get application ID and row component
		const applicationId = testJobApplication.id;
		const rowComponent = pipeline.actions.getRowById(applicationId);

		// Start editing and wait for edit form to appear
		await rowComponent.actions.clickCompanyCell();
		await pipeline.assertions.cellIsInEditMode();
		await pipeline.assertions.editFormIsVisibleById(applicationId);

		// Intercept the PUT request to return server error
		await page.route("PUT **/applications/*", (route) => {
			route.fulfill({
				status: 500,
				body: "Internal Server Error",
			});
		});

		// Try to edit - should show error
		await rowComponent.actions.enterTextValue("Server Error Test");
		await rowComponent.actions.clickSave();

		// Wait for error message to appear (user-visible feedback)
		await pipeline.assertions.errorMessageIsVisible();

		// Remove route intercept
		await page.unroute("PUT **/applications/*");
	});

	test("should support keyboard navigation in edit forms", async ({ POMs }) => {
		const pipeline = POMs.pipelineTable;

		await pipeline.assertions.tableIsVisible();

		// Get application ID and start editing
		const applicationId = await pipeline.actions.getFirstRowId();
		const rowComponent = pipeline.actions.getRowById(applicationId);

		await rowComponent.actions.clickCompanyCell();
		await pipeline.assertions.cellIsInEditMode();

		// Use Tab to navigate to Save button and Enter to submit
		await pipeline.page.keyboard.press("Tab");
		await pipeline.page.keyboard.press("Tab");
		await pipeline.page.keyboard.press("Enter");

		// Should exit edit mode
		await pipeline.assertions.noEditFormVisible();
	});

	test("should retain form focus when editing", async ({ POMs }) => {
		const pipeline = POMs.pipelineTable;

		await pipeline.assertions.tableIsVisible();

		// Get application ID and start editing
		const applicationId = await pipeline.actions.getFirstRowId();
		const rowComponent = pipeline.actions.getRowById(applicationId);

		await rowComponent.actions.clickCompanyCell();

		// Input should be focused - use the specific application ID
		const editInput = pipeline.page.locator(
			`[data-testid="edit-input-${applicationId}"]`,
		);
		await expect(editInput).toBeFocused();
	});
});
