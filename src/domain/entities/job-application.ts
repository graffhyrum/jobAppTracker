import { ArkErrors, scope, type } from "arktype";
import { err, ok, type Result } from "neverthrow";
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
	"#HasId": {
		id: "JobAppId",
	},
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
	FormForCreate: {
		"[ForCreateKey]": "string",
	},
	FormForUpdate: {
		"[ForUpdateKey]?": "string",
	},
});

export const jobApplicationModule = jobApplicationScope.export();

export type JobApplicationForCreate =
	typeof jobApplicationModule.forCreate.infer;

function _assertIsJobApplicationForCreate(
	x: unknown,
): asserts x is JobApplicationForCreate {
	jobApplicationModule.forCreate.assert(x);
}

export type JobApplicationForUpdate =
	typeof jobApplicationModule.forUpdate.infer;
export type JobApplicationId = typeof jobApplicationModule.JobAppId.infer;
export type ApplicationStatus =
	typeof jobApplicationModule.ApplicationStatus.infer;

export function createJobApplicationId(
	generateUUID: () => string,
): JobApplicationId {
	return jobApplicationModule.JobAppId.assert(generateUUID());
}

type AppStatusEntry = typeof jobApplicationModule.AppStatusEntry.infer;

export function getJobAppCurrentStatusEntry(
	app: JobApplication,
): Result<AppStatusEntry, ArkErrors> {
	const lastEntry = app.statusLog.at(-1) ?? "Can't find last entry";
	const parseResult = jobApplicationModule.AppStatusEntry(lastEntry);
	if (parseResult instanceof ArkErrors) {
		return err(parseResult);
	} else {
		return ok(parseResult);
	}
}

export type JobApplication = typeof jobApplicationModule.JobApp.infer;

export function createJobApplication(
	data: JobApplicationForCreate,
	id: JobApplicationId,
): JobApplication {
	const now = new Date().toISOString();
	return {
		...data,
		id,
		createdAt: now,
		updatedAt: now,
		statusLog: [],
		notes: [],
	};
}

export function createJobApplicationWithIdGen(
	data: JobApplicationForCreate,
	generateUUID: () => string,
): JobApplication {
	const id = createJobApplicationId(generateUUID);
	return createJobApplication(data, id);
}

export function createJobApplicationWithInitialStatus(
	data: JobApplicationForCreate,
	generateUUID: () => string,
): JobApplication {
	const id = createJobApplicationId(generateUUID);
	const baseApp = createJobApplication(data, id);

	// Add initial "applied" status
	const initialStatus: ApplicationStatus = {
		category: "active",
		label: "applied",
	};

	return updateJobApplicationStatus(baseApp, initialStatus);
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

export function getCurrentStatus(
	app: JobApplication,
): Result<ApplicationStatus, ArkErrors> {
	const statusEntry = getJobAppCurrentStatusEntry(app);
	return statusEntry.map(([_, status]) => status);
}

export function getStatusCategory(
	app: JobApplication,
): Result<"active" | "inactive", ArkErrors> {
	return getCurrentStatus(app).map((status) => status.category);
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

export function hasStatus(app: JobApplication): boolean {
	return app.statusLog.length > 0;
}

export function isActive(app: JobApplication): boolean {
	const category = getStatusCategory(app);
	return category.isOk() && category.value === "active";
}

export function isInactive(app: JobApplication): boolean {
	const category = getStatusCategory(app);
	return category.isOk() && category.value === "inactive";
}

export type ApplicationStatusLabel =
	typeof jobApplicationModule.ApplicationStatusLabel.infer;
