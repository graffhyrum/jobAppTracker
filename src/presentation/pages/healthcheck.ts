import { layout } from "../components/layout";

export const healthcheckPage = (): string => {
	const content = `
		<div class="health-status">
			<h1 data-testid="page-title">System Health Check</h1>
			
			<div class="service-check">
				<h3>Application Status</h3>
				<p class="status-ok">✓ Running</p>
			</div>

			<div class="service-check">
				<h3>System Information</h3>
				<p><strong>Timestamp:</strong> <span id="timestamp"></span></p>
				<p><strong>Environment:</strong> Development</p>
				<p><strong>Version:</strong> 1.0.0</p>
			</div>
		</div>

		<script>
			document.getElementById('timestamp').textContent = new Date().toISOString();
		</script>
	`;

	return layout("Health Check - Job App Tracker", content);
};
