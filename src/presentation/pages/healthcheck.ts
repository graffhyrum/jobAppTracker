import { getEntries } from "#rootTypes/entries.ts";

import { type LayoutOptions, layout } from "../components/layout";
import { escapeHtml } from "../utils/html-escape";

export const healthcheckPage = (
	dbStatusRecord: Parameters<typeof recordToHtml>[0],
	exposedProcessVariables: Parameters<typeof recordToHtml>[0],
	layoutOptions: LayoutOptions = {},
): string => {
	const content = `
		<style>
			.env-vars-section {
				margin-bottom: 20px;
				padding-bottom: 15px;
				border-bottom: 1px solid #eee;
			}
			.env-vars-section:last-child {
				border-bottom: none;
				margin-bottom: 0;
			}
			.env-vars-section h4 {
				margin: 0 0 10px 0;
				color: #666;
				font-size: 14px;
				text-transform: uppercase;
				letter-spacing: 0.5px;
			}
		</style>
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
					<div class="env-vars-section">
						<h4>Application Variables</h4>
						${recordToHtml(filterAllowlistedVars(exposedProcessVariables))}
					</div>
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
		.map(([key, value]) => `<p><strong>${escapeHtml(String(key))}:</strong> ${escapeHtml(String(value))}</p>`)
		.join("");
}

/** Only non-secret env vars that are safe to render in HTML. */
const allowlistedVars = ["BASE_URL", "PORT", "JOB_APP_MANAGER_TYPE"] as const;
const allowlistSet = new Set<string>(allowlistedVars);

function filterAllowlistedVars(
	record: Record<string, unknown>,
): Record<string, unknown> {
	return Object.fromEntries(
		getEntries(record).filter(([key]) => allowlistSet.has(key)),
	);
}
