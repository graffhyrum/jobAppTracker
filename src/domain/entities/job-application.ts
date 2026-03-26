import { ArkErrors, scope, type } from "arktype";
import { Either } from "effect";

import { noteScope } from "./noteScope.ts";
import { uuidSchema } from "./uuid.ts";
const jobApplicationScope = scope({
	...noteScope.export(),
	ActiveLabels:
		"'applied'|'screening interview'|'interview'|'onsite'|'online test'|'take-home assignment'|'offer'",
	InactiveLabels:
		"'rejected'|'no response'|'no longer interested'|'hiring freeze'",
	"#ActiveState": {
		category: "'active'",
		label: "ActiveLabels",
	},
	"#InactiveState": {
		category: "'inactive'",
		label: "InactiveLabels",
	},
	"#ApplicationStatusProps": {
		"note?": "string > 0",
	},
	"#dateTime": "string.date.iso",
	ApplicationStatus: "(ActiveState|InactiveState) & ApplicationStatusProps",
	ApplicationStatusLabel: "(ActiveLabels|InactiveLabels)",
	AppStatusEntry: ["dateTime", "ApplicationStatus"],
	JobAppId: uuidSchema,
	JobBoardId: uuidSchema,
	"#HasId": {
		id: "JobAppId",
	},
	SourceType:
		"'job_board'|'referral'|'company_website'|'recruiter'|'networking'|'other'",
	RequiredBaseProps: {
		company: "string > 0",
		positionTitle: "string > 0",
		applicationDate: "dateTime",
	},
	BaseProps: {
		"...": "RequiredBaseProps",
		"interestRating?": type("string")
			.or("number")
			.pipe((v) => (typeof v === "string" ? Number(v) : v))
			.to("0 <= number < 4"),
		"nextEventDate?": "dateTime | ''",
		"jobPostingUrl?": "string",
		"jobDescription?": "string",
		sourceType: "SourceType",
		"jobBoardId?": "JobBoardId",
		"sourceNotes?": "string",
		isRemote: "boolean",
	},
	JobApp: {
		"...": "BaseProps",
		id: "JobAppId",
		createdAt: "dateTime",
		updatedAt: "dateTime",
		notes: "NoteEntryArray",
		statusLog: "AppStatusEntry[] > 0", // always have at least one Log
	},
	forCreate: "BaseProps",
	forUpdate: "Partial<Omit<JobApp, 'id'>>",
	"#ForCreateKey": "keyof forCreate",
	"#ForUpdateKey": "keyof forUpdate",
	// FormForCreate accepts string or boolean for any field (for HTML form compatibility)
	FormForCreate: {
		company: "string",
		positionTitle: "string",
		applicationDate: "string",
		sourceType: "string",
		"isRemote?": "string | boolean",
		"interestRating?": "string | number",
		"nextEventDate?": "string",
		"jobPostingUrl?": "string",
		"jobDescription?": "string",
		"jobBoardId?": "string",
		"sourceNotes?": "string",
	},
	FormForUpdate: {
		"[ForUpdateKey]?": "string",
	},
});
export const jobApplicationModule = jobApplicationScope.export();
export type JobApplicationForCreate =
	typeof jobApplicationModule.forCreate.infer;
export type JobApplicationForUpdate =
	typeof jobApplicationModule.forUpdate.infer;
export type JobApplicationId = typeof jobApplicationModule.JobAppId.infer;
export type ApplicationStatus =
	typeof jobApplicationModule.ApplicationStatus.infer;
export type SourceType = typeof jobApplicationModule.SourceType.infer;
export type JobBoardId = typeof jobApplicationModule.JobBoardId.infer;
type AppStatusEntry = typeof jobApplicationModule.AppStatusEntry.infer;
export type JobApplication = typeof jobApplicationModule.JobApp.infer;
export type ApplicationStatusLabel =
	typeof jobApplicationModule.ApplicationStatusLabel.infer;
export function isInactive(app: JobApplication): boolean {
	const category = getStatusCategory(app);
	return Either.isRight(category) && category.right === "inactive";
}
export function isActive(app: JobApplication): boolean {
	const category = getStatusCategory(app);
	return Either.isRight(category) && category.right === "active";
}
export function getStatusCategory(
	app: JobApplication,
): Either.Either<"active" | "inactive", ArkErrors> {
	return Either.map(getCurrentStatus(app), (status) => status.category);
}
export function getCurrentStatus(
	app: JobApplication,
): Either.Either<ApplicationStatus, ArkErrors> {
	return Either.map(getJobAppCurrentStatusEntry(app), ([_, status]) => status);
}
export function createJobApplicationWithInitialStatus(
	data: JobApplicationForCreate,
	generateUUID: () => string,
): JobApplication {
	const id = createJobApplicationId(generateUUID);
	// createJobApplication already seeds statusLog with the initial "applied" entry
	return createJobApplication(data, id);
}
export function createJobApplicationId(
	generateUUID: () => string,
): JobApplicationId {
	return jobApplicationModule.JobAppId.assert(generateUUID());
}
export function getJobAppCurrentStatusEntry(
	app: JobApplication,
): Either.Either<AppStatusEntry, ArkErrors> {
	const lastEntry = app.statusLog.at(-1) ?? "Can't find last entry";
	const parseResult = jobApplicationModule.AppStatusEntry(lastEntry);
	if (parseResult instanceof ArkErrors) {
		return Either.left(parseResult);
	}
	return Either.right(parseResult);
}
export function createJobApplication(
	data: JobApplicationForCreate,
	id: JobApplicationId,
): JobApplication {
	const now = new Date().toISOString();
	// Seed statusLog with the initial "applied" entry to satisfy the >0 schema constraint
	const initialStatusEntry: AppStatusEntry = [
		now,
		{ category: "active", label: "applied" },
	];
	return {
		...data,
		id,
		createdAt: now,
		updatedAt: now,
		statusLog: [initialStatusEntry],
		notes: [],
	};
}
export function isJobAppOverdue(app: JobApplication): boolean {
	const now = new Date();
	const nextEventDate = app.nextEventDate;
	if (nextEventDate) {
		const nextEventDateObj = new Date(nextEventDate);
		return nextEventDateObj < now;
	}
	return false;
}
export function updateJobApplicationStatus(
	app: JobApplication,
	newStatus: ApplicationStatus,
): JobApplication {
	const now = new Date().toISOString();
	const statusEntry: AppStatusEntry = [now, newStatus];
	return {
		...app,
		statusLog: [...app.statusLog, statusEntry],
		updatedAt: now,
	};
}
export function updateJobApplicationData(
	app: JobApplication,
	updates: Partial<Omit<JobApplication, "id">>,
): JobApplication {
	return {
		...app,
		...updates,
		updatedAt: new Date().toISOString(),
	};
}
/**
 * Derives the ApplicationStatus (category + label) from a status label.
 * Category is determined by whether the label appears in the domain's ActiveLabels set.
 */
export function createApplicationStatus(
	label: ApplicationStatusLabel,
): ApplicationStatus {
	// Validate through the domain schema to get a typed, narrowed value
	const activeResult = jobApplicationModule.ActiveLabels(label);
	const category =
		activeResult instanceof ArkErrors ? "inactive" : "active";
	return { category, label } as ApplicationStatus;
}
