#!/usr/bin/env bun

/**
 * Import script to migrate BaseData job application data to the production database.
 *
 * This script:
 * 1. Reads job applications from data/job-applications.json
 * 2. Transforms BaseData schema data to application schema
 * 3. Creates/finds job boards, contacts, and interview stages
 * 4. Inserts all data into the production database
 */

import { join } from "node:path";

import { ArkErrors } from "arktype";
import { Effect, Either } from "effect";

import { runEffect } from "#src/application/server/utils/run-effect.ts";
import {
	type BaseDataJobApplication,
	baseDataModule,
	type JobApplicationResult,
} from "#src/domain/entities/base-data-schema.ts";

import type {
	ContactChannel,
	ContactForCreate,
} from "../src/domain/entities/contact.ts";
import type {
	InterviewStageForCreate,
	InterviewType,
	Question,
} from "../src/domain/entities/interview-stage.ts";
import type {
	ApplicationStatus,
	JobApplicationForCreate,
	JobApplicationId,
} from "../src/domain/entities/job-application.ts";
import type { JobBoardForCreate } from "../src/domain/entities/job-board.ts";
import type { ContactRepository } from "../src/domain/ports/contact-repository.ts";
import type { InterviewStageRepository } from "../src/domain/ports/interview-stage-repository.ts";
import type { JobApplicationManager } from "../src/domain/ports/job-application-manager.ts";
import type { JobBoardRepository } from "../src/domain/ports/job-board-repository.ts";
import { createSQLiteContactRepository } from "../src/infrastructure/adapters/sqlite-contact-repository.ts";
import { createSQLiteInterviewStageRepository } from "../src/infrastructure/adapters/sqlite-interview-stage-repository.ts";
import { createSQLiteJobBoardRepository } from "../src/infrastructure/adapters/sqlite-job-board-repository.ts";
import { jobAppManagerRegistry } from "../src/infrastructure/sqlite/sqlite-registry.ts";

const INTEREST_RATING_MIN = 0;
const INTEREST_RATING_MAX = 4;

// Type definitions
type RepositoryContainer = {
	jobBoard: JobBoardRepository;
	contact: ContactRepository;
	interviewStage: InterviewStageRepository;
};

type InterviewStageData = Omit<InterviewStageForCreate, "jobApplicationId"> & {
	questions: Array<Omit<Question, "id"> & { id: string }>;
};

type TransformedApplication = {
	jobApp: JobApplicationForCreate;
	jobBoardId: string | null;
	contacts: Omit<ContactForCreate, "jobApplicationId">[];
	interviewStages: InterviewStageData[];
};

type ValidationError = {
	index: number;
	id?: number;
	companyName?: string;
	jobTitle?: string;
	errors: ArkErrors;
};

type ProcessingError = {
	id: number;
	error: string;
};

type ImportStatistics = {
	successCount: number;
	skippedCount: number;
	duplicateCount: number;
	errorCount: number;
	validationErrors: ValidationError[];
	processingErrors: ProcessingError[];
	duplicates: Array<{
		id: number;
		companyName: string;
		jobTitle: string;
		existingId: string;
	}>;
};

// Helper functions
function isNonEmptyString(value: string | undefined | null): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

// Duplicate detection functions
async function findDuplicateApplication(
	company: string,
	positionTitle: string,
	jobAppManager: JobApplicationManager,
): Promise<string | null> {
	const allAppsResult = await runEffect(jobAppManager.getAllJobApplications());
	if (Either.isLeft(allAppsResult)) {
		return null;
	}

	const existingApp = allAppsResult.right.find(
		(app) =>
			app.company.toLowerCase().trim() === company.toLowerCase().trim() &&
			app.positionTitle.toLowerCase().trim() ===
				positionTitle.toLowerCase().trim(),
	);

	return existingApp?.id ?? null;
}

function trimIfPresent(value: string | undefined | null): string | undefined {
	return isNonEmptyString(value) ? value.trim() : undefined;
}

