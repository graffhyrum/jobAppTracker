import type { Locator, Page } from "@playwright/test";
import type { Fn } from "#rootTypes/generic-function.ts";

export type PomFactory = (page: Page) => PageObject;
export type ComponentFactory = (page: Page) => ComponentObject;
export type LocatorConfigMap = Record<string, Locator>;

export type ComponentObject = {
	page: Page;
	actions: Record<string, Fn>;
	assertions: Record<string, Fn>;
};

export type PageObject = ComponentObject & {
	goto: () => Promise<void>;
};
