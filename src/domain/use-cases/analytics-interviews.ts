import type {
	InterviewStage,
	InterviewType,
} from "../entities/interview-stage.ts";
import type { JobApplication } from "../entities/job-application.ts";
import { getCurrentStatus } from "../entities/job-application.ts";

/**
 * Interview analytics data structures
 */

export type InterviewTypeEffectiveness = {
	type: InterviewType;
	total: number;
	offers: number;
	rejected: number;
	successRate: number; // offers / (offers + rejected)
};

export type RoundAnalysis = {
	round: number;
	total: number;
	offers: number;
	rejected: number;
	stillActive: number;
	successRate: number; // offers / (offers + rejected)
};

export type FinalRoundSuccess = {
	totalFinalRounds: number;
	offers: number;
	rejections: number;
	conversionRate: number; // offers / total
};

export type InterviewCompletionRate = {
	scheduled: number;
	completed: number;
	completionRate: number; // completed / scheduled
};

export type InterviewAnalytics = {
	totalInterviews: number;
	averageRoundsToOffer: number;
	medianRoundsToOffer: number;
	interviewConversionRate: number; // apps with interviews → offers
	averageDaysFromApplicationToFirstInterview: number;
	medianDaysFromApplicationToFirstInterview: number;
	averageDaysBetweenRounds: number;
	interviewTypeEffectiveness: InterviewTypeEffectiveness[];
	roundAnalysis: RoundAnalysis[];
	finalRoundSuccess: FinalRoundSuccess;
	interviewCompletionRate: InterviewCompletionRate;
};

/**
 * Compute interview analytics from applications and interview stages
 */
export function computeInterviewAnalytics(
	applications: JobApplication[],
	interviewStages: InterviewStage[],
): InterviewAnalytics {
	// Group interviews by job application
	const interviewsByApp = new Map<string, InterviewStage[]>();
	for (const interview of interviewStages) {
		const appInterviews = interviewsByApp.get(interview.jobApplicationId) ?? [];
		appInterviews.push(interview);
		interviewsByApp.set(interview.jobApplicationId, appInterviews);
	}

	// Sort interviews by round within each application
	for (const interviews of interviewsByApp.values()) {
		interviews.sort((a, b) => a.round - b.round);
	}

	const roundsToOffer = computeRoundsToOffer(applications, interviewsByApp);

	return {
		totalInterviews: interviewStages.length,
		averageRoundsToOffer: computeAverage(roundsToOffer),
		medianRoundsToOffer: computeMedian(roundsToOffer),
		interviewConversionRate: computeInterviewConversionRate(
			applications,
			interviewsByApp,
		),
		averageDaysFromApplicationToFirstInterview:
			computeAverageDaysToFirstInterview(applications, interviewsByApp),
		medianDaysFromApplicationToFirstInterview:
			computeMedianDaysToFirstInterview(applications, interviewsByApp),
		averageDaysBetweenRounds: computeAverageDaysBetweenRounds(interviewsByApp),
		interviewTypeEffectiveness: computeInterviewTypeEffectiveness(
			applications,
			interviewStages,
			interviewsByApp,
		),
		roundAnalysis: computeRoundAnalysis(
			applications,
			interviewStages,
			interviewsByApp,
		),
		finalRoundSuccess: computeFinalRoundSuccess(
			applications,
			interviewStages,
			interviewsByApp,
		),
		interviewCompletionRate: computeInterviewCompletionRate(interviewStages),
	};
}

function computeRoundsToOffer(
	applications: JobApplication[],
	interviewsByApp: Map<string, InterviewStage[]>,
): number[] {
	const roundsToOffer: number[] = [];

	for (const app of applications) {
		const statusResult = getCurrentStatus(app);
		if (statusResult.isOk() && statusResult.value.label === "offer") {
			const interviews = interviewsByApp.get(app.id) ?? [];
			if (interviews.length > 0) {
				roundsToOffer.push(interviews.length);
			}
		}
	}

	return roundsToOffer;
}

function computeAverage(numbers: number[]): number {
	if (numbers.length === 0) return 0;
	const sum = numbers.reduce((acc, val) => acc + val, 0);
	return sum / numbers.length;
}

