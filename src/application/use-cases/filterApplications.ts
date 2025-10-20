import type { JobApplication } from "../../domain/entities/job-application";

/**
 * Pure filter use case: filters applications by a term across key fields.
 * - Case-insensitive
 * - Matches company, positionTitle, latest status label, and optional jobPostingUrl
 */
export function filterApplications(
	term: string,
	applications: JobApplication[],
): JobApplication[] {
	const q = term.trim().toLowerCase();
	if (!q) return applications;

	return applications.filter((app) => {
		const company = app.company?.toLowerCase() ?? "";
		const position = app.positionTitle?.toLowerCase() ?? "";
		const status = app.statusLog.at(-1)?.[1]?.label?.toLowerCase() ?? "";
		const url = app.jobPostingUrl?.toLowerCase?.() ?? "";
		return (
			company.includes(q) ||
			position.includes(q) ||
			status.includes(q) ||
			url.includes(q)
		);
	});
}
