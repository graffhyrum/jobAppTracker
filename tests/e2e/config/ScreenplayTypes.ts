/** biome-ignore-all lint/suspicious/noExplicitAny: Proper Generic Function Definitions require 'any' */
import type { Locator, Page } from "@playwright/test";

export type PomFactory = (page: Page) => PageObject;
export type ComponentFactory = (page: Page) => ComponentObject;
export type LocatorConfigMap = Record<string, Locator>;

export type ComponentObject = {
	page: Page;
	components: Record<string, ComponentObject>;
	actions: Record<string, (...args: any[]) => any>;
	assertions: Record<string, (...args: any[]) => any>;
};

export type PageObject = ComponentObject & {
	goto: () => Promise<void>;
};
