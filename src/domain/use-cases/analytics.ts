import type {
	ApplicationStatusLabel,
	JobApplication,
	SourceType,
} from "../entities/job-application.ts";
import { getCurrentStatus } from "../entities/job-application.ts";

/**
 * Analytics data structures
 */

export type StatusCount = {
	label: ApplicationStatusLabel;
	count: number;
	category: "active" | "inactive";
};

export type ApplicationsByDate = {
	date: string; // ISO date string (YYYY-MM-DD)
	count: number;
};

export type SourceEffectiveness = {
	sourceType: SourceType;
	total: number;
	active: number;
	offers: number;
	rejected: number;
	successRate: number; // offers / (offers + rejected)
};

export type TimeInStatus = {
	label: ApplicationStatusLabel;
	averageDays: number;
	medianDays: number;
	minDays: number;
	maxDays: number;
	sampleSize: number;
};

export type InterestRatingStats = {
	rating: number;
	total: number;
	active: number;
	offers: number;
	rejected: number;
	successRate: number;
};

export type ResponseRateStats = {
	totalApplications: number;
	withResponse: number; // any status other than "no response"
	noResponse: number;
	responseRate: number; // percentage
};

export type AnalyticsSummary = {
	totalApplications: number;
	activeApplications: number;
	inactiveApplications: number;
	offersReceived: number;
	rejections: number;
	averageInterestRating: number;
};

export type ApplicationsAnalytics = {
	summary: AnalyticsSummary;
	statusDistribution: StatusCount[];
	applicationsByDate: ApplicationsByDate[];
	sourceEffectiveness: SourceEffectiveness[];
	timeInStatus: TimeInStatus[];
	interestRatingStats: InterestRatingStats[];
	responseRate: ResponseRateStats;
};

/**
 * Analytics computation functions
 */

export function computeAnalytics(
	applications: JobApplication[],
): ApplicationsAnalytics {
	return {
		summary: computeSummary(applications),
		statusDistribution: computeStatusDistribution(applications),
		applicationsByDate: computeApplicationsByDate(applications),
		sourceEffectiveness: computeSourceEffectiveness(applications),
		timeInStatus: computeTimeInStatus(applications),
		interestRatingStats: computeInterestRatingStats(applications),
		responseRate: computeResponseRate(applications),
	};
}

function computeSummary(applications: JobApplication[]): AnalyticsSummary {
	let activeCount = 0;
	let inactiveCount = 0;
	let offerCount = 0;
	let rejectionCount = 0;
	let totalRating = 0;
	let ratingCount = 0;

	for (const app of applications) {
		const statusResult = getCurrentStatus(app);
		if (statusResult.isOk()) {
			const status = statusResult.value;
			if (status.category === "active") {
				activeCount++;
				if (status.label === "offer") {
					offerCount++;
				}
			} else {
				inactiveCount++;
				if (status.label === "rejected") {
					rejectionCount++;
				}
			}
		}

		if (app.interestRating !== undefined) {
			totalRating += app.interestRating;
			ratingCount++;
		}
	}

	return {
		totalApplications: applications.length,
		activeApplications: activeCount,
		inactiveApplications: inactiveCount,
		offersReceived: offerCount,
		rejections: rejectionCount,
		averageInterestRating: ratingCount > 0 ? totalRating / ratingCount : 0,
	};
}

function computeStatusDistribution(
	applications: JobApplication[],
): StatusCount[] {
	const statusMap = new Map<
		ApplicationStatusLabel,
		{ count: number; category: "active" | "inactive" }
	>();

	for (const app of applications) {
		const statusResult = getCurrentStatus(app);
		if (statusResult.isOk()) {
			const status = statusResult.value;
			const existing = statusMap.get(status.label);
			if (existing) {
				existing.count++;
			} else {
				statusMap.set(status.label, {
					count: 1,
					category: status.category,
				});
			}
		}
	}

	return Array.from(statusMap.entries()).map(([label, data]) => ({
		label,
		count: data.count,
		category: data.category,
	}));
}

function computeApplicationsByDate(
	applications: JobApplication[],
): ApplicationsByDate[] {
	const dateMap = new Map<string, number>();

	for (const app of applications) {
		const date = app.applicationDate.split("T")[0]; // Extract YYYY-MM-DD
		dateMap.set(date, (dateMap.get(date) ?? 0) + 1);
	}

	return Array.from(dateMap.entries())
		.map(([date, count]) => ({ date, count }))
		.sort((a, b) => a.date.localeCompare(b.date));
}

