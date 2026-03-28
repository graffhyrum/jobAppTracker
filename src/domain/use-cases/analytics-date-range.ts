/**
 * Date range for filtering analytics.
 * Extracted to break the circular import between analytics.ts and analytics-utils.ts.
 */
export type DateRange = {
	startDate?: string; // ISO date string (YYYY-MM-DD)
	endDate?: string; // ISO date string (YYYY-MM-DD)
};
