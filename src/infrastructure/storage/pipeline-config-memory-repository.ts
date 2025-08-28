import { okAsync, type ResultAsync } from "neverthrow";
import {
	createDefaultPipelineConfig,
	type PipelineConfig,
} from "../../domain/entities/pipeline-config";
import type { DatabaseError } from "../../domain/ports/job-application-repository";
import type { PipelineConfigRepository } from "../../domain/ports/pipeline-config-repository";

/**
 * In-memory implementation of PipelineConfigRepository for testing
 */
export function createPipelineConfigMemoryRepository(
	initialConfig?: PipelineConfig,
): PipelineConfigRepository {
	let storedConfig = initialConfig ?? createDefaultPipelineConfig();

	return {
		load: (): ResultAsync<PipelineConfig, DatabaseError> => {
			return okAsync(storedConfig);
		},

		save: (config: PipelineConfig): ResultAsync<void, DatabaseError> => {
			storedConfig = config;
			return okAsync(undefined);
		},
	};
}
