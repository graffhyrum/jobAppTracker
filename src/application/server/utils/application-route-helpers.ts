import { ArkErrors, type } from "arktype";
import type {
	ApplicationStatus,
	JobApplication,
	JobApplicationForCreate,
} from "#src/domain/entities/job-application.ts";
import { jobApplicationModule } from "#src/domain/entities/job-application.ts";
import type { JobApplicationManager } from "#src/domain/ports/job-application-manager.ts";
import {
	type createApplicationBodySchema,
	updateApplicationBodySchema,
} from "#src/presentation/schemas/application-routes.schemas.ts";

type ApplicationStatusLabel =
	typeof jobApplicationModule.ApplicationStatusLabel.infer;

/**
 * Converts status label to ApplicationStatus with proper category
 */
export const createApplicationStatus = (
	label: ApplicationStatusLabel,
): ApplicationStatus => {
	const activeLabels: ApplicationStatusLabel[] = [
		"applied",
		"screening interview",
		"interview",
		"onsite",
		"online test",
		"take-home assignment",
		"offer",
	];

	const category = activeLabels.includes(label) ? "active" : "inactive";

	return { category, label } as ApplicationStatus;
};

/**
 * Safely extracts string from unknown type
 */
export const extractStringField = (
	value: unknown,
	defaultValue: string | undefined = "",
): string | undefined => {
	if (typeof value === "string") {
		return value;
	}
	return defaultValue;
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

	const applicationDate = normalize(formData.applicationDate);
	const nextEventDate = nextEventDateRaw
		? normalize(nextEventDateRaw)
		: undefined;

	if (!company || !positionTitle || !applicationDate) {
		throw new Error(
			"Company, position title, and application date are required",
		);
	}

	// Handle isRemote which might come as string from forms or boolean from direct API calls
	// If checkbox is unchecked, the field won't be in formData at all
	const isRemoteValue = formData.isRemote;
	const isRemote =
		isRemoteValue === true ||
		isRemoteValue === "true" ||
		(isRemoteValue as unknown) === "true";

	const data: JobApplicationForCreate = {
		company,
		positionTitle,
		applicationDate,
		// New required fields with defaults
		sourceType:
			typeof formData.sourceType === "string" &&
			formData.sourceType.trim() !== ""
				? (formData.sourceType as JobApplicationForCreate["sourceType"])
				: "other",
		isRemote,
	};

	// Add optional fields only if they have values
	if (interestRating && ["1", "2", "3"].includes(interestRating)) {
		data.interestRating = Number(interestRating) as 1 | 2 | 3;
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
		data.jobBoardId =
			formData.jobBoardId as JobApplicationForCreate["jobBoardId"];
	}

	if (formData.sourceNotes && typeof formData.sourceNotes === "string") {
		data.sourceNotes = formData.sourceNotes;
	}

	return data;
};

// Create schema once at module initialization to avoid race conditions under concurrent load
const objectJsonSchema = type("object.json").to(updateApplicationBodySchema);

/**
 * Transforms form data for PUT request, handling status field conversion
 */
export const transformUpdateData = (
	body: unknown,
	currentApp: JobApplication | null,
) => {
	const formData = objectJsonSchema(body);

	// Handle status field transformation
	if ("status" in formData && typeof formData.status === "string") {
		if (currentApp) {
			const statusLabel =
				formData.status as typeof jobApplicationModule.ApplicationStatusLabel.infer;
			const newStatus = createApplicationStatus(statusLabel);
			const timestamp = new Date().toISOString();

			// Append new status to statusLog
			formData.statusLog = [...currentApp.statusLog, [timestamp, newStatus]];
		}

		// Remove the status field as it's not part of the schema
		delete formData.status;
	}

	// Handle date field normalization (convert YYYY-MM-DD to ISO datetime)
	if ("applicationDate" in formData && formData.applicationDate) {
		formData.applicationDate = normalize(formData.applicationDate as string);
	}

	if ("nextEventDate" in formData && formData.nextEventDate) {
		formData.nextEventDate = normalize(formData.nextEventDate as string);
	}

	// Handle optional string fields - trim and delete if empty
	if (
		"jobPostingUrl" in formData &&
		typeof formData.jobPostingUrl === "string"
	) {
		const trimmed = formData.jobPostingUrl.trim();
		if (trimmed) {
			formData.jobPostingUrl = trimmed;
		} else {
			delete formData.jobPostingUrl;
		}
	}

	if (
		"jobDescription" in formData &&
		typeof formData.jobDescription === "string"
	) {
		const trimmed = formData.jobDescription.trim();
		if (trimmed) {
			formData.jobDescription = trimmed;
		} else {
			delete formData.jobDescription;
		}
	}

	const maybeParsed = jobApplicationModule.forUpdate(formData);
	if (maybeParsed instanceof ArkErrors) {
		throw maybeParsed;
	}

	return maybeParsed;
};

/**
 * Fetches all applications, returning empty array on error
 */
export const fetchAllApplicationsOrEmpty = async (
	manager: JobApplicationManager,
): Promise<JobApplication[]> => {
	const result = await manager.getAllJobApplications();
	return result.isOk() ? result.value : [];
};

// Create schema once at module initialization to avoid race conditions under concurrent load
const dateNormalizeSchema = type("string.date.iso").pipe((md) =>
	new Date(md).toISOString(),
);

// Normalize date-only strings to UTC ISO (midnight Z)
const normalize = (s: string | undefined) => {
	return dateNormalizeSchema.assert(s);
};
