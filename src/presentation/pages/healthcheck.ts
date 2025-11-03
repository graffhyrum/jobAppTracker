import { type LayoutOptions, layout } from "../components/layout";

export const healthcheckPage = (
	dbStatusRecord: Parameters<typeof recordToHtml>[0],
	exposedProcessVariables: Parameters<typeof recordToHtml>[0],
	layoutOptions: LayoutOptions = {},
): string => {
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

			<div class="service-check">
				<h3>Database Status</h3>
				${recordToHtml(dbStatusRecord)}
			</div>

			<div class="service-check">
			<h3>Environment Variables</h3>
				<details>
					<summary>Click to toggle</summary>
					${recordToHtml(exposedProcessVariables)}
				</details>

			</div>
		</div>
		</div>

		<script>
			document.getElementById('timestamp').textContent = new Date().toISOString();
		</script>
	`;

	return layout("Health Check - Job App Tracker", content, layoutOptions);
};

function recordToHtml(record: Record<string, unknown>): string {
	return Object.entries(record)
		.map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`)
		.join("");
}
