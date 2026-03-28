import { Either } from "effect";

import type {
	ApplicationStatus,
	JobApplication,
} from "../entities/job-application.ts";
import { getCurrentStatus } from "../entities/job-application.ts";
import type { DateRange } from "./analytics-date-range.ts";

/**
 * Collapse the Either from getCurrentStatus into a nullable value.
 * All analytics call sites only use the Right (success) path.
 */
export function getResolvedStatus(
	app: JobApplication,
): ApplicationStatus | null {
	const result = getCurrentStatus(app);
	return Either.isRight(result) ? result.right : null;
}

/**
 * Filter a collection of items by their jobApplicationId membership
 * in the given applications list.
 */
export function filterByAppIds<T extends { jobApplicationId: string }>(
	items: T[],
	applications: JobApplication[],
): T[] {
	const appIds = new Set(applications.map((app) => app.id));
	return items.filter((item) => appIds.has(item.jobApplicationId));
}

/**
 * Compute default date range from oldest active application to today.
 * Returns empty DateRange if no active applications exist.
 */
export function computeDefaultDateRange(
	applications: JobApplication[],
): DateRange {
	// Filter to only active applications
	const activeApplications = applications.filter((app) => {
		const status = getResolvedStatus(app);
		return status !== null && status.category === "active";
	});

	// If no active applications, return empty range
	if (activeApplications.length === 0) {
		return {};
	}

	// Find the oldest application date among active applications
	let oldestDate: string | null = null;

	for (const app of activeApplications) {
		const appDate = String(app.applicationDate).split("T")[0] ?? "";
		if (!oldestDate || appDate < oldestDate) {
			oldestDate = appDate;
		}
	}

	// Get today's date in YYYY-MM-DD format
	const today = new Date().toISOString().split("T")[0] ?? "";

	return {
		startDate: oldestDate ?? undefined,
		endDate: today,
	};
}

/**
 * Resolve the effective date range: use the provided range if non-empty,
 * otherwise compute the default from application dates.
 */
export function resolveEffectiveDateRange(
	applications: JobApplication[],
	requested?: DateRange,
): DateRange {
	return requested && (requested.startDate || requested.endDate)
		? requested
		: computeDefaultDateRange(applications);
}