function isValidInterestRating(
	rating: number | null | undefined,
): rating is number {
	return (
		rating !== null &&
		rating !== undefined &&
		rating >= INTEREST_RATING_MIN &&
		rating < INTEREST_RATING_MAX
	);
}

// Map BaseData status/outcome to application status
function mapBaseDataStatusToAppStatus(
	status: BaseDataJobApplication["status"],
	outcome: JobApplicationResult["outcome"],
): ApplicationStatus {
	if (status === "Applied") {
		return {
			category: "active",
			label: "applied",
		};
	}

	if (status === "Archived") {
		switch (outcome) {
			case "lost_interest":
				return {
					category: "inactive",
					label: "no longer interested",
				};
			case "ghost":
				return {
					category: "inactive",
					label: "no response",
				};
			case "freeze":
				return {
					category: "inactive",
					label: "hiring freeze",
				};
			default:
				return {
					category: "inactive",
					label: "rejected",
				};
		}
	}

	return {
		category: "active",
		label: "applied",
	};
}

// Map BaseData interview_type to application InterviewType
function mapInterviewType(baseDataType: string): InterviewType {
	switch (baseDataType) {
		case "screening_interview":
			return "phone screening";
		case "interview":
			return "technical"; // Default assumption, could be behavioral
		case "take_home_assignment":
			return "other"; // Not in InterviewType enum, use other
		case "application_submitted":
			return "other"; // Not an interview
		case "offer":
			return "other"; // Not an interview
		default:
			return "other";
	}
}

// Map BaseData channel to ContactChannel
function mapChannel(baseDataChannel: string): ContactChannel {
	switch (baseDataChannel.toLowerCase()) {
		case "linkedin":
			return "linkedin";
		case "email":
			return "email";
		case "phone":
			return "phone";
		case "referral":
			return "referral";
		default:
			return "other";
	}
}

// Determine source type from BaseData data
function determineSourceType(
	hasJobBoard: boolean,
	hasPipelineConnections: boolean,
): "job_board" | "referral" | "networking" | "other" {
	if (hasJobBoard) {
		return "job_board";
	}
	if (hasPipelineConnections) {
		return "referral"; // Could be networking, but referral is more specific
	}
	return "other";
}

// Job board operations
async function findOrCreateJobBoard(
	baseDataJobBoard: BaseDataJobApplication["job_board"],
	jobBoardRepo: JobBoardRepository,
): Promise<string | null> {
	if (!baseDataJobBoard) {
		return null;
	}

	const rootDomain = baseDataJobBoard.root_domain;
	const findResult = await Effect.runPromise(
		Effect.either(jobBoardRepo.findByDomain(rootDomain)),
	);

	if (Either.isRight(findResult) && findResult.right) {
		return findResult.right.id;
	}

	const jobBoardData: JobBoardForCreate = {
		name: baseDataJobBoard.name,
		rootDomain: baseDataJobBoard.root_domain,
		domains: baseDataJobBoard.domains,
	};

	const createResult = await Effect.runPromise(
		Effect.either(jobBoardRepo.create(jobBoardData)),
	);
	return Either.isRight(createResult) ? createResult.right.id : null;
}

// Transform BaseData data to application format
async function transformBaseDataApplication(
	baseDataApp: BaseDataJobApplication,
	repos: RepositoryContainer,
): Promise<TransformedApplication> {
	const jobBoardId = await findOrCreateJobBoard(
		baseDataApp.job_board,
		repos.jobBoard,
	);

	const sourceType = determineSourceType(
		!!baseDataApp.job_board,
		baseDataApp.pipeline_connections.length > 0,
	);

	const jobApp = buildJobApplicationData(baseDataApp, sourceType, jobBoardId);
	const contacts = transformContacts(baseDataApp.pipeline_connections);
	const interviewStages = transformInterviewStages(baseDataApp.stages);

	return {
		jobApp,
		jobBoardId,
		contacts,
		interviewStages,
	};
}

