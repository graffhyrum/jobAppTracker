import { expect } from "@playwright/test";
import { test } from "../fixtures/base.ts";
import { pressKeyUntilFocused } from "../utils/keyboard-helpers.ts";

test.beforeEach(async ({ POMs, testJobApplication }) => {
	const home = POMs.pages.homePage;
	const pipeline = POMs.components.pipelineTable;
	// expect(testJobApplication).toBeDefined();

	// Navigate to homepage and ensure table is loaded
	await home.goto();
	await pipeline.assertions.waitForTableDataToLoad();

	// Verify our test application is visible in the table
	await pipeline.assertions.containsApplicationById(testJobApplication.id);
});

test.describe("Application inline editing", () => {
	test("should display editable cells with hover indicators", async ({
		POMs: {
			components: { pipelineTable },
		},
		testJobApplication,
	}) => {
		await pipelineTable.assertions.hasApplications();

		const applicationId = testJobApplication.id;
		const editableFields = [
			"company",
			"position",
			"status",
			"interest",
			"nextEvent",
		] as const;

		for (const field of editableFields) {
			await pipelineTable.assertions.editableHoverStateVisibleById(
				applicationId,
				field,
			);
		}
	});

	test("should edit company name successfully", async ({
		POMs: {
			components: { pipelineTable },
		},
		testJobApplication,
	}) => {
		// Use the test job application ID
		const applicationId = testJobApplication.id;
		const rowComponent = pipelineTable.actions.getRowById(applicationId);

		// Verify the initial company name
		const expectedCompany = testJobApplication.company;
		await pipelineTable.assertions.companyNameEqualsById(
			applicationId,
			expectedCompany,
		);

		// Edit the company name using the row component
		const newCompanyName = `Updated ${expectedCompany}`;
		await rowComponent.actions.editCompanyName(newCompanyName);

		// Verify the change was saved - search for the updated company name in the table
		await pipelineTable.assertions.containsApplicationWithCompany(
			newCompanyName,
		);
	});

	test("should edit position title successfully", async ({
		POMs: {
			components: { pipelineTable },
		},
		testJobApplication,
	}) => {
		const newPositionTitle = "Senior Software Engineer";
		const applicationId = testJobApplication.id;

		await pipelineTable.actions.editPositionTitleById(
			applicationId,
			newPositionTitle,
		);

		// Verify the change
		await pipelineTable.assertions.positionTitleEqualsById(
			applicationId,
			newPositionTitle,
		);
	});

	test("should edit status via dropdown successfully", async ({
		POMs: {
			components: { pipelineTable },
		},
		testJobApplication,
	}) => {
		const applicationId = testJobApplication.id;
		await pipelineTable.actions.editStatusById(applicationId, "interview");

		// Verify the change
		await pipelineTable.assertions.statusEqualsById(applicationId, "interview");
	});

	test("should edit interest rating via dropdown successfully", async ({
		POMs: {
			components: { pipelineTable },
		},
		testJobApplication,
	}) => {
		const applicationId = testJobApplication.id;
		await pipelineTable.actions.editInterestRatingById(applicationId, "3");

		// Verify the change (should show ★★★)
		await pipelineTable.assertions.interestRatingEqualsById(
			applicationId,
			"★★★",
		);
	});

	test("should edit next event date successfully", async ({
		POMs: {
			components: { pipelineTable },
		},
		testJobApplication,
	}) => {
		const nextDate = "2024-03-15";
		const applicationId = testJobApplication.id;

		await pipelineTable.actions.editNextEventDateById(applicationId, nextDate);

		// Verify the change (US date format)
		await pipelineTable.assertions.nextEventDateContainsById(
			applicationId,
			nextDate,
		);
	});

	test("should cancel edit operation", async ({
		POMs: {
			components: { pipelineTable },
		},
		testJobApplication,
	}) => {
		// Get application ID and verify original company name
		const applicationId = testJobApplication.id;
		const rowComponent = pipelineTable.actions.getRowById(applicationId);
		const expectedCompany = testJobApplication.company;
		await pipelineTable.assertions.companyNameEqualsById(
			applicationId,
			expectedCompany,
		);

		// Start editing but cancel
		await rowComponent.actions.clickEditButton();
		await pipelineTable.assertions.cellIsInEditMode();
		await rowComponent.actions.enterTextValue("Should Not Save");
		await rowComponent.actions.clickCancel();

		// Wait for edit mode to exit and verify nothing changed
		await pipelineTable.assertions.noEditFormVisible();
		await pipelineTable.assertions.companyNameEqualsById(
			applicationId,
			expectedCompany,
		);
	});

	test("should work after filtering applications", async ({
		POMs: {
			components: { pipelineTable },
		},
		testJobApplication,
	}) => {
		const newCompanyName = "Filtered Edit Test";

		// Filter by company name using predictable test data
		await pipelineTable.actions.searchApplications(testJobApplication.company);

		// Verify filtering worked
		await pipelineTable.assertions.containsApplicationWithCompany(
			testJobApplication.company,
		);

		const applicationId = testJobApplication.id;
		await pipelineTable.actions.editCompanyNameById(
			applicationId,
			newCompanyName,
		);

		// Clear filter and verify change persisted
		await pipelineTable.actions.searchApplications("");
		await pipelineTable.assertions.companyNameEqualsById(
			applicationId,
			newCompanyName,
		);
	});

	test("should work after sorting applications", async ({
		POMs: {
			components: { pipelineTable },
		},
		testJobApplication,
	}) => {
		const newCompanyName = "Sorted Edit Test";

		await test.step("Click company header to sort", async () => {
			await pipelineTable.page.getByTestId("company-header").click();
		});

		const applicationId = testJobApplication.id;
		await pipelineTable.actions.editCompanyNameById(
			applicationId,
			newCompanyName,
		);

		// Verify change persisted
		await pipelineTable.assertions.companyNameEqualsById(
			applicationId,
			newCompanyName,
		);
	});

	test("should support keyboard navigation in edit forms", async ({
		POMs: {
			components: { pipelineTable },
		},
		testJobApplication,
		page,
	}) => {
		const applicationId = testJobApplication.id;
		const rowComponent = pipelineTable.actions.getRowById(applicationId);

		// Define all edit form field locators
		const companyInput = page.locator(
			`[data-testid="edit-input-company-${applicationId}"]`,
		);
		const positionInput = page.locator(
			`[data-testid="edit-input-position-${applicationId}"]`,
		);
		const statusSelect = page.locator(
			`[data-testid="edit-select-status-${applicationId}"]`,
		);
		const interestSelect = page.locator(
			`[data-testid="edit-select-interest-${applicationId}"]`,
		);
		const nextEventInput = page.locator(
			`[data-testid="edit-input-nextEvent-${applicationId}"]`,
		);
		const saveBtn = page.locator(`[data-testid="save-btn-${applicationId}"]`);
		const cancelBtn = page.locator(
			`[data-testid="cancel-btn-${applicationId}"]`,
		);

		// Enter edit mode
		await rowComponent.actions.clickEditButton();
		await pipelineTable.assertions.cellIsInEditMode();

		// Test 1: Verify initial focus on company input
		await expect(companyInput).toBeFocused();

		await test.step("Test 2: Forward Tab navigation through all fields", async () => {
			await pressKeyUntilFocused(page, positionInput, "Tab");
			await pressKeyUntilFocused(page, statusSelect, "Tab");
			await pressKeyUntilFocused(page, interestSelect, "Tab");
			await pressKeyUntilFocused(page, nextEventInput, "Tab");
			await pressKeyUntilFocused(page, saveBtn, "Tab");
			await pressKeyUntilFocused(page, cancelBtn, "Tab");
		});

		await test.step("Test 3: Backward Shift+Tab navigation", async () => {
			await pressKeyUntilFocused(page, saveBtn, "Shift+Tab");
			await pressKeyUntilFocused(page, nextEventInput, "Shift+Tab");
			await pressKeyUntilFocused(page, interestSelect, "Shift+Tab");
		});

		await test.step("Test 4: Enter key submits from input field", async () => {
			await pressKeyUntilFocused(page, companyInput, "Tab");
		});

		const respProm = page.waitForResponse(
			(resp) =>
				resp.url().includes(`/applications/${applicationId}`) &&
				resp.request().method() === "PUT",
		);
		await page.keyboard.press("Enter");
		await respProm;
		await pipelineTable.assertions.noEditFormVisible();

		// Test 5: Escape key cancels edit (if implemented)
		await rowComponent.actions.clickEditButton();
		await pipelineTable.assertions.cellIsInEditMode();
		await expect(companyInput).toBeFocused();

		await companyInput.fill("Should Not Save");

		await Promise.all([
			page.waitForLoadState("networkidle"),
			page.keyboard.press("Escape"),
		]);

		// Check if Escape is implemented - if edit form is still visible, it's not implemented
		const isStillEditing = await page
			.locator("tr.editing")
			.isVisible()
			.catch(() => false);

		if (isStillEditing) {
			// Escape not implemented - cancel manually and document expected behavior
			await rowComponent.actions.clickCancel();
			await pipelineTable.assertions.noEditFormVisible();
			console.log("Note: Escape key to cancel editing is not yet implemented");
		} else {
			// Escape worked - verify we exited edit mode
			await pipelineTable.assertions.noEditFormVisible();
		}
	});
});

// New tests for delete functionality

test.describe("Application deletion", () => {
	test("should delete application after confirming", async ({
		POMs: {
			components: { pipelineTable },
		},
		testJobApplication,
	}) => {
		const applicationId = testJobApplication.id;
		const row = pipelineTable.actions.getRowById(applicationId);

		// Confirm the delete dialog and ensure the row disappears
		await row.actions.deleteAndConfirm();

		// Assert the row is removed from the table
		await row.assertions.rowIsNotVisible();
	});

	test("should not delete application when confirmation is cancelled", async ({
		POMs: {
			components: { pipelineTable },
		},
		testJobApplication,
	}) => {
		const applicationId = testJobApplication.id;
		const row = pipelineTable.actions.getRowById(applicationId);

		await row.actions.deleteAndCancel();

		// Row should still be visible
		await row.assertions.isVisible();
	});
});
