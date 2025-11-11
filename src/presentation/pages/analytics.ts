import type { ApplicationsAnalytics } from "../../domain/use-cases/analytics.ts";
import { type LayoutOptions, layout } from "../components/layout.ts";

export const analyticsPage = (
	analytics: ApplicationsAnalytics,
	layoutOptions: LayoutOptions = {},
): string => {
	const { summary, statusDistribution, applicationsByDate, sourceEffectiveness, timeInStatus, interestRatingStats, responseRate } = analytics;

	const content = `
		<div class="analytics-page">
			<div class="page-header">
				<div class="header-content">
					<h1 data-testid="page-title">Analytics Dashboard</h1>
					<p>Insights and visualizations for your job application tracking</p>
				</div>
			</div>

			<!-- Summary Cards -->
			<div class="analytics-summary">
				<div class="summary-card">
					<h3>Total Applications</h3>
					<div class="summary-value">${summary.totalApplications}</div>
				</div>
				<div class="summary-card">
					<h3>Active</h3>
					<div class="summary-value">${summary.activeApplications}</div>
				</div>
				<div class="summary-card">
					<h3>Offers</h3>
					<div class="summary-value">${summary.offersReceived}</div>
				</div>
				<div class="summary-card">
					<h3>Rejections</h3>
					<div class="summary-value">${summary.rejections}</div>
				</div>
				<div class="summary-card">
					<h3>Avg Interest</h3>
					<div class="summary-value">${summary.averageInterestRating.toFixed(1)}</div>
				</div>
				<div class="summary-card">
					<h3>Response Rate</h3>
					<div class="summary-value">${responseRate.responseRate.toFixed(1)}%</div>
				</div>
			</div>

			<!-- Charts Grid -->
			<div class="analytics-charts">
				<!-- Status Distribution -->
				<div class="chart-container">
					<h2>Status Distribution</h2>
					<canvas id="statusDistributionChart"></canvas>
				</div>

				<!-- Applications Over Time -->
				<div class="chart-container">
					<h2>Applications Over Time</h2>
					<canvas id="applicationsOverTimeChart"></canvas>
				</div>

				<!-- Source Effectiveness -->
				<div class="chart-container">
					<h2>Source Effectiveness</h2>
					<canvas id="sourceEffectivenessChart"></canvas>
				</div>

				<!-- Time in Status -->
				<div class="chart-container">
					<h2>Average Time in Status (Days)</h2>
					<canvas id="timeInStatusChart"></canvas>
				</div>

				<!-- Interest Rating Analysis -->
				<div class="chart-container">
					<h2>Success Rate by Interest Rating</h2>
					<canvas id="interestRatingChart"></canvas>
				</div>

				<!-- Response Rate Breakdown -->
				<div class="chart-container">
					<h2>Response Rate Breakdown</h2>
					<canvas id="responseRateChart"></canvas>
				</div>
			</div>
		</div>

		<!-- Chart.js -->
		<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>

		<!-- Analytics Data -->
		<script>
			const analyticsData = ${JSON.stringify(analytics)};
		</script>

		<!-- Initialize Charts -->
		<script src="/scripts/analytics-charts.js"></script>
	`;

	return layout("Analytics Dashboard", content, layoutOptions);
};
