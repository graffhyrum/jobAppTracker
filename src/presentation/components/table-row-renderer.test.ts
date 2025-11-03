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

	it("should render basic application row", () => {
		const app = createMockApplication();
		const result = renderApplicationTableRow(app);

		expect(result).toContain('data-testid="application-row-test-id"');
		expect(result).toContain("Test Company");
		expect(result).toContain("Software Engineer");
		expect(result).toContain("2024-01-15"); // formatted application date
		expect(result).toContain("2024-01-16"); // formatted updated date
		expect(result).toContain("★★★"); // interest rating
	});

	it("should render with active status", () => {
		const app = createMockApplication({
			statusLog: [
				[
					"2024-01-15T10:00:00.000Z",
					{ category: "active", label: "interview" },
				],
			],
		});
		const result = renderApplicationTableRow(app);

		expect(result).toContain('class="application-row active ');
		expect(result).toContain('class="status-badge active"');
		expect(result).toContain(">interview</span>");
	});

	it("should render with inactive status", () => {
		const app = createMockApplication({
			statusLog: [
				[
					"2024-01-15T10:00:00.000Z",
					{ category: "inactive", label: "rejected" },
				],
			],
		});
		const result = renderApplicationTableRow(app);

		expect(result).toContain('class="application-row inactive ');
		expect(result).toContain('class="status-badge inactive"');
		expect(result).toContain(">rejected</span>");
	});

	it("should render with overdue class when next event is past", () => {
		const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
		const app = createMockApplication({
			nextEventDate: pastDate.toISOString(),
		});
		const result = renderApplicationTableRow(app);

		expect(result).toContain('class="application-row active overdue"');
		expect(result).toContain('class="overdue-date"');
	});

	it("should render next event date when present", () => {
		const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now
		const app = createMockApplication({
			nextEventDate: futureDate.toISOString(),
		});
		const result = renderApplicationTableRow(app);

		expect(result).toContain(futureDate.toISOString());
		expect(result).toContain('data-testid="next-event-date-test-id"');
		expect(result).not.toContain("overdue-date");
	});

	it('should render "No date set" when next event date is missing', () => {
		const app = createMockApplication();
		const result = renderApplicationTableRow(app);

		expect(result).toContain("No date set");
		expect(result).toContain('data-testid="no-next-event-test-id"');
	});

	it("should render with no interest rating", () => {
		const app = createMockApplication({ interestRating: undefined });
		const result = renderApplicationTableRow(app);

		// Should not show any star characters when no rating is set
		expect(result).not.toContain("★");
	});

	it("should include all required HTMX attributes", () => {
		const app = createMockApplication();
		const result = renderApplicationTableRow(app);

		// Check that the Edit button has HTMX attributes for row-level edit
		expect(result).toContain('hx-get="/applications/test-id/edit"');
		expect(result).toContain('hx-target="closest tr"');
		expect(result).toContain('hx-swap="outerHTML"');
	});

	it("should include accessibility attributes", () => {
		const app = createMockApplication();
		const result = renderApplicationTableRow(app);

		// Edit button should be clearly labeled
		expect(result).toContain('title="Edit Application"');
		// View button remains labeled
		expect(result).toContain('title="View Details"');
	});

	it("should include all required test IDs", () => {
		const app = createMockApplication();
		const result = renderApplicationTableRow(app);

		expect(result).toContain('data-testid="application-row-test-id"');
		expect(result).toContain('data-testid="company-cell-test-id"');
		expect(result).toContain('data-testid="position-cell-test-id"');
		expect(result).toContain('data-testid="status-cell-test-id"');
		expect(result).toContain('data-testid="status-badge-test-id"');
		expect(result).toContain('data-testid="application-date-cell-test-id"');
		expect(result).toContain('data-testid="updated-date-cell-test-id"');
		expect(result).toContain('data-testid="interest-cell-test-id"');
		expect(result).toContain('data-testid="next-event-cell-test-id"');
		expect(result).toContain('data-testid="actions-cell-test-id"');
		expect(result).toContain('data-testid="view-btn-test-id"');
	});

	it("should handle special characters in company and position names", () => {
		const app = createMockApplication({
			company: 'Test & Co. "Special" Company',
			positionTitle: "Senior <Developer> & Engineer",
		});
		const result = renderApplicationTableRow(app);

		expect(result).toContain('Test & Co. "Special" Company');
		expect(result).toContain("Senior <Developer> & Engineer");
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

	it("should render editable row with input fields", () => {
		const app = createMockApplication();
		const result = renderEditableRow(app);

		expect(result).toContain('class="application-row active');
		expect(result).toContain('editing"');
		expect(result).toContain('data-testid="application-row-test-id"');
		expect(result).toContain('type="text"');
		expect(result).toContain('name="company"');
		expect(result).toContain('name="positionTitle"');
	});

	it("should render company input with correct value", () => {
		const app = createMockApplication({ company: "Acme Corp" });
		const result = renderEditableRow(app);

		expect(result).toContain('value="Acme Corp"');
		expect(result).toContain('data-testid="edit-input-company-test-id"');
		expect(result).toContain("autofocus");
	});

	it("should render position input with correct value", () => {
		const app = createMockApplication({ positionTitle: "Senior Developer" });
		const result = renderEditableRow(app);

		expect(result).toContain('value="Senior Developer"');
		expect(result).toContain('data-testid="edit-input-position-test-id"');
	});

	it("should render status dropdown with all options", () => {
		const app = createMockApplication();
		const result = renderEditableRow(app);

		expect(result).toContain('name="status"');
		expect(result).toContain('data-testid="edit-select-status-test-id"');
		expect(result).toContain('<option value="applied"');
		expect(result).toContain('<option value="screening interview"');
		expect(result).toContain('<option value="interview"');
		expect(result).toContain('<option value="onsite"');
		expect(result).toContain('<option value="online test"');
		expect(result).toContain('<option value="take-home assignment"');
		expect(result).toContain('<option value="offer"');
		expect(result).toContain('<option value="rejected"');
		expect(result).toContain('<option value="no response"');
		expect(result).toContain('<option value="no longer interested"');
		expect(result).toContain('<option value="hiring freeze"');
	});

	it("should select current status in dropdown", () => {
		const app = createMockApplication({
			statusLog: [
				[
					"2024-01-15T10:00:00.000Z",
					{ category: "active", label: "interview" },
				],
			],
		});
		const result = renderEditableRow(app);

		expect(result).toContain(
			'<option value="interview" selected>interview</option>',
		);
	});

	it("should render interest rating dropdown with all options", () => {
		const app = createMockApplication();
		const result = renderEditableRow(app);

		expect(result).toContain('name="interestRating"');
		expect(result).toContain('data-testid="edit-select-interest-test-id"');
		expect(result).toContain('<option value="">None</option>');
		expect(result).toContain('<option value="1"');
		expect(result).toContain('<option value="2"');
		expect(result).toContain('<option value="3"');
		expect(result).toContain("★☆☆");
		expect(result).toContain("★★☆");
		expect(result).toContain("★★★");
	});

	it("should select correct interest rating", () => {
		const app = createMockApplication({ interestRating: 2 });
		const result = renderEditableRow(app);

		expect(result).toContain('<option value="2" selected>★★☆</option>');
	});

	it("should handle undefined interest rating", () => {
		const app = createMockApplication({ interestRating: undefined });
		const result = renderEditableRow(app);

		expect(result).toContain('<option value="">None</option>');
		// When no rating is set, none of the star options should be selected
		expect(result).not.toContain('<option value="1" selected');
		expect(result).not.toContain('<option value="2" selected');
		expect(result).not.toContain('<option value="3" selected');
	});

	it("should render date input with formatted nextEventDate", () => {
		const app = createMockApplication({
			nextEventDate: "2024-03-15T10:00:00.000Z",
		});
		const result = renderEditableRow(app);

		expect(result).toContain('type="date"');
		expect(result).toContain('name="nextEventDate"');
		expect(result).toContain('value="2024-03-15"');
		expect(result).toContain('data-testid="edit-input-nextEvent-test-id"');
	});

	it("should render empty date input when no nextEventDate", () => {
		const app = createMockApplication({ nextEventDate: undefined });
		const result = renderEditableRow(app);

		expect(result).toContain('type="date"');
		expect(result).toContain('value=""');
	});

	it("should render readonly fields for applicationDate and updatedAt", () => {
		const app = createMockApplication();
		const result = renderEditableRow(app);

		// These fields should not have inputs
		expect(result).toContain('data-testid="application-date-cell-test-id"');
		expect(result).toContain('data-testid="updated-date-cell-test-id"');
		// Should contain formatted dates (not inputs)
		expect(result).toContain("2024-01-15");
		expect(result).toContain("2024-01-16");
	});

	it("should render save button with correct HTMX attributes", () => {
		const app = createMockApplication();
		const result = renderEditableRow(app);

		expect(result).toContain('data-testid="save-btn-test-id"');
		expect(result).toContain('hx-put="/applications/test-id"');
		expect(result).toContain('hx-include="closest tr"');
		expect(result).toContain('hx-target="closest tr"');
		expect(result).toContain('hx-swap="outerHTML"');
		expect(result).toContain('title="Save Changes"');
	});

	it("should render cancel button with correct HTMX attributes", () => {
		const app = createMockApplication();
		const result = renderEditableRow(app);

		expect(result).toContain('data-testid="cancel-btn-test-id"');
		expect(result).toContain('hx-get="/applications/test-id"');
		expect(result).toContain('hx-target="closest tr"');
		expect(result).toContain('hx-swap="outerHTML"');
		expect(result).toContain('title="Cancel"');
	});

	it("should include keyboard handlers for Escape and Enter", () => {
		const app = createMockApplication();
		const result = renderEditableRow(app);

		expect(result).toContain("onkeydown=");
		expect(result).toContain("e.key==='Escape'");
		expect(result).toContain("e.key==='Enter'");
		expect(result).toContain(
			"querySelector('[data-testid=cancel-btn-test-id]'",
		);
		expect(result).toContain("querySelector('[data-testid=save-btn-test-id]'");
	});

	it("should apply overdue class when nextEventDate is past", () => {
		const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
		const app = createMockApplication({
			nextEventDate: pastDate.toISOString(),
		});
		const result = renderEditableRow(app);

		expect(result).toContain('class="application-row active overdue editing"');
	});

	it("should not apply overdue class for future dates", () => {
		const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now
		const app = createMockApplication({
			nextEventDate: futureDate.toISOString(),
		});
		const result = renderEditableRow(app);

		expect(result).not.toContain("overdue editing");
	});

	it("should handle special characters in input values", () => {
		const app = createMockApplication({
			company: 'Test & Co. "Special" Company',
			positionTitle: "Senior <Developer> & Engineer",
		});
		const result = renderEditableRow(app);

		expect(result).toContain('value="Test & Co. "Special" Company"');
		expect(result).toContain('value="Senior <Developer> & Engineer"');
	});

	it("should include all required test IDs for edit mode", () => {
		const app = createMockApplication();
		const result = renderEditableRow(app);

		expect(result).toContain('data-testid="application-row-test-id"');
		expect(result).toContain('data-testid="company-cell-test-id"');
		expect(result).toContain('data-testid="position-cell-test-id"');
		expect(result).toContain('data-testid="status-cell-test-id"');
		expect(result).toContain('data-testid="application-date-cell-test-id"');
		expect(result).toContain('data-testid="updated-date-cell-test-id"');
		expect(result).toContain('data-testid="interest-cell-test-id"');
		expect(result).toContain('data-testid="next-event-cell-test-id"');
		expect(result).toContain('data-testid="actions-cell-test-id"');
		expect(result).toContain('data-testid="edit-input-company-test-id"');
		expect(result).toContain('data-testid="edit-input-position-test-id"');
		expect(result).toContain('data-testid="edit-select-status-test-id"');
		expect(result).toContain('data-testid="edit-select-interest-test-id"');
		expect(result).toContain('data-testid="edit-input-nextEvent-test-id"');
		expect(result).toContain('data-testid="save-btn-test-id"');
		expect(result).toContain('data-testid="cancel-btn-test-id"');
	});

	it("should handle inactive status category", () => {
		const app = createMockApplication({
			statusLog: [
				[
					"2024-01-15T10:00:00.000Z",
					{ category: "inactive", label: "rejected" },
				],
			],
		});
		const result = renderEditableRow(app);

		expect(result).toContain('class="application-row inactive');
	});

	it("should handle missing status (fallback to active)", () => {
		const app = createMockApplication({
			statusLog: [],
		});
		const result = renderEditableRow(app);

		// Should fallback to "active" category
		expect(result).toContain('class="application-row active');
	});
});
