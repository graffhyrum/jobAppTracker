import { describe, expect, it } from "bun:test";
import type { JobApplication } from "../../domain/entities/job-application";
import {
	renderApplicationTableRow,
	renderEditableRow,
} from "./table-row-renderer";

describe("Table Row Renderer", () => {
	const createMockApplication = (
		overrides: Partial<JobApplication> = {},
	): JobApplication => ({
		id: "test-id",
		company: "Test Company",
		positionTitle: "Software Engineer",
		applicationDate: "2024-01-15T10:00:00.000Z",
		sourceType: "other",
		isRemote: false,
		updatedAt: "2024-01-16T10:00:00.000Z",
		createdAt: "2024-01-15T10:00:00.000Z",
		notes: [],
		statusLog: [
			["2024-01-15T10:00:00.000Z", { category: "active", label: "applied" }],
		],
		interestRating: 3,
		...overrides,
	});

	const parseTableRow = (html: string) => {
		document.body.innerHTML = `<table><tbody>${html}</tbody></table>`;
		return document.body.querySelector("tr");
	};

	it("should render application data correctly", () => {
		const app = createMockApplication();
		const html = renderApplicationTableRow(app);
		const row = parseTableRow(html);

		const rowText = row?.textContent || "";
		expect(rowText).toContain("Test Company");
		expect(rowText).toContain("Software Engineer");
		expect(rowText).toContain("2024-01-15");
		expect(rowText).toContain("2024-01-16");
		expect(rowText).toContain("★★★");
	});

	it("should differentiate active vs inactive status", () => {
		const activeApp = createMockApplication({
			statusLog: [
				[
					"2024-01-15T10:00:00.000Z",
					{ category: "active", label: "interview" },
				],
			],
		});
		const inactiveApp = createMockApplication({
			statusLog: [
				[
					"2024-01-15T10:00:00.000Z",
					{ category: "inactive", label: "rejected" },
				],
			],
		});

		const activeRow = parseTableRow(renderApplicationTableRow(activeApp));
		const inactiveRow = parseTableRow(renderApplicationTableRow(inactiveApp));

		expect(activeRow?.classList.contains("active")).toBe(true);
		expect(inactiveRow?.classList.contains("inactive")).toBe(true);

		const activeBadge = activeRow?.querySelector(".status-badge");
		const inactiveBadge = inactiveRow?.querySelector(".status-badge");

		expect(activeBadge?.textContent).toBe("interview");
		expect(inactiveBadge?.textContent).toBe("rejected");
	});

	it("should apply overdue styling for past dates", () => {
		const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
		const app = createMockApplication({
			nextEventDate: pastDate.toISOString(),
		});
		const html = renderApplicationTableRow(app);
		const row = parseTableRow(html);

		expect(row?.classList.contains("overdue")).toBe(true);

		const nextEventSpan = row?.querySelector("span[data-utc]");
		expect(nextEventSpan?.classList.contains("overdue-date")).toBe(true);
	});

	it("should not apply overdue styling for future dates", () => {
		const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
		const app = createMockApplication({
			nextEventDate: futureDate.toISOString(),
		});
		const html = renderApplicationTableRow(app);
		const row = parseTableRow(html);

		expect(row?.classList.contains("overdue")).toBe(false);

		const nextEventSpan = row?.querySelector("span[data-utc]");
		expect(nextEventSpan?.classList.contains("overdue-date")).toBe(false);
	});

	it('should show "No date set" when next event date is missing', () => {
		const app = createMockApplication({ nextEventDate: undefined });
		const html = renderApplicationTableRow(app);
		const row = parseTableRow(html);

		const noDateSpan = row?.querySelector(".no-date");
		expect(noDateSpan).toBeDefined();
		expect(noDateSpan?.textContent).toBe("No date set");
	});

	it("should not show interest rating when undefined", () => {
		const app = createMockApplication({ interestRating: undefined });
		const html = renderApplicationTableRow(app);
		const row = parseTableRow(html);

		const rowText = row?.textContent || "";
		expect(rowText).not.toContain("★");
	});

	it("should have functional edit, view, and delete buttons", () => {
		const app = createMockApplication();
		const html = renderApplicationTableRow(app);
		const row = parseTableRow(html);

		const editBtn = row?.querySelector('button[hx-get*="/edit"]');
		const viewBtn = row?.querySelector('button[hx-get*="/details"]');
		const deleteBtn = row?.querySelector("button[hx-delete]");

		expect(editBtn).toBeDefined();
		expect(viewBtn).toBeDefined();
		expect(deleteBtn).toBeDefined();

		// Verify HTMX attributes exist
		expect(editBtn?.hasAttribute("hx-get")).toBe(true);
		expect(viewBtn?.hasAttribute("hx-get")).toBe(true);
		expect(deleteBtn?.hasAttribute("hx-delete")).toBe(true);
	});

	it("should handle special characters in text content", () => {
		const app = createMockApplication({
			company: "Test & Co. Special Company",
			positionTitle: "Senior Developer & Engineer",
		});
		const html = renderApplicationTableRow(app);
		const row = parseTableRow(html);

		const rowText = row?.textContent || "";
		expect(rowText).toContain("Test & Co. Special Company");
		expect(rowText).toContain("Senior Developer & Engineer");
	});
});