function buildJobApplicationData(
	baseDataApp: BaseDataJobApplication,
	sourceType: "job_board" | "referral" | "networking" | "other",
	jobBoardId: string | null,
): JobApplicationForCreate {
	const jobApp: JobApplicationForCreate = {
		company: baseDataApp.company_name,
		positionTitle: baseDataApp.job_title,
		applicationDate: baseDataApp.created_at,
		sourceType,
		isRemote: baseDataApp.is_remote ?? false,
	};

	if (isValidInterestRating(baseDataApp.interest)) {
		jobApp.interestRating = baseDataApp.interest;
	}

	const jobPostingUrl = trimIfPresent(baseDataApp.job_url);
	if (jobPostingUrl) {
		jobApp.jobPostingUrl = jobPostingUrl;
	}

	const jobDescription = trimIfPresent(baseDataApp.description);
	if (jobDescription) {
		jobApp.jobDescription = jobDescription;
	}

	if (jobBoardId) {
		jobApp.jobBoardId = jobBoardId;
	}

	const sourceNotes = trimIfPresent(baseDataApp.job_application_context);
	if (sourceNotes) {
		jobApp.sourceNotes = sourceNotes;
	}

	return jobApp;
}

function transformContacts(
	pipelineConnections: BaseDataJobApplication["pipeline_connections"],
): Omit<ContactForCreate, "jobApplicationId">[] {
	return pipelineConnections.map((conn) => ({
		contactName: conn.contact.contact_name ?? "unknown",
		contactEmail: isNonEmptyString(conn.contact.contact_email)
			? conn.contact.contact_email
			: undefined,
		linkedInUrl: isNonEmptyString(conn.contact.linkedin_url)
			? conn.contact.linkedin_url
			: undefined,
		role: undefined, // BaseData doesn't have direct role mapping
		channel: mapChannel(conn.channel),
		outreachDate: conn.outreach_date,
		responseReceived: false, // Not available in BaseData data
		notes: undefined,
	}));
}

function transformInterviewStages(
	stages: BaseDataJobApplication["stages"],
): InterviewStageData[] {
	return stages
		.filter((stage) => stage.is_interview)
		.map((stage) => ({
			round: Math.max(1, stage.round),
			interviewType: mapInterviewType(stage.interview_type),
			isFinalRound: stage.finalRound,
			scheduledDate: undefined,
			completedDate: stage.date ?? undefined,
			notes: stage.notes ?? undefined,
			questions: stage.questions.map((q) => ({
				id: crypto.randomUUID(),
				title: q.title,
				answer: undefined,
			})),
		}));
}

// Validation functions
async function validateBaseDataData(
	rawData: unknown,
): Promise<BaseDataJobApplication[]> {
	const rootValidation = baseDataModule.BaseDataJobApplications(rawData);
	if (rootValidation instanceof ArkErrors) {
		console.error("❌ Root JSON structure validation failed:");
		console.error(rootValidation.summary);
		throw rootValidation.toTraversalError();
	}
	return rootValidation;
}

function validateIndividualEntries(
	baseDataData: BaseDataJobApplication[],
): ValidationError[] {
	const validationErrors: ValidationError[] = [];

	for (let i = 0; i < baseDataData.length; i++) {
		const entry = baseDataData[i];
		const validation = baseDataModule.BaseDataJobApplication(entry);
		if (validation instanceof ArkErrors) {
			validationErrors.push({
				index: i,
				id: entry?.id,
				companyName: entry?.company_name,
				jobTitle: entry?.job_title,
				errors: validation,
			});
		}
	}

	return validationErrors;
}

function logValidationErrors(validationErrors: ValidationError[]): void {
	if (validationErrors.length === 0) {
		console.log("✅ All entries passed validation\n");
		return;
	}

	console.log(
		`\n⚠️  Found ${validationErrors.length} entries with validation errors:\n`,
	);

	for (const errorEntry of validationErrors) {
		console.log(`Entry ${errorEntry.index}:`);
		if (errorEntry.id !== undefined) {
			console.log(`  ID: ${errorEntry.id}`);
		}
		if (errorEntry.companyName) {
			console.log(`  Company: ${errorEntry.companyName}`);
		}
		if (errorEntry.jobTitle) {
			console.log(`  Job Title: ${errorEntry.jobTitle}`);
		}
		console.log(`  Validation Errors:`);
		const errorSummary = errorEntry.errors.summary;
		console.log(`  ${errorSummary}`);
		console.log(`  Full error details:`);
		console.log(JSON.stringify(errorEntry.errors, null, 2));
		console.log("");
	}

	console.log(
		`\n⚠️  Continuing import with ${validationErrors.length} entries skipped...\n`,
	);
}

