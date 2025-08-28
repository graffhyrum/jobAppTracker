/** biome-ignore-all lint/suspicious/noExplicitAny: Proper Generic Function Definitions require 'any' */
import type { Page } from "@playwright/test";

export type PomFactory = (page: Page) => PageObject;

export interface PageObject {
	page: Page;
	goto: () => Promise<void>;
	// Use 'any' to avoid noUncheckedIndexedAccess making method access possibly undefined in tests
	actions: any;
	assertions: any;
}
