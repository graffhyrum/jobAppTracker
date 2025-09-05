import { test as base } from "@playwright/test";
import {
	createJobApplication,
	type JobApplication,
} from "../../../src/domain/entities/job-application.ts";
import { jobApplicationRepositoryProvider } from "../../../src/infrastructure/di/repository-provider.ts";
import type { PageObject } from "../config/ScreenplayTypes.ts";
import {
	type AddApplicationPageObject,
	createAddApplicationPage,
} from "../POMs/addApplicationPagePOM.ts";
import {
	createHealthPage,
	type HealthPageObject,
} from "../POMs/healthPagePOM.ts";
import { createHomePage, type HomePageObject } from "../POMs/homePagePOM.ts";
import {
	createPipelineTable,
	type PipelineTableObject,
} from "../POMs/pipelineTablePOM.ts";

type POMRegistry = Record<string, PageObject> & {
	homePage: HomePageObject;
	healthPage: HealthPageObject;
	addApplicationPage: AddApplicationPageObject;
	pipelineTable: PipelineTableObject;
};

export type TestFixtures = {
	POMs: POMRegistry;
};

export type WorkerFixtures = {
	testJobApplication: JobApplication;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
	POMs: async ({ page }, use) => {
		const registry: POMRegistry = {
			homePage: createHomePage(page),
			healthPage: createHealthPage(page),
			addApplicationPage: createAddApplicationPage(page),
			pipelineTable: createPipelineTable(page),
		};
		await use(registry);
	},

	testJobApplication: [
		// biome-ignore lint/correctness/noEmptyPattern: required by playwright
		async ({}, use) => {
			const testJobApp = createJobApplication({
				company: "Test Company",
				positionTitle: "Test Position",
				applicationDate: new Date().toISOString(),
			}).match(
				(v) => v,
				(e) => {
					throw new Error(`Failed to create test job application: ${e}`);
				},
			);

			// Save to the repository using the DI provider
			const repository = jobApplicationRepositoryProvider;
			const saveResult = await repository.save(testJobApp);
			if (saveResult.isErr()) {
				throw new Error(
					`Failed to save test job application: ${saveResult.error}`,
				);
			}

			// Use the application with its data accessible to tests
			await use(testJobApp);

			// Clean up: delete the test application after use
			const deleteResult = await repository.deleteById(testJobApp.id);
			if (deleteResult.isErr()) {
				console.warn(
					`Failed to delete test job application: ${deleteResult.error}`,
				);
			}
		},
		{ scope: "worker" },
	],
});