// Application processing functions
async function updateJobApplicationStatus(
	jobAppManager: JobApplicationManager,
	jobAppId: JobApplicationId,
	baseDataApp: BaseDataJobApplication,
): Promise<void> {
	const baseDataStatus = mapBaseDataStatusToAppStatus(
		baseDataApp.status,
		(baseDataApp.result as JobApplicationResult | undefined)?.outcome ?? null,
	);
	const correctStatusLog: [string, ApplicationStatus] = [
		baseDataApp.created_at,
		baseDataStatus,
	];

	const updateResult = await runEffect(
		jobAppManager.updateJobApplication(jobAppId, {
			statusLog: [correctStatusLog],
		}),
	);

	if (Either.isRight(updateResult)) {
		console.log(`  ✅ Updated status log to: ${baseDataStatus.label}`);
	} else {
		console.warn(
			`  ⚠️  Failed to update status log: ${updateResult.left.detail}`,
		);
	}
}

async function createContacts(
	contactRepo: ContactRepository,
	jobAppId: JobApplicationId,
	contacts: Omit<ContactForCreate, "jobApplicationId">[],
): Promise<void> {
	for (const contactData of contacts) {
		const contactForCreate: ContactForCreate = {
			...contactData,
			jobApplicationId: jobAppId,
		};
		const contactResult = await Effect.runPromise(
			Effect.either(contactRepo.create(contactForCreate)),
		);
		if (Either.isLeft(contactResult)) {
			console.warn(`  Failed to create contact: ${contactResult.left.detail}`);
		} else {
			console.log(`  Created contact: ${contactResult.right.id}`);
		}
	}
}

async function createInterviewStages(
	interviewStageRepo: InterviewStageRepository,
	jobAppId: JobApplicationId,
	interviewStages: InterviewStageData[],
): Promise<void> {
	for (const stageData of interviewStages) {
		const stageForCreate: InterviewStageForCreate = {
			...stageData,
			jobApplicationId: jobAppId,
			questions: stageData.questions.map((q) => ({
				id: q.id,
				title: q.title,
				answer: q.answer,
			})),
		};
		const stageResult = await runEffect(
			interviewStageRepo.create(stageForCreate),
		);
		if (Either.isLeft(stageResult)) {
			console.warn(
				`  ⚠️  Failed to create interview stage: ${stageResult.left.detail}`,
			);
		} else {
			console.log(`  ✅ Created interview stage: ${stageResult.right.id}`);
		}
	}
}

async function processApplication(
	baseDataApp: BaseDataJobApplication,
	jobAppManager: JobApplicationManager,
	repos: RepositoryContainer,
): Promise<string | null> {
	console.log(
		`\n📝 Processing: ${baseDataApp.company_name} - ${baseDataApp.job_title} (ID: ${baseDataApp.id})`,
	);

	// Check for duplicates
	const duplicateId = await findDuplicateApplication(
		baseDataApp.company_name,
		baseDataApp.job_title,
		jobAppManager,
	);

	if (duplicateId) {
		console.log(
			`  ⚠️  Duplicate found - existing application ID: ${duplicateId}`,
		);
		return duplicateId;
	}

	const transformed = await transformBaseDataApplication(baseDataApp, repos);

	const createResult = await runEffect(
		jobAppManager.createJobApplication(transformed.jobApp),
	);

	if (Either.isLeft(createResult)) {
		throw new Error(
			`Failed to create job application: ${createResult.left.detail}`,
		);
	}

	const jobApp = createResult.right;
	console.log(`  ✅ Created job application: ${jobApp.id}`);

	await updateJobApplicationStatus(jobAppManager, jobApp.id, baseDataApp);
	await createContacts(repos.contact, jobApp.id, transformed.contacts);
	await createInterviewStages(
		repos.interviewStage,
		jobApp.id,
		transformed.interviewStages,
	);

	return null;
}

