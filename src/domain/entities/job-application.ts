import { scope } from "arktype";
import { err, ok, type Result } from "neverthrow";
import { createNotesCollection } from "./note";
import type { NoteProps, NotesCollection } from "./noteScope.ts";

const jobApplicationScope = scope({
	"#ActiveState": {
		category: "'active'",
		current:
			"'applied'|'screening interview'|'interview'|'onsite'|'online test'|'take-home assignment'|'offer'",
	},
	"#InactiveState": {
		category: "'inactive'",
		current: "'rejected'|'no response'|'no longer interested'|'hiring freeze'",
	},
	"#ApplicationStatusProps": {
		"note?": "string > 0",
	},
	"#dateTime": "string.date.iso",
	ApplicationStatus: "(ActiveState|InactiveState) & ApplicationStatusProps",
	JobAppId: "string.uuid",
	"#HasId": {
		id: "JobAppId",
	},
	BaseProps: {
		company: "string > 0",
		positionTitle: "string > 0",
		applicationDate: "string.date.iso",
		"interestRating?": "1|2|3",
		"nextEventDate?": "string.date.iso",
		"jobPostingUrl?": "string",
		"jobDescription?": "string",
	},
	JobApp: {
		"...": "BaseProps",
		id: "JobAppId",
		createdAt: "string.date.iso",
		updatedAt: "string.date.iso",
		statusLog: "Record<string, ApplicationStatus>",
	},
	forCreate: "BaseProps",
	forUpdate: "Omit<Partial<JobApp>,'id'> & HasId",
	JobAppCollection: "Record<string, BaseProps>",
});

export const jobApplicationModule = jobApplicationScope.export();

type JobApp = typeof jobApplicationModule.JobApp.infer & {
	notes: NotesCollection;
};
export type JobApplicationForCreate =
	typeof jobApplicationModule.forCreate.infer;
function assertIsJobApplicationForCreate(
	x: unknown,
): asserts x is JobApplicationForCreate {
	jobApplicationModule.forCreate.assert(x);
}
type JobApplicationForUpdate = typeof jobApplicationModule.forUpdate.infer;
type JobApplicationId = typeof jobApplicationModule.JobAppId.infer;
export type ApplicationStatus =
	typeof jobApplicationModule.ApplicationStatus.infer;

function getJobApplicationId(): JobApplicationId {
	return jobApplicationModule.JobAppId.assert(Bun.randomUUIDv7());
}

interface JobApplicationOperations {
	update(newVals: JobApplicationForUpdate): void;

	newStatus(status: ApplicationStatus): void;

	/**
	 * Check if the application has an overdue next event date
	 */
	isOverdue(): boolean;

	/**
	 * Get the current status from the status log
	 */
	getCurrentStatus(): ApplicationStatus | null;
}

export type JobApplication = JobApp & JobApplicationOperations;

export function createJobApplication(
	data: JobApplicationForCreate,
): Result<JobApplication, Error> {
	return createJobApplicationWithState(data, {
		id: getJobApplicationId(),
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		statusLog: {},
		notes: {},
	});
}

export function jobApplicationFromData(
	data: JobApplicationForCreate & {
		id: string;
		createdAt: string;
		updatedAt: string;
		statusLog: Record<string, ApplicationStatus>;
		notes: Record<string, NoteProps>;
	},
): Result<JobApplication, Error> {
	return createJobApplicationWithState(data, {
		id: data.id,
		createdAt: data.createdAt,
		updatedAt: data.updatedAt,
		statusLog: data.statusLog,
		notes: data.notes,
	});
}

function createJobApplicationWithState(
	data: JobApplicationForCreate,
	initialState: {
		id: string;
		createdAt: string;
		updatedAt: string;
		statusLog: Record<string, ApplicationStatus>;
		notes: Record<string, NoteProps>;
	},
): Result<JobApplication, Error> {
	try {
		const notes = createNotesCollection();
		// Restore notes from the initial state
		Object.assign(notes.notes, initialState.notes);

		const statusLog: JobApplication["statusLog"] = {
			...initialState.statusLog,
		};

		// Trim string properties
		const trimmedData = Object.fromEntries(
			Object.entries(data).map(([key, value]) => [
				key,
				typeof value === "string" ? value.trim() : value,
			]),
		);
		assertIsJobApplicationForCreate(trimmedData);

		let state: Omit<JobApp, "statusLog" | "notes"> = {
			id: initialState.id,
			createdAt: initialState.createdAt,
			updatedAt: initialState.updatedAt,
			...trimmedData,
			// optional fields populated conditionally below
		};

		const api = {
			get id() {
				return state.id;
			},
			get company() {
				return state.company;
			},
			get positionTitle() {
				return state.positionTitle;
			},
			get applicationDate() {
				return state.applicationDate;
			},
			get createdAt() {
				return state.createdAt;
			},
			get updatedAt() {
				return state.updatedAt;
			},
			get interestRating() {
				return state.interestRating;
			},
			get nextEventDate() {
				return state.nextEventDate;
			},
			get jobPostingUrl() {
				return state.jobPostingUrl;
			},
			get jobDescription() {
				return state.jobDescription;
			},
			statusLog,
			notes,
			update,
			newStatus,
			isOverdue,
			getCurrentStatus,
		} satisfies JobApplication;

		return ok(api);

		function update(newVals: JobApplicationForUpdate) {
			const nowIso = getNextIso(state.updatedAt);
			// Do not allow id change; spread others
			const { id: _ignored, ...rest } = newVals;
			state = {
				...state,
				...rest,
				updatedAt: nowIso,
			};
		}

		function newStatus(status: ApplicationStatus) {
			const nowIso = getNextIso(state.updatedAt);
			statusLog[nowIso] = status;
			state.updatedAt = nowIso;
		}

		function getNextIso(prevIso: string) {
			const now = new Date();
			const prev = new Date(prevIso);
			if (now <= prev) {
				return new Date(prev.getTime() + 1).toISOString();
			}
			return now.toISOString();
		}

		function isOverdue(): boolean {
			if (!state.nextEventDate) return false;
			const nextEventDate = new Date(state.nextEventDate);
			const now = new Date();
			return nextEventDate < now;
		}

		function getCurrentStatus(): ApplicationStatus | null {
			const statusEntries = Object.entries(statusLog);
			if (statusEntries.length === 0) return null;

			// Sort by timestamp (ISO string) to get the latest status
			const sortedEntries = statusEntries.toSorted(([a], [b]) =>
				b.localeCompare(a),
			);
			const latestEntry = sortedEntries[0];
			return latestEntry ? latestEntry[1] : null;
		}
	} catch (error) {
		return err(error instanceof Error ? error : new Error(String(error)));
	}
}
