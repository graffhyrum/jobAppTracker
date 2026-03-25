import type { Database } from "bun:sqlite";

import { ArkErrors } from "arktype";
import { Effect } from "effect";

import { JobApplicationError } from "../../domain/entities/job-application-error.ts";
import {
	createJobApplicationWithInitialStatus,
	type JobApplication,
	type JobApplicationForCreate,
	jobApplicationModule,
} from "../../domain/entities/job-application.ts";
import type { UUID } from "../../domain/entities/uuid.ts";
import type { ForUpdate } from "../../domain/ports/common-types.ts";
import type { JobApplicationManager } from "../../domain/ports/job-application-manager.ts";
import { uuidProvider } from "../di/uuid-provider.ts";
import { normalizeJobAppRow } from "../sqlite/normalize-sqlite-row.ts";

export function createSQLiteJobAppManager(db: Database): JobApplicationManager {
	return {
		createJobApplication: (
			data: JobApplicationForCreate,
		): Effect.Effect<JobApplication, JobApplicationError> => {
			const app = createJobApplicationWithInitialStatus(
				data,
				uuidProvider.generateUUID,
			);

			return Effect.tryPromise({
				try: () =>
					Promise.resolve().then(() => {
						const query = db.prepare(`
							INSERT INTO job_applications (id, company, positionTitle, applicationDate, interestRating,
							                              nextEventDate, jobPostingUrl, jobDescription,
							                              sourceType, jobBoardId, sourceNotes, isRemote,
							                              createdAt, updatedAt, notes, statusLog)
							VALUES ($id, $company, $positionTitle, $applicationDate, $interestRating,
							        $nextEventDate, $jobPostingUrl, $jobDescription,
							        $sourceType, $jobBoardId, $sourceNotes, $isRemote,
							        $createdAt, $updatedAt, $notes, $statusLog)
						`);

						query.run({
							$id: app.id,
							$company: app.company,
							$positionTitle: app.positionTitle,
							$applicationDate: app.applicationDate,
							$interestRating: app.interestRating ?? null,
							$nextEventDate: app.nextEventDate ?? null,
							$jobPostingUrl: app.jobPostingUrl ?? null,
							$jobDescription: app.jobDescription ?? null,
							$sourceType: app.sourceType,
							$jobBoardId: app.jobBoardId ?? null,
							$sourceNotes: app.sourceNotes ?? null,
							$isRemote: app.isRemote ? 1 : 0,
							$createdAt: app.createdAt,
							$updatedAt: app.updatedAt,
							$notes: JSON.stringify(app.notes),
							$statusLog: JSON.stringify(app.statusLog),
						});

						return app;
					}),
				catch: (err) =>
					new JobApplicationError({
						detail: `Failed to create Job Application: ${err}`,
						operation: "createJobApplication",
					}),
			}).pipe(Effect.flatMap(parseJobApplication));
		},

		getJobApplication: (
			id: UUID,
		): Effect.Effect<JobApplication, JobApplicationError> => {
			return Effect.tryPromise({
				try: () =>
					Promise.resolve().then(() => {
						const query = db.prepare(
							"SELECT * FROM job_applications WHERE id = $id",
						);
						const result = query.get({ $id: id });
						if (!result) {
							throw new Error(`Job Application with id ${id} not found`);
						}
						return result;
					}),
				catch: (err) =>
					new JobApplicationError({
						detail: `Failed to query Job Application: ${err}`,
						operation: "getJobApplication",
					}),
			}).pipe(Effect.flatMap(parseJobApplication));
		},

		getAllJobApplications: (): Effect.Effect<
			JobApplication[],
			JobApplicationError
		> => {
			return Effect.tryPromise({
				try: () =>
					Promise.resolve().then(() => {
						const query = db.prepare("SELECT * FROM job_applications");
						return query.all();
					}),
				catch: (err) =>
					new JobApplicationError({
						detail: `Failed to query Job Applications: ${err}`,
						operation: "getAllJobApplications",
					}),
			}).pipe(Effect.flatMap(parseJobAppArray));
		},

		updateJobApplication: (
			id: UUID,
			data: ForUpdate<JobApplication>,
		): Effect.Effect<JobApplication, JobApplicationError> => {
			return Effect.tryPromise({
				try: () =>
					Promise.resolve().then(() => {
						const getQuery = db.prepare(
							"SELECT * FROM job_applications WHERE id = $id",
						);
						const current = getQuery.get({ $id: id });
						if (!current) {
							throw new Error(`Job Application with id ${id} not found`);
						}

						const normalized = normalizeJobAppRow(current) as Record<
							string,
							unknown
						>;

						const updated = {
							...normalized,
							...data,
							updatedAt: new Date().toISOString(),
						} as Record<string, unknown>;

						const updateQuery = db.prepare(`
							UPDATE job_applications
							SET company         = $company,
							    positionTitle   = $positionTitle,
							    applicationDate = $applicationDate,
							    interestRating  = $interestRating,
							    nextEventDate   = $nextEventDate,
							    jobPostingUrl   = $jobPostingUrl,
							    jobDescription  = $jobDescription,
							    sourceType      = $sourceType,
							    jobBoardId      = $jobBoardId,
							    sourceNotes     = $sourceNotes,
							    isRemote        = $isRemote,
							    updatedAt       = $updatedAt,
							    notes           = $notes,
							    statusLog       = $statusLog
							WHERE id = $id
						`);

						updateQuery.run({
							$id: id,
							$company: updated.company as string,
							$positionTitle: updated.positionTitle as string,
							$applicationDate: updated.applicationDate as string,
							$interestRating:
								(updated.interestRating as number | undefined) ?? null,
							$nextEventDate:
								(updated.nextEventDate as string | undefined) ?? null,
							$jobPostingUrl:
								(updated.jobPostingUrl as string | undefined) ?? null,
							$jobDescription:
								(updated.jobDescription as string | undefined) ?? null,
							$sourceType: updated.sourceType as string,
							$jobBoardId: (updated.jobBoardId as string | undefined) ?? null,
							$sourceNotes: (updated.sourceNotes as string | undefined) ?? null,
							$isRemote: (updated.isRemote as boolean) ? 1 : 0,
							$updatedAt: updated.updatedAt as string,
							$notes:
								typeof updated.notes === "string"
									? updated.notes
									: JSON.stringify(updated.notes),
							$statusLog:
								typeof updated.statusLog === "string"
									? updated.statusLog
									: JSON.stringify(updated.statusLog),
						});

						return updated;
					}),
				catch: (err) =>
					new JobApplicationError({
						detail: `Failed to update Job Application: ${err}`,
						operation: "updateJobApplication",
					}),
			}).pipe(Effect.flatMap(parseJobApplication));
		},

		deleteJobApplication: (
			id: UUID,
		): Effect.Effect<void, JobApplicationError> => {
			return Effect.tryPromise({
				try: () =>
					Promise.resolve().then(() => {
						const query = db.prepare(
							"DELETE FROM job_applications WHERE id = $id",
						);
						query.run({ $id: id });
					}),
				catch: (err) =>
					new JobApplicationError({
						detail: `Failed to delete Job Application: ${err}`,
						operation: "deleteJobApplication",
					}),
			});
		},

		getActiveJobApplications: (): Effect.Effect<
			JobApplication[],
			JobApplicationError
		> => {
			return Effect.tryPromise({
				try: () =>
					Promise.resolve().then(() => {
						const query = db.prepare(`
							SELECT *
							FROM job_applications
							WHERE json_extract(statusLog, '$[#-1][1].category') = 'active'
						`);
						return query.all();
					}),
				catch: (err) =>
					new JobApplicationError({
						detail: `Failed to query Job Applications: ${err}`,
						operation: "getActiveJobApplications",
					}),
			}).pipe(Effect.flatMap(parseJobAppArray));
		},

		getInactiveJobApplications: (): Effect.Effect<
			JobApplication[],
			JobApplicationError
		> => {
			return Effect.tryPromise({
				try: () =>
					Promise.resolve().then(() => {
						const query = db.prepare(`
							SELECT *
							FROM job_applications
							WHERE json_extract(statusLog, '$[#-1][1].category') = 'inactive'
						`);
						return query.all();
					}),
				catch: (err) =>
					new JobApplicationError({
						detail: `Failed to query Job Applications: ${err}`,
						operation: "getInactiveJobApplications",
					}),
			}).pipe(Effect.flatMap(parseJobAppArray));
		},

		clearAllJobApplications: (): Effect.Effect<void, JobApplicationError> => {
			return Effect.tryPromise({
				try: () =>
					Promise.resolve().then(() => {
						const query = db.prepare("DELETE FROM job_applications");
						query.run();
					}),
				catch: (err) =>
					new JobApplicationError({
						detail: `Failed to clear all job applications: ${err}`,
						operation: "clearAllJobApplications",
					}),
			});
		},
	};
}

function parseJobAppArray(
	maybeArray: unknown,
): Effect.Effect<JobApplication[], JobApplicationError> {
	const normalizedArray = Array.isArray(maybeArray)
		? maybeArray.map(normalizeJobAppRow)
		: maybeArray;

	const parsedResult = jobApplicationModule.JobApp.array()(normalizedArray);
	if (parsedResult instanceof ArkErrors) {
		return Effect.fail(
			new JobApplicationError({
				detail: JSON.stringify(parsedResult, null, 2),
				operation: "parseJobAppArray",
			}),
		);
	}
	return Effect.succeed(parsedResult);
}

function parseJobApplication(
	maybeRecord: unknown,
): Effect.Effect<JobApplication, JobApplicationError> {
	const normalized = normalizeJobAppRow(maybeRecord);
	const parseResult = jobApplicationModule.JobApp(normalized);
	if (parseResult instanceof ArkErrors) {
		return Effect.fail(
			new JobApplicationError({
				detail: JSON.stringify(parseResult, null, 2),
				operation: "parseJobApplication",
			}),
		);
	}
	return Effect.succeed(parseResult);
}
