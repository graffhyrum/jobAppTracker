import { layout } from "../components/layout";

export const healthcheckPage = (): string => {
	const content = `
		<style>
			.health-status {
				background-color: white;
				padding: 20px;
				border-radius: 8px;
				box-shadow: 0 2px 4px rgba(0,0,0,0.1);
			}
			.status-ok {
				color: #28a745;
				font-weight: bold;
			}
			.status-error {
				color: #dc3545;
				font-weight: bold;
			}
			.service-check {
				margin: 10px 0;
				padding: 10px;
				border-left: 4px solid #007bff;
				background-color: #f8f9fa;
			}
		</style>
		<div class="health-status">
			<h1>System Health Check</h1>
			
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
