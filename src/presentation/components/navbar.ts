import { PAGE_CONFIG } from "./pageConfig.ts";

export function navbar(): string {
	const {
		brand,
		links: { home, health },
	} = PAGE_CONFIG;
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
				<a href=${health.href} class="nav-link" data-testid=${health.testId}>${health.text}</a>
			</li>
		</ul>
	</div>
</nav>`;
}
