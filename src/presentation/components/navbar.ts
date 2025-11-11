import { PAGE_CONFIG } from "./pageConfig.ts";

export type NavbarOptions = {
	isDev?: boolean;
	currentDb?: "test" | "prod";
};

export function navbar(options: NavbarOptions = {}): string {
	const { isDev = false, currentDb = "prod" } = options;
	const {
		brand,
		links: { home, analytics, health, api },
	} = PAGE_CONFIG;

	const dbSelector = `
		<div class="db-selector" data-testid="db-selector">
			<span class="db-selector-label">DB:</span>
			<div class="db-selector-buttons">
				<button
					class="db-selector-button ${currentDb === "test" ? "active" : ""}"
					hx-post="/dev/switch-db"
					hx-vals='{"environment": "test"}'
					hx-swap="none"
					data-testid="db-selector-test">
					Test
				</button>
				<button
					class="db-selector-button ${currentDb === "prod" ? "active" : ""}"
					hx-post="/dev/switch-db"
					hx-vals='{"environment": "prod"}'
					hx-swap="none"
					data-testid="db-selector-prod">
					Prod
				</button>
			</div>
		</div>`;

	return `
<nav class="navbar" data-testid="navbar">
	<div class="navbar-container">
		<div class="navbar-brand">
			<p>${brand.text}</p>
		</div>
		<ul class="navbar-nav">
			<li class="nav-item">
				<a href=${home.href} class="nav-link" data-testid=${home.testId}>${home.text}</a>
			</li>
			<li class="nav-item">
				<a href=${analytics.href} class="nav-link" data-testid=${analytics.testId}>${analytics.text}</a>
			</li>
			<li class="nav-item">
				<a href=${health.href} class="nav-link" data-testid=${health.testId}>${health.text}</a>
			</li>
			<li class="nav-item">
				<a href=${api.href} class="nav-link" data-testid=${api.testId}>${api.text}</a>
			</li>
			<li class="nav-item">
				<button class="theme-toggle" id="theme-toggle" aria-label="Toggle dark mode" data-testid="theme-toggle">
					<span class="theme-icon">🌙</span>
				</button>
			</li>
		</ul>
		${isDev ? dbSelector : ""}
	</div>
</nav>`;
}
