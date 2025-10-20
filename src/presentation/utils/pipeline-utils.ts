import { ArkErrors, type } from "arktype";
import {
	getJobAppCurrentStatusEntry,
	type JobApplication,
} from "../../domain/entities/job-application";

export type StatusInfo = {
	category: "active" | "inactive";
	label: string;
};

export type ProcessedApplication = {
	id: string;
	company: string;
	positionTitle: string;
	applicationDate: string;
	updatedAt: string;
	interestRating: number;
	nextEventDate: string | null;
	status: string;
	statusCategory: "active" | "inactive";
	isOverdue: boolean;
};

export function formatDate(isoDateString: string): string {
	const parsedIso = type("string.date.iso").pipe.try(
		(s: string) => s.split("T")[0],
		type(/^\d{4}-\d{2}-\d{2}$/),
	)(isoDateString);
	if (parsedIso instanceof ArkErrors) {
		throw new Error("Invalid date format", { cause: parsedIso });
	}
	return parsedIso;
}

export const formatInterestRating = (rating?: number): string => {
	if (!rating) return "";
	return "★".repeat(rating) + "☆".repeat(3 - rating);
};

export const getStatusInfo = (app: JobApplication): StatusInfo => {
	const statusRes = getJobAppCurrentStatusEntry(app);
	return statusRes.isOk()
		? statusRes.value[1]
		: { category: "active" as const, label: "applied" as const };
};

export const isApplicationOverdue = (app: JobApplication): boolean => {
	return app.nextEventDate ? Date.parse(app.nextEventDate) < Date.now() : false;
};

export const processApplicationData = (
	applications: JobApplication[],
): {
	processedApps: ProcessedApplication[];
	stats: {
		active: number;
		inactive: number;
		total: number;
	};
} => {
	let activeCount = 0;
	let inactiveCount = 0;

	const processedApps = applications.map((app) => {
		const statusInfo = getStatusInfo(app);
		const isOverdue = isApplicationOverdue(app);

		if (statusInfo.category === "active") {
			activeCount++;
		} else {
			inactiveCount++;
		}

		return {
			id: app.id,
			company: app.company,
			positionTitle: app.positionTitle,
			applicationDate: app.applicationDate,
			updatedAt: app.updatedAt,
			interestRating: app.interestRating || 0,
			nextEventDate: app.nextEventDate || null,
			status: statusInfo.label,
			statusCategory: statusInfo.category,
			isOverdue,
		};
	});

	return {
		processedApps,
		stats: {
			active: activeCount,
			inactive: inactiveCount,
			total: applications.length,
		},
	};
};

export const activeStatuses = [
	"applied",
	"screening interview",
	"interview",
	"onsite",
	"online test",
	"take-home assignment",
	"offer",
];

export const inactiveStatuses = [
	"rejected",
	"no response",
	"no longer interested",
	"hiring freeze",
];
