import { ArkErrors, type } from "arktype";
import { Either } from "effect";

import { runEffect } from "#src/application/server/utils/run-effect.ts";
import type {
	JobApplication,
	JobApplicationForCreate,
} from "#src/domain/entities/job-application.ts";
import {
	createApplicationStatus,
	jobApplicationModule,
} from "#src/domain/entities/job-application.ts";
import type { JobApplicationManager } from "#src/domain/ports/job-application-manager.ts";
import {
	type createApplicationBodySchema,
	updateApplicationBodySchema,
} from "#src/presentation/schemas/application-routes.schemas.ts";
// Create schema once at module initialization to avoid race conditions under concurrent load
const objectJsonSchema = type("object.json").to(updateApplicationBodySchema);
const dateNormalizeSchema = type("string.date.iso").pipe((md) =>
	new Date(md).toISOString(),
);
/**
 * Transforms form data for PUT request, handling status field conversion
 */
export const transformUpdateData = (
	body: unknown,
	currentApp: JobApplication | null,
) => {
	const parseResult = objectJsonSchema(body);
	if (parseResult instanceof ArkErrors) {
		throw parseResult;
	}
	const formData = parseResult;
	if ("status" in formData && typeof formData.status === "string") {
		if (!currentApp) {
			// Cannot append to statusLog without the existing application — throw rather than silently drop
			throw new Error(
				"Cannot update status: current application could not be loaded",
			);
		}
		const statusResult = jobApplicationModule.ApplicationStatusLabel(formData.status);
		if (statusResult instanceof ArkErrors) {
			throw new Error(`Invalid status: ${statusResult.summary}`);
		}
		const statusLabel = statusResult;
		const newStatus = createApplicationStatus(statusLabel);
		const timestamp = new Date().toISOString();
		formData.statusLog = [...currentApp.statusLog, [timestamp, newStatus]];
		// statusLog is the canonical field; status is a shorthand accepted only at this boundary
		delete formData.status;
	}
	if ("applicationDate" in formData && formData.applicationDate) {
		formData.applicationDate = normalize(formData.applicationDate as string);
	}
	if ("nextEventDate" in formData && formData.nextEventDate) {
		formData.nextEventDate = normalize(formData.nextEventDate as string);
	}
	trimOrDelete(formData as Record<string, unknown>, "jobPostingUrl");
	trimOrDelete(formData as Record<string, unknown>, "jobDescription");
	const maybeParsed = jobApplicationModule.forUpdate(formData);
	if (maybeParsed instanceof ArkErrors) {
		throw maybeParsed;
	}
	return maybeParsed;
};
/**
 * Parses form-formatted JA Creation data to JobApplicationForCreate
 */
export const extractApplicationData = (
	formData: typeof createApplicationBodySchema.infer,
): JobApplicationForCreate => {
	const interestRating = extractStringField(formData.interestRating);
	const nextEventDateRaw = formData.nextEventDate;
	const jobPostingUrl = extractStringField(formData.jobPostingUrl)?.trim();
	const jobDescription = extractStringField(formData.jobDescription)?.trim();
	const { company, positionTitle } = formData;
	if (!company || !positionTitle || !formData.applicationDate) {
		throw new Error(
			"Company, position title, and application date are required",
		);
	}
	const applicationDate = normalize(formData.applicationDate);
	const nextEventDate = nextEventDateRaw
		? normalize(nextEventDateRaw)
		: undefined;
	// isRemote may arrive as a string from HTML forms (checkbox absent = unchecked = field omitted)
	// or as a boolean from direct API calls
	const isRemoteValue = formData.isRemote;
	const isRemote = isRemoteValue === true || isRemoteValue === "true";
	const data: JobApplicationForCreate = {
		company,
		positionTitle,
		applicationDate,
		sourceType: (() => {
			if (typeof formData.sourceType === "string" && formData.sourceType.trim() !== "") {
				const result = jobApplicationModule.SourceType(formData.sourceType);
				if (!(result instanceof ArkErrors)) return result;
			}
			return "other" as const;
		})(),
		isRemote,
	};
	if (
		interestRating != null &&
		VALID_INTEREST_RATINGS.includes(interestRating)
	) {
		data.interestRating = Number(interestRating) as 0 | 1 | 2 | 3;
	}
	if (nextEventDate) {
		data.nextEventDate = nextEventDate;
	}
	if (jobPostingUrl) {
		data.jobPostingUrl = jobPostingUrl;
	}
	if (jobDescription) {
		data.jobDescription = jobDescription;
	}
	if (formData.jobBoardId && typeof formData.jobBoardId === "string") {
		const uuidResult = type("string.uuid")(formData.jobBoardId);
		if (!(uuidResult instanceof ArkErrors)) {
			data.jobBoardId = uuidResult as JobApplicationForCreate["jobBoardId"];
		}
	}
	if (formData.sourceNotes && typeof formData.sourceNotes === "string") {
		data.sourceNotes = formData.sourceNotes;
	}
	return data;
};
/**
 * Safely extracts string from unknown type
 */
export const extractStringField = (
	value: unknown,
	defaultValue: string | undefined = undefined,
): string | undefined => {
	if (typeof value === "string") {
		return value;
	}
	return defaultValue;
};
/**
 * Fetches all applications, returning empty array on error
 */
export const fetchAllApplicationsOrEmpty = async (
	manager: JobApplicationManager,
): Promise<JobApplication[]> => {
	const result = await runEffect(manager.getAllJobApplications());
	if (Either.isRight(result)) return result.right;
	console.error("[fetchAllApplicationsOrEmpty] DB error silently returning empty array:", result.left.detail);
	return [];
};
// Normalize date-only strings to UTC ISO (midnight Z)
const normalize = (s: string): string => {
	return dateNormalizeSchema.assert(s);
};
// Trims a string field in-place; deletes the key if blank after trim.
const trimOrDelete = (obj: Record<string, unknown>, key: string): void => {
	if (key in obj && typeof obj[key] === "string") {
		const trimmed = (obj[key] as string).trim();
		if (trimmed) {
			obj[key] = trimmed;
		} else {
			delete obj[key];
		}
	}
};
const VALID_INTEREST_RATINGS: string[] = ["0", "1", "2", "3"];
