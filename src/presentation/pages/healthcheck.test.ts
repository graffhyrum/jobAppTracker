import { describe, expect, test } from "bun:test";

import { healthcheckPage } from "./healthcheck";

describe("healthcheckPage", () => {
	const dbStatus = { sqlite: "ok" };

	const fakeProcessEnv = {
		BASE_URL: "http://localhost:3000",
		PORT: "3000",
		JOB_APP_MANAGER_TYPE: "test",
		BROWSER_EXTENSION_API_KEY: "super-secret-key-12345",
		NODE_ENV: "development",
		HOME: "/home/user",
		PATH: "/usr/bin:/bin",
		SECRET_TOKEN: "another-secret",
	};

	test("renders allowlisted vars: BASE_URL, PORT, JOB_APP_MANAGER_TYPE", () => {
		const html = healthcheckPage(dbStatus, fakeProcessEnv);

		expect(html).toContain("BASE_URL");
		expect(html).toContain("http://localhost:3000");
		expect(html).toContain("PORT");
		expect(html).toContain("JOB_APP_MANAGER_TYPE");
	});

	test("does NOT render BROWSER_EXTENSION_API_KEY", () => {
		const html = healthcheckPage(dbStatus, fakeProcessEnv);

		expect(html).not.toContain("BROWSER_EXTENSION_API_KEY");
		expect(html).not.toContain("super-secret-key-12345");
	});

	test("does NOT render other non-allowlisted env vars", () => {
		const html = healthcheckPage(dbStatus, fakeProcessEnv);

		expect(html).not.toContain("NODE_ENV");
		expect(html).not.toContain("SECRET_TOKEN");
		expect(html).not.toContain("another-secret");
		expect(html).not.toContain("HOME");
	});

	test("renders database status", () => {
		const html = healthcheckPage(dbStatus, fakeProcessEnv);

		expect(html).toContain("sqlite");
		expect(html).toContain("ok");
	});

	test("HTML-escapes values to prevent XSS", () => {
		const xssEnv = {
			BASE_URL: '<script>alert("xss")</script>',
			PORT: "3000",
			JOB_APP_MANAGER_TYPE: "test",
		};
		const html = healthcheckPage(dbStatus, xssEnv);

		expect(html).not.toContain('<script>alert("xss")</script>');
		expect(html).toContain("&lt;script&gt;");
	});
});
