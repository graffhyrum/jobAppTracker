import { isActive } from "#src/domain/entities/job-application.ts";
import type { JobApplication } from "#src/domain/entities/job-application.ts";

export type DashboardStats = {
	totalApplications: number;
	activeApplications: number;
	upcomingInSevenDays: number;
};

export type OverdueItem = {
	id: string;
	company: string;
	positionTitle: string;
	nextEventDate: string;
};

export type ActivityEntry = {
	company: string;
	oldStatusLabel: string;
	newStatusLabel: string;
	timestamp: string;
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function computeDashboardStats(
	applications: readonly JobApplication[],
	now: Date = new Date(),
): DashboardStats {
	const nowMs = now.getTime();
	const sevenDaysFromNow = nowMs + SEVEN_DAYS_MS;

	let activeApplications = 0;
	let upcomingInSevenDays = 0;

	for (const app of applications) {
		if (isActive(app)) {
			activeApplications++;
		}

		if (app.nextEventDate) {
			const eventMs = new Date(app.nextEventDate).getTime();
			// Upcoming means in the future but within 7 days
			if (eventMs >= nowMs && eventMs <= sevenDaysFromNow) {
				upcomingInSevenDays++;
			}
		}
	}

	return {
		totalApplications: applications.length,
		activeApplications,
		upcomingInSevenDays,
	};
}

export function getOverdueApplications(
	applications: readonly JobApplication[],
	now: Date = new Date(),
): OverdueItem[] {
	const nowMs = now.getTime();

	return applications
		.filter((app) => {
			if (!app.nextEventDate) return false;
			return new Date(app.nextEventDate).getTime() < nowMs;
		})
		.sort((a, b) => {
			// Sort ascending by nextEventDate (most overdue first)
			return (
				new Date(a.nextEventDate!).getTime() -
				new Date(b.nextEventDate!).getTime()
			);
		})
		.map((app) => ({
			id: app.id,
			company: app.company,
			positionTitle: app.positionTitle,
			nextEventDate: app.nextEventDate!,
		}));
}

export function getRecentActivity(
	applications: readonly JobApplication[],
	limit: number = 10,
): ActivityEntry[] {
	const entries: ActivityEntry[] = [];

	for (const app of applications) {
		const { statusLog } = app;
		for (let i = 1; i < statusLog.length; i++) {
			const [timestamp, newStatus] = statusLog[i]!;
			const [, oldStatus] = statusLog[i - 1]!;
			entries.push({
				company: app.company,
				oldStatusLabel: oldStatus.label,
				newStatusLabel: newStatus.label,
				timestamp,
			});
		}
	}

	// Sort descending by timestamp (most recent first)
	entries.sort(
		(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
	);

	return entries.slice(0, limit);
}
