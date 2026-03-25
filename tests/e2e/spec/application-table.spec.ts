import { expect } from "@playwright/test";

import { test } from "../fixtures/base.ts";

test.beforeEach(async ({ POMs, mutableApp }) => {
	const home = POMs.pages.homePage;
	const pipeline = POMs.components.pipelineTable;

	await home.goto();
	await pipeline.assertions.waitForTableDataToLoad();
	await pipeline.assertions.containsApplicationById(mutableApp.id);
});

test.describe("Application inline editing", () => {
	test("should display editable cells with hover indicators", async ({
		POMs: {
			components: { pipelineTable },
		},
		mutableApp,
	}) => {
		await pipelineTable.assertions.hasApplications();

		const applicationId = mutableApp.id;
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
		mutableApp,
	}) => {
		const applicationId = mutableApp.id;
		const rowComponent = pipelineTable.actions.getRowById(applicationId);

		const expectedCompany = mutableApp.company;
		await pipelineTable.assertions.companyNameEqualsById(
			applicationId,
			expectedCompany,
		);

		const newCompanyName = `Updated ${expectedCompany}`;
		await rowComponent.actions.editCompanyName(newCompanyName);

		await pipelineTable.assertions.companyNameEqualsById(
			applicationId,
			newCompanyName,
		);
	});

	test("should edit position title successfully", async ({
		POMs: {
			components: { pipelineTable },
		},
		mutableApp,
	}) => {
		const newPositionTitle = "Senior Software Engineer";
		const applicationId = mutableApp.id;

		await pipelineTable.actions.editPositionTitleById(
			applicationId,
			newPositionTitle,
		);

		await pipelineTable.assertions.positionTitleEqualsById(
			applicationId,
			newPositionTitle,
		);
	});

	test("should edit status via dropdown successfully", async ({
		POMs: {
			components: { pipelineTable },
		},
		mutableApp,
	}) => {
		const applicationId = mutableApp.id;
		await pipelineTable.actions.editStatusById(applicationId, "interview");

		await pipelineTable.assertions.statusEqualsById(applicationId, "interview");
	});

	test("should edit interest rating via dropdown successfully", async ({
		POMs: {
			components: { pipelineTable },
		},
		mutableApp,
	}) => {
		const applicationId = mutableApp.id;
		await pipelineTable.actions.editInterestRatingById(applicationId, "3");

		await pipelineTable.assertions.interestRatingEqualsById(
			applicationId,
			"★★★",
		);
	});

	test("should edit next event date successfully", async ({
		POMs: {
			components: { pipelineTable },
		},
		mutableApp,
	}) => {
		const nextDate = "2024-03-15";
		const applicationId = mutableApp.id;

		await pipelineTable.actions.editNextEventDateById(applicationId, nextDate);

		await pipelineTable.assertions.nextEventDateContainsById(
			applicationId,
			nextDate,
		);
	});

	test("should cancel edit operation", async ({
		POMs: {
			components: { pipelineTable },
		},
		mutableApp,
	}) => {
		const applicationId = mutableApp.id;
		const rowComponent = pipelineTable.actions.getRowById(applicationId);
		const expectedCompany = mutableApp.company;
		await pipelineTable.assertions.companyNameEqualsById(
			applicationId,
			expectedCompany,
		);

		await rowComponent.actions.fromView.clickEditButton();
		await pipelineTable.assertions.cellIsInEditMode();
		await rowComponent.actions.enterTextValue("Should Not Save");
		await rowComponent.actions.fromEdit.clickCancel();

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
		mutableApp,
	}) => {
		const newCompanyName = "Filtered Edit Test";

		await pipelineTable.actions.searchApplications(mutableApp.company);

		await pipelineTable.assertions.companyNameEqualsById(
			mutableApp.id,
			mutableApp.company,
		);

		const applicationId = mutableApp.id;
		await pipelineTable.actions.editCompanyNameById(
			applicationId,
			newCompanyName,
		);

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
		mutableApp,
	}) => {
		const newCompanyName = "Sorted Edit Test";

		await test.step("Click company header to sort", async () => {
			await pipelineTable.actions.clickColumnHeader("company");
		});

		const applicationId = mutableApp.id;
		await pipelineTable.actions.editCompanyNameById(
			applicationId,
			newCompanyName,
		);

		await pipelineTable.assertions.companyNameEqualsById(
			applicationId,
			newCompanyName,
		);
	});

	test("should support keyboard navigation in edit forms", async ({
		POMs: {
			components: { pipelineTable },
		},
		mutableApp,
		page,
	}) => {
		const applicationId = mutableApp.id;
		const rowComponent = pipelineTable.actions.getRowById(applicationId);

		await rowComponent.actions.fromView.clickEditButton();
		await pipelineTable.assertions.cellIsInEditMode();

		await rowComponent.assertions.isFocused("companyInput");

		await test.step("Test 2: Forward Tab navigation through all fields", async () => {
			await rowComponent.actions.pressUntilFocused("positionInput", "Tab");
			await rowComponent.actions.pressUntilFocused("statusSelect", "Tab");
			await rowComponent.actions.pressUntilFocused("interestSelect", "Tab");
			await rowComponent.actions.pressUntilFocused("nextEventInput", "Tab");
			await rowComponent.actions.pressUntilFocused("saveBtn", "Tab");
			await rowComponent.actions.pressUntilFocused("cancelBtn", "Tab");
		});

		await test.step("Test 3: Backward Shift+Tab navigation", async () => {
			await rowComponent.actions.pressUntilFocused("saveBtn", "Shift+Tab");
			await rowComponent.actions.pressUntilFocused(
				"nextEventInput",
				"Shift+Tab",
			);
			await rowComponent.actions.pressUntilFocused(
				"interestSelect",
				"Shift+Tab",
			);
		});

		await test.step("Test 4: Enter key submits from input field", async () => {
			await rowComponent.actions.pressUntilFocused("companyInput", "Shift+Tab");
		});

		await page.keyboard.press("Enter");
		await pipelineTable.assertions.noEditFormVisible();

		// Test 5: Escape key cancels edit
		await rowComponent.actions.fromView.clickEditButton();
		await pipelineTable.assertions.cellIsInEditMode();
		await rowComponent.assertions.isFocused("companyInput");

		await rowComponent.actions.fillInput("companyInput", "Should Not Save");

		await page.keyboard.press("Escape");

		await pipelineTable.assertions.noEditFormVisible();
		await rowComponent.assertions.elementIsNotVisible("cancelBtn");
	});
});