// Main import function
async function importData(): Promise<void> {
	console.log("🚀 Starting BaseData data import...");

	const db = jobAppManagerRegistry.getDatabase("prod");
	const jobAppManager = jobAppManagerRegistry.getManager("prod");

	const repos: RepositoryContainer = {
		jobBoard: createSQLiteJobBoardRepository(db),
		contact: createSQLiteContactRepository(db),
		interviewStage: createSQLiteInterviewStageRepository(db),
	};

	const jsonPath = join(process.cwd(), "data", "job-applications.json");
	console.log(`📖 Reading data from: ${jsonPath}`);
	const rawData = await import(jsonPath);

	console.log("🔍 Validating JSON structure...");
	const baseDataData = await validateBaseDataData(rawData);
	console.log(`📊 Found ${baseDataData.length} applications to import`);

	console.log("🔍 Validating individual entries...");
	const validationErrors = validateIndividualEntries(baseDataData);
	logValidationErrors(validationErrors);

	const statistics: ImportStatistics = {
		successCount: 0,
		skippedCount: 0,
		duplicateCount: 0,
		errorCount: 0,
		validationErrors,
		processingErrors: [],
		duplicates: [],
	};

	const skippedEntries = new Set<number>(validationErrors.map((e) => e.index));

	for (let i = 0; i < baseDataData.length; i++) {
		if (skippedEntries.has(i)) {
			statistics.skippedCount++;
			continue;
		}

		const baseDataApp = baseDataData[i];
		if (!baseDataApp) {
			statistics.skippedCount++;
			continue;
		}

		try {
			const duplicateId = await processApplication(
				baseDataApp,
				jobAppManager,
				repos,
			);
			if (duplicateId) {
				statistics.duplicateCount++;
				statistics.duplicates.push({
					id: baseDataApp.id,
					companyName: baseDataApp.company_name,
					jobTitle: baseDataApp.job_title,
					existingId: duplicateId,
				});
			} else {
				statistics.successCount++;
			}
		} catch (error) {
			statistics.errorCount++;
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.error(
				`  ❌ Error processing application ${baseDataApp.id}: ${errorMessage}`,
			);
			statistics.processingErrors.push({
				id: baseDataApp.id,
				error: errorMessage,
			});
		}
	}

	logImportSummary(statistics);
}

function logImportSummary(statistics: ImportStatistics): void {
	console.log(`\n${"=".repeat(60)}`);
	console.log("📈 Import Summary:");
	console.log(`  ✅ Successfully imported: ${statistics.successCount}`);
	console.log(`  🔄 Duplicates found: ${statistics.duplicateCount}`);
	console.log(`  ⏭️  Skipped (validation errors): ${statistics.skippedCount}`);
	console.log(`  ❌ Failed (processing errors): ${statistics.errorCount}`);

	if (statistics.duplicates.length > 0) {
		console.log(`\n🔄 Duplicates Summary:`);
		for (const {
			id,
			companyName,
			jobTitle,
			existingId,
		} of statistics.duplicates) {
			console.log(
				`  - Application ${id}: ${companyName} - ${jobTitle} (existing: ${existingId})`,
			);
		}
	}

	if (statistics.validationErrors.length > 0) {
		console.log(`\n⚠️  Validation Errors Summary:`);
		console.log(
			`  Total entries with validation errors: ${statistics.validationErrors.length}`,
		);
	}

	if (statistics.processingErrors.length > 0) {
		console.log("\n❌ Processing Errors:");
		for (const { id, error } of statistics.processingErrors) {
			console.log(`  - Application ${id}: ${error}`);
		}
	}

	console.log("=".repeat(60));
}

// Run the import
try {
	await importData();
} catch (error) {
	console.error("Fatal error during import:", error);
	process.exit(1);
}
