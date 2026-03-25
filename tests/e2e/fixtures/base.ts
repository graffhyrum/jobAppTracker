/* oxlint-disable no-empty-pattern */
import { type APIRequestContext, request, test as base } from "@playwright/test";

import type { PageLinkKeys } from "#src/presentation/components/pageConfig.ts";
import type { createApplicationBodySchema } from "#src/presentation/schemas/application-routes.schemas.ts";

import type { ComponentObject, PageObject } from "../config/ScreenplayTypes.ts";
import {
	createApplicationDetails,
	type ApplicationDetailsObject,
} from "../POMs/applicationDetailsPOM.ts";
import {
	createHealthPage,
	type HealthPageObject,
} from "../POMs/healthPagePOM.ts";
import { createHomePage, type HomePageObject } from "../POMs/homePagePOM.ts";
import { createNavBar, type NavBarObject } from "../POMs/navBarPOM.ts";
import {
	createPipelineTable,
	type PipelineTableObject,
} from "../POMs/pipelineTable/pipelineTablePOM.ts";
import {
	createThemeToggle,
	type ThemeToggleObject,
} from "../POMs/themeTogglePOM.ts";

export type PagePOMRegistry = {
	[K in PageLinkKeys as `${string & K}Page`]?: PageObject;
} & {
	homePage: HomePageObject;
	healthPage: HealthPageObject;
};

type ComponentPOMRegistry = Record<string, ComponentObject> & {
	navbar: NavBarObject;
	pipelineTable: PipelineTableObject;
	themeToggle: ThemeToggleObject;
	applicationDetails: ApplicationDetailsObject;
};

export type CreatedApp = {
	id: string;
	company: string;
	positionTitle: string;
};

type AppOverrides = {
	company?: string;
	positionTitle?: string;
};

export type AppFactory = (overrides?: AppOverrides) => Promise<CreatedApp>;

export type WorkerFixtures = {
	immutableApp: CreatedApp;
};

export type TestFixtures = {
	POMs: {
		pages: PagePOMRegistry;
		components: ComponentPOMRegistry;
	};
	appFactory: AppFactory;
	mutableApp: CreatedApp;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
	immutableApp: [
		async ({}, use, workerInfo) => {
			const baseURL = workerInfo.project.use.baseURL;
			if (!baseURL) {
				throw new Error("baseURL not configured in playwright.config.ts");
			}

			const requestContext = await request.newContext({ baseURL });
			let app: CreatedApp | undefined;

			try {
				app = await createAppViaApi(requestContext, {
					company: `W${workerInfo.workerIndex}-Immutable Co`,
					positionTitle: `W${workerInfo.workerIndex}-Immutable Position`,
					applicationDate: new Date().toISOString(),
					sourceType: "other",
				});

				await use(app);
			} finally {
				if (app) {
					try {
						await requestContext.delete(`/applications/${app.id}`);
					} catch {
						// teardown best-effort
					}
				}
				await requestContext.dispose();
			}
		},
		{ scope: "worker" },
	],

	POMs: async ({ page }, use) => {
		const registry: PagePOMRegistry = {
			homePage: createHomePage(page),
			healthPage: createHealthPage(page),
		};
		const componentRegistry: ComponentPOMRegistry = {
			navbar: createNavBar(page),
			pipelineTable: createPipelineTable(page),
			themeToggle: createThemeToggle(page),
			applicationDetails: createApplicationDetails(page),
		};
		await use({
			pages: registry,
			components: componentRegistry,
		});
	},

	appFactory: async ({ request }, use, testInfo) => {
		const createdIds: string[] = [];
		let createdCount = 0;

		const factory: AppFactory = async (overrides) => {
			const position = createdCount++;
			const app = await createAppViaApi(request, {
				company:
					overrides?.company ??
					`W${testInfo.workerIndex}-Factory Co`,
				positionTitle:
					overrides?.positionTitle ??
					`W${testInfo.workerIndex}-Factory Position ${position}`,
				applicationDate: new Date().toISOString(),
				sourceType: "other",
			});
			createdIds.push(app.id);
			return app;
		};

		await use(factory);

		for (const id of createdIds) {
			try {
				await request.delete(`/applications/${id}`);
			} catch {
				// teardown best-effort: app may already be deleted by test
			}
		}
	},

	mutableApp: async ({ appFactory }, use) => {
		const app = await appFactory();
		await use(app);
	},
});

async function createAppViaApi(
	requestContext: APIRequestContext,
	data: Omit<typeof createApplicationBodySchema.infer, "isRemote">,
): Promise<CreatedApp> {
	const response = await requestContext.post("/applications", {
		form: { ...data, isRemote: false },
	});

	if (!response.ok()) {
		throw new Error(
			`Failed to create test app: ${response.status()} ${await response.text()}`,
		);
	}

	const applicationId = response.headers()["x-application-id"];
	if (!applicationId) {
		throw new Error("X-Application-ID header missing from POST response");
	}

	return {
		id: applicationId,
		company: data.company,
		positionTitle: data.positionTitle,
	};
}
