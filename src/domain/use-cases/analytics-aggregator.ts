import { Effect } from "effect";

import type { ContactError } from "../entities/contact-error.ts";
import type { InterviewStageError } from "../entities/interview-stage-error.ts";
import type { JobApplicationError } from "../entities/job-application-error.ts";
import type { JobApplication } from "../entities/job-application.ts";
import type { ContactRepository } from "../ports/contact-repository.ts";
import type { InterviewStageRepository } from "../ports/interview-stage-repository.ts";
import type { JobApplicationManager } from "../ports/job-application-manager.ts";
import type { ContactAnalytics } from "./analytics-contacts.ts";
import { computeContactAnalytics } from "./analytics-contacts.ts";
import type { InterviewAnalytics } from "./analytics-interviews.ts";
import { computeInterviewAnalytics } from "./analytics-interviews.ts";
import type { ApplicationsAnalytics, DateRange } from "./analytics.ts";
import {
	computeAnalytics,
	computeDefaultDateRange,
	filterApplicationsByDateRange,
} from "./analytics.ts";

/**
 * Combined analytics result including all analytics modules
 */
export type CombinedAnalytics = {
	applications: ApplicationsAnalytics;
	contacts: ContactAnalytics;
	interviews: InterviewAnalytics;
	dateRange: DateRange;
};

/** Union of all errors the aggregator can produce */
export type AnalyticsError =
	| JobApplicationError
	| ContactError
	| InterviewStageError;

/**
 * Aggregates all analytics computations from different modules
 */
export function createAnalyticsAggregator(
	jobAppManager: JobApplicationManager,
	contactRepository: ContactRepository,
	interviewStageRepository: InterviewStageRepository,
) {
	return {
		/**
		 * Compute all analytics for the given date range
		 */
		computeAllAnalytics(
			dateRange?: DateRange,
		): Effect.Effect<CombinedAnalytics, AnalyticsError> {
			return Effect.gen(function* () {
				const applications = yield* jobAppManager.getAllJobApplications();

				const effectiveDateRange =
					dateRange && (dateRange.startDate || dateRange.endDate)
						? dateRange
						: computeDefaultDateRange(applications);

				const filteredApplications = filterApplicationsByDateRange(
					applications,
					effectiveDateRange,
				);

				const [allContacts, allInterviews] = yield* Effect.all([
					contactRepository.getAll(),
					interviewStageRepository.getAll(),
				]);

				const appIds = new Set(filteredApplications.map((app) => app.id));
				const filteredContacts = allContacts.filter((contact) =>
					appIds.has(contact.jobApplicationId),
				);
				const filteredInterviews = allInterviews.filter((interview) =>
					appIds.has(interview.jobApplicationId),
				);

				return {
					applications: computeAnalytics(filteredApplications),
					contacts: computeContactAnalytics(
						filteredApplications,
						filteredContacts,
					),
					interviews: computeInterviewAnalytics(
						filteredApplications,
						filteredInterviews,
					),
					dateRange: effectiveDateRange,
				};
			});
		},

		/**
		 * Compute only application analytics (existing functionality)
		 */
		computeApplicationAnalytics(
			dateRange?: DateRange,
		): Effect.Effect<
			{ analytics: ApplicationsAnalytics; dateRange: DateRange },
			JobApplicationError
		> {
			return Effect.gen(function* () {
				const applications = yield* jobAppManager.getAllJobApplications();

				const effectiveDateRange =
					dateRange && (dateRange.startDate || dateRange.endDate)
						? dateRange
						: computeDefaultDateRange(applications);

				const filteredApplications = filterApplicationsByDateRange(
					applications,
					effectiveDateRange,
				);

				return {
					analytics: computeAnalytics(filteredApplications),
					dateRange: effectiveDateRange,
				};
			});
		},

		/**
		 * Compute only contact analytics
		 */
		computeContactAnalyticsOnly(
			applications: JobApplication[],
		): Effect.Effect<ContactAnalytics, ContactError> {
			return Effect.gen(function* () {
				const allContacts = yield* contactRepository.getAll();
				const appIds = new Set(applications.map((app) => app.id));
				const filteredContacts = allContacts.filter((contact) =>
					appIds.has(contact.jobApplicationId),
				);

				return computeContactAnalytics(applications, filteredContacts);
			});
		},

		/**
		 * Compute only interview analytics
		 */
		computeInterviewAnalyticsOnly(
			applications: JobApplication[],
		): Effect.Effect<InterviewAnalytics, InterviewStageError> {
			return Effect.gen(function* () {
				const allInterviews = yield* interviewStageRepository.getAll();
				const appIds = new Set(applications.map((app) => app.id));
				const filteredInterviews = allInterviews.filter((interview) =>
					appIds.has(interview.jobApplicationId),
				);

				return computeInterviewAnalytics(applications, filteredInterviews);
			});
		},
	};
}

export type AnalyticsAggregator = ReturnType<typeof createAnalyticsAggregator>;
