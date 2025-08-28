import type { ResultAsync } from "neverthrow";
import {
	createDefaultPipelineConfig,
	type PipelineConfig,
	pipelineConfigFromData,
} from "../../domain/entities/pipeline-config";
import type { DatabaseError } from "../../domain/ports/job-application-repository";
import type { PipelineConfigRepository } from "../../domain/ports/pipeline-config-repository";
import type { SerializablePipelineConfig } from "./types";
import { toDatabaseError, wrapAsyncOperation } from "./utils";

/**
 * JSON file-based implementation of PipelineConfigRepository using Bun.file
 */
export function createPipelineConfigJsonRepository(
	filePath: string,
): PipelineConfigRepository {
	return {
		load: (): ResultAsync<PipelineConfig, DatabaseError> => {
			return wrapAsyncOperation(async () => {
				const data = await readData();
				if (!data) {
					// Return default configuration if file doesn't exist
					return createDefaultPipelineConfig();
				}
				return pipelineConfigFromData(data);
			}, "Failed to load pipeline configuration");
		},

		save: (config: PipelineConfig): ResultAsync<void, DatabaseError> => {
			return wrapAsyncOperation(async () => {
				const data: SerializablePipelineConfig = config.toJSON();
				await writeData(data);
			}, "Failed to save pipeline configuration");
		},
	};

	async function readData(): Promise<SerializablePipelineConfig | null> {
		try {
			const file = Bun.file(filePath);
			const exists = await file.exists();
			if (!exists) {
				return null;
			}
			const content = await file.text();
			if (content.trim() === "") {
				return null;
			}
			return JSON.parse(content);
		} catch (error) {
			throw toDatabaseError(`Failed to read from ${filePath}`, error);
		}
	}

	async function writeData(data: SerializablePipelineConfig): Promise<void> {
		try {
			await Bun.write(filePath, JSON.stringify(data, null, 2));
		} catch (error) {
			throw toDatabaseError(`Failed to write to ${filePath}`, error);
		}
	}
}
