import { processEnv } from "../../../processEnvFacade.ts";
import type { JobApplicationRepository } from "../../domain/ports/job-application-repository.ts";
import { createJobApplicationJsonRepository } from "../storage/job-application-json-repository.ts";
import { createJobApplicationMemoryRepository } from "../storage/job-application-memory-repository.ts";

/**
 * Repository provider types
 */
export type RepositoryType = "json" | "memory";

/**
 * Dependency injection provider for JobApplicationRepository
 */
const configMap = {
	json: createJobApplicationJsonRepository,
	memory: createJobApplicationMemoryRepository,
} as const satisfies Record<RepositoryType, () => JobApplicationRepository>;
const instance = configMap[processEnv.JOB_APP_REPOSITORY_TYPE]();

function getRepository(): JobApplicationRepository {
	return instance;
}

// Create and export a singleton instance
export const jobApplicationRepositoryProvider = getRepository();
