// Analytics Charts using Chart.js
// This script expects analyticsData to be available globally

(() => {
	if (typeof Chart === "undefined") {
		console.error("Chart.js is not loaded");
		return;
	}

	if (typeof analyticsData === "undefined") {
		console.error("analyticsData is not available");
		return;
	}

	// Read theme colors from CSS custom properties for theme-aware, accessible charts
	const getThemeColor = (colorVar) => {
		return getComputedStyle(document.documentElement)
			.getPropertyValue(colorVar)
			.trim();
	};

	// WCAG AA compliant color palette using theme colors
	const themeColors = {
		textPrimary: getThemeColor("--color-text-primary"),
		textSecondary: getThemeColor("--color-text-secondary"),
		blueBase: getThemeColor("--color-accent-blue"),
		blueLight: getThemeColor("--color-accent-blue-light"),
		blueMedium: getThemeColor("--color-accent-blue-medium"),
		blueDark: getThemeColor("--color-accent-blue-dark"),
		success: getThemeColor("--color-status-success"),
		error: getThemeColor("--color-status-error"),
		errorLight: getThemeColor("--color-status-error-lighter"),
		purple: getThemeColor("--color-accent-purple"),
		purpleDark: getThemeColor("--color-accent-purple-dark"),
	};

	// Accessible color palette for charts - using theme colors
	const colors = {
		active: {
			applied: themeColors.blueBase,
			"screening interview": themeColors.blueLight,
			interview: themeColors.blueMedium,
			onsite: themeColors.blueDark,
			"online test": themeColors.blueLight,
			"take-home assignment": themeColors.blueMedium,
			offer: themeColors.success,
		},
		inactive: {
			rejected: themeColors.error,
			"no response": themeColors.errorLight,
			"no longer interested": themeColors.errorLight,
			"hiring freeze": themeColors.errorLight,
		},
	};

	const getStatusColor = (label, category) => {
		return colors[category]?.[label] ?? themeColors.textSecondary;
	};

	// Chart.js default configuration with theme-aware text color
	Chart.defaults.font.family = "system-ui, -apple-system, sans-serif";
	Chart.defaults.color = themeColors.textPrimary;

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
					borderColor: getThemeColor("--color-bg-container"),
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: true,
			plugins: {
				legend: {
					position: "right",
					labels: {
						color: themeColors.textPrimary,
					},
				},
				tooltip: {
					callbacks: {
						label: (context) => {
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
					borderColor: themeColors.blueBase,
					backgroundColor: `${themeColors.blueBase}15`,
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
						color: themeColors.textPrimary,
					},
					grid: {
						color: `${themeColors.textSecondary}20`,
					},
				},
				x: {
					ticks: {
						color: themeColors.textPrimary,
					},
					grid: {
						color: `${themeColors.textSecondary}20`,
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
					backgroundColor: themeColors.success,
					borderColor: themeColors.success,
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
						callback: (value) => `${value}%`,
						color: themeColors.textPrimary,
					},
					grid: {
						color: `${themeColors.textSecondary}20`,
					},
				},
				x: {
					ticks: {
						color: themeColors.textPrimary,
					},
					grid: {
						color: `${themeColors.textSecondary}20`,
					},
				},
			},
			plugins: {
				tooltip: {
					callbacks: {
						label: (context) => {
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
					backgroundColor: themeColors.blueBase,
				},
				{
					label: "Median Days",
					data: medianDays,
					backgroundColor: themeColors.blueLight,
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
					ticks: {
						color: themeColors.textPrimary,
					},
					grid: {
						color: `${themeColors.textSecondary}20`,
					},
				},
				y: {
					ticks: {
						color: themeColors.textPrimary,
					},
					grid: {
						color: `${themeColors.textSecondary}20`,
					},
				},
			},
			plugins: {
				legend: {
					labels: {
						color: themeColors.textPrimary,
					},
				},
				tooltip: {
					callbacks: {
						label: (context) =>
							`${context.dataset.label}: ${context.parsed.x.toFixed(1)} days`,
					},
				},
			},
		},
	});

	// 5. Interest Rating Success Rate Chart
	const ratings = analyticsData.interestRatingStats.map(
		(r) => `Rating ${r.rating}`,
	);
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
					backgroundColor: themeColors.purple,
					borderColor: themeColors.purpleDark,
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
						callback: (value) => `${value}%`,
						color: themeColors.textPrimary,
					},
					grid: {
						color: `${themeColors.textSecondary}20`,
					},
				},
				x: {
					ticks: {
						color: themeColors.textPrimary,
					},
					grid: {
						color: `${themeColors.textSecondary}20`,
					},
				},
			},
			plugins: {
				tooltip: {
					callbacks: {
						label: (context) => {
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
					backgroundColor: [themeColors.success, themeColors.error],
					borderWidth: 2,
					borderColor: getThemeColor("--color-bg-container"),
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: true,
			plugins: {
				legend: {
					position: "bottom",
					labels: {
						color: themeColors.textPrimary,
					},
				},
				tooltip: {
					callbacks: {
						label: (context) => {
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
