export const navbar = (): string => `
<nav class="navbar">
	<div class="navbar-container">
		<div class="navbar-brand">
			<a href="/">Job App Tracker</a>
		</div>
		<ul class="navbar-nav">
			<li class="nav-item">
				<a href="/" class="nav-link">Home</a>
			</li>
			<li class="nav-item">
				<a href="/health" class="nav-link">Health Check</a>
			</li>
		</ul>
	</div>
</nav>
<style>
	.navbar {
		background-color: #343a40;
		padding: 0;
		margin-bottom: 20px;
		box-shadow: 0 2px 4px rgba(0,0,0,0.1);
	}
	
	.navbar-container {
		display: flex;
		justify-content: space-between;
		align-items: center;
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 20px;
		height: 60px;
	}
	
	.navbar-brand a {
		color: #fff;
		font-size: 1.5rem;
		font-weight: bold;
		text-decoration: none;
		transition: color 0.3s ease;
	}
	
	.navbar-brand a:hover {
		color: #007bff;
	}
	
	.navbar-nav {
		display: flex;
		list-style: none;
		margin: 0;
		padding: 0;
		gap: 20px;
	}
	
	.nav-item {
		margin: 0;
	}
	
	.nav-link {
		color: #fff;
		text-decoration: none;
		padding: 8px 16px;
		border-radius: 4px;
		transition: background-color 0.3s ease, color 0.3s ease;
	}
	
	.nav-link:hover {
		background-color: #495057;
		color: #007bff;
	}
	
	.nav-link.active {
		background-color: #007bff;
		color: #fff;
	}
	
	@media (max-width: 768px) {
		.navbar-container {
			padding: 0 15px;
		}
		
		.navbar-brand a {
			font-size: 1.25rem;
		}
		
		.navbar-nav {
			gap: 10px;
		}
		
		.nav-link {
			padding: 6px 12px;
			font-size: 0.9rem;
		}
	}
</style>`;
