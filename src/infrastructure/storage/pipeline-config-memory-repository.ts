import { ResultAsync } from "neverthrow";
import {
	createDefaultPipelineConfig,
	type PipelineConfig,
} from "../../domain/entities/pipeline-config";
import {
	createDatabaseError,
	type DatabaseError,
} from "../../domain/ports/job-application-repository";
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
			return ResultAsync.fromPromise(Promise.resolve(storedConfig), (error) =>
				createDatabaseError(
					"Failed to load pipeline configuration",
					error instanceof Error ? error : new Error(String(error)),
				),
			);
		},

		save: (config: PipelineConfig): ResultAsync<void, DatabaseError> => {
			return ResultAsync.fromPromise(
				Promise.resolve().then(() => {
					storedConfig = config;
				}),
				(error) =>
					createDatabaseError(
						"Failed to save pipeline configuration",
						error instanceof Error ? error : new Error(String(error)),
					),
			);
		},
	};
}