test.describe("Application deletion", () => {
	test("should delete application after confirming", async ({
		POMs: {
			components: { pipelineTable },
		},
		mutableApp,
	}) => {
		const applicationId = mutableApp.id;
		const row = pipelineTable.actions.getRowById(applicationId);

		await row.actions.deleteAndConfirm();

		await row.assertions.rowIsNotVisible();
	});

	test("should not delete application when confirmation is cancelled", async ({
		POMs: {
			components: { pipelineTable },
		},
		mutableApp,
	}) => {
		const applicationId = mutableApp.id;
		const row = pipelineTable.actions.getRowById(applicationId);

		await row.actions.deleteAndCancel();

		await row.assertions.isVisible();
	});

	test("codegen", async ({ page, mutableApp }) => {
		const itemId = mutableApp.id;
		const editButtonLocator = page.getByTestId(`edit-btn-${itemId}`);
		const saveButtonLocator = page.getByTestId(`save-btn-${itemId}`);
		const cancelButtonLocator = page.getByTestId(`cancel-btn-${itemId}`);
		const viewButtonLocator = page.getByTestId(`view-btn-${itemId}`);
		const deleteButtonLocator = page.getByTestId(`delete-btn-${itemId}`);

		await editButtonLocator.click();
		await expect(saveButtonLocator).toBeVisible();
		await expect(cancelButtonLocator).toBeVisible();
		await saveButtonLocator.click();
		await expect(editButtonLocator).toBeVisible();
		await expect(viewButtonLocator).toBeVisible();
		await expect(deleteButtonLocator).toBeVisible();
	});
});
