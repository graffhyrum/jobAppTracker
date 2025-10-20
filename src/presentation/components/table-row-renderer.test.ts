import { describe, expect, it } from "bun:test";
import type { JobApplication } from "../../domain/entities/job-application";
import { renderApplicationTableRow } from "./table-row-renderer";

describe("Table Row Renderer", () => {
	const createMockApplication = (
		overrides: Partial<JobApplication> = {},
	): JobApplication => ({
		id: "test-id",
		company: "Test Company",
		positionTitle: "Software Engineer",
		applicationDate: "2024-01-15T10:00:00.000Z",
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
