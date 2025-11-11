import { beforeEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { getAndAssertJobData, type JobData } from "./extractorSchema.ts";

// Register happy-dom globals once
try {
	GlobalRegistrator.register();
} catch {
	// Already registered, ignore
}

// Type-narrowing wrapper around expect().toBeDefined()
function expectDefined<T>(value: T): asserts value is NonNullable<T> {
	expect(value).toBeDefined();
}

type AssertionMatcher = "toBe" | "toContain";

type TestConfig = {
	name: string;
	bodyHtml: string | null;
	headHtml: string | null;
	url: string | null;
	documentTitle: string | null;
	expectedCompany: string | null;
	expectedPosition: string | null;
	expectedDescriptionContains: string | null;
	expectedUrl: string | null;
	expectNull: boolean;
	positionMatcher: AssertionMatcher;
	companyMatcher: AssertionMatcher;
	additionalAssertions: ((result: JobData) => void) | null;
};

const runExtractorTests = (
	extractorFn: () => JobData | null,
	tests: TestConfig[],
	validateSchema: boolean = false,
) => {
	for (const test of tests) {
		it(test.name, () => {
			if (test.bodyHtml) document.body.innerHTML = test.bodyHtml;
			if (test.headHtml) document.head.innerHTML = test.headHtml;
			if (test.url) {
				Object.defineProperty(window, "location", {
					value: { href: test.url },
					writable: true,
				});
			}
			if (test.documentTitle) document.title = test.documentTitle;

			const extractResult = extractorFn();

			if (test.expectNull) {
				expect(extractResult).toBeNull();
				return;
			}

			expectDefined(extractResult);

			// Only validate schema for extractJobData tests (which return complete JobData)
			// Individual extractors don't include jobPostingUrl field
			const result = validateSchema
				? getAndAssertJobData(extractResult)
				: extractResult;

			if (test.expectedCompany) {
				if (test.companyMatcher === "toBe") {
					expect(result.company).toBe(test.expectedCompany);
				} else {
					expect(result.company).toContain(test.expectedCompany);
				}
			}
			if (test.expectedPosition) {
				if (test.positionMatcher === "toBe") {
					expect(result.position).toBe(test.expectedPosition);
				} else {
					expect(result.position).toContain(test.expectedPosition);
				}
			}
			if (test.expectedDescriptionContains) {
				expect(result.jobDescription).toContain(
					test.expectedDescriptionContains,
				);
			}
			if (test.expectedUrl) {
				expect(result.jobPostingUrl).toBe(test.expectedUrl);
			}
			if (test.additionalAssertions) {
				test.additionalAssertions(result);
			}
		});
	}
};

describe("Content Script Extractor", () => {
	let extractJobData: () => JobData | null;
	let extractLinkedInJob: () => JobData | null;
	let extractIndeedJob: () => JobData | null;
	let extractGreenhouseJob: () => JobData | null;
	let extractLeverJob: () => JobData | null;
	let extractGeneric: () => JobData | null;

	beforeEach(async () => {
		// Clear the document
		document.body.innerHTML = "";
		document.head.innerHTML = "";

		// Load the extractor script by evaluating it
		// Since it's not a module, we need to evaluate it in the global scope
		const extractorCode = await Bun.file(
			"extension/content/extractor.js",
		).text();

		// Create a function wrapper to capture the functions
		const wrappedCode = `
      ${extractorCode}

      // Export the functions for testing
      return {
        extractJobData,
        extractLinkedInJob,
        extractIndeedJob,
        extractGreenhouseJob,
        extractLeverJob,
        extractGeneric
      };
    `;

		// biome-ignore lint: eval needed for dynamic code loading in tests
		const functions = eval(`(function () {
            ${wrappedCode}
        })()`);

		extractJobData = functions.extractJobData;
		extractLinkedInJob = functions.extractLinkedInJob;
		extractIndeedJob = functions.extractIndeedJob;
		extractGreenhouseJob = functions.extractGreenhouseJob;
		extractLeverJob = functions.extractLeverJob;
		extractGeneric = functions.extractGeneric;
	});

	describe("LinkedIn Job Extraction", () => {
		const linkedInTests: TestConfig[] = [
			{
				name: "should extract job data from LinkedIn unified card format",
				bodyHtml: `
					<div class="job-details-jobs-unified-top-card__company-name">Acme Corp</div>
					<div class="job-details-jobs-unified-top-card__job-title">Senior Software Engineer</div>
					<div class="jobs-description__content">
						We are looking for an experienced software engineer to join our team.
						Must have 5+ years of experience with TypeScript and React.
					</div>
				`,
				headHtml: null,
				url: null,
				documentTitle: null,
				expectedCompany: "Acme Corp",
				expectedPosition: "Senior Software Engineer",
				expectedDescriptionContains: "experienced software engineer",
				expectedUrl: null,
				expectNull: false,
				positionMatcher: "toBe",
				companyMatcher: "toBe",
				additionalAssertions: null,
			},
			{
				name: "should extract job data from LinkedIn topcard format",
				bodyHtml: `
					<a class="topcard__org-name-link">Tech Startup Inc</a>
					<h1 class="topcard__title">Full Stack Developer</h1>
					<div class="description__text">
						Join our fast-growing startup as a full stack developer.
					</div>
				`,
				headHtml: null,
				url: null,
				documentTitle: null,
				expectedCompany: "Tech Startup Inc",
				expectedPosition: "Full Stack Developer",
				expectedDescriptionContains: "fast-growing startup",
				expectedUrl: null,
				expectNull: false,
				positionMatcher: "toBe",
				companyMatcher: "toBe",
				additionalAssertions: null,
			},
			{
				name: "should return null if required fields are missing",
				bodyHtml: `
					<div class="job-details-jobs-unified-top-card__company-name">Acme Corp</div>
					<!-- Missing job title -->
				`,
				headHtml: null,
				url: null,
				documentTitle: null,
				expectedCompany: null,
				expectedPosition: null,
				expectedDescriptionContains: null,
				expectedUrl: null,
				expectNull: true,
				positionMatcher: "toBe",
				companyMatcher: "toBe",
				additionalAssertions: null,
			},
		];

		runExtractorTests(() => extractLinkedInJob(), linkedInTests);
	});

	describe("Indeed Job Extraction", () => {
		const indeedTests: TestConfig[] = [
			{
				name: "should extract job data from Indeed using data attribute",
				bodyHtml: `
					<div data-company-name="true">Global Tech Solutions</div>
					<h1 class="jobsearch-JobInfoHeader-title">Backend Engineer</h1>
					<div id="jobDescriptionText">
						We need a backend engineer with experience in Node.js and databases.
						Competitive salary and benefits package offered.
					</div>
				`,
				headHtml: null,
				url: null,
				documentTitle: null,
				expectedCompany: "Global Tech Solutions",
				expectedPosition: "Backend Engineer",
				expectedDescriptionContains: "Node.js and databases",
				expectedUrl: null,
				expectNull: false,
				positionMatcher: "toBe",
				companyMatcher: "toBe",
				additionalAssertions: null,
			},
			{
				name: "should extract job data from Indeed using company info container",
				bodyHtml: `
					<div class="jobsearch-CompanyInfoContainer">Remote First Company</div>
					<h1 class="jobsearch-JobInfoHeader-title">DevOps Engineer</h1>
					<div id="jobDescriptionText">Remote DevOps position available.</div>
				`,
				headHtml: null,
				url: null,
				documentTitle: null,
				expectedCompany: "Remote First Company",
				expectedPosition: "DevOps Engineer",
				expectedDescriptionContains: null,
				expectedUrl: null,
				expectNull: false,
				positionMatcher: "toBe",
				companyMatcher: "toBe",
				additionalAssertions: null,
			},
			{
				name: "should return null if required fields are missing",
				bodyHtml: `
					<div data-company-name="true">Some Company</div>
					<!-- Missing job title -->
				`,
				headHtml: null,
				url: null,
				documentTitle: null,
				expectedCompany: null,
				expectedPosition: null,
				expectedDescriptionContains: null,
				expectedUrl: null,
				expectNull: true,
				positionMatcher: "toBe",
				companyMatcher: "toBe",
				additionalAssertions: null,
			},
		];

		runExtractorTests(() => extractIndeedJob(), indeedTests);
	});

	describe("Greenhouse Job Extraction", () => {
		const greenhouseTests: TestConfig[] = [
			{
				name: "should extract job data from Greenhouse application page",
				bodyHtml: `
					<div class="company-name">Innovative Startup</div>
					<div class="app-title">Product Manager</div>
					<div id="content">
						<p>We're looking for a product manager to lead our product team.</p>
						<p>Requirements: 3+ years PM experience, strong communication skills.</p>
					</div>
				`,
				headHtml: null,
				url: null,
				documentTitle: null,
				expectedCompany: "Innovative Startup",
				expectedPosition: "Product Manager",
				expectedDescriptionContains: "product manager",
				expectedUrl: null,
				expectNull: false,
				positionMatcher: "toBe",
				companyMatcher: "toBe",
				additionalAssertions: null,
			},
			{
				name: "should use h1 as fallback for position title",
				bodyHtml: `
					<div class="company-name">Design Co</div>
					<h1>UX Designer</h1>
					<div class="job-post">Looking for creative UX designer.</div>
				`,
				headHtml: null,
				url: null,
				documentTitle: null,
				expectedCompany: "Design Co",
				expectedPosition: "UX Designer",
				expectedDescriptionContains: null,
				expectedUrl: null,
				expectNull: false,
				positionMatcher: "toBe",
				companyMatcher: "toBe",
				additionalAssertions: null,
			},
			{
				name: "should return null if company or position is missing",
				bodyHtml: `
					<h1>Some Position</h1>
					<!-- Missing company name -->
				`,
				headHtml: null,
				url: null,
				documentTitle: null,
				expectedCompany: null,
				expectedPosition: null,
				expectedDescriptionContains: null,
				expectedUrl: null,
				expectNull: true,
				positionMatcher: "toBe",
				companyMatcher: "toBe",
				additionalAssertions: null,
			},
		];

		runExtractorTests(() => extractGreenhouseJob(), greenhouseTests);
	});

	describe("Lever Job Extraction", () => {
		const leverTests: TestConfig[] = [
			{
				name: "should extract job data from Lever posting",
				bodyHtml: `
					<div class="main-header-text-logo">Enterprise Solutions Ltd</div>
					<div class="posting-headline">
						<h2>Senior Data Scientist</h2>
					</div>
					<div class="posting-description">
						<p>We're seeking a data scientist with ML expertise.</p>
						<p>Location: San Francisco or Remote</p>
					</div>
				`,
				headHtml: null,
				url: null,
				documentTitle: null,
				expectedCompany: "Enterprise Solutions Ltd",
				expectedPosition: "Senior Data Scientist",
				expectedDescriptionContains: "ML expertise",
				expectedUrl: null,
				expectNull: false,
				positionMatcher: "toBe",
				companyMatcher: "toBe",
				additionalAssertions: null,
			},
			{
				name: "should use section-wrapper as fallback for description",
				bodyHtml: `
					<div class="main-header-text-logo">AI Company</div>
					<div class="posting-headline">
						<h2>ML Engineer</h2>
					</div>
					<div class="section-wrapper">Machine learning position available.</div>
				`,
				headHtml: null,
				url: null,
				documentTitle: null,
				expectedCompany: null,
				expectedPosition: null,
				expectedDescriptionContains: "Machine learning position",
				expectedUrl: null,
				expectNull: false,
				positionMatcher: "toBe",
				companyMatcher: "toBe",
				additionalAssertions: null,
			},
		];

		runExtractorTests(() => extractLeverJob(), leverTests);
	});

	describe("Generic Extraction", () => {
		const genericTests: TestConfig[] = [
			{
				name: "should extract data from h1 and meta tags",
				bodyHtml: `
					<h1>Software Engineer</h1>
					<div class="company-info">Example Corp</div>
					<article>
						<p>We are hiring software engineers with JavaScript experience.</p>
					</article>
				`,
				headHtml: `
					<meta property="og:title" content="Software Engineer at Example Corp">
					<meta property="og:description" content="Join our engineering team">
				`,
				url: "https://example.com/jobs/12345",
				documentTitle: null,
				expectedCompany: null,
				expectedPosition: "Software Engineer",
				expectedDescriptionContains: null,
				expectedUrl: "https://example.com/jobs/12345",
				expectNull: false,
				positionMatcher: "toContain",
				companyMatcher: "toBe",
				additionalAssertions: (result) => {
					expect(result.company).toBeDefined();
				},
			},
			{
				name: "should extract company from page title with 'at' pattern",
				bodyHtml: `
					<h1>Product Designer</h1>
				`,
				headHtml: null,
				url: "https://example.com/jobs/12345",
				documentTitle: "Product Designer at Design Studio",
				expectedCompany: "Design Studio",
				expectedPosition: null,
				expectedDescriptionContains: null,
				expectedUrl: null,
				expectNull: false,
				positionMatcher: "toBe",
				companyMatcher: "toContain",
				additionalAssertions: null,
			},
			{
				name: "should extract description from article tag",
				bodyHtml: `
					<h1>Data Analyst</h1>
					<article>
						<p>We need a data analyst proficient in SQL and Python.</p>
						<p>Experience with data visualization required.</p>
					</article>
				`,
				headHtml: null,
				url: "https://example.com/jobs/12345",
				documentTitle: null,
				expectedCompany: null,
				expectedPosition: null,
				expectedDescriptionContains: "SQL and Python",
				expectedUrl: null,
				expectNull: false,
				positionMatcher: "toBe",
				companyMatcher: "toBe",
				additionalAssertions: null,
			},
			{
				name: "should handle pages with minimal information gracefully",
				bodyHtml: `<h1>Job Title</h1>`,
				headHtml: null,
				url: "https://example.com/jobs/12345",
				documentTitle: null,
				expectedCompany: null,
				expectedPosition: "Job Title",
				expectedDescriptionContains: null,
				expectedUrl: "https://example.com/jobs/12345",
				expectNull: false,
				positionMatcher: "toBe",
				companyMatcher: "toBe",
				additionalAssertions: (result) => {
					expect(result.company).toBeDefined();
				},
			},
		];

		runExtractorTests(() => extractGeneric(), genericTests);
	});

	describe("extractJobData - Main Function", () => {
		const extractJobDataTests: TestConfig[] = [
			{
				name: "should use LinkedIn extractor for linkedin.com URLs",
				bodyHtml: `
					<div class="job-details-jobs-unified-top-card__company-name">LinkedIn Test Co</div>
					<div class="job-details-jobs-unified-top-card__job-title">Test Position</div>
				`,
				headHtml: null,
				url: "https://www.linkedin.com/jobs/view/12345",
				documentTitle: null,
				expectedCompany: "LinkedIn Test Co",
				expectedPosition: null,
				expectedDescriptionContains: null,
				expectedUrl: null,
				expectNull: false,
				positionMatcher: "toBe",
				companyMatcher: "toBe",
				additionalAssertions: (result) => {
					expect(result.jobPostingUrl).toContain("linkedin.com");
				},
			},
			{
				name: "should use Indeed extractor for indeed.com URLs",
				bodyHtml: `
					<div data-company-name="true">Indeed Test Co</div>
					<h1 class="jobsearch-JobInfoHeader-title">Test Position</h1>
				`,
				headHtml: null,
				url: "https://www.indeed.com/viewjob?jk=12345",
				documentTitle: null,
				expectedCompany: "Indeed Test Co",
				expectedPosition: null,
				expectedDescriptionContains: null,
				expectedUrl: null,
				expectNull: false,
				positionMatcher: "toBe",
				companyMatcher: "toBe",
				additionalAssertions: null,
			},
			{
				name: "should fall back to generic extractor for unknown sites",
				bodyHtml: `
					<h1>Unknown Site Position</h1>
					<div class="company">Some Company</div>
				`,
				headHtml: null,
				url: "https://careers.somecompany.com/job/12345",
				documentTitle: null,
				expectedCompany: null,
				expectedPosition: null,
				expectedDescriptionContains: null,
				expectedUrl: null,
				expectNull: false,
				positionMatcher: "toBe",
				companyMatcher: "toBe",
				additionalAssertions: (result) => {
					expect(result.jobPostingUrl).toContain("somecompany.com");
				},
			},
			{
				name: "should include URL in returned data",
				bodyHtml: `
					<div class="job-details-jobs-unified-top-card__company-name">Test Co</div>
					<div class="job-details-jobs-unified-top-card__job-title">Test Role</div>
				`,
				headHtml: null,
				url: "https://www.linkedin.com/jobs/view/12345",
				documentTitle: null,
				expectedCompany: null,
				expectedPosition: null,
				expectedDescriptionContains: null,
				expectedUrl: "https://www.linkedin.com/jobs/view/12345",
				expectNull: false,
				positionMatcher: "toBe",
				companyMatcher: "toBe",
				additionalAssertions: null,
			},
		];

		runExtractorTests(() => extractJobData(), extractJobDataTests);
	});
});
