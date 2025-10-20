import { expect } from "@playwright/test";
import { test } from "../fixtures/base.ts";

test.beforeEach(async ({ POMs, testJobApplication }) => {
	const home = POMs.pages.homePage;
	const pipeline = POMs.components.pipelineTable;
	expect(testJobApplication).toBeDefined();

	// Navigate to homepage and ensure table is loaded
	await home.goto();
	await pipeline.assertions.waitForTableDataToLoad();

	// Verify our test application is visible in the table
	await pipeline.assertions.containsApplicationById(testJobApplication.id);
});

test.describe("Application inline editing", () => {
	test("should display editable cells with hover indicators", async ({
		POMs,
		testJobApplication,
	}) => {
		const pipeline = POMs.components.pipelineTable;

		await pipeline.assertions.tableIsVisible();
		await pipeline.assertions.hasApplications();

		const applicationId = testJobApplication.id;
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
		const pipeline = POMs.components.pipelineTable;

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

	test("should edit position title successfully", async ({
		POMs,
		testJobApplication,
	}) => {
		const pipeline = POMs.components.pipelineTable;

		await pipeline.assertions.tableIsVisible();

		const applicationId = testJobApplication.id;
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

	test("should edit status via dropdown successfully", async ({
		POMs,
		testJobApplication,
	}) => {
		const pipeline = POMs.components.pipelineTable;

		await pipeline.assertions.tableIsVisible();

		const applicationId = testJobApplication.id;
		await pipeline.actions.editStatusById(applicationId, "interview");

		// Verify the change
		await pipeline.assertions.statusEqualsById(applicationId, "interview");
	});

	test("should edit interest rating via dropdown successfully", async ({
		POMs,
		testJobApplication,
	}) => {
		const pipeline = POMs.components.pipelineTable;

		await pipeline.assertions.tableIsVisible();

		const applicationId = testJobApplication.id;
		await pipeline.actions.editInterestRatingById(applicationId, "3");

		// Verify the change (should show ★★★)
		await pipeline.assertions.interestRatingEqualsById(applicationId, "★★★");
	});

	test("should edit next event date successfully", async ({
		POMs,
		testJobApplication,
	}) => {
		const nextDate = "2024-03-15";
		const pipeline = POMs.components.pipelineTable;

		await pipeline.assertions.tableIsVisible();

		// Get the application ID and edit next event date
		const applicationId = testJobApplication.id;
		await pipeline.actions.editNextEventDateById(applicationId, nextDate);

		// Verify the change (US date format)
		await pipeline.assertions.nextEventDateContainsById(
			applicationId,
			nextDate,
		);
	});

	test("should cancel edit operation", async ({ POMs, testJobApplication }) => {
		const pipeline = POMs.components.pipelineTable;

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
		await rowComponent.actions.clickEditButton();
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

	test("should work after filtering applications", async ({
		POMs,
		testJobApplication,
	}) => {
		const pipeline = POMs.components.pipelineTable;

		await pipeline.assertions.tableIsVisible();

		// Filter by company name using predictable test data
		await pipeline.actions.searchApplications(testJobApplication.company);

		// Verify filtering worked
		await pipeline.assertions.containsApplicationWithCompany(
			testJobApplication.company,
		);

		const applicationId = testJobApplication.id;
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

	test("should work after sorting applications", async ({
		POMs,
		testJobApplication,
	}) => {
		const pipeline = POMs.components.pipelineTable;

		await pipeline.assertions.tableIsVisible();

		await test.step("Click company header to sort", async () => {
			await pipeline.page.getByTestId("company-header").click();
		});

		const applicationId = testJobApplication.id;
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

	test("should support keyboard navigation in edit forms", async ({
		POMs,
		testJobApplication,
	}) => {
		const pipeline = POMs.components.pipelineTable;

		await pipeline.assertions.tableIsVisible();

		const applicationId = testJobApplication.id;
		const rowComponent = pipeline.actions.getRowById(applicationId);

		await rowComponent.actions.clickEditButton();
		await pipeline.assertions.cellIsInEditMode();

		// Wait for HTMX swap to complete and edit mode to exit
		const respProm = pipeline.page.waitForResponse(
			(resp) =>
				resp.url().includes(`/applications/${applicationId}`) &&
				resp.request().method() === "PUT",
		);
		// Test Enter key on input triggers save (via keyboard handler)
		await pipeline.page.keyboard.press("Enter"); // Trigger save from autofocused company input
		await respProm;

		await pipeline.assertions.noEditFormVisible();
	});

	test("should retain form focus when editing", async ({
		POMs,
		testJobApplication,
	}) => {
		const pipeline = POMs.components.pipelineTable;

		await pipeline.assertions.tableIsVisible();

		const applicationId = testJobApplication.id;
		const rowComponent = pipeline.actions.getRowById(applicationId);

		await rowComponent.actions.clickEditButton();

		// Input should be focused - use the specific application ID
		const editInput = pipeline.page.locator(
			`[data-testid="edit-input-company-${applicationId}"]`,
		);
		await expect(editInput).toBeFocused();
	});
});

// New tests for delete functionality

test.describe("Application deletion", () => {
	test("should delete application after confirming", async ({
		POMs,
		testJobApplication,
	}) => {
		const pipeline = POMs.components.pipelineTable;
		const applicationId = testJobApplication.id;
		const row = pipeline.actions.getRowById(applicationId);

		// Confirm the delete dialog and ensure the row disappears
		await row.actions.deleteAndConfirm();

		// Assert the row is removed from the table
		await row.assertions.rowIsNotVisible();
	});

	test("should not delete application when confirmation is cancelled", async ({
		POMs,
		testJobApplication,
	}) => {
		const pipeline = POMs.components.pipelineTable;
		const applicationId = testJobApplication.id;
		const row = pipeline.actions.getRowById(applicationId);

		await row.actions.deleteAndCancel();

		// Row should still be visible
		await row.assertions.isVisible();
	});
});
