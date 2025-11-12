import type { ResultAsync } from "neverthrow";
import type { Contact } from "../entities/contact.ts";
import type { InterviewStage } from "../entities/interview-stage.ts";
import type { JobApplication } from "../entities/job-application.ts";
import type { ContactRepository } from "../ports/contact-repository.ts";
import type { InterviewStageRepository } from "../ports/interview-stage-repository.ts";
import type { JobApplicationManager } from "../ports/job-application-manager.ts";
import type {
	ApplicationsAnalytics,
	DateRange,
} from "./analytics.ts";
import {
	computeAnalytics,
	computeDefaultDateRange,
	filterApplicationsByDateRange,
} from "./analytics.ts";
import type { ContactAnalytics } from "./analytics-contacts.ts";
import { computeContactAnalytics } from "./analytics-contacts.ts";
import type { InterviewAnalytics } from "./analytics-interviews.ts";
import { computeInterviewAnalytics } from "./analytics-interviews.ts";

/**
 * Combined analytics result including all analytics modules
 */
export type CombinedAnalytics = {
	applications: ApplicationsAnalytics;
	contacts: ContactAnalytics;
	interviews: InterviewAnalytics;
	dateRange: DateRange;
};

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
		): ResultAsync<CombinedAnalytics, string> {
			return jobAppManager.getAllJobApplications().andThen((applications) => {
				// Compute default date range if not provided
				const effectiveDateRange =
					dateRange && (dateRange.startDate || dateRange.endDate)
						? dateRange
						: computeDefaultDateRange(applications);

				// Filter applications by date range
				const filteredApplications = filterApplicationsByDateRange(
					applications,
					effectiveDateRange,
				);

				// Get all contacts and interviews in parallel
				return contactRepository
					.getAll()
					.andThen((allContacts) => {
						return interviewStageRepository.getAll().map((allInterviews) => {
							// Filter contacts and interviews to only those belonging to filtered applications
							const appIds = new Set(filteredApplications.map((app) => app.id));
							const filteredContacts = allContacts.filter((contact) =>
								appIds.has(contact.jobApplicationId),
							);
							const filteredInterviews = allInterviews.filter((interview) =>
								appIds.has(interview.jobApplicationId),
							);

							return {
								applications: filteredApplications,
								contacts: filteredContacts,
								interviews: filteredInterviews,
								dateRange: effectiveDateRange,
							};
						});
					})
					.map((data) => {
						return {
							applications: computeAnalytics(data.applications),
							contacts: computeContactAnalytics(
								data.applications,
								data.contacts,
							),
							interviews: computeInterviewAnalytics(
								data.applications,
								data.interviews,
							),
							dateRange: data.dateRange,
						};
					});
			});
		},

		/**
		 * Compute only application analytics (existing functionality)
		 */
		computeApplicationAnalytics(
			dateRange?: DateRange,
		): ResultAsync<
			{ analytics: ApplicationsAnalytics; dateRange: DateRange },
			string
		> {
			return jobAppManager.getAllJobApplications().map((applications) => {
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
		): ResultAsync<ContactAnalytics, string> {
			return contactRepository.getAll().map((allContacts) => {
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
		): ResultAsync<InterviewAnalytics, string> {
			return interviewStageRepository.getAll().map((allInterviews) => {
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
