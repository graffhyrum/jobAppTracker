import type { Locator, Page } from "@playwright/test";
import type { Fn } from "#rootTypes/generic-function.ts";

export type PomFactory = (page: Page) => PageObject;
// biome-ignore lint/suspicious/noExplicitAny: generic
export type ComponentFactory = (page: Page, ...args: any[]) => ComponentObject;
export type LocatorConfigMap = Record<string, Locator>;
export type FunctionTree = {
	[key: string]: Fn | FunctionTree;
};

export type ComponentObject = {
	page: Page;
	actions: FunctionTree;
	assertions: FunctionTree;
};

export type PageObject = ComponentObject & {
	goto: () => Promise<void>;
};
