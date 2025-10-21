/** biome-ignore-all lint/correctness/noEmptyPattern: required by playwright */
import { test as base } from "@playwright/test";
import type { JobApplication } from "#src/domain/entities/job-application.ts";
import type { PageLinkKeys } from "#src/presentation/components/pageConfig.ts";
import type { createApplicationBodySchema } from "#src/presentation/schemas/application-routes.schemas.ts";
import type { ComponentObject, PageObject } from "../config/ScreenplayTypes.ts";
import {
	createHealthPage,
	type HealthPageObject,
} from "../POMs/healthPagePOM.ts";
import { createHomePage, type HomePageObject } from "../POMs/homePagePOM.ts";
import { createNavBar, type NavBarObject } from "../POMs/navBarPOM.ts";
import {
	createPipelineTable,
	type PipelineTableObject,
} from "../POMs/pipelineTablePOM.ts";

export type PagePOMRegistry = {
	[K in PageLinkKeys as `${string & K}Page`]?: PageObject;
} & {
	homePage: HomePageObject;
	healthPage: HealthPageObject;
};

type ComponentPOMRegistry = Record<string, ComponentObject> & {
	navbar: NavBarObject;
	pipelineTable: PipelineTableObject;
};

export type TestFixtures = {
	POMs: {
		pages: PagePOMRegistry;
		components: ComponentPOMRegistry;
	};
	testJobApplication: JobApplication;
};

export const test = base.extend<TestFixtures>({
	POMs: async ({ page }, use) => {
		const registry: PagePOMRegistry = {
			homePage: createHomePage(page),
			healthPage: createHealthPage(page),
		};
		const componentRegistry: ComponentPOMRegistry = {
			navbar: createNavBar(page),
			pipelineTable: createPipelineTable(page),
		};
		await use({
			pages: registry,
			components: componentRegistry,
		});
	},

	testJobApplication: async ({ request }, use, testInfo) => {
		// Create the input data for the API as form data
		const testJobAppData = {
			company: "Test Company",
			positionTitle: `Test Position - ${testInfo.workerIndex}`,
			applicationDate: new Date().toISOString(),
		} satisfies typeof createApplicationBodySchema.infer;

		// Create via API using form data
		const response = await request.post("/applications", {
			form: testJobAppData,
		});

		if (!response.ok()) {
			throw new Error(
				`Failed to create test job application: ${response.status()}`,
			);
		}

		// Extract application ID from response headers
		const applicationId = response.headers()["x-application-id"];
		if (!applicationId) {
			throw new Error("Application ID not found in response headers");
		}

		// Fetch the created application to get full details
		const getResponse = await request.get(`/applications/${applicationId}`);
		if (!getResponse.ok()) {
			throw new Error(
				`Failed to fetch created application: ${getResponse.status()}`,
			);
		}

		// Parse the application from the HTML response or construct it
		const testJobApp: JobApplication = {
			id: applicationId,
			...testJobAppData,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			notes: [],
			statusLog: [
				[new Date().toISOString(), { category: "active", label: "applied" }],
			],
		} as JobApplication;

		testInfo.annotations.push({
			type: "jobApplication",
			description: JSON.stringify(testJobApp, null, 2),
		});

		await use(testJobApp);
	},
});
