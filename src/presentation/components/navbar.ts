export const navbar = (): string => `
<nav class="navbar" data-testid="navbar">
	<div class="navbar-container">
		<div class="navbar-brand">
			<a href="/" data-testid="navbar-brand">Job App Tracker</a>
		</div>
		<ul class="navbar-nav">
			<li class="nav-item">
				<a href="/" class="nav-link" data-testid="nav-link-home">Home</a>
			</li>
			<li class="nav-item">
				<a href="/health" class="nav-link" data-testid="nav-link-health">Health Check</a>
			</li>
		</ul>
	</div>
</nav>`;
