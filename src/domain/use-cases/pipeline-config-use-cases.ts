import type { ResultAsync } from "neverthrow";
import type { PipelineConfig } from "../entities/pipeline-config";
import type { DatabaseError } from "../ports/job-application-repository";
import type { PipelineConfigRepository } from "../ports/pipeline-config-repository";

export interface PipelineConfigUseCases {
	getPipelineConfig(): ResultAsync<PipelineConfig, DatabaseError>;
	updatePipelineConfig(
		config: PipelineConfig,
	): ResultAsync<void, DatabaseError>;
	addActiveStatus(status: string): ResultAsync<void, DatabaseError>;
	addInactiveStatus(status: string): ResultAsync<void, DatabaseError>;
	removeStatus(status: string): ResultAsync<void, DatabaseError>;
}

export function createPipelineConfigUseCases(
	repository: PipelineConfigRepository,
): PipelineConfigUseCases {
	return {
		getPipelineConfig: (): ResultAsync<PipelineConfig, DatabaseError> => {
			return repository.load();
		},

		updatePipelineConfig: (
			config: PipelineConfig,
		): ResultAsync<void, DatabaseError> => {
			return repository.save(config);
		},

		addActiveStatus: (status: string): ResultAsync<void, DatabaseError> => {
			return repository
				.load()
				.map((config) => {
					config.addActiveStatus(status);
					return config;
				})
				.andThen((config) => repository.save(config));
		},

		addInactiveStatus: (status: string): ResultAsync<void, DatabaseError> => {
			return repository
				.load()
				.map((config) => {
					config.addInactiveStatus(status);
					return config;
				})
				.andThen((config) => repository.save(config));
		},

		removeStatus: (status: string): ResultAsync<void, DatabaseError> => {
			return repository
				.load()
				.map((config) => {
					config.removeStatus(status);
					return config;
				})
				.andThen((config) => repository.save(config));
		},
	};
}