function computeMedian(numbers: number[]): number {
	if (numbers.length === 0) return 0;

	const sorted = [...numbers].sort((a, b) => a - b);

	if (sorted.length % 2 === 0) {
		const mid1 = sorted[sorted.length / 2 - 1];
		const mid2 = sorted[sorted.length / 2];
		if (mid1 !== undefined && mid2 !== undefined) {
			return (mid1 + mid2) / 2;
		}
	} else {
		const mid = sorted[Math.floor(sorted.length / 2)];
		if (mid !== undefined) {
			return mid;
		}
	}

	return 0;
}

function computeInterviewConversionRate(
	applications: JobApplication[],
	interviewsByApp: Map<string, InterviewStage[]>,
): number {
	let appsWithInterviews = 0;
	let offersWithInterviews = 0;

	for (const app of applications) {
		const interviews = interviewsByApp.get(app.id) ?? [];
		if (interviews.length > 0) {
			appsWithInterviews++;

			const statusResult = getCurrentStatus(app);
			if (statusResult.isOk() && statusResult.value.label === "offer") {
				offersWithInterviews++;
			}
		}
	}

	return appsWithInterviews > 0 ? offersWithInterviews / appsWithInterviews : 0;
}

function computeAverageDaysToFirstInterview(
	applications: JobApplication[],
	interviewsByApp: Map<string, InterviewStage[]>,
): number {
	const daysToFirstInterview: number[] = [];

	for (const app of applications) {
		const interviews = interviewsByApp.get(app.id) ?? [];
		if (interviews.length > 0) {
			const firstInterview = interviews[0];
			if (firstInterview && firstInterview.scheduledDate) {
				const appTime = new Date(app.applicationDate).getTime();
				const interviewTime = new Date(firstInterview.scheduledDate).getTime();
				const days = (interviewTime - appTime) / (1000 * 60 * 60 * 24);
				daysToFirstInterview.push(days);
			}
		}
	}

	return computeAverage(daysToFirstInterview);
}

function computeMedianDaysToFirstInterview(
	applications: JobApplication[],
	interviewsByApp: Map<string, InterviewStage[]>,
): number {
	const daysToFirstInterview: number[] = [];

	for (const app of applications) {
		const interviews = interviewsByApp.get(app.id) ?? [];
		if (interviews.length > 0) {
			const firstInterview = interviews[0];
			if (firstInterview && firstInterview.scheduledDate) {
				const appTime = new Date(app.applicationDate).getTime();
				const interviewTime = new Date(firstInterview.scheduledDate).getTime();
				const days = (interviewTime - appTime) / (1000 * 60 * 60 * 24);
				daysToFirstInterview.push(days);
			}
		}
	}

	return computeMedian(daysToFirstInterview);
}

function computeAverageDaysBetweenRounds(
	interviewsByApp: Map<string, InterviewStage[]>,
): number {
	const daysBetweenRounds: number[] = [];

	for (const interviews of interviewsByApp.values()) {
		for (let i = 0; i < interviews.length - 1; i++) {
			const current = interviews[i];
			const next = interviews[i + 1];

			if (
				current?.scheduledDate &&
				next?.scheduledDate &&
				current.scheduledDate !== "" &&
				next.scheduledDate !== ""
			) {
				const currentTime = new Date(current.scheduledDate).getTime();
				const nextTime = new Date(next.scheduledDate).getTime();
				const days = (nextTime - currentTime) / (1000 * 60 * 60 * 24);
				daysBetweenRounds.push(days);
			}
		}
	}

	return computeAverage(daysBetweenRounds);
}

function computeInterviewTypeEffectiveness(
	applications: JobApplication[],
	interviewStages: InterviewStage[],
	interviewsByApp: Map<string, InterviewStage[]>,
): InterviewTypeEffectiveness[] {
	const typeMap = new Map<
		InterviewType,
		{ total: number; offers: number; rejected: number }
	>();

	// Group applications by whether they had each interview type
	const appsByType = new Map<InterviewType, Set<string>>();

	for (const interview of interviewStages) {
		const existing = typeMap.get(interview.interviewType) ?? {
			total: 0,
			offers: 0,
			rejected: 0,
		};
		existing.total++;
		typeMap.set(interview.interviewType, existing);

		const appSet = appsByType.get(interview.interviewType) ?? new Set();
		appSet.add(interview.jobApplicationId);
		appsByType.set(interview.interviewType, appSet);
	}

	// Count offers and rejections for applications with each interview type
	for (const [type, appIds] of appsByType.entries()) {
		const stats = typeMap.get(type);
		if (!stats) continue;

		for (const appId of appIds) {
			const app = applications.find((a) => a.id === appId);
			if (!app) continue;

			const statusResult = getCurrentStatus(app);
			if (statusResult.isOk()) {
				const status = statusResult.value;
				if (status.label === "offer") {
					stats.offers++;
				} else if (status.label === "rejected") {
					stats.rejected++;
				}
			}
		}
	}

	return Array.from(typeMap.entries()).map(([type, data]) => ({
		type,
		total: data.total,
		offers: data.offers,
		rejected: data.rejected,
		successRate:
			data.offers + data.rejected > 0
				? data.offers / (data.offers + data.rejected)
				: 0,
	}));
}

