export const PAGE_CONFIG = {
	brand: {
		text: "Job App Tracker",
		testId: "navbar-brand",
	},
	links: {
		home: {
			href: "/",
			text: "Home",
			testId: "nav-link-home",
		},
		health: {
			href: "/health",
			text: "Health Check",
			testId: "nav-link-health",
		},
	},
} as const satisfies {
	brand: { text: string; testId: string };
	links: Record<string, { href: string; text: string; testId: string }>;
};
export type PageConfig = typeof PAGE_CONFIG;
export type PageLinkKeys = keyof PageConfig["links"];

export function getPageLinkKeys(): PageLinkKeys[] {
	return Object.keys(PAGE_CONFIG.links) as PageLinkKeys[];
}

export const LINK_KEYS = getPageLinkKeys();
