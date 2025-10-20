import {
	defineConfig,
	devices,
	type PlaywrightTestProject,
	type ViewportSize,
} from "@playwright/test";
import { processEnv } from "./processEnvFacade.ts";
import type { TestFixtures } from "./tests/e2e/fixtures/base.ts";

const baseURL = `${processEnv.BASE_URL}:${processEnv.PORT}`;

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
	testDir: "./tests/e2e",
	timeout: 10 * 1000,
	expect: {
		timeout: 2 * 1000,
	},
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : 8,
	reporter: [["dot"], ["html", { open: "never" }]],

	// Global setup and teardown for data isolation
	globalSetup: "./tests/e2e/global-setup.ts",
	globalTeardown: "./tests/e2e/global-teardown.ts",

	use: {
		baseURL,
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
	},

	projects: getProjects(),
});

function getProjects(): PlaywrightTestProject<TestFixtures>[] {
	const base = [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	] as const satisfies PlaywrightTestProject<TestFixtures>[];
	const viewportsOptions: Array<ViewportSize> = [
		{ width: 1920, height: 1080 },
		// { width: 375, height: 667 },
	];

	return base.flatMap((project) =>
		viewportsOptions.map((viewport) => ({
			...project,
			name: `${project.name}-${viewport.width}x${viewport.height}`,
			use: { ...project.use, viewport },
		})),
	);
}
