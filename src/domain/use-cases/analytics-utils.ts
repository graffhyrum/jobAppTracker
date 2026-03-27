import { Either } from "effect";

import type {
	ApplicationStatus,
	JobApplication,
} from "../entities/job-application.ts";
import { getCurrentStatus } from "../entities/job-application.ts";
import type { DateRange } from "./analytics.ts";
import { computeDefaultDateRange } from "./analytics.ts";

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
