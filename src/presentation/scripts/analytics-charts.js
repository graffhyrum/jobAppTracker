// Analytics Charts using Chart.js
// This script expects analyticsData to be available globally

(function () {
	if (typeof Chart === "undefined") {
		console.error("Chart.js is not loaded");
		return;
	}

	if (typeof analyticsData === "undefined") {
		console.error("analyticsData is not available");
		return;
	}

	// Color palette for charts
	const colors = {
		active: {
			applied: "#3b82f6",
			"screening interview": "#60a5fa",
			interview: "#93c5fd",
			onsite: "#bfdbfe",
			"online test": "#dbeafe",
			"take-home assignment": "#eff6ff",
			offer: "#10b981",
		},
		inactive: {
			rejected: "#ef4444",
			"no response": "#f87171",
			"no longer interested": "#fca5a5",
			"hiring freeze": "#fecaca",
		},
	};

	const getStatusColor = (label, category) => {
		return colors[category]?.[label] ?? "#6b7280";
	};

	// Chart.js default configuration
	Chart.defaults.font.family = "system-ui, -apple-system, sans-serif";
	Chart.defaults.color = "#374151";

	// 1. Status Distribution Pie Chart
	const statusLabels = analyticsData.statusDistribution.map((s) => s.label);
	const statusCounts = analyticsData.statusDistribution.map((s) => s.count);
	const statusColors = analyticsData.statusDistribution.map((s) =>
		getStatusColor(s.label, s.category),
	);

	new Chart(document.getElementById("statusDistributionChart"), {
		type: "pie",
		data: {
			labels: statusLabels,
			datasets: [
				{
					data: statusCounts,
					backgroundColor: statusColors,
					borderWidth: 2,
					borderColor: "#fff",
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: true,
			plugins: {
				legend: {
					position: "right",
				},
				tooltip: {
					callbacks: {
						label: function (context) {
							const label = context.label || "";
							const value = context.parsed || 0;
							const total = context.dataset.data.reduce((a, b) => a + b, 0);
							const percentage = ((value / total) * 100).toFixed(1);
							return `${label}: ${value} (${percentage}%)`;
						},
					},
				},
			},
		},
	});

	// 2. Applications Over Time Line Chart
	const dates = analyticsData.applicationsByDate.map((d) => d.date);
	const counts = analyticsData.applicationsByDate.map((d) => d.count);

	new Chart(document.getElementById("applicationsOverTimeChart"), {
		type: "line",
		data: {
			labels: dates,
			datasets: [
				{
					label: "Applications",
					data: counts,
					borderColor: "#3b82f6",
					backgroundColor: "rgba(59, 130, 246, 0.1)",
					fill: true,
					tension: 0.4,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: true,
			scales: {
				y: {
					beginAtZero: true,
					ticks: {
						stepSize: 1,
					},
				},
			},
			plugins: {
				legend: {
					display: false,
				},
			},
		},
	});

	// 3. Source Effectiveness Bar Chart
	const sources = analyticsData.sourceEffectiveness.map((s) => s.sourceType);
	const sourceSuccessRates = analyticsData.sourceEffectiveness.map(
		(s) => s.successRate * 100,
	);
	const sourceTotals = analyticsData.sourceEffectiveness.map((s) => s.total);

	new Chart(document.getElementById("sourceEffectivenessChart"), {
		type: "bar",
		data: {
			labels: sources,
			datasets: [
				{
					label: "Success Rate (%)",
					data: sourceSuccessRates,
					backgroundColor: "#10b981",
					borderColor: "#059669",
					borderWidth: 1,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: true,
			scales: {
				y: {
					beginAtZero: true,
					max: 100,
					ticks: {
						callback: function (value) {
							return value + "%";
						},
					},
				},
			},
			plugins: {
				tooltip: {
					callbacks: {
						label: function (context) {
							const index = context.dataIndex;
							const successRate = sourceSuccessRates[index].toFixed(1);
							const total = sourceTotals[index];
							return `${successRate}% success (${total} total apps)`;
						},
					},
				},
			},
		},
	});

	// 4. Time in Status Horizontal Bar Chart
	const timeLabels = analyticsData.timeInStatus.map((t) => t.label);
	const averageDays = analyticsData.timeInStatus.map((t) => t.averageDays);
	const medianDays = analyticsData.timeInStatus.map((t) => t.medianDays);

	new Chart(document.getElementById("timeInStatusChart"), {
		type: "bar",
		data: {
			labels: timeLabels,
			datasets: [
				{
					label: "Average Days",
					data: averageDays,
					backgroundColor: "#3b82f6",
				},
				{
					label: "Median Days",
					data: medianDays,
					backgroundColor: "#60a5fa",
				},
			],
		},
		options: {
			indexAxis: "y",
			responsive: true,
			maintainAspectRatio: true,
			scales: {
				x: {
					beginAtZero: true,
				},
			},
			plugins: {
				tooltip: {
					callbacks: {
						label: function (context) {
							return `${context.dataset.label}: ${context.parsed.x.toFixed(1)} days`;
						},
					},
				},
			},
		},
	});

	// 5. Interest Rating Success Rate Chart
	const ratings = analyticsData.interestRatingStats.map((r) => `Rating ${r.rating}`);
	const ratingSuccessRates = analyticsData.interestRatingStats.map(
		(r) => r.successRate * 100,
	);
	const ratingTotals = analyticsData.interestRatingStats.map((r) => r.total);

	new Chart(document.getElementById("interestRatingChart"), {
		type: "bar",
		data: {
			labels: ratings,
			datasets: [
				{
					label: "Success Rate (%)",
					data: ratingSuccessRates,
					backgroundColor: "#8b5cf6",
					borderColor: "#7c3aed",
					borderWidth: 1,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: true,
			scales: {
				y: {
					beginAtZero: true,
					max: 100,
					ticks: {
						callback: function (value) {
							return value + "%";
						},
					},
				},
			},
			plugins: {
				tooltip: {
					callbacks: {
						label: function (context) {
							const index = context.dataIndex;
							const successRate = ratingSuccessRates[index].toFixed(1);
							const total = ratingTotals[index];
							return `${successRate}% success (${total} apps)`;
						},
					},
				},
			},
		},
	});

	// 6. Response Rate Pie Chart
	const responseLabels = ["With Response", "No Response"];
	const responseCounts = [
		analyticsData.responseRate.withResponse,
		analyticsData.responseRate.noResponse,
	];

	new Chart(document.getElementById("responseRateChart"), {
		type: "doughnut",
		data: {
			labels: responseLabels,
			datasets: [
				{
					data: responseCounts,
					backgroundColor: ["#10b981", "#ef4444"],
					borderWidth: 2,
					borderColor: "#fff",
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: true,
			plugins: {
				legend: {
					position: "bottom",
				},
				tooltip: {
					callbacks: {
						label: function (context) {
							const label = context.label || "";
							const value = context.parsed || 0;
							const total = context.dataset.data.reduce((a, b) => a + b, 0);
							const percentage = ((value / total) * 100).toFixed(1);
							return `${label}: ${value} (${percentage}%)`;
						},
					},
				},
			},
		},
	});
})();
