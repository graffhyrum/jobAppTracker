import type { Page } from "@playwright/test";

// Counter to ensure unique values across test runs
let applicationCounter = 0;

export interface MockJobApplicationData {
	applicationId?: string;
	company?: string;
	positionTitle?: string;
	applicationDate?: string;
	interestRating?: "1" | "2" | "3";
	nextEventDate?: string;
	jobPostingUrl?: string;
	jobDescription?: string;
}

export interface CreateMockApplicationOptions extends MockJobApplicationData {
	// Allow any additional options
}

/**
 * Factory function to create mock job application data with defaults
 * Ensures unique values for each test to prevent conflicts
 */
export function createMockJobApplication(
	overrides: CreateMockApplicationOptions = {},
): MockJobApplicationData {
	applicationCounter++;
	const timestamp = Date.now();

	const defaults: MockJobApplicationData = {
		company: `Test Company ${applicationCounter}`,
		positionTitle: `Software Engineer ${applicationCounter}`,
		applicationDate: "2024-01-01",
		interestRating: "2",
		nextEventDate: "2024-02-01",
		jobPostingUrl: `https://example.com/job-${timestamp}`,
		jobDescription: `Job description for test application ${applicationCounter}`,
	};

	return { ...defaults, ...overrides };
}

/**
 * Helper function to fill a job application form using the page object
 * Uses the mock data to fill form fields
 */
export async function fillJobApplicationForm(
	page: Page,
	mockData: MockJobApplicationData,
): Promise<void> {
	if (mockData.company) {
		await page.fill('input[name="company"]', mockData.company);
	}
	if (mockData.positionTitle) {
		await page.fill('input[name="positionTitle"]', mockData.positionTitle);
	}
	if (mockData.applicationDate) {
		await page.fill('input[name="applicationDate"]', mockData.applicationDate);
	}
	if (mockData.interestRating) {
		await page.selectOption(
			'select[name="interestRating"]',
			mockData.interestRating,
		);
	}
	if (mockData.nextEventDate) {
		await page.fill('input[name="nextEventDate"]', mockData.nextEventDate);
	}
	if (mockData.jobPostingUrl) {
		await page.fill('input[name="jobPostingUrl"]', mockData.jobPostingUrl);
	}
	if (mockData.jobDescription) {
		await page.fill('textarea[name="jobDescription"]', mockData.jobDescription);
	}
}

/**
 * Helper function to create and submit a job application through the UI
 * Returns the mock data used, including the applicationId
 */
export async function createJobApplicationViaUI(
	page: Page,
	overrides: CreateMockApplicationOptions = {},
): Promise<MockJobApplicationData> {
	const mockData = createMockJobApplication(overrides);

	// Navigate to add application page
	await page.goto("/add");

	// Fill the form
	await fillJobApplicationForm(page, mockData);

	// Submit and capture the response to extract the application ID
	const [response] = await Promise.all([
		page.waitForResponse(
			(response) =>
				response.url().includes("/applications") &&
				response.request().method() === "POST" &&
				response.status() === 303,
			{ timeout: 10000 },
		),
		page.click('button[type="submit"]'),
	]);

	// Extract application ID from the response header
	let applicationId: string | undefined;
	try {
		const appIdHeader = response.headers()["x-application-id"];
		if (appIdHeader) {
			applicationId = appIdHeader;
		}
	} catch (error) {
		console.warn(
			"Could not extract application ID from response header:",
			error,
		);
	}

	// Fallback: If we couldn't get the ID from the response header, try to get it from the page
	if (!applicationId) {
		await page.waitForURL("/", { timeout: 5000 }).catch(() => {});
		// Look for the created application row in the table
		try {
			const firstRow = page
				.locator('[data-testid^="application-row-"]')
				.first();
			const testId = await firstRow.getAttribute("data-testid");
			if (testId) {
				applicationId = testId.replace("application-row-", "");
			}
		} catch (error) {
			console.warn("Could not extract application ID from page:", error);
		}
	}

	return { ...mockData, applicationId };
}
