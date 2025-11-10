import { beforeEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Register happy-dom globals
GlobalRegistrator.register();

describe("Content Script Extractor", () => {
	let extractJobData: () => any;
	let extractLinkedInJob: () => any;
	let extractIndeedJob: () => any;
	let extractGreenhouseJob: () => any;
	let extractLeverJob: () => any;
	let extractGeneric: () => any;

	beforeEach(async () => {
		// Clear the document
		document.body.innerHTML = "";

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
		const functions = eval(`(function() { ${wrappedCode} })()`);

		extractJobData = functions.extractJobData;
		extractLinkedInJob = functions.extractLinkedInJob;
		extractIndeedJob = functions.extractIndeedJob;
		extractGreenhouseJob = functions.extractGreenhouseJob;
		extractLeverJob = functions.extractLeverJob;
		extractGeneric = functions.extractGeneric;
	});

	describe("LinkedIn Job Extraction", () => {
		it("should extract job data from LinkedIn unified card format", () => {
			document.body.innerHTML = `
        <div class="job-details-jobs-unified-top-card__company-name">Acme Corp</div>
        <div class="job-details-jobs-unified-top-card__job-title">Senior Software Engineer</div>
        <div class="jobs-description__content">
          We are looking for an experienced software engineer to join our team.
          Must have 5+ years of experience with TypeScript and React.
        </div>
      `;

			const result = extractLinkedInJob();

			expect(result).toBeDefined();
			expect(result?.company).toBe("Acme Corp");
			expect(result?.position).toBe("Senior Software Engineer");
			expect(result?.jobDescription).toContain("experienced software engineer");
		});

		it("should extract job data from LinkedIn topcard format", () => {
			document.body.innerHTML = `
        <a class="topcard__org-name-link">Tech Startup Inc</a>
        <h1 class="topcard__title">Full Stack Developer</h1>
        <div class="description__text">
          Join our fast-growing startup as a full stack developer.
        </div>
      `;

			const result = extractLinkedInJob();

			expect(result).toBeDefined();
			expect(result?.company).toBe("Tech Startup Inc");
			expect(result?.position).toBe("Full Stack Developer");
			expect(result?.jobDescription).toContain("fast-growing startup");
		});

		it("should return null if required fields are missing", () => {
			document.body.innerHTML = `
        <div class="job-details-jobs-unified-top-card__company-name">Acme Corp</div>
        <!-- Missing job title -->
      `;

			const result = extractLinkedInJob();

			expect(result).toBeNull();
		});
	});

	describe("Indeed Job Extraction", () => {
		it("should extract job data from Indeed using data attribute", () => {
			document.body.innerHTML = `
        <div data-company-name="true">Global Tech Solutions</div>
        <h1 class="jobsearch-JobInfoHeader-title">Backend Engineer</h1>
        <div id="jobDescriptionText">
          We need a backend engineer with experience in Node.js and databases.
          Competitive salary and benefits package offered.
        </div>
      `;

			const result = extractIndeedJob();

			expect(result).toBeDefined();
			expect(result?.company).toBe("Global Tech Solutions");
			expect(result?.position).toBe("Backend Engineer");
			expect(result?.jobDescription).toContain("Node.js and databases");
		});

		it("should extract job data from Indeed using company info container", () => {
			document.body.innerHTML = `
        <div class="jobsearch-CompanyInfoContainer">Remote First Company</div>
        <h1 class="jobsearch-JobInfoHeader-title">DevOps Engineer</h1>
        <div id="jobDescriptionText">Remote DevOps position available.</div>
      `;

			const result = extractIndeedJob();

			expect(result).toBeDefined();
			expect(result?.company).toBe("Remote First Company");
			expect(result?.position).toBe("DevOps Engineer");
		});

		it("should return null if required fields are missing", () => {
			document.body.innerHTML = `
        <div data-company-name="true">Some Company</div>
        <!-- Missing job title -->
      `;

			const result = extractIndeedJob();

			expect(result).toBeNull();
		});
	});

	describe("Greenhouse Job Extraction", () => {
		it("should extract job data from Greenhouse application page", () => {
			document.body.innerHTML = `
        <div class="company-name">Innovative Startup</div>
        <div class="app-title">Product Manager</div>
        <div id="content">
          <p>We're looking for a product manager to lead our product team.</p>
          <p>Requirements: 3+ years PM experience, strong communication skills.</p>
        </div>
      `;

			const result = extractGreenhouseJob();

			expect(result).toBeDefined();
			expect(result?.company).toBe("Innovative Startup");
			expect(result?.position).toBe("Product Manager");
			expect(result?.jobDescription).toContain("product manager");
		});

		it("should use h1 as fallback for position title", () => {
			document.body.innerHTML = `
        <div class="company-name">Design Co</div>
        <h1>UX Designer</h1>
        <div class="job-post">Looking for creative UX designer.</div>
      `;

			const result = extractGreenhouseJob();

			expect(result).toBeDefined();
			expect(result?.company).toBe("Design Co");
			expect(result?.position).toBe("UX Designer");
		});

		it("should return null if company or position is missing", () => {
			document.body.innerHTML = `
        <h1>Some Position</h1>
        <!-- Missing company name -->
      `;

			const result = extractGreenhouseJob();

			expect(result).toBeNull();
		});
	});

	describe("Lever Job Extraction", () => {
		it("should extract job data from Lever posting", () => {
			document.body.innerHTML = `
        <div class="main-header-text-logo">Enterprise Solutions Ltd</div>
        <div class="posting-headline">
          <h2>Senior Data Scientist</h2>
        </div>
        <div class="posting-description">
          <p>We're seeking a data scientist with ML expertise.</p>
          <p>Location: San Francisco or Remote</p>
        </div>
      `;

			const result = extractLeverJob();

			expect(result).toBeDefined();
			expect(result?.company).toBe("Enterprise Solutions Ltd");
			expect(result?.position).toBe("Senior Data Scientist");
			expect(result?.jobDescription).toContain("ML expertise");
		});

		it("should use section-wrapper as fallback for description", () => {
			document.body.innerHTML = `
        <div class="main-header-text-logo">AI Company</div>
        <div class="posting-headline">
          <h2>ML Engineer</h2>
        </div>
        <div class="section-wrapper">Machine learning position available.</div>
      `;

			const result = extractLeverJob();

			expect(result).toBeDefined();
			expect(result?.jobDescription).toContain("Machine learning position");
		});
	});

	describe("Generic Extraction", () => {
		beforeEach(() => {
			// Mock window.location for generic extractor
			Object.defineProperty(window, "location", {
				value: {
					href: "https://example.com/jobs/12345",
				},
				writable: true,
			});
		});

		it("should extract data from h1 and meta tags", () => {
			document.head.innerHTML = `
        <meta property="og:title" content="Software Engineer at Example Corp">
        <meta property="og:description" content="Join our engineering team">
      `;
			document.body.innerHTML = `
        <h1>Software Engineer</h1>
        <div class="company-info">Example Corp</div>
        <article>
          <p>We are hiring software engineers with JavaScript experience.</p>
        </article>
      `;

			const result = extractGeneric();

			expect(result).toBeDefined();
			expect(result.jobPostingUrl).toBe("https://example.com/jobs/12345");
			expect(result.position).toContain("Software Engineer");
			expect(result.company).toBeDefined();
		});

		it("should extract company from page title with 'at' pattern", () => {
			document.title = "Product Designer at Design Studio";
			document.body.innerHTML = `
        <h1>Product Designer</h1>
      `;

			const result = extractGeneric();

			expect(result).toBeDefined();
			expect(result.company).toContain("Design Studio");
		});

		it("should extract description from article tag", () => {
			document.body.innerHTML = `
        <h1>Data Analyst</h1>
        <article>
          <p>We need a data analyst proficient in SQL and Python.</p>
          <p>Experience with data visualization required.</p>
        </article>
      `;

			const result = extractGeneric();

			expect(result).toBeDefined();
			expect(result.jobDescription).toContain("SQL and Python");
		});

		it("should handle pages with minimal information gracefully", () => {
			document.body.innerHTML = `<h1>Job Title</h1>`;

			const result = extractGeneric();

			expect(result).toBeDefined();
			expect(result.position).toBe("Job Title");
			expect(result.company).toBeDefined(); // May be empty string but should exist
			expect(result.jobPostingUrl).toBe("https://example.com/jobs/12345");
		});
	});

	describe("extractJobData - Main Function", () => {
		beforeEach(() => {
			// Mock window.location
			Object.defineProperty(window, "location", {
				value: {
					href: "https://www.linkedin.com/jobs/view/12345",
				},
				writable: true,
			});
		});

		it("should use LinkedIn extractor for linkedin.com URLs", () => {
			document.body.innerHTML = `
        <div class="job-details-jobs-unified-top-card__company-name">LinkedIn Test Co</div>
        <div class="job-details-jobs-unified-top-card__job-title">Test Position</div>
      `;

			const result = extractJobData();

			expect(result).toBeDefined();
			expect(result.company).toBe("LinkedIn Test Co");
			expect(result.jobPostingUrl).toContain("linkedin.com");
		});

		it("should use Indeed extractor for indeed.com URLs", () => {
			Object.defineProperty(window, "location", {
				value: {
					href: "https://www.indeed.com/viewjob?jk=12345",
				},
				writable: true,
			});

			document.body.innerHTML = `
        <div data-company-name="true">Indeed Test Co</div>
        <h1 class="jobsearch-JobInfoHeader-title">Test Position</h1>
      `;

			const result = extractJobData();

			expect(result).toBeDefined();
			expect(result.company).toBe("Indeed Test Co");
		});

		it("should fall back to generic extractor for unknown sites", () => {
			Object.defineProperty(window, "location", {
				value: {
					href: "https://careers.somecompany.com/job/12345",
				},
				writable: true,
			});

			document.body.innerHTML = `
        <h1>Unknown Site Position</h1>
        <div class="company">Some Company</div>
      `;

			const result = extractJobData();

			expect(result).toBeDefined();
			expect(result.jobPostingUrl).toContain("somecompany.com");
		});

		it("should include URL in returned data", () => {
			document.body.innerHTML = `
        <div class="job-details-jobs-unified-top-card__company-name">Test Co</div>
        <div class="job-details-jobs-unified-top-card__job-title">Test Role</div>
      `;

			const result = extractJobData();

			expect(result.jobPostingUrl).toBe(
				"https://www.linkedin.com/jobs/view/12345",
			);
		});
	});
});