function computeSourceEffectiveness(
	applications: JobApplication[],
): SourceEffectiveness[] {
	const sourceMap = new Map<
		SourceType,
		{ total: number; active: number; offers: number; rejected: number }
	>();

	for (const app of applications) {
		const source = app.sourceType;
		const existing = sourceMap.get(source) ?? {
			total: 0,
			active: 0,
			offers: 0,
			rejected: 0,
		};

		existing.total++;

		const statusResult = getCurrentStatus(app);
		if (statusResult.isOk()) {
			const status = statusResult.value;
			if (status.category === "active") {
				existing.active++;
				if (status.label === "offer") {
					existing.offers++;
				}
			} else if (status.label === "rejected") {
				existing.rejected++;
			}
		}

		sourceMap.set(source, existing);
	}

	return Array.from(sourceMap.entries()).map(([sourceType, data]) => ({
		sourceType,
		...data,
		successRate:
			data.offers + data.rejected > 0
				? data.offers / (data.offers + data.rejected)
				: 0,
	}));
}

function computeTimeInStatus(applications: JobApplication[]): TimeInStatus[] {
	// Map of status label to array of durations in days
	const statusDurations = new Map<ApplicationStatusLabel, number[]>();

	for (const app of applications) {
		const statusLog = app.statusLog;

		for (let i = 0; i < statusLog.length; i++) {
			const [startTime, status] = statusLog[i];
			const endTime =
				i < statusLog.length - 1
					? statusLog[i + 1][0]
					: new Date().toISOString();

			const durationMs =
				new Date(endTime).getTime() - new Date(startTime).getTime();
			const durationDays = durationMs / (1000 * 60 * 60 * 24);

			const existing = statusDurations.get(status.label) ?? [];
			existing.push(durationDays);
			statusDurations.set(status.label, existing);
		}
	}

	return Array.from(statusDurations.entries()).map(([label, durations]) => {
		const sorted = [...durations].sort((a, b) => a - b);
		const sum = sorted.reduce((acc, val) => acc + val, 0);
		const median =
			sorted.length > 0
				? sorted.length % 2 === 0
					? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
					: sorted[Math.floor(sorted.length / 2)]
				: 0;

		return {
			label,
			averageDays: sorted.length > 0 ? sum / sorted.length : 0,
			medianDays: median,
			minDays: sorted.length > 0 ? sorted[0] : 0,
			maxDays: sorted.length > 0 ? sorted[sorted.length - 1] : 0,
			sampleSize: sorted.length,
		};
	});
}

function computeInterestRatingStats(
	applications: JobApplication[],
): InterestRatingStats[] {
	const ratingMap = new Map<
		number,
		{ total: number; active: number; offers: number; rejected: number }
	>();

	for (const app of applications) {
		const rating = app.interestRating ?? -1; // Use -1 for unrated
		const existing = ratingMap.get(rating) ?? {
			total: 0,
			active: 0,
			offers: 0,
			rejected: 0,
		};

		existing.total++;

		const statusResult = getCurrentStatus(app);
		if (statusResult.isOk()) {
			const status = statusResult.value;
			if (status.category === "active") {
				existing.active++;
				if (status.label === "offer") {
					existing.offers++;
				}
			} else if (status.label === "rejected") {
				existing.rejected++;
			}
		}

		ratingMap.set(rating, existing);
	}

	return Array.from(ratingMap.entries())
		.filter(([rating]) => rating >= 0) // Exclude unrated
		.map(([rating, data]) => ({
			rating,
			...data,
			successRate:
				data.offers + data.rejected > 0
					? data.offers / (data.offers + data.rejected)
					: 0,
		}))
		.sort((a, b) => a.rating - b.rating);
}

function computeResponseRate(
	applications: JobApplication[],
): ResponseRateStats {
	let noResponseCount = 0;
	let withResponseCount = 0;

	for (const app of applications) {
		const statusResult = getCurrentStatus(app);
		if (statusResult.isOk()) {
			const status = statusResult.value;
			if (status.label === "no response") {
				noResponseCount++;
			} else {
				withResponseCount++;
			}
		}
	}

	const total = applications.length;
	return {
		totalApplications: total,
		withResponse: withResponseCount,
		noResponse: noResponseCount,
		responseRate: total > 0 ? (withResponseCount / total) * 100 : 0,
	};
}
