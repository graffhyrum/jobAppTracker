import type { ResultAsync } from "neverthrow";
import type { PipelineConfig } from "../entities/pipeline-config";
import type { DatabaseError } from "./job-application-repository";

export interface PipelineConfigRepository {
	/**
	 * Load the pipeline configuration from storage
	 */
	load(): ResultAsync<PipelineConfig, DatabaseError>;

	/**
	 * Save the pipeline configuration to storage
	 */
	save(config: PipelineConfig): ResultAsync<void, DatabaseError>;
}