describe("Editable Row Renderer", () => {
	const createMockApplication = (
		overrides: Partial<JobApplication> = {},
	): JobApplication => ({
		id: "test-id",
		company: "Test Company",
		positionTitle: "Software Engineer",
		applicationDate: "2024-01-15T10:00:00.000Z",
		sourceType: "other",
		isRemote: false,
		updatedAt: "2024-01-16T10:00:00.000Z",
		createdAt: "2024-01-15T10:00:00.000Z",
		notes: [],
		statusLog: [
			["2024-01-15T10:00:00.000Z", { category: "active", label: "applied" }],
		],
		interestRating: 3,
		nextEventDate: "2024-02-01T10:00:00.000Z",
		...overrides,
	});

	const parseEditableRow = (html: string) => {
		// Wrap in table structure for proper parsing
		document.body.innerHTML = `<table><tbody>${html}</tbody></table>`;
		return document.body.querySelector("tr");
	};

	it("should render editable inputs with correct values", () => {
		const app = createMockApplication({
			company: "Acme Corp",
			positionTitle: "Senior Developer",
		});
		const html = renderEditableRow(app);
		const row = parseEditableRow(html);

		const companyInput = row?.querySelector(
			'input[name="company"]',
		) as HTMLInputElement;
		const positionInput = row?.querySelector(
			'input[name="positionTitle"]',
		) as HTMLInputElement;

		expect(companyInput).toBeDefined();
		expect(positionInput).toBeDefined();
		expect(companyInput?.value).toBe("Acme Corp");
		expect(positionInput?.value).toBe("Senior Developer");
	});

	it("should render status dropdown with current selection", () => {
		const app = createMockApplication({
			statusLog: [
				[
					"2024-01-15T10:00:00.000Z",
					{ category: "active", label: "interview" },
				],
			],
		});
		const html = renderEditableRow(app);
		const row = parseEditableRow(html);

		const statusSelect = row?.querySelector(
			'select[name="status"]',
		) as HTMLSelectElement;

		expect(statusSelect).toBeDefined();

		// Verify the selected option has the selected attribute in HTML
		const selectedOption = statusSelect?.querySelector(
			"option[selected]",
		) as HTMLOptionElement;
		expect(selectedOption).toBeDefined();
		expect(selectedOption?.value).toBe("interview");
	});

	it("should render interest rating dropdown with current selection", () => {
		const app = createMockApplication({ interestRating: 2 });
		const html = renderEditableRow(app);
		const row = parseEditableRow(html);

		const ratingSelect = row?.querySelector(
			'select[name="interestRating"]',
		) as HTMLSelectElement;

		expect(ratingSelect).toBeDefined();

		// Verify the selected option has the selected attribute in HTML
		const selectedOption = ratingSelect?.querySelector(
			"option[selected]",
		) as HTMLOptionElement;
		expect(selectedOption).toBeDefined();
		expect(selectedOption?.value).toBe("2");
	});

	it("should handle undefined interest rating", () => {
		const app = createMockApplication({ interestRating: undefined });
		const html = renderEditableRow(app);
		const row = parseEditableRow(html);

		const ratingSelect = row?.querySelector(
			'select[name="interestRating"]',
		) as HTMLSelectElement;

		expect(ratingSelect).toBeDefined();
		// Should not have any selected rating
		const options = Array.from(ratingSelect?.querySelectorAll("option") || []);
		const selectedRatingOptions = options.filter(
			(opt) => opt.value !== "" && opt.hasAttribute("selected"),
		);
		expect(selectedRatingOptions.length).toBe(0);
	});

	it("should format nextEventDate for HTML5 date input", () => {
		const app = createMockApplication({
			nextEventDate: "2024-03-15T10:00:00.000Z",
		});
		const html = renderEditableRow(app);
		const row = parseEditableRow(html);

		const dateInput = row?.querySelector(
			'input[name="nextEventDate"]',
		) as HTMLInputElement;

		expect(dateInput).toBeDefined();
		expect(dateInput?.type).toBe("date");
		expect(dateInput?.value).toBe("2024-03-15");
	});

	it("should render empty date input when no nextEventDate", () => {
		const app = createMockApplication({ nextEventDate: undefined });
		const html = renderEditableRow(app);
		const row = parseEditableRow(html);

		const dateInput = row?.querySelector(
			'input[name="nextEventDate"]',
		) as HTMLInputElement;

		expect(dateInput).toBeDefined();
		expect(dateInput?.value).toBe("");
	});

	it("should render readonly fields without inputs", () => {
		const app = createMockApplication();
		const html = renderEditableRow(app);
		const row = parseEditableRow(html);

		// Application date and updated date should not have input fields
		const appDateInput = row?.querySelector(
			'input[name="applicationDate"]',
		) as HTMLInputElement;
		const updatedInput = row?.querySelector(
			'input[name="updatedAt"]',
		) as HTMLInputElement;

		expect(appDateInput).toBeNull();
		expect(updatedInput).toBeNull();

		// Should display formatted dates as text
		const cells = Array.from(row?.querySelectorAll("td") || []);
		const cellTexts = cells.map((cell) => cell.textContent?.trim());

		expect(cellTexts.some((text) => text?.includes("2024-01-15"))).toBe(true);
		expect(cellTexts.some((text) => text?.includes("2024-01-16"))).toBe(true);
	});

	it("should have functional save and cancel buttons", () => {
		const app = createMockApplication();
		const html = renderEditableRow(app);
		const row = parseEditableRow(html);

		const saveBtn = row?.querySelector(
			'button[hx-put*="/applications/test-id"]',
		) as HTMLButtonElement;
		const cancelBtn = row?.querySelector(
			'button[hx-get*="/applications/test-id"]',
		) as HTMLButtonElement;

		expect(saveBtn).toBeDefined();
		expect(cancelBtn).toBeDefined();

		// Verify HTMX behavior attributes exist (without testing exact values)
		expect(saveBtn?.hasAttribute("hx-put")).toBe(true);
		expect(cancelBtn?.hasAttribute("hx-get")).toBe(true);
	});

	it("should apply overdue styling for past dates", () => {
		const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
		const app = createMockApplication({
			nextEventDate: pastDate.toISOString(),
		});
		const html = renderEditableRow(app);
		const row = parseEditableRow(html);

		expect(row?.classList.contains("overdue")).toBe(true);
	});

	it("should not apply overdue styling for future dates", () => {
		const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
		const app = createMockApplication({
			nextEventDate: futureDate.toISOString(),
		});
		const html = renderEditableRow(app);
		const row = parseEditableRow(html);

		expect(row?.classList.contains("overdue")).toBe(false);
	});

	it("should handle special characters in input values", () => {
		const app = createMockApplication({
			company: "Test & Co. Special Company",
			positionTitle: "Senior Developer & Engineer",
		});
		const html = renderEditableRow(app);
		const row = parseEditableRow(html);

		const companyInput = row?.querySelector(
			'input[name="company"]',
		) as HTMLInputElement;
		const positionInput = row?.querySelector(
			'input[name="positionTitle"]',
		) as HTMLInputElement;

		expect(companyInput?.value).toBe("Test & Co. Special Company");
		expect(positionInput?.value).toBe("Senior Developer & Engineer");
	});

	it("should differentiate active vs inactive status categories", () => {
		const activeApp = createMockApplication({
			statusLog: [
				["2024-01-15T10:00:00.000Z", { category: "active", label: "applied" }],
			],
		});
		const inactiveApp = createMockApplication({
			statusLog: [
				[
					"2024-01-15T10:00:00.000Z",
					{ category: "inactive", label: "rejected" },
				],
			],
		});

		const activeRow = parseEditableRow(renderEditableRow(activeApp));
		const inactiveRow = parseEditableRow(renderEditableRow(inactiveApp));

		expect(activeRow?.classList.contains("active")).toBe(true);
		expect(inactiveRow?.classList.contains("inactive")).toBe(true);
	});
});