function computeRoundAnalysis(
	applications: JobApplication[],
	interviewStages: InterviewStage[],
	interviewsByApp: Map<string, InterviewStage[]>,
): RoundAnalysis[] {
	const roundMap = new Map<
		number,
		{
			total: number;
			offers: number;
			rejected: number;
			stillActive: number;
		}
	>();

	// Count interviews by round
	for (const interview of interviewStages) {
		const existing = roundMap.get(interview.round) ?? {
			total: 0,
			offers: 0,
			rejected: 0,
			stillActive: 0,
		};
		existing.total++;
		roundMap.set(interview.round, existing);
	}

	// Track applications that reached each round
	const appsReachingRound = new Map<number, Set<string>>();
	for (const [appId, interviews] of interviewsByApp.entries()) {
		for (const interview of interviews) {
			const appSet = appsReachingRound.get(interview.round) ?? new Set();
			appSet.add(appId);
			appsReachingRound.set(interview.round, appSet);
		}
	}

	// Count outcomes for applications that reached each round
	for (const [round, appIds] of appsReachingRound.entries()) {
		const stats = roundMap.get(round);
		if (!stats) continue;

		for (const appId of appIds) {
			const app = applications.find((a) => a.id === appId);
			if (!app) continue;

			const statusResult = getCurrentStatus(app);
			if (statusResult.isOk()) {
				const status = statusResult.value;
				if (status.label === "offer") {
					stats.offers++;
				} else if (status.label === "rejected") {
					stats.rejected++;
				} else if (status.category === "active") {
					stats.stillActive++;
				}
			}
		}
	}

	return Array.from(roundMap.entries())
		.map(([round, data]) => ({
			round,
			total: data.total,
			offers: data.offers,
			rejected: data.rejected,
			stillActive: data.stillActive,
			successRate:
				data.offers + data.rejected > 0
					? data.offers / (data.offers + data.rejected)
					: 0,
		}))
		.sort((a, b) => a.round - b.round);
}

function computeFinalRoundSuccess(
	applications: JobApplication[],
	interviewStages: InterviewStage[],
	interviewsByApp: Map<string, InterviewStage[]>,
): FinalRoundSuccess {
	const finalRounds = interviewStages.filter((i) => i.isFinalRound);
	const appIdsWithFinalRound = new Set(
		finalRounds.map((i) => i.jobApplicationId),
	);

	let offers = 0;
	let rejections = 0;

	for (const appId of appIdsWithFinalRound) {
		const app = applications.find((a) => a.id === appId);
		if (!app) continue;

		const statusResult = getCurrentStatus(app);
		if (statusResult.isOk()) {
			const status = statusResult.value;
			if (status.label === "offer") {
				offers++;
			} else if (status.label === "rejected") {
				rejections++;
			}
		}
	}

	return {
		totalFinalRounds: finalRounds.length,
		offers,
		rejections,
		conversionRate:
			finalRounds.length > 0 ? offers / finalRounds.length : 0,
	};
}

function computeInterviewCompletionRate(
	interviewStages: InterviewStage[],
): InterviewCompletionRate {
	let scheduled = 0;
	let completed = 0;

	for (const interview of interviewStages) {
		if (interview.scheduledDate && interview.scheduledDate !== "") {
			scheduled++;
			if (interview.completedDate && interview.completedDate !== "") {
				completed++;
			}
		}
	}

	return {
		scheduled,
		completed,
		completionRate: scheduled > 0 ? completed / scheduled : 0,
	};
}
